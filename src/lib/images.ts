import "server-only";
import sharp from "sharp";
import { HttpError } from "./api";
export async function imageBuffer(file: FormDataEntryValue | null) {
  if (
    !(file instanceof File) ||
    file.size === 0 ||
    file.size > 5 * 1024 * 1024 ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type)
  )
    throw new HttpError(400, "Envie JPEG, PNG ou WebP de até 5 MB.");
  try {
    const input = Buffer.from(await file.arrayBuffer());
    const meta = await sharp(input, { limitInputPixels: 40000000 }).metadata();
    if (
      !["jpeg", "png", "webp"].includes(meta.format || "") ||
      (meta.pages || 1) > 1
    )
      throw new Error();
    return await sharp(input, { limitInputPixels: 40000000 })
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new HttpError(
      400,
      "Fotografia inválida ou grande demais. Escolha outra imagem.",
    );
  }
}
