import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  Camera,
  ClipboardList,
  ChartNoAxesCombined,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Check,
  Plus,
  Sprout,
  Download,
} from "lucide-react";
import styles from "./home.module.css";

export const metadata: Metadata = {
  title: "Peso Correto | Seu rebanho, na palma da mão",
  description:
    "Cadastre seus animais, fotografe e obtenha estimativas experimentais de peso por inteligência artificial. Organize pesagens, acompanhe o histórico e compare com a balança.",
  alternates: { canonical: "https://pesocerto-six.vercel.app/home" },
  openGraph: {
    title: "Peso Correto — tecnologia que acompanha o seu rebanho",
    description:
      "Animais, fotografias, estimativas experimentais de peso e registros em um só lugar.",
    url: "https://pesocerto-six.vercel.app/home",
    locale: "pt_BR",
    type: "website",
  },
};

const resources = [
  {
    icon: ClipboardList,
    title: "Cada animal tem sua história",
    text: "Organize identificação, espécie, raça, idade e observações. Encontre seus animais e consulte os registros de cada um.",
  },
  {
    icon: ScanLine,
    title: "Uma foto para começar",
    text: "Use a câmera ou a galeria do celular. A inteligência artificial analisa as imagens e as informações para produzir uma estimativa experimental, quando possível.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Um histórico para acompanhar",
    text: "Salve as análises, registre o peso obtido em balança e acompanhe a evolução. Consulte gráficos e exporte seus registros em CSV.",
  },
];
const questions = [
  {
    title: "A estimativa substitui a balança?",
    answer:
      "Não. A estimativa por fotografia é experimental e não tem precisão garantida. A faixa apresentada não é um intervalo estatístico calibrado. Confirme o peso em balança e não utilize a estimativa como peso certificado para transações comerciais.",
  },
  {
    title: "Como tirar uma fotografia melhor?",
    answer:
      "Fotografe o animal inteiro, preferencialmente de lado, em um local iluminado e sem obstáculos. Mantenha o animal parado. Uma segunda foto traseira é opcional. Medidas corporais e uma referência de escala conhecida podem ajudar a avaliação.",
  },
  {
    title: "Preciso instalar alguma coisa?",
    answer:
      "Você pode usar o Peso Correto diretamente no navegador do celular, tablet ou computador. Em navegadores compatíveis, também é possível adicionar o aplicativo à tela inicial. A disponibilidade da câmera depende do dispositivo e das permissões do navegador.",
  },
  {
    title: "As fotografias ficam públicas?",
    answer:
      "Não. As fotografias são armazenadas em buckets privados, e o acesso aos seus registros exige autenticação. As imagens enviadas para análise são processadas pela OpenAI para gerar o resultado.",
  },
  {
    title: "Funciona sem internet?",
    answer:
      "Você precisa de conexão para acessar seus registros, enviar fotografias e realizar análises. A inteligência artificial não funciona offline. Há limites de utilização das análises, que você pode consultar no perfil.",
  },
];

export default function PresentationPage() {
  return (
    <div className={styles.site}>
      <a className={styles.skipLink} href="#conteudo">
        Ir para o conteúdo
      </a>
      <header className={styles.header}>
        <div className={styles.container}>
          <Link
            href="/home"
            className={styles.brand}
            aria-label="Peso Correto — apresentação"
          >
            <img
              src="/assets/logo-transparent.webp"
              width="200"
              height="73"
              alt="PESO CORRETO"
            />
          </Link>
          <nav className={styles.navigation} aria-label="Navegação do site">
            <a href="#como-funciona">Como funciona</a>
            <a href="#recursos">Recursos</a>
            <a href="#duvidas">Dúvidas</a>
          </nav>
          <Link className={styles.loginLink} href="/login">
            Acessar aplicativo <ArrowUpRight size={18} />
          </Link>
        </div>
      </header>

      <main id="conteudo">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={`${styles.container} ${styles.heroGrid}`}>
            <div className={styles.heroCopy}>
              <span className={styles.eyebrow}>
                <Sprout size={17} /> TECNOLOGIA PARA O CAMPO
              </span>
              <h1 id="hero-title">
                Seu rebanho,
                <br />
                na <span>palma da mão.</span>
              </h1>
              <p>
                Mais informação para cuidar de quem faz parte da sua produção.
                Organize seus animais e acompanhe estimativas experimentais de
                peso com uma fotografia.
              </p>
              <div className={styles.actions}>
                <Link className={styles.primaryButton} href="/cadastro">
                  Começar agora <ArrowUpRight size={20} />
                </Link>
                <a className={styles.secondaryButton} href="#como-funciona">
                  Conhecer o aplicativo <ArrowRight size={18} />
                </a>
              </div>
              <div className={styles.heroNotes}>
                <span>
                  <Check size={16} /> No celular e no computador
                </span>
                <span>
                  <Check size={16} /> Seus registros em um só lugar
                </span>
              </div>
              <p className={styles.heroDisclaimer}>
                Estimativas por IA são experimentais. Confirme o peso em
                balança.
              </p>
            </div>

            <div className={styles.productVisual}>
              <div className={styles.orbit} aria-hidden="true" />
              <div className={styles.phone}>
                <div className={styles.phoneTop}>
                  <span />
                  <span>PESO CERTO. DECISÃO CERTA.</span>
                  <span />
                </div>
                <img
                  className={styles.phoneLogo}
                  src="/assets/logo-transparent.webp"
                  alt="Peso Correto"
                  width="230"
                  height="84"
                />
                <div className={styles.herd}>
                  <img
                    src="/assets/hero.webp"
                    alt="Bovino, ovino, suíno e equino no campo"
                    width="436"
                    height="285"
                    fetchPriority="high"
                  />
                </div>
                <div className={styles.phoneIntro}>
                  <span>DO CAMPO PARA O SEU CELULAR</span>
                  <h2>Seu manejo começa aqui.</h2>
                </div>
                <div className={styles.phoneActions}>
                  <Link href="/pesagem">
                    <Camera size={26} />
                    <span>
                      Registrar
                      <br />
                      pesagem
                    </span>
                    <ArrowUpRight size={16} />
                  </Link>
                  <Link href="/registros">
                    <ClipboardList size={26} />
                    <span>
                      Meus
                      <br />
                      registros
                    </span>
                    <ArrowUpRight size={16} />
                  </Link>
                  <Link href="/relatorios">
                    <ChartNoAxesCombined size={26} />
                    <span>Relatórios</span>
                    <ArrowUpRight size={16} />
                  </Link>
                  <Link href="/animais">
                    <Sprout size={26} />
                    <span>
                      Meus
                      <br />
                      animais
                    </span>
                    <ArrowUpRight size={16} />
                  </Link>
                </div>
                <div className={styles.phoneBottom}>
                  <span /> Simples de usar. Perto do seu rebanho.
                </div>
              </div>
              <div className={styles.visualLabel}>
                <Camera size={21} />
                <div>
                  <strong>Fotografe. Analise. Acompanhe.</strong>
                  <span>Informações que ficam com você.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          className={styles.speciesBand}
          aria-label="Espécies suportadas"
        >
          <div className={styles.container}>
            <span>PARA DIFERENTES CRIAÇÕES</span>
            <div>
              {["Bovinos", "Suínos", "Ovinos", "Caprinos", "Equinos"].map(
                (s) => (
                  <span key={s}>{s}</span>
                ),
              )}
            </div>
          </div>
        </section>

        <section
          id="como-funciona"
          className={`${styles.section} ${styles.how}`}
        >
          <div className={styles.container}>
            <div className={styles.sectionHeading}>
              <span className={styles.eyebrow}>
                MENOS COMPLICAÇÃO, MAIS ORGANIZAÇÃO
              </span>
              <h2>
                Da primeira foto
                <br />
                ao próximo registro.
              </h2>
              <p>Um caminho simples para começar a acompanhar seus animais.</p>
            </div>
            <div className={styles.steps}>
              {[
                {
                  n: "01",
                  icon: ClipboardList,
                  title: "Cadastre seu animal",
                  text: "Crie sua conta e registre os dados do animal. Identificação, espécie e informações de manejo ficam organizadas.",
                },
                {
                  n: "02",
                  icon: Camera,
                  title: "Faça uma boa fotografia",
                  text: "Fotografe o animal inteiro, de preferência de lado. Se quiser, adicione uma segunda foto e medidas complementares.",
                },
                {
                  n: "03",
                  icon: ChartNoAxesCombined,
                  title: "Analise e acompanhe",
                  text: "Revise o resultado da IA, salve a análise e acompanhe o histórico. Adicione o peso real quando houver uma medição em balança.",
                },
              ].map((step) => (
                <article key={step.n} className={styles.step}>
                  <div className={styles.stepTop}>
                    <span>{step.n}</span>
                    <step.icon size={26} />
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="recursos"
          className={`${styles.section} ${styles.resources}`}
        >
          <div className={`${styles.container} ${styles.resourcesGrid}`}>
            <div className={styles.resourceIntro}>
              <span className={styles.eyebrow}>UM COMPANHEIRO DE MANEJO</span>
              <h2>
                Cada registro
                <br />
                faz parte
                <br />
                da evolução.
              </h2>
              <p>
                Do cadastro ao relatório, reúna as informações que ajudam você a
                conhecer melhor seu rebanho.
              </p>
              <Link href="/cadastro" className={styles.textLink}>
                Organizar meus animais <ArrowUpRight size={20} />
              </Link>
              <div className={styles.privacyNote}>
                <ShieldCheck size={25} />
                <span>Conta individual e fotografias privadas.</span>
              </div>
            </div>
            <div className={styles.resourceList}>
              {resources.map((r) => (
                <article key={r.title}>
                  <div className={styles.resourceIcon}>
                    <r.icon size={26} />
                  </div>
                  <div>
                    <h3>{r.title}</h3>
                    <p>{r.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.install}`}>
          <div className={`${styles.container} ${styles.installGrid}`}>
            <div className={styles.installIcon}>
              <Smartphone size={76} strokeWidth={1.3} />
              <span>
                <Download size={25} />
              </span>
            </div>
            <div>
              <span className={styles.eyebrow}>
                PRONTO PARA A ROTINA DO CAMPO
              </span>
              <h2>
                Um atalho para
                <br />o seu dia a dia.
              </h2>
              <p>
                Use direto no navegador ou adicione o Peso Correto à tela
                inicial em dispositivos compatíveis. Acesse o aplicativo com
                poucos toques.
              </p>
              <div className={styles.installTips}>
                <span>
                  <strong>Android</strong> Menu do navegador → Instalar
                  aplicativo.
                </span>
                <span>
                  <strong>iPhone</strong> Compartilhar → Adicionar à Tela de
                  Início.
                </span>
              </div>
            </div>
          </div>
        </section>

        <section id="duvidas" className={`${styles.section} ${styles.faq}`}>
          <div className={`${styles.container} ${styles.faqGrid}`}>
            <div>
              <span className={styles.eyebrow}>ANTES DE COMEÇAR</span>
              <h2>
                Respostas
                <br />
                para suas dúvidas.
              </h2>
              <p>
                Conheça as possibilidades e os cuidados ao usar o aplicativo.
              </p>
            </div>
            <div className={styles.questions}>
              {questions.map((q) => (
                <details key={q.title}>
                  <summary>
                    {q.title}
                    <Plus size={21} />
                  </summary>
                  <p>{q.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.cta}>
          <div className={styles.container}>
            <div>
              <span className={styles.eyebrow}>SEU PRÓXIMO PASSO</span>
              <h2>
                Seu rebanho merece
                <br />
                esse cuidado.
              </h2>
              <p>
                Comece pelo primeiro animal. Construa seu histórico a cada
                registro.
              </p>
            </div>
            <Link className={styles.primaryButton} href="/cadastro">
              Criar minha conta <ArrowUpRight size={22} />
            </Link>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerTop}>
            <Link href="/home" aria-label="Peso Correto — início do site">
              <img
                src="/assets/logo-transparent.webp"
                width="190"
                height="69"
                alt="Peso Correto"
                loading="lazy"
              />
            </Link>
            <p>
              Peso certo. Decisão certa.
              <br />
              Tecnologia para acompanhar o seu rebanho.
            </p>
            <Link href="/login">
              Acessar aplicativo <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className={styles.footerBottom}>
            <span>© {new Date().getFullYear()} Peso Correto.</span>
            <span>
              Estimativas experimentais. Sempre confirme o peso em balança.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
