import { test } from "node:test";
import assert from "node:assert/strict";
import { sameOrigin } from "../src/lib/api";
test("valida a origem do navegador pelo host público, mesmo com bind interno diferente", () => {
  assert.doesNotThrow(() =>
    sameOrigin(
      new Request("http://0.0.0.0:3000/api/admin/login", {
        headers: { host: "localhost:3000", origin: "http://localhost:3000" },
      }),
    ),
  );
  assert.doesNotThrow(() =>
    sameOrigin(
      new Request("https://internal.example/api/admin/login", {
        headers: {
          host: "www.example.test",
          "x-forwarded-proto": "https",
          origin: "https://www.example.test",
        },
      }),
    ),
  );
});
test("origem externa, protocolo divergente e origem inválida são rejeitados", () => {
  for (const origin of [
    "https://evil.example",
    "http://www.example.test",
    "null",
  ])
    assert.throws(
      () =>
        sameOrigin(
          new Request("https://www.example.test/api/admin/login", {
            headers: { host: "www.example.test", origin },
          }),
        ),
      /Origem não permitida/,
    );
});
