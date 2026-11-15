import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
const u1 = "00000000-0000-4000-8000-000000000001",
  u2 = "00000000-0000-4000-8000-000000000002";
test("migrations reais: CRUD, RLS, fotos, cotas, duplicação e relatórios", async (t) => {
  const db = new PGlite({ extensions: { pgcrypto } });
  try {
    // Minimal Supabase-owned schemas. The project migrations below run unmodified.
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;create schema auth;create schema storage;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql immutable as $$select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1]$$;
 grant usage on schema public,auth,storage to authenticated,anon,service_role;grant select on storage.objects to authenticated;`);
    await db.exec(
      await readFile("supabase/migrations/202611140001_initial.sql", "utf8"),
    );
    await db.exec(
      await readFile("supabase/migrations/202611140002_reports.sql", "utf8"),
    );
    await db.exec(
      await readFile("supabase/migrations/202611150001_admin.sql", "utf8"),
    );
    await db.query("insert into auth.users(id,email) values($1,$2),($3,$4)", [
      u1,
      "one@example.test",
      u2,
      "two@example.test",
    ]);
    const a1 = randomUUID(),
      a2 = randomUUID(),
      w1 = randomUUID();
    await db.query(
      "insert into animals(id,user_id,identification,species,sex) values($1,$2,'001','Bovino','Macho'),($3,$4,'002','Suíno','Fêmea')",
      [a1, u1, a2, u2],
    );
    await db.query(
      "insert into weighing_records(id,user_id,animal_id,estimated_weight_kg,minimum_weight_kg,maximum_weight_kg,evidence_quality,model_name,ai_response,status) values($1,$2,$3,300,200,400,'baixa','test-only','{}','saved')",
      [w1, u1, a1],
    );
    await db.query(
      "insert into storage.objects(bucket_id,name) values('animal-photos',$1),('animal-photos',$2)",
      [u1 + "/animals/photo.webp", u2 + "/animals/photo.webp"],
    );
    const asUser = async (user: string) => {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        user,
      ]);
      await db.exec("set role authenticated");
    };
    await t.test(
      "usuário só lê seus próprios animais, perfis, registros e fotografias",
      async () => {
        await asUser(u2);
        assert.equal(
          (await db.query("select * from weighing_records")).rows.length,
          0,
        );
        assert.equal((await db.query("select * from animals")).rows.length, 1);
        assert.equal((await db.query("select * from profiles")).rows.length, 1);
        const photos = await db.query<{ name: string }>(
          "select name from storage.objects",
        );
        assert.equal(photos.rows.length, 1);
        assert.ok(photos.rows[0].name.startsWith(u2));
      },
    );
    await t.test(
      "RLS bloqueia transferência de propriedade e edição de outro usuário",
      async () => {
        await asUser(u2);
        await assert.rejects(
          db.query("update animals set user_id=$1 where id=$2", [u1, a2]),
          /permission denied/,
        );
        const update = await db.query(
          "update animals set name='invadido' where id=$1 returning id",
          [a1],
        );
        assert.equal(update.rows.length, 0);
        await assert.rejects(
          db.query(
            "insert into animals(user_id,identification,species,sex) values($1,'INV','Bovino','Macho')",
            [u1],
          ),
          /row-level security/,
        );
      },
    );
    await t.test(
      "consumo e resposta da IA não podem ser forjados pelo cliente",
      async () => {
        await asUser(u1);
        await assert.rejects(
          db.exec("update analysis_usage set input_tokens=0"),
          /permission denied/,
        );
        await assert.rejects(
          db.exec("update weighing_records set estimated_weight_kg=999"),
          /permission denied/,
        );
        await assert.rejects(
          db.query("select reserve_analysis($1,$2,'hash','model',10,1000)", [
            u1,
            randomUUID(),
          ]),
          /permission denied/,
        );
      },
    );
    await t.test("cadastro, edição e exclusão de animal próprio", async () => {
      await asUser(u1);
      const result = await db.query<{ id: string }>(
        "insert into animals(user_id,identification,species,sex) values($1,'CRUD','Equino','Macho') returning id",
        [u1],
      );
      const id = result.rows[0].id;
      await db.query("update animals set name='Teste' where id=$1", [id]);
      assert.equal(
        (
          await db.query<{ name: string }>(
            "select name from animals where id=$1",
            [id],
          )
        ).rows[0].name,
        "Teste",
      );
      await db.query("delete from animals where id=$1", [id]);
      assert.equal(
        (await db.query("select * from animals where id=$1", [id])).rows.length,
        0,
      );
    });
    await t.test(
      "FK composta impede associar pesagem a animal de outro dono",
      async () => {
        await db.exec("reset role");
        await assert.rejects(
          db.query(
            "insert into weighing_records(user_id,animal_id,evidence_quality,model_name,ai_response) values($1,$2,'baixa','test','{}')",
            [u2, a1],
          ),
          /foreign key/,
        );
      },
    );
    await t.test(
      "reserva atômica aplica limite, mantém idempotência e rejeita outro payload",
      async () => {
        await db.exec("reset role");
        const request = randomUUID();
        const call = () =>
          db.query<{ result: { id: string; existing: boolean } }>(
            "select reserve_analysis($1,$2,'hash','test',1,1000) as result",
            [u1, request],
          );
        const first = await call();
        const repeat = await call();
        assert.equal(first.rows[0].result.id, repeat.rows[0].result.id);
        assert.equal(repeat.rows[0].result.existing, true);
        await assert.rejects(
          db.query("select reserve_analysis($1,$2,'changed','test',1,1000)", [
            u1,
            request,
          ]),
          /REQUEST_CONFLICT/,
        );
        await assert.rejects(
          db.query("select reserve_analysis($1,$2,'hash','test',1,1000)", [
            u1,
            randomUUID(),
          ]),
          /DAILY_LIMIT/,
        );
      },
    );
    await t.test("limite mensal é compartilhado entre usuários", async () => {
      await db.exec("reset role");
      await assert.rejects(
        db.query("select reserve_analysis($1,$2,'hash','test',10,1)", [
          u2,
          randomUUID(),
        ]),
        /GLOBAL_LIMIT/,
      );
    });
    await t.test(
      "relatórios só agregam dados do dono, com filtros e peso real",
      async () => {
        await db.exec("reset role");
        await db.query(
          "update weighing_records set actual_weight_kg=320 where id=$1",
          [w1],
        );
        await asUser(u1);
        const summary = await db.query<{
          r: {
            weighings: number;
            average: number;
            series: { actual: number }[];
          };
        }>("select report_summary() as r");
        assert.equal(summary.rows[0].r.weighings, 1);
        assert.equal(summary.rows[0].r.average, 300);
        assert.equal(summary.rows[0].r.series[0].actual, 320);
        const filtered = await db.query<{ r: { weighings: number } }>(
          "select report_summary(null,'Equino') as r",
        );
        assert.equal(filtered.rows[0].r.weighings, 0);
        await asUser(u2);
        const other = await db.query<{ r: { weighings: number } }>(
          "select report_summary() as r",
        );
        assert.equal(other.rows[0].r.weighings, 0);
      },
    );
    await t.test(
      "gravação repetida salva uma única pesagem e mantém peso real separado",
      async () => {
        await db.exec("reset role");
        await db.query(
          "update weighing_records set status='saved' where id=$1",
          [w1],
        );
        await db.query(
          "update weighing_records set status='saved' where id=$1",
          [w1],
        );
        const result = await db.query<{
          estimated_weight_kg: string;
          actual_weight_kg: string;
        }>(
          "select estimated_weight_kg,actual_weight_kg from weighing_records where id=$1",
          [w1],
        );
        assert.equal(result.rows.length, 1);
        assert.equal(Number(result.rows[0].estimated_weight_kg), 300);
        assert.equal(Number(result.rows[0].actual_weight_kg), 320);
      },
    );
    await t.test(
      "contas comuns não consultam nem atribuem privilégios administrativos",
      async () => {
        await asUser(u2);
        for (const query of [
          "select * from admin_accounts",
          "update admin_accounts set active=true",
          "select * from admin_login_limits",
          "select admin_overview()",
          "select admin_user_directory()",
        ]) {
          await assert.rejects(db.exec(query), /permission denied/);
        }
        await assert.rejects(
          db.query(
            "insert into admin_accounts(user_id,username,email) values($1,'testadmin','admin@example.test')",
            [u2],
          ),
          /permission denied/,
        );
        await assert.rejects(
          db.query("select allow_admin_login($1,$2)", [
            "a".repeat(64),
            "b".repeat(64),
          ]),
          /permission denied/,
        );
      },
    );
    await t.test(
      "limite administrativo bloqueia repetição e renova a janela no banco",
      async () => {
        await db.exec("reset role");
        for (let i = 0; i < 12; i++) {
          const r = await db.query<{ allowed: boolean }>(
            "select allow_admin_login($1,$2) as allowed",
            ["a".repeat(64), "b".repeat(64)],
          );
          assert.equal(r.rows[0].allowed, true);
        }
        const blocked = await db.query<{ allowed: boolean }>(
          "select allow_admin_login($1,$2) as allowed",
          ["c".repeat(64), "b".repeat(64)],
        );
        assert.equal(blocked.rows[0].allowed, false);
        await db.exec(
          "update admin_login_limits set window_started_at=now()-interval '16 minutes'",
        );
        const renewed = await db.query<{ allowed: boolean }>(
          "select allow_admin_login($1,$2) as allowed",
          ["a".repeat(64), "b".repeat(64)],
        );
        assert.equal(renewed.rows[0].allowed, true);
        await db.exec("delete from admin_login_limits");
        for (let i = 0; i < 30; i++) {
          const r = await db.query<{ allowed: boolean }>(
            "select allow_admin_login($1,$2) as allowed",
            ["d".repeat(64), String(i).padStart(64, "0")],
          );
          assert.equal(r.rows[0].allowed, true);
        }
        const ipBlocked = await db.query<{ allowed: boolean }>(
          "select allow_admin_login($1,$2) as allowed",
          ["d".repeat(64), "e".repeat(64)],
        );
        assert.equal(ipBlocked.rows[0].allowed, false);
      },
    );
    await t.test(
      "visão geral e diretório administrativo agregam e filtram dados corretamente",
      async () => {
        await db.exec("reset role");
        await db.query(
          "insert into admin_accounts(user_id,username,email) values($1,'testadmin','admin@example.test')",
          [u1],
        );
        await db.query(
          "update profiles set full_name='Produtor Teste',deletion_requested_at=now() where id=$1",
          [u2],
        );
        await db.exec("set role service_role");
        const overview = await db.query<{
          data: { users: number; animals: number; pending_deletions: number };
        }>("select admin_overview() as data");
        assert.equal(overview.rows[0].data.users, 1);
        assert.equal(overview.rows[0].data.animals, 2);
        assert.equal(overview.rows[0].data.pending_deletions, 1);
        const users = await db.query<{
          data: {
            total: number;
            items: { id: string; animal_count: number }[];
          };
        }>("select admin_user_directory('Produtor',1,20,true) as data");
        assert.equal(users.rows[0].data.total, 1);
        assert.equal(users.rows[0].data.items[0].id, u2);
        assert.equal(users.rows[0].data.items[0].animal_count, 1);
        const noMatch = await db.query<{ data: { total: number } }>(
          "select admin_user_directory('Inexistente',1,20) as data",
        );
        assert.equal(noMatch.rows[0].data.total, 0);
        const nextPage = await db.query<{
          data: { total: number; items: unknown[] };
        }>("select admin_user_directory('',2,1) as data");
        assert.equal(nextPage.rows[0].data.total, 1);
        assert.equal(nextPage.rows[0].data.items.length, 0);
        await db.exec("reset role");
      },
    );
  } finally {
    await db.close();
  }
});
