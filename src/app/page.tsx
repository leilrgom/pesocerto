import Link from "next/link";
import { ClipboardList, ChartNoAxesCombined, ChevronRight } from "lucide-react";
import { AnimalIcon, WeighingIcon } from "@/components/shell";
export default function Home() {
  const cards = [
    {
      href: "/pesagem",
      label: (
        <>
          Registrar
          <br />
          Pesagem
        </>
      ),
      icon: WeighingIcon,
    },
    {
      href: "/registros",
      label: (
        <>
          Meus
          <br />
          Registros
        </>
      ),
      icon: ClipboardList,
    },
    { href: "/relatorios", label: <>Relatórios</>, icon: ChartNoAxesCombined },
    {
      href: "/animais",
      label: (
        <>
          Meus
          <br />
          Animais
        </>
      ),
      icon: AnimalIcon,
    },
  ];
  return (
    <>
      <div className="home-hero">
        <img
          src="/assets/hero.webp"
          alt="PESO CORRETO. Peso certo. Decisão certa. Bovino, ovino, suíno e equino no campo."
          width="436"
          height="285"
          fetchPriority="high"
        />
      </div>
      <div className="home-cards">
        {cards.map((c) => (
          <Link href={c.href} key={c.href} className="home-card">
            <c.icon size={67} />
            <span className="home-card-label">{c.label}</span>
            <span className="card-arrow">
              <ChevronRight size={22} />
            </span>
          </Link>
        ))}
      </div>
      <div className="home-glow" aria-hidden="true" />
    </>
  );
}
