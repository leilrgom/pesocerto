"use client";
import { useState, useEffect, useCallback } from "react";
import { api, dateLabel } from "@/lib/client";
import { configured } from "@/lib/supabase/browser";
import {
  PageTitle,
  Message,
  Loading,
  Empty,
  SetupNotice,
} from "@/components/ui";
type Notification = {
  id: string;
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
};
export default function Page() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (!configured()) {
      setLoading(false);
      return;
    }
    try {
      setItems(await api("/api/data/notifications"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  async function mark() {
    setBusy(true);
    try {
      await api("/api/data/notifications", { method: "PATCH", body: "{}" });
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
        title="Notificações"
        subtitle="As últimas 50 atualizações da sua conta."
      />
      {!configured() ? (
        <SetupNotice />
      ) : (
        <>
          {error && <Message error>{error}</Message>}
          {loading ? (
            <Loading />
          ) : !items.length ? (
            <Empty
              title="Tudo em dia"
              text="As atualizações dos seus animais e pesagens aparecerão aqui."
            />
          ) : (
            <>
              {items.some((i) => !i.read_at) && (
                <button
                  className="button secondary full"
                  style={{ marginBottom: 18 }}
                  disabled={busy}
                  onClick={mark}
                >
                  Marcar todas como lidas
                </button>
              )}
              {items.map((n) => (
                <article
                  className={`panel notification ${n.read_at ? "" : "unread"}`}
                  key={n.id}
                >
                  <h2>{n.title}</h2>
                  <p>{n.message}</p>
                  <time dateTime={n.created_at}>{dateLabel(n.created_at)}</time>
                </article>
              ))}
            </>
          )}
        </>
      )}
    </>
  );
}
