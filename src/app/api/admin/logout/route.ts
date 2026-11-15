import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";
import { failure, check, sameOrigin } from "@/lib/api";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const db = await serverClient();
    const { error } = await db.auth.signOut();
    check(error);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
