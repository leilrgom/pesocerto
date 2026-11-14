import { Empty } from "@/components/ui";
export default function Page() {
  return (
    <Empty
      title="Página não encontrada"
      text="Use a navegação para continuar."
      href="/dashboard"
      label="Voltar ao início"
    />
  );
}
