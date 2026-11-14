import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next =
    url.searchParams.get("next") === "/atualizar-senha"
      ? "/atualizar-senha"
      : "/dashboard";
  if (code) {
    const db = await serverClient();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(
    new URL("/login?erro=link-expirado", url.origin),
  );
}
