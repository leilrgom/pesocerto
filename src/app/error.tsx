"use client";
import { Message } from "@/components/ui";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="panel">
      <h1>Não foi possível carregar</h1>
      <Message error>Verifique sua conexão e tente novamente.</Message>
      <button className="button" onClick={reset}>
        Tentar novamente
      </button>
    </div>
  );
}
