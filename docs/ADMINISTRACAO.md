# Administração

Acesso: https://www.pesocorreto.com.br/admin/login. Painel protegido: `/admin`.

O login administrativo usa um nome de usuário. A senha é verificada pelo Supabase Authentication. O nome de usuário é associado a uma conta Auth com endereço interno gerado durante o provisionamento; esse endereço não é usado para envio de mensagens. Não há senha administrativa fixa no código, no JavaScript do navegador ou nas migrations.

## Painel implementado

- Visão geral de usuários, animais, pesagens salvas e análises do dia.
- Utilização mensal da IA, estados das tentativas e tokens retornados pelo provedor.
- Consulta do modelo e dos limites em uso no servidor.
- Diretório paginado de usuários, com pesquisa por nome, e-mail ou propriedade.
- Consulta dos dados de contato, contagens e até dez animais e pesagens recentes de cada usuário.
- Histórico paginado das tentativas de análise, com filtro por situação.
- Consulta das solicitações de exclusão de conta. O painel não apaga contas ou fotografias automaticamente; siga o procedimento operacional do README.
- Encerramento de sessão pelo botão Sair.

Esta versão concentra consulta e acompanhamento. Alterações dos limites globais continuam sendo feitas nas variáveis de ambiente da Vercel.

## Segurança

A tabela `admin_accounts` define os administradores autorizados. Ela não pode ser consultada ou modificada pelas roles `anon` e `authenticated`. Cada acesso à página protegida e à API valida a sessão no Supabase e verifica a conta administrativa ativa no banco usando o cliente exclusivo do servidor.

Metadados enviados no cadastro, como `role: admin` ou `is_admin: true`, não concedem privilégios. As funções de consulta global e limitação de login só podem ser chamadas pela service role. O isolamento normal dos dados dos produtores permanece em vigor.

O login limita tentativas em janelas de quinze minutos, com contadores atômicos no PostgreSQL: até doze por usuário e trinta por origem de rede. Os identificadores de rede são armazenados como hashes com segredo do servidor. Logins bem-sucedidos também contam na janela. Todas as respostas privadas usam `Cache-Control: private, no-store`; páginas e APIs administrativas não são armazenadas pelo service worker.

Para revogar o acesso, um operador com acesso ao banco pode definir `admin_accounts.active=false`. Uma sessão existente perde autorização na próxima consulta administrativa. Nenhuma rota pública permite atribuir esse papel.

## Configuração em novos ambientes

Execute as migrations em ordem, incluindo `supabase/migrations/202611150001_admin.sql`. Para criar um administrador, configure `ADMIN_USERNAME` e `ADMIN_PASSWORD` temporariamente no ambiente local e execute:

```bash
node --env-file=.env.local scripts/create-admin.mjs
```

O script usa `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`. Não coloque a senha na linha de comando, em arquivos versionados ou em variáveis `NEXT_PUBLIC_`. O script não sobrescreve uma conta existente nem altera silenciosamente uma senha.

As variáveis `ADMIN_USERNAME` e `ADMIN_PASSWORD` são usadas apenas pelo script de provisionamento. A aplicação publicada autentica com o Supabase e não precisa dessas variáveis na Vercel.

## Verificação

```bash
npm test
npm run lint
npm run build
```

A suíte local contém 28 testes, incluindo bloqueio de leitura/atribuição de papel administrativo por usuários comuns, acesso a RPCs privilegiadas, consultas e paginação, limitação de tentativas e validação de origem das requisições.

Verificação HTTP integrada, com credenciais configuradas apenas no ambiente:

```bash
node --env-file=.env.local scripts/check-admin.mjs
```

Além das credenciais Supabase, esse script requer `ADMIN_CHECK_URL`, `ADMIN_USERNAME` e `ADMIN_PASSWORD`. Ele verifica login, senha incorreta, origem externa, página protegida, APIs e logout. Cria uma conta comum temporária com metadados que simulam uma tentativa de elevação de privilégio, confirma o bloqueio e remove a conta ao concluir. Não envia e-mails nem chama a OpenAI. Cada execução inclui duas tentativas de login e deve respeitar a janela de limitação.

Uma página negada pode responder por redirecionamento HTTP ou por uma meta tag de redirecionamento, conforme o streaming do Next.js. Em ambos os casos, o painel não é renderizado; a API retorna 403 para uma conta autenticada sem autorização.

## Resultado executado — 15/11/2026

Migration aplicada ao Supabase e conta solicitada provisionada com Supabase Auth, sem senha no repositório. Build, lint e os 28 testes locais passaram. O script de verificação HTTP também passou no servidor local e em `https://www.pesocorreto.com.br`: login válido, senha incorreta, bloqueio de origem externa, indicadores, diretório, consumo de IA, solicitações, consulta de detalhes e logout. A conta comum temporária foi impedida de acessar a página, a API, a tabela de administradores e a RPC global, mesmo com metadados de administrador. Todas as contas temporárias foram removidas; a conta administrativa solicitada permanece ativa.
