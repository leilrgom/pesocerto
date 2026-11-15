import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/server";
import { check, failure, HttpError } from "@/lib/api";
export const runtime = "nodejs";
export async function GET(req: Request) {
  try {
    const { admin, account } = await requireAdmin();
    const p = new URL(req.url).searchParams;
    const section = p.get("section") || "overview";
    if (section === "overview") {
      const { data, error } = await admin.rpc("admin_overview");
      check(error);
      return NextResponse.json({
        ...data,
        username: account.username,
        limits: {
          daily: Number(process.env.DAILY_ANALYSIS_LIMIT || 10),
          monthly: Number(process.env.GLOBAL_MONTHLY_ANALYSIS_LIMIT || 1000),
        },
        model: process.env.OPENAI_MODEL || "Não configurado",
      });
    }
    const page = z.coerce
      .number()
      .int()
      .min(1)
      .max(100000)
      .parse(p.get("page") || 1);
    const size = 20;
    if (section === "users" || section === "deletions") {
      const search = z
        .string()
        .max(100)
        .parse(p.get("search") || "");
      const { data, error } = await admin.rpc("admin_user_directory", {
        p_search: search,
        p_page: page,
        p_size: size,
        p_deletions: section === "deletions",
      });
      check(error);
      return NextResponse.json({ ...data, page, size });
    }
    if (section === "usage") {
      const status = z
        .enum(["", "reserved", "completed", "failed"])
        .parse(p.get("status") || "");
      let query = admin
        .from("analysis_usage")
        .select(
          "id,user_id,model_name,input_tokens,output_tokens,status,created_at,profiles(full_name,email)",
          { count: "exact" },
        )
        .order("created_at", { ascending: false })
        .order("id", { ascending: false });
      if (status) query = query.eq("status", status);
      const { data, error, count } = await query.range(
        (page - 1) * size,
        page * size - 1,
      );
      check(error);
      return NextResponse.json({ items: data, total: count || 0, page, size });
    }
    if (section === "user") {
      const id = z.uuid().parse(p.get("id"));
      const { data: profile, error } = await admin
        .from("profiles")
        .select(
          "id,full_name,email,phone,farm_name,created_at,deletion_requested_at",
        )
        .eq("id", id)
        .maybeSingle();
      check(error);
      if (!profile) throw new HttpError(404, "Usuário não encontrado.");
      const [animals, records, usage] = await Promise.all([
        admin
          .from("animals")
          .select("id,identification,name,species,created_at", {
            count: "exact",
          })
          .eq("user_id", id)
          .order("created_at", { ascending: false })
          .limit(10),
        admin
          .from("weighing_records")
          .select("id,created_at,estimated_weight_kg,actual_weight_kg,status", {
            count: "exact",
          })
          .eq("user_id", id)
          .eq("status", "saved")
          .order("created_at", { ascending: false })
          .limit(10),
        admin
          .from("analysis_usage")
          .select(
            "id,status,model_name,input_tokens,output_tokens,created_at",
            { count: "exact" },
          )
          .eq("user_id", id)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);
      [animals.error, records.error, usage.error].forEach(check);
      return NextResponse.json({
        profile,
        animals: animals.data,
        animal_count: animals.count,
        records: records.data,
        record_count: records.count,
        usage: usage.data,
        analysis_count: usage.count,
      });
    }
    throw new HttpError(404, "Seção não encontrada.");
  } catch (e) {
    return failure(e);
  }
}
