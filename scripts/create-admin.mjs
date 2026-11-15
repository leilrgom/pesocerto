import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
const schema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_-]{3,64}$/),
  password: z.string().min(8).max(128),
  url: z.url(),
  key: z.string().min(10),
});
const parsed = schema.safeParse({
  username: process.env.ADMIN_USERNAME,
  password: process.env.ADMIN_PASSWORD,
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY,
});
if (!parsed.success) {
  console.error(
    "Configure ADMIN_USERNAME, ADMIN_PASSWORD e as credenciais Supabase no ambiente.",
  );
  process.exit(1);
}
const { username, password, url, key } = parsed.data;
const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data: existing, error: lookupError } = await admin
  .from("admin_accounts")
  .select("user_id")
  .eq("username", username)
  .maybeSingle();
if (lookupError) {
  console.error(
    "Não foi possível consultar administradores. Execute a migration de administração.",
  );
  process.exit(1);
}
if (existing) {
  console.error(
    "Este usuário administrativo já está cadastrado. Nenhuma senha foi alterada.",
  );
  process.exit(1);
}
const email = `admin-${randomUUID()}@admin.pesocorreto.com.br`;
const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: "Administrador" },
});
if (error) {
  console.error(
    "Não foi possível criar a conta administrativa. Código:",
    error.code || "indisponível",
  );
  process.exit(1);
}
const { error: roleError } = await admin
  .from("admin_accounts")
  .insert({ user_id: data.user.id, username, email, active: true });
if (roleError) {
  await admin.auth.admin.deleteUser(data.user.id);
  console.error(
    "Não foi possível atribuir acesso administrativo. A conta provisória foi removida.",
  );
  process.exit(1);
}
console.log(
  "Administrador criado: " +
    username +
    ". A senha não foi exibida nem gravada no código.",
);
