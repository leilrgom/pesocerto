export async function api<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers:
        init?.body instanceof FormData
          ? init.headers
          : { "Content-Type": "application/json", ...init?.headers },
      cache: "no-store",
    });
  } catch {
    throw new Error("Falha de conexão. Verifique sua internet.");
  }
  const data = await response.json().catch(() => {
    throw new Error(
      response.status === 413
        ? "Fotografias grandes demais. Reduza o tamanho e tente novamente."
        : "O serviço não respondeu. Tente novamente.",
    );
  });
  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined")
      window.location.assign("/login?erro=sessao-expirada");
    throw new Error(data.error || "Não foi possível concluir.");
  }
  if (typeof window !== "undefined" && init?.method && init.method !== "GET")
    window.dispatchEvent(new Event("notifications-updated"));
  return data;
}
export function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[\s]*[=+@\-\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export const dateLabel = (date: string) =>
  new Date(date).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
export const weightLabel = (value: number | null | undefined) =>
  value == null
    ? "Indisponível"
    : `${Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg`;
export async function compressImage(file: File) {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 15 * 1024 * 1024
  )
    throw new Error("Escolha JPEG, PNG ou WebP de até 15 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas
      .getContext("2d")!
      .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.82),
    );
    if (!blob || blob.size > 5 * 1024 * 1024)
      throw new Error("Não foi possível compactar a imagem.");
    return new File([blob], "foto.webp", { type: "image/webp" });
  } finally {
    bitmap.close();
  }
}
