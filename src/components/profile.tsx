"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { api } from "@/lib/client";
import { browserClient, configured } from "@/lib/supabase/browser";
import { PageTitle, Message, Loading, SetupNotice } from "./ui";
type Profile = {
  full_name: string;
  email: string;
  phone: string;
  farm_name: string;
  deletion_requested_at: string | null;
};
export function Profile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(
    null,
  );
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    if (!configured()) return;
    let active = true;
    Promise.all([
      api<Profile>("/api/data/profile"),
      api<{ used: number; limit: number }>("/api/data/usage"),
    ])
      .then(([p, u]) => {
        if (active) {
          setProfile(p);
          setUsage(u);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  async function save(deletion = false) {
    if (!profile) return;
    setBusy(true);
    setError("");
    try {
      const updated = {
        full_name: profile.full_name,
        phone: profile.phone,
        farm_name: profile.farm_name,
        ...(deletion
          ? { deletion_requested_at: new Date().toISOString() }
          : {}),
      };
      await api("/api/data/profile", {
        method: "PATCH",
        body: JSON.stringify(updated),
      });
      setSuccess(
        deletion
          ? "Solicitação registrada. O responsável pela plataforma deverá concluir a exclusão dos seus dados e da conta."
          : "Perfil atualizado.",
      );
      if (deletion) {
        setProfile({
          ...profile,
          deletion_requested_at: updated.deletion_requested_at!,
        });
        setConfirm(false);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    try {
      const { error } = await browserClient().auth.signOut();
      if (error) throw error;
      location.assign("/login");
    } catch {
      setError("Não foi possível sair. Tente novamente.");
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle title="Meu perfil" subtitle="Sua conta e sua propriedade." />
      {!configured() ? (
        <SetupNotice />
      ) : (
        <>
          {error && <Message error>{error}</Message>}
          {success && <Message>{success}</Message>}
          {!profile ? (
            !error && <Loading />
          ) : (
            <>
              <div className="panel">
                <form
                  className="stack"
                  onSubmit={(e) => {
                    e.preventDefault();
                    save();
                  }}
                >
                  <label>
                    Nome completo
                    <input
                      value={profile.full_name}
                      required
                      minLength={2}
                      maxLength={120}
                      onChange={(e) =>
                        setProfile({ ...profile, full_name: e.target.value })
                      }
                      autoComplete="name"
                    />
                  </label>
                  <label>
                    E-mail
                    <input type="email" value={profile.email} readOnly />
                    <span className="muted">
                      E-mail utilizado na autenticação.
                    </span>
                  </label>
                  <label>
                    Telefone
                    <input
                      type="tel"
                      value={profile.phone}
                      maxLength={30}
                      onChange={(e) =>
                        setProfile({ ...profile, phone: e.target.value })
                      }
                      autoComplete="tel"
                    />
                  </label>
                  <label>
                    Propriedade rural
                    <input
                      value={profile.farm_name}
                      maxLength={120}
                      onChange={(e) =>
                        setProfile({ ...profile, farm_name: e.target.value })
                      }
                    />
                  </label>
                  <button className="button" disabled={busy}>
                    Salvar informações
                  </button>
                </form>
              </div>
              <div className="panel">
                <h2>Suas análises</h2>
                <div className="weight">
                  {usage?.used ?? "—"} / {usage?.limit ?? "—"}
                </div>
                <p>
                  Tentativas utilizadas hoje. O limite é renovado à meia-noite,
                  no horário de Brasília. Tentativas aceitas com falha também
                  são contabilizadas.
                </p>
                <Link className="button secondary" href="/atualizar-senha">
                  Alterar senha
                </Link>
              </div>
              <button
                className="button full secondary"
                disabled={busy}
                onClick={logout}
              >
                <LogOut size={19} />
                Sair da conta
              </button>
              <hr className="account-divider" />
              <div className="panel">
                <h2>Exclusão de conta</h2>
                {profile.deletion_requested_at ? (
                  <p>
                    Sua solicitação de exclusão está registrada e aguarda
                    atendimento pelo responsável pela plataforma.
                  </p>
                ) : (
                  <>
                    <p>
                      Você pode solicitar a exclusão de sua conta, dos animais e
                      dos registros. A solicitação será registrada para
                      atendimento pelo responsável pela plataforma.
                    </p>
                    {confirm ? (
                      <>
                        <p>Confirma o registro da solicitação de exclusão?</p>
                        <div className="button-row">
                          <button
                            className="button danger"
                            disabled={busy}
                            onClick={() => save(true)}
                          >
                            Confirmar solicitação
                          </button>
                          <button
                            className="button secondary"
                            onClick={() => setConfirm(false)}
                          >
                            Cancelar
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        className="button secondary"
                        onClick={() => setConfirm(true)}
                      >
                        Solicitar exclusão
                      </button>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
