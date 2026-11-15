import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { adminClient, serverClient } from "@/lib/supabase/server";
import { adminLoginSchema } from "@/lib/admin/validation";
import { failure, HttpError, check, sameOrigin } from "@/lib/api";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    if (Number(req.headers.get("content-length") || 0) > 2048)
      throw new HttpError(413, "Dados de acesso inválidos.");
    const { username, password } = adminLoginSchema.parse(await req.json());
    const admin = adminClient();
    const hash = (value: string) =>
      createHash("sha256")
        .update(process.env.SUPABASE_SERVICE_ROLE_KEY! + ":" + value)
        .digest("hex");
    const ip =
      req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const { data: allowed, error: limitError } = await admin.rpc(
      "allow_admin_login",
      { p_ip_hash: hash(ip), p_username_hash: hash(username) },
    );
    check(limitError);
    if (!allowed)
      throw new HttpError(
        429,
        "Muitas tentativas de acesso. Aguarde 15 minutos e tente novamente.",
      );
    const { data: account, error: accountError } = await admin
      .from("admin_accounts")
      .select("user_id,email")
      .eq("username", username)
      .eq("active", true)
      .maybeSingle();
    check(accountError);
    if (!account) throw new HttpError(401, "Usuário ou senha inválidos.");
    const db = await serverClient();
    const { data, error } = await db.auth.signInWithPassword({
      email: account.email,
      password,
    });
    if (error || !data.user)
      throw new HttpError(401, "Usuário ou senha inválidos.");
    if (data.user.id !== account.user_id) {
      await db.auth.signOut();
      throw new HttpError(403, "Acesso não autorizado.");
    }
    return NextResponse.json(
      { ok: true, redirect: "/admin" },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
