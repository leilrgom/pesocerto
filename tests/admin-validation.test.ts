import { test } from "node:test";
import assert from "node:assert/strict";
import { adminLoginSchema } from "../src/lib/admin/validation";
test("login administrativo normaliza usuário e valida entradas sem credenciais fixas", () => {
  assert.equal(
    adminLoginSchema.parse({
      username: " TEST_ADMIN ",
      password: "controlled-test-only",
    }).username,
    "test_admin",
  );
  for (const input of [
    { username: "aa", password: "x" },
    { username: "admin@example.test", password: "x" },
    { username: "test_admin", password: "" },
    { username: "test_admin", password: "x".repeat(129) },
    { username: "<script>", password: "x" },
  ])
    assert.equal(adminLoginSchema.safeParse(input).success, false);
});
