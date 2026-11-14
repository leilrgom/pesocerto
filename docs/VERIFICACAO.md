# Verificação

Data do trabalho: 14/11/2026 (America/Sao_Paulo).

## Executado localmente

- Referência `visualexato.png` aberta e analisada antes da implementação; original preservado.
- Instalação das dependências e auditoria: zero vulnerabilidades após atualização de Sharp e minimatch.
- TypeScript, ESLint e build de produção aprovados.
- Suíte completa: **22 testes aprovados**, sem falhas. Testes automatizados: migrations PostgreSQL reais em PGlite; isolamento entre dois usuários para animais, perfis, pesagens e fotos; bloqueio de alteração de consumo/resultados pelo cliente; CRUD; FK de propriedade; cotas diária/global; reenvio idempotente; faixas válidas/inválidas; ausência de evidência; relatórios; CSV; imagens; SDK OpenAI com transporte controlado.
- Servidor de produção local iniciado. HTTP 200 confirmado em início, login, animais, pesagem, registros, relatórios, perfil e manifest. API de dados retornou 503 com orientação de configuração na ausência de credenciais.

Atualização de configuração: conexões PostgreSQL salvas exclusivamente no `.env.local`; as duas migrations foram aplicadas ao Supabase remoto e registradas em `supabase_migrations.schema_migrations`. Confirmados RLS nas seis tabelas, dois buckets privados e bloqueio de leitura anônima/alteração de consumo e estimativas. Ainda não foram executados cadastro/login reais, envio de e-mail, upload no Supabase remoto, chamada paga OpenAI ou deploy Vercel. As chaves HTTP anon/service role e o modelo OpenAI ainda precisam ser configurados. O teste de banco usa schemas mínimos que representam as interfaces Auth/Storage; não é um teste do serviço remoto. PGlite serializa consultas numa conexão: o lock transacional está implementado, mas uma carga concorrente em múltiplas conexões precisa ser validada no PostgreSQL do projeto.

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
