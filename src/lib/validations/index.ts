import { z } from "zod";
export const species = [
  "Bovino",
  "Suíno",
  "Ovino",
  "Caprino",
  "Equino",
] as const;
const optionalNumber = (max: number) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().positive().max(max).nullable(),
  );
export const animalSchema = z.object({
  identification: z.string().trim().min(1, "Informe a identificação.").max(80),
  name: z.string().trim().max(100).default(""),
  species: z.enum(species),
  breed: z.string().trim().max(100).default(""),
  sex: z.enum(["Macho", "Fêmea", "Não informado"]),
  birth_date: z
    .union([z.iso.date(), z.literal("")])
    .nullable()
    .optional(),
  approximate_age_months: optionalNumber(1200).refine(
    (v) => v === null || Number.isInteger(v),
    "Informe a idade em meses inteiros.",
  ),
  reference_weight_kg: optionalNumber(10000),
  notes: z.string().max(3000).default(""),
});
export const measurementsSchema = z.object({
  thoracic_cm: optionalNumber(1000),
  body_length_cm: optionalNumber(1000),
  previous_weight_kg: optionalNumber(10000),
  body_condition: z.string().max(200).default(""),
});
export const aiSchema = z.object({
  estimativa_disponivel: z.boolean(),
  especie_identificada: z.enum([...species, "Não identificada"]),
  raca_aparente: z.string().nullable(),
  peso_estimado_kg: z.number().nullable(),
  peso_minimo_kg: z.number().nullable(),
  peso_maximo_kg: z.number().nullable(),
  qualidade_evidencia: z.enum(["baixa", "moderada", "alta", "insuficiente"]),
  condicao_corporal: z.string().nullable(),
  observacoes: z.string(),
  recomendacoes: z.array(z.string()),
});
export const validatedAiSchema = aiSchema.superRefine((r, ctx) => {
  const weights = [r.peso_estimado_kg, r.peso_minimo_kg, r.peso_maximo_kg];
  if (!r.estimativa_disponivel) {
    if (weights.some((w) => w !== null))
      ctx.addIssue({
        code: "custom",
        message: "Pesos devem ser nulos sem estimativa.",
      });
    return;
  }
  if (
    r.especie_identificada === "Não identificada" ||
    weights.some((w) => w === null || w <= 0 || w > 10000) ||
    r.peso_minimo_kg! > r.peso_estimado_kg! ||
    r.peso_maximo_kg! < r.peso_estimado_kg!
  )
    ctx.addIssue({ code: "custom", message: "Faixa de peso inválida." });
});
export type AiResult = z.infer<typeof aiSchema>;
export type Animal = z.infer<typeof animalSchema> & {
  id: string;
  photo_path: string | null;
  photo_url?: string | null;
  created_at: string;
};
export type Weighing = {
  id: string;
  animal_id: string;
  estimated_weight_kg: number | null;
  minimum_weight_kg: number | null;
  maximum_weight_kg: number | null;
  actual_weight_kg: number | null;
  estimation_method: string;
  evidence_quality: string;
  status: string;
  notes: string | null;
  created_at: string;
  ai_response: AiResult;
  animals: Animal;
  photo_url?: string | null;
};
