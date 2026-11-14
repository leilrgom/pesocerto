import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireUser, check, failure, HttpError, sameOrigin } from "@/lib/api";
import { imageBuffer } from "@/lib/images";
import { adminClient } from "@/lib/supabase/server";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const { db, user } = await requireUser();
    if (Number(req.headers.get("content-length") || 0) > 6 * 1024 * 1024)
      throw new HttpError(413, "Arquivo grande demais.");
    const form = await req.formData();
    const id = z.uuid().parse(form.get("animal_id"));
    const { data: animal } = await db
      .from("animals")
      .select("id,photo_path")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (!animal) throw new HttpError(404, "Animal não encontrado.");
    const buffer = await imageBuffer(form.get("photo"));
    const admin = adminClient();
    const path = `${user.id}/animals/${id}/${randomUUID()}.webp`;
    const { error } = await admin.storage
      .from("animal-photos")
      .upload(path, buffer, { contentType: "image/webp" });
    check(error);
    const { error: saveError } = await admin
      .from("animals")
      .update({ photo_path: path })
      .eq("id", id)
      .eq("user_id", user.id);
    if (saveError) {
      await admin.storage.from("animal-photos").remove([path]);
      check(saveError);
    }
    if (animal.photo_path)
      await admin.storage.from("animal-photos").remove([animal.photo_path]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
