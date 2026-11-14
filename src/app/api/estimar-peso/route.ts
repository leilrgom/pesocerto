import { NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { requireUser, failure, check, HttpError, sameOrigin } from "@/lib/api";
import { adminClient } from "@/lib/supabase/server";
import { imageBuffer } from "@/lib/images";
import { measurementsSchema } from "@/lib/validations";
import { analyze } from "@/lib/openai/analyze";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(req: Request) {
  let usageId: string | undefined;
  const uploaded: string[] = [];
  let recordId: string | undefined;
  try {
    sameOrigin(req);
    const { db, user } = await requireUser();
    if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_MODEL)
      throw new HttpError(503, "A análise por IA ainda não foi configurada.");
    if (Number(req.headers.get("content-length") || 0) > 4 * 1024 * 1024)
      throw new HttpError(413, "Fotografias grandes demais.");
    const form = await req.formData();
    const animalId = z.uuid().parse(form.get("animal_id"));
    const requestId = z.uuid().parse(form.get("request_id"));
    const measurements = measurementsSchema.parse(
      JSON.parse(String(form.get("measurements") || "{}")),
    );
    const { data: animal, error } = await db
      .from("animals")
      .select("*")
      .eq("id", animalId)
      .eq("user_id", user.id)
      .single();
    if (error || !animal) throw new HttpError(404, "Animal não encontrado.");
    const images = [await imageBuffer(form.get("photo"))];
    if (
      form.get("photo2") instanceof File &&
      (form.get("photo2") as File).size > 0
    )
      images.push(await imageBuffer(form.get("photo2")));
    const hash = createHash("sha256").update(
      JSON.stringify({ animalId, measurements }),
    );
    images.forEach((i) => hash.update(i));
    const admin = adminClient();
    const daily = z.coerce
      .number()
      .int()
      .positive()
      .parse(process.env.DAILY_ANALYSIS_LIMIT || 10);
    const monthly = z.coerce
      .number()
      .int()
      .positive()
      .parse(process.env.GLOBAL_MONTHLY_ANALYSIS_LIMIT || 1000);
    const { data: reservation, error: quotaError } = await admin.rpc(
      "reserve_analysis",
      {
        p_user: user.id,
        p_request: requestId,
        p_hash: hash.digest("hex"),
        p_model: process.env.OPENAI_MODEL,
        p_daily: daily,
        p_monthly: monthly,
      },
    );
    if (quotaError) {
      if (quotaError.message.includes("DAILY_LIMIT"))
        throw new HttpError(
          429,
          "Limite diário de análises atingido. Tente amanhã.",
        );
      if (quotaError.message.includes("GLOBAL_LIMIT"))
        throw new HttpError(429, "Limite mensal do serviço atingido.");
      if (quotaError.message.includes("REQUEST_CONFLICT"))
        throw new HttpError(
          409,
          "Esta tentativa já foi usada para outra fotografia. Inicie nova pesagem.",
        );
      check(quotaError);
    }
    if (reservation.existing) {
      if (reservation.status === "completed" && reservation.weighing_id) {
        const { data, error } = await db
          .from("weighing_records")
          .select("*")
          .eq("id", reservation.weighing_id)
          .single();
        check(error);
        return NextResponse.json(data);
      }
      throw new HttpError(
        409,
        reservation.status === "reserved"
          ? "Análise já recebida. Aguarde e consulte novamente."
          : "Essa tentativa falhou. Inicie uma nova análise.",
      );
    }
    usageId = reservation.id;
    const id = randomUUID();
    for (let i = 0; i < images.length; i++) {
      const path = `${user.id}/weighings/${id}/${i === 0 ? "lateral" : "traseira"}.webp`;
      const { error } = await admin.storage
        .from("weighing-photos")
        .upload(path, images[i], { contentType: "image/webp", upsert: false });
      check(error);
      uploaded.push(path);
    }
    const { result, model } = await analyze(
      images,
      {
        animal: {
          species: animal.species,
          breed: animal.breed,
          sex: animal.sex,
          approximate_age_months: animal.approximate_age_months,
          birth_date: animal.birth_date,
          reference_weight_kg: animal.reference_weight_kg,
        },
        measurements,
      },
      undefined,
      async (usage) => {
        const { error } = await admin
          .from("analysis_usage")
          .update({
            input_tokens: usage?.input_tokens || 0,
            output_tokens: usage?.output_tokens || 0,
          })
          .eq("id", usageId);
        check(error);
      },
    ).catch(() => {
      throw new HttpError(
        502,
        "A IA está indisponível ou retornou uma resposta inválida. Nenhum peso foi gerado.",
      );
    });
    const record = {
      id,
      user_id: user.id,
      animal_id: animalId,
      estimated_weight_kg: result.peso_estimado_kg,
      minimum_weight_kg: result.peso_minimo_kg,
      maximum_weight_kg: result.peso_maximo_kg,
      evidence_quality: result.qualidade_evidencia,
      model_name: process.env.OPENAI_MODEL,
      model_version: model,
      ai_response: result,
      status: "draft",
      estimation_method: "IA experimental",
    };
    const { data, error: saveError } = await admin
      .from("weighing_records")
      .insert(record)
      .select()
      .single();
    check(saveError);
    recordId = id;
    const { error: photosError } = await admin.from("weighing_photos").insert(
      uploaded.map((storage_path, i) => ({
        user_id: user.id,
        weighing_id: id,
        storage_path,
        photo_type: i === 0 ? "lateral" : "traseira",
      })),
    );
    check(photosError);
    const { error: finishError } = await admin
      .from("analysis_usage")
      .update({ status: "completed", weighing_id: id })
      .eq("id", usageId);
    check(finishError);
    await admin.from("notifications").insert({
      user_id: user.id,
      title: "Análise concluída",
      message: result.estimativa_disponivel
        ? "Sua estimativa experimental está pronta para revisão."
        : "Evidências insuficientes. Consulte as recomendações.",
    });
    return NextResponse.json(data);
  } catch (e) {
    if (usageId) {
      const admin = adminClient();
      if (recordId)
        await admin.from("weighing_records").delete().eq("id", recordId);
      if (uploaded.length)
        await admin.storage.from("weighing-photos").remove(uploaded);
      await admin
        .from("analysis_usage")
        .update({ status: "failed" })
        .eq("id", usageId);
      const { data } = await admin
        .from("analysis_usage")
        .select("user_id")
        .eq("id", usageId)
        .single();
      if (data)
        await admin.from("notifications").insert({
          user_id: data.user_id,
          title: "Falha na análise",
          message:
            "Não foi possível concluir a análise. A tentativa foi contabilizada.",
        });
    }
    if (e instanceof SyntaxError)
      return failure(new HttpError(400, "Informações inválidas."));
    return failure(e);
  }
}
