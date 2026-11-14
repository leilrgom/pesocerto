"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import {
  Camera,
  ImagePlus,
  Trash2,
  Scale,
  Check,
  ArrowRight,
} from "lucide-react";
import { Animal, Weighing } from "@/lib/validations";
import { api, compressImage, weightLabel } from "@/lib/client";
import { configured } from "@/lib/supabase/browser";
import { PageTitle, Message, Loading, Empty, SetupNotice } from "./ui";
export const disclaimer =
  "Estimativa visual experimental, sem precisão garantida. A faixa aproximada não é um intervalo estatístico calibrado. Confirme em balança; não utilize como peso certificado em transações comerciais.";
export function PhotoPicker({
  file,
  onChange,
  label,
  optional = false,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  label: string;
  optional?: boolean;
}) {
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  async function select(file: File | undefined) {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      onChange(await compressImage(file));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (camera.current) camera.current.value = "";
      if (gallery.current) gallery.current.value = "";
    }
  }
  return (
    <div className="photo-picker">
      <h3>
        {label}
        {optional && <span className="muted"> · opcional</span>}
      </h3>
      <input
        ref={camera}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        hidden
        onChange={(e) => select(e.target.files?.[0])}
      />
      <input
        ref={gallery}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => select(e.target.files?.[0])}
      />
      {preview && (
        <img className="photo-preview" src={preview} alt={`Prévia: ${label}`} />
      )}
      <div className="button-row">
        <button
          type="button"
          className="button small"
          onClick={() => camera.current?.click()}
          disabled={busy}
        >
          <Camera size={18} />
          {file ? "Refazer foto" : "Tirar foto"}
        </button>
        <button
          type="button"
          className="button small secondary"
          onClick={() => gallery.current?.click()}
          disabled={busy}
        >
          <ImagePlus size={18} />
          Galeria
        </button>
        {file && (
          <button
            type="button"
            className="icon-button"
            onClick={() => onChange(null)}
            aria-label={`Remover ${label}`}
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>
      {busy && <Loading text="Preparando fotografia..." />}
      {error && <Message error>{error}</Message>}
    </div>
  );
}
export function ResultDetails({ record }: { record: Weighing }) {
  const r = record.ai_response;
  return (
    <>
      <div className="result-weight">
        <span>PESO ESTIMADO</span>
        <strong>
          {r.estimativa_disponivel
            ? weightLabel(r.peso_estimado_kg)
            : "Indisponível"}
        </strong>
        <p>Estimativa experimental por inteligência artificial</p>
        {r.estimativa_disponivel && (
          <span className="badge">
            Faixa aproximada: {weightLabel(r.peso_minimo_kg)} a{" "}
            {weightLabel(r.peso_maximo_kg)}
          </span>
        )}
      </div>
      <div className="disclaimer">{disclaimer}</div>
      <dl className="details-list">
        <div>
          <dt>Qualidade das evidências</dt>
          <dd>{r.qualidade_evidencia}</dd>
        </div>
        <div>
          <dt>Espécie identificada · raça aparente</dt>
          <dd>
            {r.especie_identificada} · {r.raca_aparente || "Não identificada"}
          </dd>
        </div>
        <div>
          <dt>Condição corporal aparente</dt>
          <dd>{r.condicao_corporal || "Não identificada"}</dd>
        </div>
        <div>
          <dt>Observações da análise</dt>
          <dd>{r.observacoes}</dd>
        </div>
      </dl>
      {r.recomendacoes.length > 0 && (
        <>
          <h3 style={{ marginTop: 22 }}>Recomendações</h3>
          <ul className="guidance">
            {r.recomendacoes.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
export function WeighingFlow() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [animalId, setAnimalId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photo2, setPhoto2] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Weighing | null>(null);
  const [saved, setSaved] = useState(false);
  const requestId = useRef("");
  const [measurements, setMeasurements] = useState({
    thoracic_cm: "",
    body_length_cm: "",
    previous_weight_kg: "",
    body_condition: "",
  });
  const [animalPage, setAnimalPage] = useState(1);
  const [animalTotal, setAnimalTotal] = useState(0);
  useEffect(() => {
    if (!configured()) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    api<{ items: Animal[]; total: number }>(
      `/api/data/animals?size=100&page=${animalPage}`,
    )
      .then((d) => {
        if (active) {
          setAnimals(d.items);
          setAnimalTotal(d.total);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [animalPage]);
  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(
      () => setProgress((p) => Math.min(2, p + 1)),
      6000,
    );
    return () => clearInterval(timer);
  }, [busy]);
  const animal = animals.find((a) => a.id === animalId);
  function reset() {
    setStep(0);
    setResult(null);
    setPhoto(null);
    setPhoto2(null);
    setSaved(false);
    setError("");
    requestId.current = "";
  }
  async function estimate() {
    if (!photo || !animalId) return;
    setError("");
    setBusy(true);
    setProgress(0);
    if (!requestId.current) requestId.current = crypto.randomUUID();
    try {
      if (photo.size + (photo2?.size || 0) > 4 * 1024 * 1024 - 4096)
        throw new Error(
          "As fotos juntas excedem o limite de envio. Use fotos menores.",
        );
      const form = new FormData();
      form.set("animal_id", animalId);
      form.set("request_id", requestId.current);
      form.set("photo", photo);
      if (photo2) form.set("photo2", photo2);
      form.set("measurements", JSON.stringify(measurements));
      const data = await api<Weighing>("/api/estimar-peso", {
        method: "POST",
        body: form,
      });
      setResult(data);
      setStep(4);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!result) return;
    setBusy(true);
    try {
      await api("/api/data/records", {
        method: "PATCH",
        body: JSON.stringify({ id: result.id, status: "saved" }),
      });
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        title={result ? "Resultado da análise" : "Registrar pesagem"}
        subtitle={
          result
            ? `${animal?.identification || "Animal"} · ${new Date(result.created_at).toLocaleDateString("pt-BR")}`
            : "Uma fotografia, mais informações para seu manejo."
        }
      />
      {!configured() ? (
        <SetupNotice />
      ) : loading ? (
        <Loading />
      ) : !animals.length ? (
        <Empty
          title="Cadastre seu primeiro animal"
          text="A pesagem precisa estar vinculada a um dos seus animais."
          href="/animais"
          label="Cadastrar animal"
        />
      ) : (
        <>
          <div className="steps" aria-label={`Etapa ${step + 1} de 5`}>
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className={`step ${i <= step ? "active" : ""}`} />
            ))}
          </div>
          {error && <Message error>{error}</Message>}
          {step === 0 && (
            <div className="panel">
              <span className="badge">1 · Selecionar animal</span>
              <h2 style={{ marginTop: 15 }}>Qual animal vamos avaliar?</h2>
              <label>
                Animal cadastrado
                <select
                  value={animalId}
                  onChange={(e) => {
                    setAnimalId(e.target.value);
                    requestId.current = "";
                  }}
                >
                  <option value="">Selecione um animal</option>
                  {animals.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.identification}
                      {a.name ? ` · ${a.name}` : ""} ({a.species})
                    </option>
                  ))}
                </select>
              </label>
              {animalTotal > 100 && (
                <div className="pagination">
                  <button
                    className="button small secondary"
                    disabled={animalPage === 1}
                    onClick={() => setAnimalPage((p) => p - 1)}
                  >
                    Anterior
                  </button>
                  <span>Página {animalPage}</span>
                  <button
                    className="button small secondary"
                    disabled={animalPage * 100 >= animalTotal}
                    onClick={() => setAnimalPage((p) => p + 1)}
                  >
                    Próxima
                  </button>
                </div>
              )}
              <div className="button-row">
                <Link className="text-link" href="/animais">
                  + Cadastrar novo animal
                </Link>
              </div>
              <button
                className="button full"
                style={{ marginTop: 24 }}
                disabled={!animal}
                onClick={() => setStep(1)}
              >
                Continuar
                <ArrowRight size={18} />
              </button>
            </div>
          )}
          {step === 1 && (
            <div className="panel">
              <span className="badge">2 · Fotografar</span>
              <h2 style={{ marginTop: 15 }}>Uma boa foto faz diferença</h2>
              <ul className="guidance">
                <li>Fotografe o animal inteiro, preferencialmente de lado.</li>
                <li>Evite fotografias escuras ou desfocadas.</li>
                <li>Mantenha o animal parado.</li>
                <li>Evite obstáculos na frente do animal.</li>
                <li>
                  Sempre que possível, utilize uma referência de escala
                  conhecida.
                </li>
              </ul>
              <div className="stack">
                <PhotoPicker
                  label="Foto lateral"
                  file={photo}
                  onChange={(f) => {
                    setPhoto(f);
                    requestId.current = "";
                  }}
                />
                <PhotoPicker
                  label="Foto traseira"
                  optional
                  file={photo2}
                  onChange={(f) => {
                    setPhoto2(f);
                    requestId.current = "";
                  }}
                />
              </div>
              <div className="button-row">
                <button className="button secondary" onClick={() => setStep(0)}>
                  Voltar
                </button>
                <button
                  className="button"
                  disabled={!photo}
                  onClick={() => setStep(2)}
                >
                  Continuar
                  <ArrowRight size={18} />
                </button>
              </div>
              <p className="muted" style={{ marginTop: 15 }}>
                JPEG, PNG ou WebP. As fotos são compactadas antes do envio. A
                câmera depende do dispositivo e das permissões do navegador.
              </p>
            </div>
          )}
          {step === 2 && (
            <div className="panel">
              <span className="badge">3 · Informações complementares</span>
              <h2 style={{ marginTop: 15 }}>Sobre o animal</h2>
              <p>
                {animal?.species} · {animal?.breed || "Raça não informada"} ·{" "}
                {animal?.sex}
                {animal?.approximate_age_months
                  ? ` · ${animal.approximate_age_months} meses`
                  : ""}
              </p>
              <Link className="text-link" href="/animais">
                Corrigir dados do animal
              </Link>
              <p style={{ marginTop: 20 }}>
                As medidas abaixo são opcionais e podem melhorar a avaliação.
                Não são exigidas para a análise por imagem.
              </p>
              <div className="stack">
                {(
                  [
                    { key: "thoracic_cm", label: "Perímetro torácico (cm)" },
                    {
                      key: "body_length_cm",
                      label: "Comprimento corporal (cm)",
                    },
                    { key: "previous_weight_kg", label: "Peso anterior (kg)" },
                  ] as const
                ).map((f) => (
                  <label key={f.key}>
                    {f.label}
                    <input
                      type="number"
                      min="0.1"
                      max={f.key === "previous_weight_kg" ? 10000 : 1000}
                      step="0.1"
                      value={measurements[f.key]}
                      onChange={(e) => {
                        setMeasurements((m) => ({
                          ...m,
                          [f.key]: e.target.value,
                        }));
                        requestId.current = "";
                      }}
                    />
                  </label>
                ))}
                <label>
                  Condição corporal conhecida
                  <input
                    maxLength={200}
                    placeholder="Ex.: moderada; avaliação recente"
                    value={measurements.body_condition}
                    onChange={(e) => {
                      setMeasurements((m) => ({
                        ...m,
                        body_condition: e.target.value,
                      }));
                      requestId.current = "";
                    }}
                  />
                </label>
              </div>
              <div className="button-row">
                <button className="button secondary" onClick={() => setStep(1)}>
                  Voltar
                </button>
                <button className="button" onClick={() => setStep(3)}>
                  Revisar
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="panel">
              <span className="badge">4 · Analisar com IA</span>
              <h2 style={{ marginTop: 15 }}>
                {animal?.identification} · {animal?.species}
              </h2>
              <p>
                {photo2
                  ? "Duas fotografias prontas para análise."
                  : "Uma fotografia pronta para análise."}
              </p>
              <div className="disclaimer">{disclaimer}</div>
              {busy ? (
                <>
                  <Loading
                    text={
                      [
                        "Analisando fotografia...",
                        "Identificando características do animal...",
                        "Preparando estimativa...",
                      ][progress]
                    }
                  />
                  <p className="progress-caption">
                    Mantenha esta tela aberta até a conclusão.
                  </p>
                </>
              ) : (
                <>
                  <button className="button full" onClick={estimate}>
                    <Scale size={22} />
                    ESTIMAR PESO COM IA
                  </button>
                  <div className="button-row">
                    <button
                      className="button secondary"
                      onClick={() => setStep(2)}
                    >
                      Voltar
                    </button>
                    {error && (
                      <button
                        className="button secondary"
                        onClick={() => {
                          requestId.current = "";
                          setError("");
                        }}
                      >
                        Iniciar nova tentativa
                      </button>
                    )}
                  </div>
                  <p className="muted" style={{ marginTop: 16 }}>
                    Tentativas aceitas, mesmo com falha, contam no limite
                    diário. Repetir o envio da mesma tentativa não gera outra
                    chamada à IA.
                  </p>
                </>
              )}
            </div>
          )}
          {step === 4 && result && (
            <div className="panel">
              {photo && <ResultPhoto file={photo} />}
              <ResultDetails record={result} />
              {saved ? (
                <Message>
                  <Check size={17} style={{ display: "inline" }} />
                  Pesagem salva no histórico.
                </Message>
              ) : (
                <button className="button full" onClick={save} disabled={busy}>
                  {busy ? "Salvando..." : "SALVAR PESAGEM"}
                </button>
              )}
              <div className="button-row">
                <button className="button secondary" onClick={reset}>
                  Nova pesagem
                </button>
                <Link className="button secondary" href="/registros">
                  Ver registros
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
function ResultPhoto({ file }: { file: File }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return url ? (
    <img className="record-detail-photo" src={url} alt="Animal analisado" />
  ) : null;
}
