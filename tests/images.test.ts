import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { imageBuffer } from "../src/lib/images";
test("upload valida bytes reais e rejeita tipo, conteúdo e tamanho indevidos", async () => {
  await assert.rejects(
    imageBuffer(new File(["html"], "a.jpg", { type: "image/jpeg" })),
  );
  await assert.rejects(
    imageBuffer(new File(["svg"], "a.svg", { type: "image/svg+xml" })),
  );
  await assert.rejects(
    imageBuffer(
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], "a.png", {
        type: "image/png",
      }),
    ),
  );
  await assert.rejects(imageBuffer(null));
});
test("normaliza foto, redimensiona e remove metadados no servidor", async () => {
  const input = await sharp({
    create: { width: 2400, height: 1200, channels: 3, background: "#236341" },
  })
    .jpeg()
    .toBuffer();
  const output = await imageBuffer(
    new File([new Uint8Array(input)], "photo.jpg", { type: "image/jpeg" }),
  );
  const meta = await sharp(output).metadata();
  assert.equal(meta.format, "webp");
  assert.equal(meta.width, 1600);
  assert.equal(meta.height, 800);
  assert.equal(meta.exif, undefined);
});
