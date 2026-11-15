import { z } from "zod";
export const adminLoginSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Informe seu usuário.")
    .max(64)
    .regex(/^[a-z0-9_-]+$/, "Usuário inválido."),
  password: z.string().min(1, "Informe sua senha.").max(128),
});
