import { test } from "node:test";
import assert from "node:assert/strict";
import OpenAI from "openai";
import { analyze } from "../src/lib/openai/analyze";
const result = {
  estimativa_disponivel: true,
  especie_identificada: "Bovino",
  raca_aparente: null,
  peso_estimado_kg: 300,
  peso_minimo_kg: 200,
  peso_maximo_kg: 400,
  qualidade_evidencia: "baixa",
  condicao_corporal: null,
  observacoes: "Somente teste controlado.",
  recomendacoes: [],
};
function mockClient(
  output: unknown,
  options: { status?: string; http?: number } = {},
) {
  let calls = 0;
  let request: Record<string, unknown> | undefined;
  return {
    client: new OpenAI({
      apiKey: "test-only",
      maxRetries: 0,
      fetch: async (_url, init) => {
        calls++;
        request = JSON.parse(String(init?.body));
        if (options.http)
          return new Response(
            JSON.stringify({
              error: { message: "Controlled failure", type: "server_error" },
            }),
            {
              status: options.http,
              headers: { "Content-Type": "application/json" },
            },
          );
        return new Response(
          JSON.stringify({
            id: "resp_test",
            object: "response",
            created_at: 0,
            status: options.status || "completed",
            model: "controlled-test-model",
            output: [
              {
                id: "msg_test",
                type: "message",
                role: "assistant",
                status: "completed",
                content: [
                  {
                    type: "output_text",
                    text: JSON.stringify(output),
                    annotations: [],
                  },
                ],
              },
            ],
            usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 },
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    }),
    get calls() {
      return calls;
    },
    get request() {
      return request;
    },
  };
}
test("SDK oficial Responses: imagem, schema estrito, store false e consumo com transporte controlado", async () => {
  process.env.OPENAI_MODEL = "test-model";
  const mock = mockClient(result);
  const response = await analyze(
    [Buffer.from("test-image")],
    { species: "Bovino" },
    mock.client,
  );
  assert.equal(response.result.peso_estimado_kg, 300);
  assert.equal(response.usage?.input_tokens, 100);
  assert.equal(mock.calls, 1);
  assert.equal(mock.request?.store, false);
  assert.equal(mock.request?.model, "test-model");
  const text = mock.request?.text as {
    format: { type: string; strict: boolean };
  };
  assert.equal(text.format.type, "json_schema");
  assert.equal(text.format.strict, true);
  assert.match(JSON.stringify(mock.request?.input), /input_image/);
});
test("resposta inválida ou incompleta não produz estimativa", async () => {
  for (const output of [
    { ...result, peso_minimo_kg: 500 },
    { estimativa_disponivel: true },
  ]) {
    const mock = mockClient(output);
    await assert.rejects(analyze([], {}, mock.client));
    assert.equal(mock.calls, 1);
  }
  const mock = mockClient(result, { status: "incomplete" });
  await assert.rejects(analyze([], {}, mock.client));
});
test("falha da OpenAI não é repetida automaticamente", async () => {
  const mock = mockClient(null, { http: 500 });
  await assert.rejects(analyze([], {}, mock.client));
  assert.equal(mock.calls, 1);
});
test("evidência insuficiente retorna pesos nulos sem fallback fictício", async () => {
  const mock = mockClient({
    ...result,
    estimativa_disponivel: false,
    peso_estimado_kg: null,
    peso_minimo_kg: null,
    peso_maximo_kg: null,
    qualidade_evidencia: "insuficiente",
  });
  const response = await analyze([], {}, mock.client);
  assert.equal(response.result.estimativa_disponivel, false);
  assert.equal(response.result.peso_estimado_kg, null);
});

test("consumo de resposta inválida é registrado antes da validação do peso", async () => {
  const mock = mockClient({ ...result, peso_minimo_kg: 500 });
  let tokens = 0;
  await assert.rejects(
    analyze([], {}, mock.client, async (usage) => {
      tokens = usage?.input_tokens || 0;
    }),
  );
  assert.equal(tokens, 100);
});
