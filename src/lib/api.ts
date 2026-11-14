import "server-only";
import { NextResponse } from "next/server";
import { serverClient } from "./supabase/server";
import { ZodError } from "zod";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function requireUser() {
  const db = await serverClient();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user)
    throw new HttpError(401, "Sua sessão expirou. Entre novamente.");
  return { db, user };
}
export function failure(e: unknown) {
  if (e instanceof SyntaxError)
    return NextResponse.json(
      { error: "Dados enviados inválidos." },
      { status: 400 },
    );
  if (e instanceof HttpError)
    return NextResponse.json({ error: e.message }, { status: e.status });
  if (e instanceof ZodError)
    return NextResponse.json(
      { error: e.issues.map((i) => i.message).join(" ") },
      { status: 400 },
    );
  if (e instanceof Error && e.message === "CONFIGURATION")
    return NextResponse.json(
      {
        error:
          "Serviço não configurado. Preencha as variáveis indicadas no README.",
      },
      { status: 503 },
    );
  console.error("Operação falhou:", e instanceof Error ? e.name : "unknown");
  return NextResponse.json(
    {
      error:
        "Não foi possível concluir. Verifique a conexão e tente novamente.",
    },
    { status: 500 },
  );
}
export function check(error: unknown) {
  if (error)
    throw new HttpError(
      500,
      "Não foi possível acessar os dados. Verifique a configuração e tente novamente.",
    );
}
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin)
    throw new HttpError(403, "Origem não permitida.");
}
