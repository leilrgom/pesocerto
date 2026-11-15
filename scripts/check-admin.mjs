import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { randomUUID } from "node:crypto";

const base = process.env.ADMIN_CHECK_URL;
const username = process.env.ADMIN_USERNAME,
  password = process.env.ADMIN_PASSWORD;
if (!base || !username || !password)
  throw new Error(
    "Configure ADMIN_CHECK_URL, ADMIN_USERNAME e ADMIN_PASSWORD no ambiente.",
  );
const jar = new Map();
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
let temporaryId;
async function call(
  path,
  { body, method = "GET", cookies = jar, origin = base } = {},
) {
  const response = await fetch(base + path, {
    method,
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      Cookie: [...cookies].map(([k, v]) => k + "=" + v).join("; "),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    redirect: "manual",
  });
  for (const item of response.headers.getSetCookie()) {
    const pair = item.split(";")[0],
      index = pair.indexOf("="),
      key = pair.slice(0, index),
      value = pair.slice(index + 1);
    if (!value) cookies.delete(key);
    else cookies.set(key, value);
  }
  return response;
}
function expect(value, label) {
  if (!value) throw new Error(label);
  console.log("OK: " + label);
}
try {
  expect(
    (await call("/admin/login")).status === 200,
    "página de login administrativo acessível",
  );
  const blocked = await call("/admin");
  expect(
    blocked.status === 307 &&
      blocked.headers.get("location")?.endsWith("/admin/login"),
    "painel sem sessão redireciona ao login",
  );
  expect(
    (await call("/api/admin/data")).status === 401,
    "API administrativa rejeita visitante",
  );
  expect(
    (
      await call("/api/admin/login", {
        method: "POST",
        body: { username: "teste", password: "teste" },
        origin: "https://invalid.example",
      })
    ).status === 403,
    "login rejeita origem externa",
  );
  const wrong = await call("/api/admin/login", {
    method: "POST",
    body: { username, password: "senha-incorreta-de-teste" },
  });
  expect(
    wrong.status === 401,
    "senha incorreta rejeitada (HTTP " + wrong.status + ")",
  );
  const login = await call("/api/admin/login", {
    method: "POST",
    body: { username, password },
  });
  expect(
    login.status === 200,
    "login com credenciais administrativas (HTTP " + login.status + ")",
  );
  expect(
    (await call("/admin")).status === 200,
    "painel acessível com sessão administrativa",
  );
  const overview = await call("/api/admin/data"),
    summary = await overview.json();
  expect(
    overview.ok &&
      typeof summary.users === "number" &&
      summary.username === username,
    "indicadores reais consultados",
  );
  for (const section of ["users", "usage", "deletions"]) {
    const response = await call("/api/admin/data?section=" + section),
      data = await response.json();
    expect(
      response.ok && Array.isArray(data.items),
      "seção " + section + " funcional",
    );
  }
  const email = "admin-denial-" + randomUUID() + "@example.com",
    temporaryPassword = randomUUID() + randomUUID();
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: {
      full_name: "Teste de acesso comum",
      role: "admin",
      is_admin: true,
    },
  });
  if (error) throw error;
  temporaryId = created.user.id;
  const otherJar = new Map();
  const normal = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => [...otherJar].map(([name, value]) => ({ name, value })),
        setAll: (items) => items.forEach((c) => otherJar.set(c.name, c.value)),
      },
    },
  );
  const { error: loginError } = await normal.auth.signInWithPassword({
    email,
    password: temporaryPassword,
  });
  if (loginError) throw loginError;
  expect(
    (await call("/api/admin/data", { cookies: otherJar })).status === 403,
    "conta comum bloqueada mesmo com metadados role=admin",
  );
  const deniedPage = await call("/admin", { cookies: otherJar });
  const deniedHtml = await deniedPage.text();
  const redirected =
    deniedPage.status === 307 ||
    (deniedHtml.includes('http-equiv="refresh"') &&
      deniedHtml.includes("/admin/login"));
  expect(
    redirected && !deniedHtml.includes("GERENCIAMENTO"),
    "conta comum é redirecionada sem renderizar o painel",
  );
  const { error: roleError } = await normal.from("admin_accounts").select("*");
  expect(Boolean(roleError), "banco impede leitura de contas administrativas");
  const { error: rpcError } = await normal.rpc("admin_overview");
  expect(
    Boolean(rpcError),
    "banco impede consulta direta de estatísticas administrativas",
  );
  const detail = await call("/api/admin/data?section=user&id=" + temporaryId),
    detailData = await detail.json();
  expect(
    detail.ok && detailData.profile.id === temporaryId,
    "consulta de detalhes autorizada ao administrador",
  );
  expect(
    (await call("/api/admin/logout", { method: "POST" })).ok,
    "logout administrativo concluído",
  );
  expect(
    (await call("/api/admin/data")).status === 401,
    "sessão encerrada não acessa API",
  );
} catch (error) {
  console.log("FALHOU: " + error.message);
  process.exitCode = 1;
} finally {
  if (temporaryId) {
    const { error } = await admin.auth.admin.deleteUser(temporaryId);
    if (error) {
      console.log("Falha ao limpar a conta temporária.");
      process.exitCode = 1;
    } else console.log("Conta comum temporária removida.");
  }
}
