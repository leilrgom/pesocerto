import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, failure, check, HttpError, sameOrigin } from "@/lib/api";
import { adminClient } from "@/lib/supabase/server";
import { animalSchema, species } from "@/lib/validations";
export const runtime = "nodejs";
type Context = { params: Promise<{ resource: string }> };
const resources = ["animals", "records", "profile", "notifications", "usage"];
export async function GET(req: Request, ctx: Context) {
  try {
    const { resource } = await ctx.params;
    if (!resources.includes(resource))
      throw new HttpError(404, "Página não encontrada.");
    const { db, user } = await requireUser();
    const url = new URL(req.url);
    const p = url.searchParams;
    if (resource === "profile") {
      const { data, error } = await db
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      check(error);
      return NextResponse.json(data);
    }
    if (resource === "usage") {
      const start = new Date(
        new Date().toLocaleDateString("en-CA", {
          timeZone: "America/Sao_Paulo",
        }) + "T00:00:00-03:00",
      );
      const { count, error } = await db
        .from("analysis_usage")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", start.toISOString());
      check(error);
      return NextResponse.json({
        used: count || 0,
        limit: Number(process.env.DAILY_ANALYSIS_LIMIT || 10),
      });
    }
    if (resource === "notifications") {
      const { data, error } = await db
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      check(error);
      return NextResponse.json(data);
    }
    const page = z.coerce
      .number()
      .int()
      .min(1)
      .max(100000)
      .parse(p.get("page") || 1);
    const size = z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .parse(p.get("size") || 20);
    const table = resource === "animals" ? "animals" : "weighing_records";
    let q = db
      .from(table)
      .select(
        resource === "animals"
          ? "*"
          : "*, animals!inner(*), weighing_photos(storage_path)",
        { count: "exact" },
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (resource === "records") q = q.eq("status", "saved");
    const search = (p.get("search") || "")
      .replace(/[^\p{L}\p{N} _-]/gu, "")
      .slice(0, 80);
    if (search)
      q =
        resource === "animals"
          ? q.or(`identification.ilike.%${search}%,name.ilike.%${search}%`)
          : q.ilike("animals.identification", `%${search}%`);
    if (p.get("species"))
      q = q.eq(
        resource === "animals" ? "species" : "animals.species",
        z.enum(species).parse(p.get("species")),
      );
    if (p.get("animal"))
      q = q.eq(
        resource === "animals" ? "id" : "animal_id",
        z.uuid().parse(p.get("animal")),
      );
    if (p.get("from"))
      q = q.gte(
        "created_at",
        z.iso.date().parse(p.get("from")) + "T00:00:00-03:00",
      );
    if (p.get("to"))
      q = q.lte(
        "created_at",
        z.iso.date().parse(p.get("to")) + "T23:59:59.999-03:00",
      );
    const { data, error, count } = await q.range(
      (page - 1) * size,
      page * size - 1,
    );
    check(error);
    const items = await Promise.all(
      (data || []).map(async (row) => {
        const r = row as unknown as Record<string, unknown>;
        const path =
          resource === "animals"
            ? r.photo_path
            : (r.weighing_photos as { storage_path: string }[])?.[0]
                ?.storage_path;
        let photo_url = null;
        if (typeof path === "string" && path.startsWith(user.id + "/")) {
          const { data } = await db.storage
            .from(resource === "animals" ? "animal-photos" : "weighing-photos")
            .createSignedUrl(path, 600);
          photo_url = data?.signedUrl;
        }
        return { ...r, photo_url };
      }),
    );
    return NextResponse.json({ items, total: count || 0, page, size });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request, ctx: Context) {
  try {
    sameOrigin(req);
    const { resource } = await ctx.params;
    if (resource !== "animals")
      throw new HttpError(405, "Operação não permitida.");
    const { db, user } = await requireUser();
    const fields = animalSchema.parse(await req.json());
    const { data, error } = await db
      .from("animals")
      .insert({
        ...fields,
        birth_date: fields.birth_date || null,
        user_id: user.id,
      })
      .select()
      .single();
    if (error?.code === "23505")
      throw new HttpError(409, "Já existe um animal com esta identificação.");
    check(error);
    await adminClient()
      .from("notifications")
      .insert({
        user_id: user.id,
        title: "Animal cadastrado",
        message: `${fields.identification} foi adicionado aos seus animais.`,
      });
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return failure(e);
  }
}
export async function PATCH(req: Request, ctx: Context) {
  try {
    sameOrigin(req);
    const { resource } = await ctx.params;
    const { db, user } = await requireUser();
    const body = await req.json();
    if (resource === "profile") {
      const data = z
        .object({
          full_name: z.string().trim().min(2).max(120),
          phone: z.string().max(30),
          farm_name: z.string().max(120),
          deletion_requested_at: z.string().datetime().nullable().optional(),
        })
        .parse(body);
      const { error } = await db
        .from("profiles")
        .update(data)
        .eq("id", user.id);
      check(error);
      return NextResponse.json({ ok: true });
    }
    if (resource === "notifications") {
      const { error } = await db
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("read_at", null);
      check(error);
      return NextResponse.json({ ok: true });
    }
    const id = z.uuid().parse(body.id);
    if (resource === "animals") {
      const fields = animalSchema.parse(body);
      const { data, error } = await db
        .from("animals")
        .update({ ...fields, birth_date: fields.birth_date || null })
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();
      if (error?.code === "23505")
        throw new HttpError(409, "Identificação já cadastrada.");
      check(error);
      return NextResponse.json(data);
    }
    if (resource === "records") {
      const patch = z
        .object({
          status: z.literal("saved").optional(),
          actual_weight_kg: z
            .number()
            .positive()
            .max(10000)
            .nullable()
            .optional(),
          notes: z.string().max(3000).optional(),
        })
        .parse(body);
      if (!Object.keys(patch).length)
        throw new HttpError(400, "Informe uma alteração.");
      const admin = adminClient();
      const { data: before } = await db
        .from("weighing_records")
        .select("status")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();
      if (!before) throw new HttpError(404, "Pesagem não encontrada.");
      const { data, error } = await admin
        .from("weighing_records")
        .update(patch)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();
      check(error);
      if (patch.status === "saved" && before.status !== "saved")
        await admin
          .from("notifications")
          .insert({
            user_id: user.id,
            title: "Pesagem salva",
            message:
              "O registro já está disponível no histórico e nos relatórios.",
          });
      return NextResponse.json(data);
    }
    throw new HttpError(405, "Operação não permitida.");
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(req: Request, ctx: Context) {
  try {
    sameOrigin(req);
    const { resource } = await ctx.params;
    if (!["animals", "records"].includes(resource))
      throw new HttpError(405, "Operação não permitida.");
    const { db, user } = await requireUser();
    const id = z.uuid().parse(new URL(req.url).searchParams.get("id"));
    const table = resource === "animals" ? "animals" : "weighing_records";
    const { data: owned } = await db
      .from(table)
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (!owned) throw new HttpError(404, "Registro não encontrado.");
    const admin = adminClient();
    let photoQuery = admin
      .from("weighing_photos")
      .select("storage_path,weighing_records!inner(animal_id)")
      .eq("user_id", user.id);
    photoQuery =
      resource === "animals"
        ? photoQuery.eq("weighing_records.animal_id", id)
        : photoQuery.eq("weighing_id", id);
    const { data: photos, error: photoError } = await photoQuery;
    check(photoError);
    if (photos?.length) {
      const { error } = await admin.storage
        .from("weighing-photos")
        .remove(photos.map((p) => p.storage_path));
      check(error);
    }
    if (resource === "animals" && owned.photo_path) {
      const { error } = await admin.storage
        .from("animal-photos")
        .remove([owned.photo_path]);
      check(error);
    }
    const { error } = await admin
      .from(table)
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    check(error);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
