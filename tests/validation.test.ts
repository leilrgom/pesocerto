import { test } from "node:test";
import assert from "node:assert/strict";
import {
  animalSchema,
  validatedAiSchema,
  measurementsSchema,
} from "../src/lib/validations";
import { csvCell } from "../src/lib/client";
const valid = {
  estimativa_disponivel: true,
  especie_identificada: "Bovino",
  raca_aparente: null,
  peso_estimado_kg: 300,
  peso_minimo_kg: 200,
  peso_maximo_kg: 400,
  qualidade_evidencia: "baixa",
  condicao_corporal: null,
  observacoes: "Apenas um dado de teste controlado.",
  recomendacoes: [],
};
test("aceita faixa consistente e rejeita peso negativo, nulo ou fora da faixa", () => {
  assert.ok(validatedAiSchema.safeParse(valid).success);
  for (const patch of [
    { peso_estimado_kg: -1 },
    { peso_estimado_kg: null },
    { peso_minimo_kg: 301 },
    { peso_maximo_kg: 299 },
    { especie_identificada: "Cão" },
    { especie_identificada: "Não identificada" },
    { qualidade_evidencia: "99%" },
    { peso_estimado_kg: Infinity },
  ])
    assert.equal(
      validatedAiSchema.safeParse({ ...valid, ...patch }).success,
      false,
    );
});
test("ausência de evidência exige todos os pesos nulos", () => {
  assert.equal(
    validatedAiSchema.safeParse({ ...valid, estimativa_disponivel: false })
      .success,
    false,
  );
  assert.ok(
    validatedAiSchema.safeParse({
      ...valid,
      estimativa_disponivel: false,
      especie_identificada: "Não identificada",
      peso_estimado_kg: null,
      peso_minimo_kg: null,
      peso_maximo_kg: null,
      qualidade_evidencia: "insuficiente",
    }).success,
  );
});
test("rejeita resposta incompleta e dados de animal inválidos", () => {
  assert.equal(
    validatedAiSchema.safeParse({ estimativa_disponivel: true }).success,
    false,
  );
  assert.equal(
    animalSchema.safeParse({ identification: "", species: "Cão", sex: "Outro" })
      .success,
    false,
  );
});
test("medidas são opcionais, limitadas e não inventadas", () => {
  const result = measurementsSchema.parse({});
  assert.equal(result.thoracic_cm, null);
  assert.equal(result.previous_weight_kg, null);
  assert.equal(
    measurementsSchema.safeParse({ thoracic_cm: 5000 }).success,
    false,
  );
});
test("CSV escapa aspas, separadores e fórmulas de planilha", () => {
  assert.equal(csvCell('a;"b'), '"a;""b"');
  assert.equal(csvCell('=HYPERLINK("evil")'), '"\'=HYPERLINK(""evil"")"');
  assert.equal(csvCell("  +1"), '"\'  +1"');
  assert.equal(csvCell(42), '"42"');
});
