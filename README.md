# PESO CORRETO

Aplicativo publicado: https://pesocerto-six.vercel.app

Repositório público: https://github.com/leilrgom/pesocerto

Aplicação Next.js App Router + TypeScript para animais, fotografias privadas e estimativas **experimentais** de peso com a OpenAI Responses API. Supabase fornece autenticação, PostgreSQL e Storage. Preparada para execução serverless na Vercel.

A imagem `visualexato.png` foi preservada. Os recortes em `public/assets` conservam o logotipo, os animais e a iluminação. Cards, menu, notificações e navegação são elementos reais. A página inicial fica pública; os módulos com dados exigem sessão quando o Supabase está configurado. Sem configuração, mostram uma orientação, sem dados fictícios.

## Instalação local

Requer Node.js 22.12+ e npm.

```bash
npm ci
cp .env.example .env.local
# Preencha .env.local, conforme as instruções abaixo.
npm run dev
```

Abra http://localhost:3000. Para produção local:

```bash
npm run build
npm start
```

## Variáveis

| Variável                        | Onde obter / finalidade                                                   |
| ------------------------------- | ------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | URL do projeto Supabase                                                   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública anon do mesmo projeto                                       |
| `SUPABASE_SERVICE_ROLE_KEY`     | Chave de servidor Supabase; nunca enviar ao navegador                     |
| `OPENAI_API_KEY`                | Chave de API do projeto OpenAI com faturamento habilitado                 |
| `OPENAI_MODEL`                  | ID de modelo com entrada de imagens e Structured Outputs na Responses API |
| `DAILY_ANALYSIS_LIMIT`          | Inteiro positivo, padrão 10, por usuário                                  |
| `GLOBAL_MONTHLY_ANALYSIS_LIMIT` | Inteiro positivo, padrão 1000, compartilhado pelo serviço                 |

As duas variáveis `NEXT_PUBLIC_` são incorporadas ao build. Reinicie o servidor após alterações e refaça o deploy quando necessário. Nunca use `NEXT_PUBLIC_` para a chave OpenAI ou service role. `.env.local` e demais segredos estão no `.gitignore`.

## Supabase

1. Crie um projeto Supabase e copie a URL, a chave anon e a service role para `.env.local`.
2. No SQL Editor execute, em ordem, **uma única vez por migration**:
   - `supabase/migrations/202611140001_initial.sql`
   - `supabase/migrations/202611140002_reports.sql`
3. Alternativamente, com a CLI oficial instalada, vincule o projeto e execute `supabase db push`. O histórico da CLI evita reaplicações.
4. As migrations criam as seis tabelas, índices, relações de propriedade, triggers, políticas RLS, buckets privados `animal-photos` e `weighing-photos`, cotas e agregação de relatórios. Não é necessário criar buckets públicos ou políticas adicionais de escrita.
5. Em Authentication, habilite Email/Password. Configure Site URL para o domínio final. Adicione Redirect URLs exatas:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/auth/callback?next=/atualizar-senha`
   - `https://SEU-DOMINIO/auth/callback`
   - `https://SEU-DOMINIO/auth/callback?next=/atualizar-senha`
6. Habilite confirmação de e-mail. Mantenha os templates de confirmação e recuperação com `{{ .ConfirmationURL }}` para concluir o fluxo PKCE no callback.
7. Configure SMTP próprio se o limite de envio de e-mails do ambiente de desenvolvimento não atender ao uso. Confira os limites vigentes no painel antes de abrir cadastros ao público.
8. Crie duas contas de teste e execute o roteiro em `docs/VERIFICACAO.md` antes da produção.

O trigger cria um perfil após cadastro e mantém o e-mail sincronizado com Auth. O proxy renova cookies; APIs verificam a sessão com `getUser()`. IDs enviados pelo cliente são validados e associados ao usuário autenticado. Mesmo acesso direto ao Supabase respeita RLS. Somente o servidor escreve resultados de IA, fotos, consumo e notificações. O cliente não pode forjar peso estimado ou alterar cotas.

## OpenAI

1. Crie uma chave de projeto em https://platform.openai.com/api-keys.
2. Habilite faturamento e configure orçamento/alertas no painel do projeto. As cotas desta aplicação limitam **tentativas**, não o valor monetário exato.
3. Defina `OPENAI_API_KEY` e `OPENAI_MODEL`. Consulte o catálogo oficial para selecionar um modelo com visão e schema JSON estrito. O aplicativo não escolhe um modelo silenciosamente se a variável estiver ausente.
4. Com login realizado, cadastre um animal, abra Registrar Pesagem, escolha uma foto lateral e, opcionalmente, uma traseira. Confirme os dados e inicie a análise.
5. Revise as recomendações e clique em **Salvar pesagem**. O resultado aparece no histórico e nos relatórios. Resultado sem evidência suficiente tem pesos nulos e pode ser salvo para registrar a tentativa.

A integração usa o SDK oficial, `responses.create`, `input_image` e `zodTextFormat`, com `store: false`, timeout de 45 segundos e nenhuma repetição automática. Respostas recusadas, incompletas ou com pesos incoerentes não geram um resultado aceito. Não existe peso padrão ou simulação em produção.

A reserva de cota ocorre no PostgreSQL antes da chamada paga e usa um advisory lock transacional global. Uma chave UUID e hash vinculam a tentativa ao animal, aos dados e às imagens. Reenvio de tentativa concluída devolve o mesmo registro; tentativa em processamento ou falha não dispara outra chamada. Uma nova tentativa deve ser explicitamente iniciada pelo usuário. Tentativas reservadas e falhas contam no limite, incluindo interrupções abruptas do provedor. Tokens retornados pelo provedor são registrados antes da validação do peso, mesmo se a saída for inválida. Em timeout ou erro sem dados de consumo, os tokens ficam em zero (consumo desconhecido; consulte o faturamento do provedor). O dia e o mês seguem `America/Sao_Paulo`.

Fontes consultadas para a implementação: [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [imagens na Responses API](https://developers.openai.com/api/docs/guides/images-vision) e [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client).

## Funcionalidades

- Início baseado na referência, quatro cards, menu lateral e navegação inferior.
- Cadastro, login, confirmação de e-mail, recuperação, troca de senha e logout.
- Cadastro, consulta, pesquisa, filtro, edição e exclusão de animais. Identificação única por usuário; fotografia opcional, sexo, raça, idade, nascimento, peso conhecido e observações.
- Fluxo de pesagem com seleção, orientações, câmera via captura nativa do navegador, galeria, prévia, remoção, segunda foto opcional e medidas complementares.
- Compactação no celular e validação dos bytes no servidor; conversão WebP, rotação, remoção de metadados e limite de dimensões.
- Resultado estruturado, faixa não calibrada, evidência, condição corporal, observações e recomendações. O resultado fica em rascunho até ser salvo. Salvar repetidamente mantém o mesmo UUID.
- Histórico paginado, filtros por espécie, animal e período, busca por identificação, detalhes, exclusão confirmada e registro de peso real separado do peso estimado.
- Relatórios agregados no banco, indicadores, evolução, comparação com balança e distribuição por espécie. Filtros aplicados também ao CSV. Sem animal selecionado, as linhas exibem médias diárias do grupo.
- CSV paginado, com proteção contra fórmulas de planilha. O endpoint de relatório e seus dados estruturados permitem acrescentar um renderizador PDF posteriormente; exportação PDF não está implementada.
- Perfil, limite diário e solicitação de exclusão registrada no banco. **A exclusão de conta não é automática:** o operador precisa atender as solicitações conforme o procedimento abaixo.
- Notificações internas com leitura e indicador, sem push externo.
- Manifest, ícones e service worker restrito a uma lista de imagens estáticas públicas. Nenhuma API, HTML autenticado, foto privada ou token é colocado no Cache Storage. IA requer internet.

## Armazenamento e operação

Fotos ficam em buckets privados, em caminhos iniciados pelo UUID do dono. Visualização usa URLs assinadas por 10 minutos. Não compartilhe esses links; recarregar a página gera links novos.

O cliente aceita JPEG/PNG/WebP de até 15 MB para compactação. O servidor aceita cada original recebido de até 5 MB, decodifica os bytes reais, limita 40 milhões de pixels e redimensiona para até 1600 × 1600. O formulário de análise é limitado a cerca de 4 MB no total para respeitar o limite de payload de funções da Vercel. Em celulares sem suporte a `createImageBitmap`, escolha outro navegador compatível. HEIC não é aceito.

Exclusão de um animal remove suas fotos e as de todas as pesagens antes de excluir os registros associados. Exclusão de pesagem também remove as fotos. Falhas normais de análise tentam limpar uploads. Uma interrupção abrupta da função pode deixar fotos ou rascunhos órfãos; não são públicos. Não há fila nem tarefa permanente.

Procedimento periódico do operador:

1. Verifique `profiles.deletion_requested_at is not null` no painel Supabase e atenda as solicitações de acordo com o processo de suporte da propriedade/plataforma.
2. Para excluir uma conta, primeiro remova todos os objetos dos dois buckets sob o prefixo `UUID-DO-USUÁRIO/` pelo Storage/API administrativa. Depois exclua o usuário em Auth. As FKs removem seus dados relacionais. Não remova apenas `profiles`.
3. Revise rascunhos e tentativas `reserved` antigas após interrupções. Remova arquivos sem referência e rascunhos abandonados conforme sua política de retenção. Tentativas antigas permanecem contabilizadas no período; não remova consumo para contornar limite.
4. Monitore espaço do Storage, egress, banco, Auth, duração das funções e faturamento OpenAI. Os planos gratuitos possuem limites e não equivalem a uso ilimitado.

Os endpoints exigem mesma origem para mutações do navegador e retornam dados privados sem cache. Chaves ficam exclusivamente em módulos `server-only`. Logs não imprimem credenciais, fotografias ou respostas privadas. Não há serviços pagos adicionais obrigatórios.

## Vercel

1. Envie este projeto para seu repositório Git e importe na Vercel.
2. Framework: Next.js. Instalação: `npm ci`. Build: `npm run build`. Use Node.js 22.x.
3. Configure todas as variáveis de `.env.example` em Production e, se precisar, em Preview; segredos devem ser marcados como sensíveis. Não publique uma cópia de `.env.local`.
4. Configure as URLs de redirecionamento no Supabase para cada domínio utilizado. Prefira URLs exatas; cuidado ao autorizar domínios de preview.
5. Faça o deploy e execute o roteiro de verificação real. A publicação inicial foi executada pela CLI e está disponível no endereço acima. Deploy automático por Git ainda depende de conectar a conta GitHub nas configurações da Vercel.
6. Para domínio próprio, adicione o domínio nas configurações da Vercel, aplique os registros DNS apresentados e atualize Site URL/Redirect URLs no Supabase.

`/api/estimar-peso` usa runtime Node e `maxDuration=60`; a chamada paga tem timeout menor. Confirme a duração permitida no painel do plano e ajuste caso necessário. A arquitetura não depende de workers, VPS, Docker, Prisma ou Redis. Avalie a elegibilidade do uso pretendido para o plano Hobby nos termos vigentes da Vercel.

Instalação PWA depende de HTTPS em produção e do suporte do navegador. No Android, use Instalar aplicativo no navegador; no iPhone, Compartilhar → Adicionar à Tela de Início. Captura usa `accept`/`capture=environment`; o sistema pode oferecer a câmera ou um seletor, conforme o aparelho.

## Qualidade e testes

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Os testes de banco executam as migrations reais em PostgreSQL embarcado (PGlite), com schemas mínimos de Auth/Storage para testar RLS, permissões, triggers, constraints, CRUD, idempotência, cotas e agregações. Isso não substitui um projeto Supabase real, autenticação por e-mail, armazenamento remoto ou concorrência entre múltiplas conexões de produção.

Os testes OpenAI usam o SDK oficial com transporte HTTP controlado e respostas de teste explícitas: verificam payload multimodal, schema estrito, consumo, ausência de repetição e rejeição de saída inválida. Não efetuam chamadas pagas. Os testes de imagem exercitam Sharp com bytes reais e arquivos inválidos.

Consulte `docs/VERIFICACAO.md` para resultados executados e pendências. As conexões PostgreSQL foram configuradas localmente e as migrations aplicadas ao projeto Supabase. As chaves HTTP e o modelo `gpt-5.4-mini` estão configurados no ambiente de produção da Vercel. Foram validados com contas temporárias: login real, perfil, cadastro de animal, foto privada e URL assinada, uma chamada OpenAI, persistência, histórico, relatório, reenvio idempotente e isolamento entre contas. A imagem coletiva de referência foi corretamente tratada sem estimativa disponível; isso não valida a precisão de peso. Os dados de teste foram removidos. Está pendente a troca de Site URL e Redirect URLs no painel Supabase para confirmar cadastros e recuperar senhas no domínio publicado. O controle de navegador disponível informou que não havia navegador: a screenshot e a comparação visual renderizada permanecem pendentes. A referência foi aberta e analisada diretamente.

## Estrutura

- `src/app`: páginas, callback de autenticação e Route Handlers.
- `src/components`: navegação, formulários e módulos de animais, pesagem, histórico, relatórios e perfil.
- `src/lib/supabase`: clientes separados para navegador, sessão do servidor e administração.
- `src/lib/openai`: integração Responses e instruções internas.
- `src/lib/validations`: esquemas Zod e tipos compartilhados.
- `supabase/migrations`: esquema, segurança, cotas e relatórios.
- `tests`: testes automatizados isolados, sem credenciais reais.
- `public/assets`: recortes derivados da referência; original preservado na raiz.

**Limitação do produto:** peso por fotografia é experimental, sem precisão garantida ou certificação. A faixa fornecida pela IA não é intervalo estatístico calibrado. Utilize balança para confirmar peso e para decisões comerciais.
