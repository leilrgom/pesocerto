"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { browserClient, configured } from "@/lib/supabase/browser";
import { PageTitle, Message, SetupNotice } from "./ui";
const schema = z.object({
  name: z.string(),
  email: z.email("Informe um e-mail válido."),
  password: z.string(),
  confirmation: z.string(),
});
type Fields = z.infer<typeof schema>;
export function AuthForm({
  mode,
}: {
  mode: "login" | "cadastro" | "recuperar" | "senha";
}) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (mode !== "login") return;
    const code = new URLSearchParams(location.search).get("erro");
    if (code === "sessao-expirada")
      setError("Sua sessão expirou. Entre novamente para continuar.");
    if (code === "link-expirado")
      setError("Este link é inválido ou expirou. Solicite um novo e-mail.");
  }, [mode]);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Fields>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: mode === "senha" ? "senha@local.invalid" : "",
      password: "",
      confirmation: "",
    },
  });
  const title = {
    login: "Bem-vindo de volta",
    cadastro: "Crie sua conta",
    recuperar: "Recuperar senha",
    senha: "Nova senha",
  }[mode];
  async function submit(values: Fields) {
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const db = browserClient();
      if (
        ["cadastro", "senha"].includes(mode) &&
        (values.password.length < 8 || values.password !== values.confirmation)
      )
        throw new Error("Use ao menos 8 caracteres e confirme a mesma senha.");
      if (mode === "cadastro") {
        if (values.name.trim().length < 2)
          throw new Error("Informe seu nome completo.");
        const { data, error } = await db.auth.signUp({
          email: values.email,
          password: values.password,
          options: {
            data: { full_name: values.name.trim() },
            emailRedirectTo: location.origin + "/auth/callback",
          },
        });
        if (error) throw error;
        if (data.session) location.assign("/dashboard");
        else
          setSuccess("Confira seu e-mail para confirmar o cadastro e entrar.");
      }
      if (mode === "login") {
        const { error } = await db.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });
        if (error)
          throw new Error(
            "E-mail ou senha inválidos. Verifique também a confirmação do e-mail.",
          );
        const next = new URLSearchParams(location.search).get("next");
        location.assign(
          next &&
            /^\/(animais|pesagem|registros|relatorios|perfil|notificacoes)(\/|$)/.test(
              next,
            )
            ? next
            : "/dashboard",
        );
      }
      if (mode === "recuperar") {
        const { error } = await db.auth.resetPasswordForEmail(values.email, {
          redirectTo: location.origin + "/auth/callback?next=/atualizar-senha",
        });
        if (error) throw error;
        setSuccess(
          "Se houver uma conta com esse e-mail, você receberá um link para redefinir a senha.",
        );
      }
      if (mode === "senha") {
        const {
          data: { user },
        } = await db.auth.getUser();
        if (!user)
          throw new Error(
            "O link expirou. Solicite novamente a recuperação de senha.",
          );
        const { error } = await db.auth.updateUser({
          password: values.password,
        });
        if (error) throw error;
        setSuccess("Senha atualizada. Você já pode continuar.");
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível acessar a conta.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle title={title} subtitle="Peso certo. Decisão certa." />
      {!configured() ? (
        <SetupNotice />
      ) : (
        <div className="panel">
          <form className="stack" onSubmit={handleSubmit(submit)}>
            {mode === "cadastro" && (
              <label>
                Nome completo
                <input
                  autoComplete="name"
                  {...register("name")}
                  required
                  maxLength={120}
                />
              </label>
            )}
            {mode !== "senha" && (
              <label>
                E-mail
                <input
                  type="email"
                  autoComplete="email"
                  {...register("email")}
                  required
                />
                {errors.email && (
                  <span className="field-error">{errors.email.message}</span>
                )}
              </label>
            )}
            {mode !== "recuperar" && (
              <label>
                Senha
                <input
                  type="password"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  {...register("password")}
                  minLength={mode === "login" ? 1 : 8}
                  required
                  maxLength={128}
                />
              </label>
            )}
            {["cadastro", "senha"].includes(mode) && (
              <label>
                Confirmar senha
                <input
                  type="password"
                  autoComplete="new-password"
                  {...register("confirmation")}
                  required
                  maxLength={128}
                />
              </label>
            )}
            {error && <Message error>{error}</Message>}
            {success && <Message>{success}</Message>}
            <button className="button full" disabled={busy}>
              {busy
                ? "Aguarde..."
                : {
                    login: "Entrar",
                    cadastro: "Criar conta",
                    recuperar: "Enviar link de recuperação",
                    senha: "Atualizar senha",
                  }[mode]}
            </button>
          </form>
          <div className="auth-footer">
            {mode === "login" ? (
              <>
                <Link className="text-link" href="/cadastro">
                  Criar conta
                </Link>
                <Link className="text-link" href="/recuperar-senha">
                  Esqueci a senha
                </Link>
              </>
            ) : (
              <Link
                className="text-link"
                href={success && mode === "senha" ? "/dashboard" : "/login"}
              >
                {success && mode === "senha" ? "Continuar" : "Voltar ao login"}
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
