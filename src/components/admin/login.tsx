"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ShieldCheck, ArrowRight, Eye, EyeOff } from "lucide-react";
import { adminFetch } from "./client";
import styles from "@/app/admin/admin.module.css";
export function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await adminFetch("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      window.location.assign("/admin");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <div className={styles.loginPage}>
      <Link href="/home" className={styles.loginBrand}>
        <img
          src="/assets/logo-correto.webp"
          alt="Peso Correto"
          width="260"
          height="95"
        />
      </Link>
      <main className={styles.loginCard}>
        <span className={styles.badge}>
          <ShieldCheck size={15} /> ACESSO ADMINISTRATIVO
        </span>
        <h1>Administração</h1>
        <p>Entre com seu usuário e senha para acompanhar a plataforma.</p>
        <form onSubmit={submit} className={styles.loginForm}>
          <label>
            Usuário
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              maxLength={64}
              placeholder="Seu usuário de administrador"
            />
          </label>
          <label>
            Senha
            <div className={styles.passwordField}>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={visible ? "text" : "password"}
                autoComplete="current-password"
                required
                maxLength={128}
              />
              <button
                type="button"
                aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
                onClick={() => setVisible((v) => !v)}
              >
                {visible ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </label>
          {error && (
            <div className={styles.error} role="alert">
              {error}
            </div>
          )}
          <button className={styles.primaryButton} disabled={busy}>
            {busy ? "Entrando..." : "Entrar na administração"}
            {!busy && <ArrowRight size={19} />}
          </button>
        </form>
        <Link href="/home" className={styles.backLink}>
          Voltar ao site
        </Link>
      </main>
      <p className={styles.loginFootnote}>
        Área exclusiva para administradores autorizados.
      </p>
    </div>
  );
}
