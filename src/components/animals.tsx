"use client";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { Animal, species, animalSchema } from "@/lib/validations";
import { api, compressImage, weightLabel } from "@/lib/client";
import { configured } from "@/lib/supabase/browser";
import { PageTitle, Message, Loading, Empty, Confirm, SetupNotice } from "./ui";
import { AnimalIcon } from "./shell";
type AnimalForm = {
  identification: string;
  name: string;
  species: (typeof species)[number];
  breed: string;
  sex: "Macho" | "Fêmea" | "Não informado";
  birth_date: string;
  approximate_age_months: string;
  reference_weight_kg: string;
  notes: string;
};
export function Animals() {
  const [items, setItems] = useState<Animal[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editing, setEditing] = useState<Animal | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Animal | null>(null);
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const { register, reset, handleSubmit } = useForm<AnimalForm>();
  const load = useCallback(async () => {
    if (!configured()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await api<{ items: Animal[]; total: number }>(
        `/api/data/animals?${new URLSearchParams({ page: String(page), search, species: filter })}`,
      );
      setItems(data.items);
      setTotal(data.total);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, search, filter]);
  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);
  function edit(animal: Animal | null) {
    setEditing(animal);
    setPhoto(null);
    reset({
      identification: animal?.identification || "",
      name: animal?.name || "",
      species: animal?.species || "Bovino",
      breed: animal?.breed || "",
      sex: animal?.sex || "Não informado",
      birth_date: animal?.birth_date || "",
      approximate_age_months: String(animal?.approximate_age_months || ""),
      reference_weight_kg: String(animal?.reference_weight_kg || ""),
      notes: animal?.notes || "",
    });
  }
  async function save(values: AnimalForm) {
    setBusy(true);
    setError("");
    try {
      const fields = animalSchema.parse(values);
      const data = await api<Animal>("/api/data/animals", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify({
          ...fields,
          ...(editing ? { id: editing.id } : {}),
        }),
      });
      if (photo) {
        try {
          const form = new FormData();
          form.set("animal_id", data.id);
          form.set("photo", await compressImage(photo));
          await api("/api/photos", { method: "POST", body: form });
        } catch (e) {
          setEditing(undefined);
          await load();
          throw new Error(
            `Animal salvo, mas a fotografia falhou: ${(e as Error).message} Edite o animal para reenviar.`,
          );
        }
      }
      setEditing(undefined);
      setSuccess("Animal salvo com sucesso.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/api/data/animals?id=${deleting.id}`, { method: "DELETE" });
      setDeleting(null);
      setSuccess("Animal e histórico excluídos.");
      await load();
    } catch (e) {
      setError((e as Error).message);
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        title="Meus animais"
        subtitle="Cuide do seu rebanho, animal por animal."
      />
      {!configured() ? (
        <SetupNotice />
      ) : (
        <>
          <button className="button full" onClick={() => edit(null)}>
            <Plus size={20} />
            Cadastrar animal
          </button>
          <div className="filters" style={{ marginTop: 20 }}>
            <label>
              <span>
                <Search size={15} style={{ display: "inline" }} /> Pesquisar
                animal
              </span>
              <input
                placeholder="Identificação ou nome"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label>
              Espécie
              <select
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Todas as espécies</option>
                {species.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>
          {error && <Message error>{error}</Message>}
          {success && <Message>{success}</Message>}
          {loading ? (
            <Loading />
          ) : !items.length ? (
            <Empty
              title="Nenhum animal encontrado"
              text={
                search || filter
                  ? "Ajuste a pesquisa para encontrar seus animais."
                  : "Cadastre seu primeiro animal para registrar uma pesagem."
              }
            />
          ) : (
            items.map((a) => (
              <div className="panel" key={a.id}>
                <div className="animal-card">
                  {a.photo_url ? (
                    <img
                      className="thumb"
                      src={a.photo_url}
                      alt={a.identification}
                      loading="lazy"
                    />
                  ) : (
                    <div className="thumb">
                      <AnimalIcon size={48} />
                    </div>
                  )}
                  <div className="card-body">
                    <h2>
                      {a.identification}
                      {a.name ? ` · ${a.name}` : ""}
                    </h2>
                    <p>
                      {a.species} · {a.breed || "Raça não informada"}
                    </p>
                    <p>
                      {a.sex}
                      {a.approximate_age_months
                        ? ` · ${a.approximate_age_months} meses`
                        : ""}
                    </p>
                    {a.reference_weight_kg && (
                      <p>
                        Peso conhecido: {weightLabel(a.reference_weight_kg)}
                      </p>
                    )}
                    <div className="card-actions">
                      <Link
                        className="button small secondary"
                        href={`/registros?animal=${a.id}`}
                      >
                        Histórico
                      </Link>
                      <button
                        className="icon-button"
                        onClick={() => edit(a)}
                        aria-label={`Editar ${a.identification}`}
                      >
                        <Pencil size={17} />
                      </button>
                      <button
                        className="icon-button"
                        onClick={() => setDeleting(a)}
                        aria-label={`Excluir ${a.identification}`}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>
                </div>
                {a.notes && (
                  <p style={{ marginTop: 13, whiteSpace: "pre-wrap" }}>
                    {a.notes}
                  </p>
                )}
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
          {editing !== undefined && (
            <div className="modal-backdrop">
              <div
                className="modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="animal-form-title"
              >
                <h2 id="animal-form-title">
                  {editing ? "Editar animal" : "Cadastrar animal"}
                </h2>
                <form
                  onSubmit={handleSubmit(save)}
                  className="stack"
                  style={{ marginTop: 20 }}
                >
                  <label>
                    Identificação *
                    <input
                      {...register("identification")}
                      maxLength={80}
                      required
                      placeholder="Ex.: Brinco 001"
                    />
                  </label>
                  <label>
                    Nome
                    <input {...register("name")} maxLength={100} />
                  </label>
                  <div className="form-grid">
                    <label>
                      Espécie
                      <select {...register("species")}>
                        {species.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Sexo
                      <select {...register("sex")}>
                        <option>Não informado</option>
                        <option>Macho</option>
                        <option>Fêmea</option>
                      </select>
                    </label>
                  </div>
                  <label>
                    Raça
                    <input {...register("breed")} maxLength={100} />
                  </label>
                  <div className="form-grid">
                    <label>
                      Idade em meses
                      <input
                        type="number"
                        min="1"
                        max="1200"
                        step="1"
                        {...register("approximate_age_months")}
                      />
                    </label>
                    <label>
                      Nascimento
                      <input type="date" {...register("birth_date")} />
                    </label>
                  </div>
                  <label>
                    Peso real conhecido (kg)
                    <input
                      type="number"
                      min="0.1"
                      max="10000"
                      step="0.1"
                      {...register("reference_weight_kg")}
                    />
                  </label>
                  <label>
                    Fotografia
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                    />
                  </label>
                  <label>
                    Observações
                    <textarea {...register("notes")} maxLength={3000} />
                  </label>
                  {error && <Message error>{error}</Message>}
                  <div className="button-row">
                    <button className="button" disabled={busy}>
                      {busy ? "Salvando..." : "Salvar animal"}
                    </button>
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => setEditing(undefined)}
                      disabled={busy}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {deleting && (
            <Confirm
              title={`Excluir ${deleting.identification}?`}
              text="Esta ação também exclui todas as pesagens e fotografias deste animal. Não pode ser desfeita."
              onCancel={() => setDeleting(null)}
              onConfirm={remove}
              busy={busy}
            />
          )}
        </>
      )}
    </>
  );
}
