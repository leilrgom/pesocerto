export async function adminFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  }).catch(() => {
    throw new Error("Falha de conexão. Verifique sua internet.");
  });
  const data = await response.json().catch(() => {
    throw new Error("O servidor não respondeu. Tente novamente.");
  });
  if (!response.ok) {
    if (response.status === 401 && !path.endsWith("/login"))
      window.location.assign("/admin/login");
    throw new Error(data.error || "Não foi possível concluir.");
  }
  return data;
}
