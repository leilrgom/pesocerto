"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Menu,
  Bell,
  Home,
  ChartNoAxesCombined,
  UserRound,
  X,
  Scale,
  ClipboardList,
  LogIn,
} from "lucide-react";
import { configured } from "@/lib/supabase/browser";

export function AnimalIcon({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 72 60"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M27 18 18 12l-5 4 10 8M45 18l9-6 5 4-10 8M26 17q10-6 20 0l-2 22q-8 9-16 0ZM30 11l-2-7M42 11l2-7M28 32q8-5 16 0M31 36h1m8 0h1M29 24h1m12 0h1" />
      <path d="m10 40-5-4-3 5 6 5m13-6 5-4 3 5-6 5M9 44q7-5 13 0v9q-6 7-13 0ZM12 49h1m5 0h1M52 39l-3-5 5-3 6 5 6-1 4 5-5 5v9q-5 6-10 0v-9Z" />
    </svg>
  );
}
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const home = path === "/" || path === "/dashboard";
  const [menu, setMenu] = useState(false);
  const [unread, setUnread] = useState(false);
  useEffect(() => {
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  useEffect(() => {
    let active = true;
    const refresh = () => {
      if (!configured()) return;
      fetch("/api/data/notifications", { cache: "no-store" })
        .then(async (response) =>
          response.ok
            ? ((await response.json()) as { read_at: string | null }[])
            : [],
        )
        .then((n) => {
          if (active) setUnread(n.some((i) => !i.read_at));
        })
        .catch(() => {});
    };
    refresh();
    window.addEventListener("notifications-updated", refresh);
    return () => {
      window.removeEventListener("notifications-updated", refresh);
      active = false;
    };
  }, [path]);
  const nav = [
    { href: "/dashboard", label: "Início", icon: Home },
    { href: "/animais", label: "Animais", icon: AnimalIcon },
    { href: "/relatorios", label: "Relatórios", icon: ChartNoAxesCombined },
    { href: "/perfil", label: "Perfil", icon: UserRound },
  ];
  return (
    <div className={`app-shell ${home ? "home-shell" : ""}`}>
      <header className={`topbar ${home ? "home-topbar" : ""}`}>
        <button
          aria-label="Abrir menu"
          className="header-icon"
          onClick={() => setMenu(true)}
        >
          <Menu size={30} />
        </button>
        <Link
          className="brand-link"
          href="/dashboard"
          aria-label="Peso Correto — início"
        >
          <img
            className="header-logo"
            src="/assets/logo-transparent.webp"
            alt="PESO CORRETO. Peso certo. Decisão certa."
          />
        </Link>
        <Link
          className="header-icon notification-link"
          href="/notificacoes"
          aria-label="Notificações"
        >
          <Bell size={26} />
          {unread && <span className="notification-dot" />}
        </Link>
      </header>
      {menu && (
        <div className="modal-backdrop" onClick={() => setMenu(false)}>
          <aside
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menu principal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="icon-button drawer-close"
              onClick={() => setMenu(false)}
              aria-label="Fechar menu"
            >
              <X />
            </button>
            <img
              src="/assets/logo-transparent.webp"
              alt="Peso Correto"
              width="260"
              height="95"
            />
            {[
              ...nav,
              { href: "/pesagem", label: "Registrar pesagem", icon: Scale },
              {
                href: "/registros",
                label: "Meus registros",
                icon: ClipboardList,
              },
              { href: "/login", label: "Entrar na conta", icon: LogIn },
            ].map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setMenu(false)}>
                <n.icon size={25} />
                {n.label}
              </Link>
            ))}
          </aside>
        </div>
      )}
      <main className={home ? "home-main" : "page-main"}>{children}</main>
      <nav className="bottom-nav" aria-label="Navegação principal">
        {nav.map((n) => {
          const active =
            n.href === "/dashboard" ? home : path.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={active ? "active" : ""}
              aria-current={active ? "page" : undefined}
            >
              <n.icon size={30} />
              <span>{n.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function WeighingIcon({ size = 64 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 72 70"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 6h50l-5 8H16ZM28 15v7h16v-7M23 24h26l13 35H10ZM15 63h42" />
      <circle cx="36" cy="42" r="12" />
      <path d="m36 42 6-8M24 52h24" />
      <circle cx="36" cy="42" r="2" />
    </svg>
  );
}
