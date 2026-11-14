import { NextResponse } from "next/server";
import { z } from "zod";
import { species } from "@/lib/validations";
import { requireUser, check, failure } from "@/lib/api";
export async function GET(req: Request) {
  try {
    const { db } = await requireUser();
    const p = new URL(req.url).searchParams;
    const { data, error } = await db.rpc("report_summary", {
      p_animal: p.get("animal") ? z.uuid().parse(p.get("animal")) : null,
      p_species: p.get("species")
        ? z.enum(species).parse(p.get("species"))
        : null,
      p_from: p.get("from")
        ? z.iso.date().parse(p.get("from")) + "T00:00:00-03:00"
        : null,
      p_to: p.get("to")
        ? z.iso.date().parse(p.get("to")) + "T23:59:59.999-03:00"
        : null,
    });
    check(error);
    return NextResponse.json(data);
  } catch (e) {
    return failure(e);
  }
}
