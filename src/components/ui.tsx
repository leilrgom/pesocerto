"use client";
import Link from "next/link";
import {
  AlertCircle,
  LoaderCircle,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
export function PageTitle({
  title,
  subtitle,
  back = "/dashboard",
}: {
  title: string;
  subtitle?: string;
  back?: string;
}) {
  return (
    <div className="page-heading">
      <Link href={back} aria-label="Voltar" className="icon-button">
        <ArrowLeft size={22} />
      </Link>
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </div>
  );
}
export function Message({
  children,
  error = false,
}: {
  children: React.ReactNode;
  error?: boolean;
}) {
  return (
    <div
      role={error ? "alert" : "status"}
      className={`message ${error ? "error" : "success"}`}
    >
      {error ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
      <span>{children}</span>
    </div>
  );
}
export function Loading({ text = "Carregando..." }: { text?: string }) {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" />
      {text}
    </div>
  );
}
export function Empty({
  title,
  text,
  href,
  label,
}: {
  title: string;
  text: string;
  href?: string;
  label?: string;
}) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      <p>{text}</p>
      {href && (
        <Link className="button" href={href}>
          {label}
        </Link>
      )}
    </div>
  );
}
export function Confirm({
  title,
  text,
  onConfirm,
  onCancel,
  busy = false,
}: {
  title: string;
  text: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  return (
    <div className="modal-backdrop">
      <div
        className="modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <h2 id="confirm-title">{title}</h2>
        <p>{text}</p>
        <div className="button-row">
          <button
            className="button secondary"
            onClick={onCancel}
            disabled={busy}
          >
            Cancelar
          </button>
          <button className="button danger" onClick={onConfirm} disabled={busy}>
            {busy ? "Excluindo..." : "Confirmar exclusão"}
          </button>
        </div>
      </div>
    </div>
  );
}
export function SetupNotice() {
  return (
    <div className="panel">
      <h2>Configure sua conexão</h2>
      <p>
        O Supabase ainda não está configurado neste ambiente. Preencha as
        variáveis de <code>.env.local</code> e execute a migration conforme o
        README para habilitar sua conta e os dados privados.
      </p>
      <Link className="button" href="/dashboard">
        Voltar ao início
      </Link>
    </div>
  );
}
