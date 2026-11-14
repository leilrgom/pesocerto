"use client";
import { useState, useEffect, useCallback } from "react";
import { Download } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import { Animal, Weighing, species } from "@/lib/validations";
import { api, csvCell, dateLabel, weightLabel } from "@/lib/client";
import { configured } from "@/lib/supabase/browser";
import { PageTitle, Message, Loading, Empty, SetupNotice } from "./ui";
import { disclaimer } from "./weighing";
type Report = {
  animals: number;
  weighings: number;
  last: string | null;
  average: number | null;
  series: { date: string; estimated: number | null; actual: number | null }[];
  distribution: { species: string; count: number }[];
};
export function Reports() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [animal, setAnimal] = useState("");
  const [filter, setFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!configured()) return;
    let active = true;
    (async () => {
      const result: Animal[] = [];
      let page = 1,
        total = 1;
      while (result.length < total) {
        const d = await api<{ items: Animal[]; total: number }>(
          `/api/data/animals?size=100&page=${page++}`,
        );
        total = d.total;
        result.push(...d.items);
        if (!d.items.length) break;
      }
      if (active) setAnimals(result);
    })().catch((e) => {
      if (active) setError(e.message);
    });
    return () => {
      active = false;
    };
  }, []);
  const params = useCallback(
    () => new URLSearchParams({ animal, species: filter, from, to }),
    [animal, filter, from, to],
  );
  useEffect(() => {
    if (!configured()) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    api<Report>(`/api/reports?${params()}`)
      .then((d) => {
        if (active) {
          setData(d);
          setError("");
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
  }, [params]);
  async function exportCsv() {
    setBusy(true);
    try {
      const rows = [
        [
          "Animal",
          "Espécie",
          "Data",
          "Peso estimado (kg)",
          "Peso mínimo (kg)",
          "Peso máximo (kg)",
          "Peso em balança (kg)",
          "Método",
          "Observações",
        ],
      ];
      let page = 1,
        total = 1,
        count = 0;
      while (count < total) {
        const p = params();
        p.set("size", "100");
        p.set("page", String(page++));
        const d = await api<{ items: Weighing[]; total: number }>(
          `/api/data/records?${p}`,
        );
        total = d.total;
        d.items.forEach((r) =>
          rows.push([
            r.animals.identification,
            r.animals.species,
            dateLabel(r.created_at),
            String(r.estimated_weight_kg ?? ""),
            String(r.minimum_weight_kg ?? ""),
            String(r.maximum_weight_kg ?? ""),
            String(r.actual_weight_kg ?? ""),
            r.estimation_method,
            r.notes || "",
          ]),
        );
        count += d.items.length;
        if (!d.items.length) break;
      }
      const blob = new Blob(
        ["\ufeff" + rows.map((r) => r.map(csvCell).join(";")).join("\r\n")],
        { type: "text/csv;charset=utf-8" },
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "peso-correto-registros.csv";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const tooltip = {
    contentStyle: {
      background: "#073c25",
      border: "1px solid #8bbf40",
      borderRadius: 10,
    },
    labelStyle: { color: "#fff" },
  };
  return (
    <>
      <PageTitle
        title="Relatórios"
        subtitle="Acompanhe a evolução do seu rebanho."
      />
      {!configured() ? (
        <SetupNotice />
      ) : (
        <>
          <div className="filters">
            <label>
              Animal
              <select
                value={animal}
                onChange={(e) => setAnimal(e.target.value)}
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
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="">Todas as espécies</option>
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
                  onChange={(e) => setFrom(e.target.value)}
                />
              </label>
              <label>
                Até
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </label>
            </div>
          </div>
          {error && <Message error>{error}</Message>}
          {loading ? (
            <Loading />
          ) : (
            data && (
              <>
                <div className="stats-grid">
                  <div className="stat">
                    <span>Animais cadastrados</span>
                    <strong>{data.animals}</strong>
                  </div>
                  <div className="stat">
                    <span>Pesagens salvas</span>
                    <strong>{data.weighings}</strong>
                  </div>
                  <div className="stat">
                    <span>Média das estimativas</span>
                    <strong>{weightLabel(data.average)}</strong>
                  </div>
                  <div className="stat">
                    <span>Última pesagem</span>
                    <strong style={{ fontSize: 20 }}>
                      {data.last ? dateLabel(data.last) : "—"}
                    </strong>
                  </div>
                </div>
                {!data.weighings ? (
                  <Empty
                    title="Seu histórico começa aqui"
                    text="Salve pesagens para visualizar a evolução e comparar com os pesos em balança."
                    href="/pesagem"
                    label="Registrar pesagem"
                  />
                ) : (
                  <>
                    <div className="panel">
                      <h2>Evolução de peso</h2>
                      <p>
                        {animal
                          ? "Média diária das estimativas do animal selecionado."
                          : "Média diária do grupo. Selecione um animal para acompanhar sua evolução individual."}
                      </p>
                      <div className="chart">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={data.series}
                            margin={{ left: -20, right: 5, top: 10, bottom: 5 }}
                          >
                            <CartesianGrid
                              stroke="#335c39"
                              strokeDasharray="3 3"
                            />
                            <XAxis
                              dataKey="date"
                              tickFormatter={(d) =>
                                String(d)
                                  .slice(5)
                                  .split("-")
                                  .reverse()
                                  .join("/")
                              }
                              stroke="#b2c8ac"
                            />
                            <YAxis stroke="#b2c8ac" />
                            <Tooltip {...tooltip} />
                            <Legend />
                            <Line
                              name="Estimativa (kg)"
                              dataKey="estimated"
                              stroke="#a5ff00"
                              strokeWidth={2}
                              connectNulls={false}
                              dot={{ r: 3 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="panel">
                      <h2>Estimativa e peso real</h2>
                      <p>
                        Médias por dia, em kg. Pesos reais só aparecem quando
                        informados. A diferença não comprova precisão do método.
                      </p>
                      <div className="chart">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={data.series}
                            margin={{ left: -20, right: 5 }}
                          >
                            <CartesianGrid
                              stroke="#335c39"
                              strokeDasharray="3 3"
                            />
                            <XAxis
                              dataKey="date"
                              tickFormatter={(d) =>
                                String(d)
                                  .slice(5)
                                  .split("-")
                                  .reverse()
                                  .join("/")
                              }
                              stroke="#b2c8ac"
                            />
                            <YAxis stroke="#b2c8ac" />
                            <Tooltip {...tooltip} />
                            <Legend />
                            <Line
                              name="Estimado"
                              dataKey="estimated"
                              stroke="#a5ff00"
                              dot={{ r: 3 }}
                            />
                            <Line
                              name="Balança"
                              dataKey="actual"
                              stroke="#7ad8f0"
                              strokeWidth={2}
                              dot={{ r: 4 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="panel">
                      <h2>Pesagens por espécie</h2>
                      <div className="chart">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={data.distribution}
                            margin={{ left: -25, right: 5, top: 20 }}
                          >
                            <XAxis dataKey="species" stroke="#b2c8ac" />
                            <YAxis allowDecimals={false} stroke="#b2c8ac" />
                            <Tooltip {...tooltip} />
                            <Bar
                              name="Pesagens"
                              dataKey="count"
                              fill="#a5ff00"
                              radius={[6, 6, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <button
                      className="button full"
                      disabled={busy}
                      onClick={exportCsv}
                    >
                      <Download size={19} />
                      {busy ? "Preparando CSV..." : "Exportar registros em CSV"}
                    </button>
                  </>
                )}
                <div className="disclaimer">{disclaimer}</div>
              </>
            )
          )}
        </>
      )}
    </>
  );
}
