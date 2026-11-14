# Verificação

Data do trabalho: 14/11/2026 (America/Sao_Paulo).

## Executado localmente

- Referência `visualexato.png` aberta e analisada antes da implementação; original preservado.
- Instalação das dependências e auditoria: zero vulnerabilidades após atualização de Sharp e minimatch.
- TypeScript, ESLint e build de produção aprovados.
- Suíte completa: **22 testes aprovados**, sem falhas. Testes automatizados: migrations PostgreSQL reais em PGlite; isolamento entre dois usuários para animais, perfis, pesagens e fotos; bloqueio de alteração de consumo/resultados pelo cliente; CRUD; FK de propriedade; cotas diária/global; reenvio idempotente; faixas válidas/inválidas; ausência de evidência; relatórios; CSV; imagens; SDK OpenAI com transporte controlado.
- Servidor de produção local iniciado. HTTP 200 confirmado em início, login, animais, pesagem, registros, relatórios, perfil e manifest. API de dados retornou 503 com orientação de configuração na ausência de credenciais.

## Verificação real após a publicação

Aplicativo: https://pesocerto-six.vercel.app. Repositório público: https://github.com/leilrgom/pesocerto.

As duas migrations foram aplicadas ao Supabase remoto e registradas em `supabase_migrations.schema_migrations`. Confirmados RLS nas seis tabelas, buckets privados e bloqueio de leitura anônima/alteração de consumo e estimativas. Segredos foram configurados na Vercel e permanecem fora do repositório. Modelo configurado: `gpt-5.4-mini`.

Testes executados por HTTP na publicação, usando contas temporárias:

- Página inicial HTTP 200 e API de animais HTTP 401 sem sessão.
- Criação administrativa de conta temporária confirmada, login real por senha e leitura do perfil com cookies de sessão.
- Cadastro real de animal, upload no bucket privado e leitura por URL assinada.
- Uma chamada paga real à Responses API, com a imagem coletiva de referência. A resposta estruturada foi validada e não forneceu peso por falta de evidência apropriada. Isso verifica o fluxo e a recusa; não demonstra precisão de uma estimativa positiva.
- Salvamento de pesagem, inclusão de peso real de teste, consulta do histórico e agregação do relatório.
- Reenvio com o mesmo UUID/payload retornou o mesmo registro sem outra chamada paga.
- Segunda conta real não conseguiu consultar o animal da primeira conta, confirmando RLS por acesso HTTP.
- Animal, pesagem, fotografias e contas temporárias removidos ao concluir.

**Pendente no Supabase:** os links de autenticação ainda apontavam para `http://localhost:3000` no teste. É necessário configurar Site URL como `https://pesocerto-six.vercel.app` e adicionar as Redirect URLs `/auth/callback` e `/auth/callback?next=/atualizar-senha` desse domínio. Envio/recebimento de e-mails de confirmação e recuperação ainda não foram verificados.

O teste local de banco usa schemas mínimos que representam Auth/Storage. PGlite serializa consultas numa conexão: cotas são testadas localmente, mas a carga concorrente em múltiplas conexões precisa ser validada no PostgreSQL remoto. A pesagem positiva com foto completa de um animal ainda precisa ser verificada em campo.

A conexão automática GitHub → Vercel foi tentada, mas a Vercel informou que é necessário adicionar uma Login Connection do GitHub. A publicação pela CLI funciona; a sincronização automática de commits ainda não está habilitada.

O controle de navegador retornou “No browser is available”. Não foi feita screenshot nem comparação de pixels da implementação, nem teste de câmera física ou de responsividade em navegador. Não considerar a fidelidade visual renderizada aprovada apenas pelo build.

## Roteiro obrigatório com serviços reais

Use um projeto de homologação, duas contas distintas (A e B), fotografias próprias e um pequeno orçamento OpenAI.

| Caso              | Procedimento                                             | Resultado esperado                                          |
| ----------------- | -------------------------------------------------------- | ----------------------------------------------------------- |
| Cadastro          | Cadastre nome, e-mail e senha; confirme e-mail           | Perfil criado, confirmação e retorno ao início              |
| Login e sessão    | Entre, recarregue e reabra o aplicativo                  | Sessão persiste; módulos privados acessíveis                |
| Logout            | Saia e acesse `/animais` diretamente                     | Redirecionamento ao login e APIs sem dados                  |
| Recuperação       | Solicite link, abra e defina nova senha                  | Link válido abre atualização, nova senha funciona           |
| Link inválido     | Abra callback sem código ou com código vencido           | Retorno seguro ao login                                     |
| Animais           | Cadastre cada espécie, edite, busque e filtre            | Dados persistem; identificação duplicada rejeitada          |
| Isolamento        | Na conta B, tente IDs da conta A nas APIs e Storage      | Nenhum dado/foto da A fica disponível                       |
| Foto              | Teste câmera no Android/iPhone via HTTPS e galeria       | Captura ou seletor, prévia, refazer e remover funcionam     |
| Formato           | Tente HEIC, SVG, arquivo falso e arquivo grande          | Erro claro; nenhum upload indevido                          |
| Análise           | Foto lateral nítida e informações reais                  | Resultado da API real ou recusa fundamentada                |
| Evidência ruim    | Foto sem animal, escura ou bloqueada                     | Sem peso fictício; recomendações e pesos nulos              |
| Falha IA          | Em homologação, use chave/modelo inválido                | Erro claro, consumo registrado e nenhum peso inventado      |
| Duplicação        | Reenvie exatamente o mesmo UUID/payload                  | Mesma resposta ou estado em processamento; uma chamada paga |
| Cota diária       | Configure limite 1 e faça duas tentativas distintas      | Segunda bloqueada no banco                                  |
| Cota global       | Configure limite mensal pequeno, use A e B               | Soma global respeitada, incluindo simultaneidade            |
| Concorrência      | Dispare duas requisições distintas com limite restante 1 | Apenas uma reserva aprovada entre conexões                  |
| Salvar            | Clique repetidamente em Salvar pesagem                   | Um único registro visível no histórico                      |
| Registros         | Filtre espécie, animal e período, avance páginas         | Ordenação recente e resultados corretos                     |
| Peso real         | Adicione peso de balança em Detalhes                     | Peso real separado da estimativa                            |
| Relatórios        | Compare médias e contagens com SQL/histórico             | Apenas dados próprios e filtros aplicados                   |
| CSV               | Exporte com filtros e abra na planilha                   | Todas as páginas, UTF-8, fórmulas neutralizadas             |
| Exclusão          | Cancele e confirme exclusões                             | Cancelamento preserva; confirmação remove dados e fotos     |
| Perfil            | Atualize nome, telefone e propriedade                    | Dados persistem; e-mail somente leitura                     |
| Exclusão de conta | Registre uma solicitação                                 | Timestamp no perfil, mensagem de atendimento pendente       |
| Notificações      | Cadastre/salve, leia notificações                        | Eventos e indicador atualizados                             |
| PWA               | Instale no celular, examine Cache Storage                | Só imagens decorativas em cache, nenhum dado privado        |
| Offline           | Desative internet durante análise/consulta               | Mensagem de conexão; nenhuma promessa de IA offline         |
| Visual            | Compare screenshot a 436 × 730 com referência            | Ajustar cards, ícones, textos, espaçamento e curvas         |
| Responsividade    | Teste 320, 375, 390, 436, 768 e 1440 px                  | Sem corte horizontal, botões e áreas seguras utilizáveis    |

## Operação após publicação

Atenda solicitações de exclusão, monitore cotas/consumo, confira limites dos planos e limpe rascunhos/uploads órfãos após interrupções abruptas. O procedimento está no README. A exportação PDF é uma extensão futura; CSV está implementado.
