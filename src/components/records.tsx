"use client";
import { useState, useEffect, useCallback } from "react";
import { Trash2, Eye, Scale } from "lucide-react";
import { Animal, Weighing, species } from "@/lib/validations";
import { api, dateLabel, weightLabel } from "@/lib/client";
import { configured } from "@/lib/supabase/browser";
import { PageTitle, Message, Loading, Empty, Confirm, SetupNotice } from "./ui";
import { ResultDetails } from "./weighing";
export function Records() {
  const [items, setItems] = useState<Weighing[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [speciesFilter, setSpeciesFilter] = useState("");
  const [animal, setAnimal] = useState("");
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<Weighing | null>(null);
  const [deleting, setDeleting] = useState<Weighing | null>(null);
  const [busy, setBusy] = useState(false);
  const [actual, setActual] = useState("");
  const [notes, setNotes] = useState("");
  const [success, setSuccess] = useState("");
  useEffect(() => {
    setAnimal(new URLSearchParams(location.search).get("animal") || "");
  }, []);
  useEffect(() => {
    if (!configured()) return;
    let active = true;
    (async () => {
      const list: Animal[] = [];
      let page = 1,
        total = 1;
      while (list.length < total) {
        const data = await api<{ items: Animal[]; total: number }>(
          `/api/data/animals?size=100&page=${page++}`,
        );
        list.push(...data.items);
        total = data.total;
        if (!data.items.length) break;
      }
      if (active) setAnimals(list);
    })().catch((e) => {
      if (active) setError(e.message);
    });
    return () => {
      active = false;
    };
  }, []);
  const load = useCallback(async () => {
    if (!configured()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await api<{ items: Weighing[]; total: number }>(
        `/api/data/records?${new URLSearchParams({ page: String(page), search, species: speciesFilter, animal, from, to })}`,
      );
      setItems(data.items);
      setTotal(data.total);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, search, speciesFilter, animal, from, to]);
  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/api/data/records?id=${deleting.id}`, { method: "DELETE" });
      setDeleting(null);
      setSuccess("Pesagem excluída.");
      await load();
    } catch (e) {
      setError((e as Error).message);
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  }
  async function update() {
    if (!detail) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/data/records", {
        method: "PATCH",
        body: JSON.stringify({
          id: detail.id,
          actual_weight_kg: actual ? Number(actual) : null,
          notes,
        }),
      });
      setDetail(null);
      setSuccess("Peso real e observações atualizados.");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        title="Meus registros"
        subtitle="Cada pesagem conta uma parte da história."
      />
      {!configured() ? (
        <SetupNotice />
      ) : (
        <>
          <div className="filters">
            <label>
              Pesquisar identificação
              <input
                value={search}
                placeholder="Ex.: Brinco 001"
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <details>
              <summary>Filtrar por animal, espécie e período</summary>
              <div className="stack">
                <label>
                  Animal
                  <select
                    value={animal}
                    onChange={(e) => {
                      setAnimal(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">Todos os animais</option>
                    {animals.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.identification}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Espécie
                  <select
                    value={speciesFilter}
                    onChange={(e) => {
                      setSpeciesFilter(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">Todas</option>
                    {species.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <div className="form-grid">
                  <label>
                    De
                    <input
                      type="date"
                      value={from}
                      onChange={(e) => {
                        setFrom(e.target.value);
                        setPage(1);
                      }}
                    />
                  </label>
                  <label>
                    Até
                    <input
                      type="date"
                      value={to}
                      onChange={(e) => {
                        setTo(e.target.value);
                        setPage(1);
                      }}
                    />
                  </label>
                </div>
                {animal && (
                  <button
                    className="button secondary small"
                    onClick={() => {
                      setAnimal("");
                      setPage(1);
                    }}
                  >
                    Remover filtro por animal
                  </button>
                )}
              </div>
            </details>
          </div>
          {error && <Message error>{error}</Message>}
          {success && <Message>{success}</Message>}
          {loading ? (
            <Loading />
          ) : !items.length ? (
            <Empty
              title="Nenhuma pesagem encontrada"
              text="Registre uma análise e salve o resultado para acompanhar por aqui."
              href="/pesagem"
              label="Registrar pesagem"
            />
          ) : (
            items.map((r) => (
              <div className="panel" key={r.id}>
                <div className="record-card">
                  {r.photo_url ? (
                    <img
                      className="thumb"
                      src={r.photo_url}
                      alt={r.animals.identification}
                      loading="lazy"
                    />
                  ) : (
                    <div className="thumb">
                      <Scale size={35} />
                    </div>
                  )}
                  <div className="card-body">
                    <h2>{r.animals.identification}</h2>
                    <p>
                      {r.animals.species} · {dateLabel(r.created_at)}
                    </p>
                    <div className="weight">
                      {weightLabel(r.estimated_weight_kg)}
                    </div>
                    <span className="badge">{r.estimation_method}</span>
                    {r.actual_weight_kg && (
                      <p>Peso em balança: {weightLabel(r.actual_weight_kg)}</p>
                    )}
                    <div className="card-actions">
                      <button
                        className="button small secondary"
                        onClick={() => {
                          setDetail(r);
                          setActual(String(r.actual_weight_kg || ""));
                          setNotes(r.notes || "");
                        }}
                      >
                        <Eye size={16} />
                        Detalhes
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Excluir pesagem de ${r.animals.identification}`}
                        onClick={() => setDeleting(r)}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          {total > 20 && (
            <div className="pagination">
              <button
                className="button small secondary"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </button>
              <span>
                {page} / {Math.ceil(total / 20)}
              </span>
              <button
                className="button small secondary"
                disabled={page * 20 >= total}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </button>
            </div>
          )}
          {detail && (
            <div className="modal-backdrop">
              <div
                className="modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="record-title"
              >
                <h2 id="record-title">{detail.animals.identification}</h2>
                <p>
                  {dateLabel(detail.created_at)} · {detail.animals.species}
                </p>
                {detail.photo_url && (
                  <img
                    className="record-detail-photo"
                    src={detail.photo_url}
                    alt="Fotografia da pesagem"
                  />
                )}
                <ResultDetails record={detail} />
                <form
                  className="stack"
                  onSubmit={(e) => {
                    e.preventDefault();
                    update();
                  }}
                >
                  <label>
                    Peso real em balança (kg)
                    <input
                      type="number"
                      min="0.1"
                      max="10000"
                      step="0.1"
                      value={actual}
                      onChange={(e) => setActual(e.target.value)}
                      placeholder="Adicionar medição real"
                    />
                  </label>
                  <label>
                    Observações
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      maxLength={3000}
                    />
                  </label>
                  {error && <Message error>{error}</Message>}
                  <div className="button-row">
                    <button className="button" disabled={busy}>
                      Salvar alterações
                    </button>
                    <button
                      className="button secondary"
                      type="button"
                      onClick={() => setDetail(null)}
                    >
                      Fechar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {deleting && (
            <Confirm
              title="Excluir esta pesagem?"
              text="O registro e suas fotografias serão removidos permanentemente."
              onConfirm={remove}
              onCancel={() => setDeleting(null)}
              busy={busy}
            />
          )}
        </>
      )}
    </>
  );
}
