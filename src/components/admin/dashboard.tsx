"use client";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Activity,
  ClipboardList,
  ShieldCheck,
  LogOut,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  ExternalLink,
  Leaf,
  Clock,
  AlertCircle,
} from "lucide-react";
import {
  AdminOverview,
  AdminUser,
  AdminUsage,
  AdminUserDetail,
} from "@/lib/admin/types";
import { dateLabel, weightLabel } from "@/lib/client";
import { adminFetch } from "./client";
import styles from "@/app/admin/admin.module.css";
type Tab = "overview" | "users" | "usage" | "deletions";
const statusLabel = {
  reserved: "Em processamento",
  completed: "Concluída",
  failed: "Falhou",
};
const number = (v: number) => Number(v).toLocaleString("pt-BR");
export function AdminDashboard({ username }: { username: string }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usage, setUsage] = useState<AdminUsage[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const loadOverview = useCallback(
    () => adminFetch<AdminOverview>("/api/admin/data").then(setOverview),
    [],
  );
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        if (tab === "overview") {
          await loadOverview();
        } else {
          const p = new URLSearchParams({
            section: tab,
            page: String(page),
            search,
            status,
          });
          const data = await adminFetch<{
            items: AdminUser[] | AdminUsage[];
            total: number;
          }>("/api/admin/data?" + p, { signal: controller.signal });
          if (active) {
            if (tab === "usage") setUsage(data.items as AdminUsage[]);
            else setUsers(data.items as AdminUser[]);
            setTotal(data.total);
          }
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    }, 200);
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [tab, page, search, status, refresh, loadOverview]);
  function selectTab(next: Tab) {
    setTab(next);
    setPage(1);
    setSearch("");
    setStatus("");
  }
  async function showUser(id: string) {
    setDetail(null);
    setDetailError("");
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      setDetail(
        await adminFetch<AdminUserDetail>(
          "/api/admin/data?section=user&id=" + id,
        ),
      );
    } catch (e) {
      setDetailError((e as Error).message);
    } finally {
      setDetailLoading(false);
    }
  }
  async function logout() {
    setLogoutBusy(true);
    try {
      await adminFetch("/api/admin/logout", { method: "POST" });
      window.location.assign("/admin/login");
    } catch (e) {
      setError((e as Error).message);
      setLogoutBusy(false);
    }
  }
  const tabs = [
    { id: "overview" as const, label: "Visão geral", icon: Activity },
    { id: "users" as const, label: "Usuários", icon: Users },
    { id: "usage" as const, label: "Análises de IA", icon: ClipboardList },
    { id: "deletions" as const, label: "Solicitações", icon: Clock },
  ];
  return (
    <div className={styles.adminPage}>
      <header className={styles.header}>
        <Link href="/admin" aria-label="Administração Peso Correto">
          <img
            src="/assets/logo-correto.webp"
            width="190"
            height="69"
            alt="Peso Correto"
          />
        </Link>
        <span className={styles.headerBadge}>
          <ShieldCheck size={17} /> Administração
        </span>
        <div className={styles.headerActions}>
          <Link href="/home" target="_blank" rel="noopener noreferrer">
            Ver site <ExternalLink size={16} />
          </Link>
          <button onClick={logout} disabled={logoutBusy}>
            <LogOut size={17} />
            <span>{logoutBusy ? "Saindo..." : "Sair"}</span>
          </button>
        </div>
      </header>
      <div className={styles.workspace}>
        <aside className={styles.sidebar}>
          <span className={styles.sidebarLabel}>GERENCIAMENTO</span>
          <nav aria-label="Administração">
            {tabs.map((t) => (
              <button
                key={t.id}
                className={tab === t.id ? styles.activeTab : ""}
                aria-current={tab === t.id ? "page" : undefined}
                onClick={() => selectTab(t.id)}
              >
                <t.icon size={20} />
                <span>{t.label}</span>
                {t.id === "deletions" &&
                  Boolean(overview?.pending_deletions) && (
                    <b>{overview!.pending_deletions}</b>
                  )}
              </button>
            ))}
          </nav>
          <div className={styles.adminIdentity}>
            <ShieldCheck size={20} />
            <div>
              <strong>{username}</strong>
              <span>Administrador autorizado</span>
            </div>
          </div>
        </aside>
        <main className={styles.main}>
          <div className={styles.heading}>
            <div>
              <span className={styles.eyebrow}>PESO CORRETO · ADMIN</span>
              <h1>{tabs.find((t) => t.id === tab)?.label}</h1>
              <p>
                {tab === "overview"
                  ? "Acompanhe os dados e a utilização da sua plataforma."
                  : tab === "users"
                    ? "Consulte as contas cadastradas e seus registros."
                    : tab === "usage"
                      ? "Consulte tentativas, resultados e tokens informados pela IA."
                      : "Consulte as solicitações de exclusão de conta que aguardam atendimento."}
              </p>
            </div>
            <button
              className={styles.refreshButton}
              onClick={() => setRefresh((r) => r + 1)}
              disabled={loading}
            >
              <RefreshCw size={17} />
              <span>Atualizar</span>
            </button>
          </div>
          {error && (
            <div className={styles.error} role="alert">
              <AlertCircle size={18} />
              {error}
            </div>
          )}
          {tab === "overview" && overview && (
            <>
              <div className={styles.stats}>
                {[
                  {
                    label: "Usuários cadastrados",
                    value: overview.users,
                    icon: Users,
                  },
                  {
                    label: "Animais cadastrados",
                    value: overview.animals,
                    icon: Leaf,
                  },
                  {
                    label: "Pesagens salvas",
                    value: overview.records,
                    icon: ClipboardList,
                  },
                  {
                    label: "Análises hoje",
                    value: overview.analyses_today,
                    icon: Activity,
                  },
                ].map((s) => (
                  <article key={s.label}>
                    <div>
                      <span>{s.label}</span>
                      <s.icon size={21} />
                    </div>
                    <strong>{number(s.value)}</strong>
                  </article>
                ))}
              </div>
              <div className={styles.twoColumns}>
                <section className={styles.card}>
                  <h2>Utilização de IA neste mês</h2>
                  <div className={styles.quotaNumber}>
                    {number(overview.analyses_month)}{" "}
                    <span>/ {number(overview.limits.monthly)} tentativas</span>
                  </div>
                  <progress
                    className={styles.progress}
                    value={Math.min(
                      overview.analyses_month,
                      overview.limits.monthly,
                    )}
                    max={overview.limits.monthly}
                    aria-label="Utilização do limite mensal"
                  />
                  <dl className={styles.summaryList}>
                    <div>
                      <dt>Concluídas</dt>
                      <dd>{number(overview.completed_month)}</dd>
                    </div>
                    <div>
                      <dt>Com falha</dt>
                      <dd>{number(overview.failed_month)}</dd>
                    </div>
                    <div>
                      <dt>Tokens de entrada</dt>
                      <dd>{number(overview.input_tokens_month)}</dd>
                    </div>
                    <div>
                      <dt>Tokens de saída</dt>
                      <dd>{number(overview.output_tokens_month)}</dd>
                    </div>
                  </dl>
                  <p className={styles.smallNote}>
                    Tentativas aceitas com falha também contam no limite. Tokens
                    podem não estar disponíveis em falhas de conexão. Estes
                    números não representam o valor da fatura.
                  </p>
                </section>
                <section className={styles.card}>
                  <h2>Configuração em uso</h2>
                  <dl className={styles.summaryList}>
                    <div>
                      <dt>Modelo de IA</dt>
                      <dd>{overview.model}</dd>
                    </div>
                    <div>
                      <dt>Limite diário por usuário</dt>
                      <dd>{number(overview.limits.daily)}</dd>
                    </div>
                    <div>
                      <dt>Limite mensal da plataforma</dt>
                      <dd>{number(overview.limits.monthly)}</dd>
                    </div>
                  </dl>
                  <p className={styles.smallNote}>
                    Os limites e o modelo são configurados pelas variáveis de
                    ambiente do servidor.
                  </p>
                  <div className={styles.requestBox}>
                    <Clock size={21} />
                    <div>
                      <strong>
                        {number(overview.pending_deletions)} solicitações de
                        exclusão
                      </strong>
                      <p>
                        Contas aguardando atendimento pelo responsável pela
                        plataforma.
                      </p>
                    </div>
                    <button onClick={() => selectTab("deletions")}>
                      Consultar
                    </button>
                  </div>
                </section>
              </div>
            </>
          )}
          {tab !== "overview" && (
            <>
              <div className={styles.filters}>
                {tab === "usage" ? (
                  <label>
                    Situação
                    <select
                      value={status}
                      onChange={(e) => {
                        setStatus(e.target.value);
                        setPage(1);
                      }}
                    >
                      <option value="">Todas as situações</option>
                      <option value="reserved">Em processamento</option>
                      <option value="completed">Concluídas</option>
                      <option value="failed">Com falha</option>
                    </select>
                  </label>
                ) : (
                  <label>
                    <span>
                      <Search size={15} /> Buscar usuário
                    </span>
                    <input
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
                      placeholder="Nome, e-mail ou propriedade"
                      maxLength={100}
                    />
                  </label>
                )}
                <span className={styles.total}>{number(total)} registros</span>
              </div>
              {tab === "deletions" && (
                <p className={styles.infoNote}>
                  Esta área consulta as solicitações. A exclusão da conta e das
                  fotos deve ser executada conforme o procedimento operacional
                  documentado, sem apagar dados apenas por marcar uma
                  solicitação.
                </p>
              )}
              {!loading &&
              !error &&
              !(tab === "usage" ? usage.length : users.length) ? (
                <div className={styles.empty}>
                  <h2>
                    {tab === "deletions"
                      ? "Nenhuma solicitação pendente"
                      : "Nenhum registro encontrado"}
                  </h2>
                  <p>
                    {tab === "deletions"
                      ? "As solicitações de exclusão aparecerão aqui."
                      : "Ajuste a pesquisa ou aguarde novos cadastros e análises."}
                  </p>
                </div>
              ) : (
                !loading && (
                  <div className={styles.tableWrap}>
                    <table>
                      {tab === "usage" ? (
                        <>
                          <thead>
                            <tr>
                              <th>Usuário</th>
                              <th>Data</th>
                              <th>Modelo</th>
                              <th>Situação</th>
                              <th>Tokens entrada / saída</th>
                            </tr>
                          </thead>
                          <tbody>
                            {usage.map((row) => (
                              <tr key={row.id}>
                                <td>
                                  <button
                                    className={styles.userLink}
                                    onClick={() => showUser(row.user_id)}
                                  >
                                    {row.profiles?.full_name || "Sem nome"}
                                  </button>
                                  <small>{row.profiles?.email || "—"}</small>
                                </td>
                                <td>{dateLabel(row.created_at)}</td>
                                <td>{row.model_name}</td>
                                <td>
                                  <span
                                    className={`${styles.status} ${row.status === "failed" ? styles.failed : ""}`}
                                  >
                                    {statusLabel[row.status]}
                                  </span>
                                </td>
                                <td>
                                  {number(row.input_tokens)} /{" "}
                                  {number(row.output_tokens)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </>
                      ) : (
                        <>
                          <thead>
                            <tr>
                              <th>Usuário</th>
                              <th>Propriedade</th>
                              <th>Animais</th>
                              <th>Pesagens</th>
                              <th>
                                {tab === "deletions"
                                  ? "Solicitado em"
                                  : "Cadastro"}
                              </th>
                              <th>Consulta</th>
                            </tr>
                          </thead>
                          <tbody>
                            {users.map((row) => (
                              <tr key={row.id}>
                                <td>
                                  <strong>{row.full_name || "Sem nome"}</strong>
                                  <small>{row.email}</small>
                                </td>
                                <td>{row.farm_name || "—"}</td>
                                <td>{number(row.animal_count)}</td>
                                <td>{number(row.record_count)}</td>
                                <td>
                                  {dateLabel(
                                    tab === "deletions"
                                      ? row.deletion_requested_at!
                                      : row.created_at,
                                  )}
                                </td>
                                <td>
                                  <button
                                    className={styles.outlineButton}
                                    onClick={() => showUser(row.id)}
                                  >
                                    Ver detalhes
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </>
                      )}
                    </table>
                  </div>
                )
              )}
              {total > 20 && (
                <div className={styles.pagination}>
                  <button
                    disabled={page === 1 || loading}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft size={17} /> Anterior
                  </button>
                  <span>
                    Página {page} de {Math.ceil(total / 20)}
                  </span>
                  <button
                    disabled={page * 20 >= total || loading}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Próxima <ChevronRight size={17} />
                  </button>
                </div>
              )}
            </>
          )}
          {loading && (
            <div className={styles.loading} role="status">
              Carregando informações...
            </div>
          )}
        </main>
      </div>
      {detailOpen && (
        <div className={styles.backdrop}>
          <section
            className={styles.detailModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-detail-title"
          >
            <button
              className={styles.close}
              onClick={() => setDetailOpen(false)}
              aria-label="Fechar detalhes"
            >
              <X size={22} />
            </button>
            <h2 id="admin-detail-title">Detalhes do usuário</h2>
            {detailLoading && (
              <div className={styles.loading}>Carregando...</div>
            )}
            {detailError && (
              <div className={styles.error} role="alert">
                {detailError}
              </div>
            )}
            {detail && (
              <>
                <h3>{detail.profile.full_name || "Sem nome"}</h3>
                <dl className={styles.summaryList}>
                  <div>
                    <dt>E-mail</dt>
                    <dd>{detail.profile.email}</dd>
                  </div>
                  <div>
                    <dt>Telefone</dt>
                    <dd>{detail.profile.phone || "Não informado"}</dd>
                  </div>
                  <div>
                    <dt>Propriedade</dt>
                    <dd>{detail.profile.farm_name || "Não informada"}</dd>
                  </div>
                  <div>
                    <dt>Cadastrado em</dt>
                    <dd>{dateLabel(detail.profile.created_at)}</dd>
                  </div>
                  <div>
                    <dt>Animais / pesagens / análises</dt>
                    <dd>
                      {detail.animal_count} / {detail.record_count} /{" "}
                      {detail.analysis_count}
                    </dd>
                  </div>
                </dl>
                {detail.profile.deletion_requested_at && (
                  <p className={styles.infoNote}>
                    Exclusão solicitada em{" "}
                    {dateLabel(detail.profile.deletion_requested_at)}.
                  </p>
                )}
                <h3>Animais recentes</h3>
                {detail.animals.length ? (
                  <ul className={styles.detailList}>
                    {detail.animals.map((a) => (
                      <li key={a.id}>
                        <strong>
                          {a.identification}
                          {a.name ? " · " + a.name : ""}
                        </strong>
                        <span>{a.species}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.smallNote}>Nenhum animal cadastrado.</p>
                )}
                <h3>Pesagens recentes</h3>
                {detail.records.length ? (
                  <ul className={styles.detailList}>
                    {detail.records.map((r) => (
                      <li key={r.id}>
                        <strong>{dateLabel(r.created_at)}</strong>
                        <span>
                          Estimado: {weightLabel(r.estimated_weight_kg)} ·
                          Balança: {weightLabel(r.actual_weight_kg)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.smallNote}>Nenhuma pesagem salva.</p>
                )}
                <p className={styles.smallNote}>
                  Até 10 registros recentes por categoria. Os pesos estimados
                  são experimentais.
                </p>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
