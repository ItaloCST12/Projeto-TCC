# Requisitos do Sistema (TCC)

Data de levantamento: 02/03/2026  
Base: implementação atual do projeto (Front-end + Back-end)

## Requisitos Funcionais (RF)

| ID   | Requisito funcional                                                                                    | Ator                                            | Prioridade | Critério de aceitação                                                                                                                       |
| ---- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| RF01 | O sistema deve permitir cadastro de usuário com nome, telefone, e-mail e senha.                        | Visitante                                       | Alta       | Dado um formulário válido, quando enviar cadastro, então a conta é criada com perfil `USER` por padrão.                                     |
| RF02 | O sistema deve permitir login de usuário por e-mail e senha.                                           | Usuário/Administrador                           | Alta       | Dadas credenciais válidas, quando autenticar, então retorna token JWT e dados do usuário.                                                   |
| RF03 | O sistema deve permitir encerramento de sessão (logout) no cliente.                                    | Usuário/Administrador                           | Média      | Quando acionar sair, então token e dados de sessão são removidos do armazenamento local.                                                    |
| RF04 | O sistema deve permitir recuperação de senha por código temporário.                                    | Usuário                                         | Alta       | Dado e-mail cadastrado, quando solicitar recuperação, então é gerado código; ao confirmar código + nova senha válida, a senha é redefinida. |
| RF05 | O sistema deve controlar perfis de acesso `USER` e `ADMIN`.                                            | Sistema                                         | Alta       | Quando uma rota exigir privilégios de administrador, então usuário sem role `ADMIN` recebe acesso negado.                                   |
| RF06 | O sistema deve permitir consultar o próprio perfil.                                                    | Usuário/Administrador                           | Alta       | Quando autenticado consultar perfil, então retorna id, nome, e-mail, telefone e role.                                                       |
| RF07 | O sistema deve permitir atualizar o próprio telefone.                                                  | Usuário/Administrador                           | Média      | Quando enviar telefone válido para atualização do perfil, então o novo valor é persistido.                                                  |
| RF08 | O sistema deve permitir ao administrador listar usuários.                                              | Administrador                                   | Alta       | Quando admin consultar usuários, então recebe lista com dados básicos de contas.                                                            |
| RF09 | O sistema deve permitir ao administrador atualizar dados de usuário.                                   | Administrador                                   | Média      | Quando admin enviar campos válidos de edição, então os dados do usuário são atualizados.                                                    |
| RF10 | O sistema deve permitir ao administrador excluir usuário.                                              | Administrador                                   | Média      | Quando admin excluir um usuário existente, então conta e dados vinculados são removidos conforme regras da aplicação.                       |
| RF11 | O sistema deve permitir ao administrador consultar perfil completo de usuário (incluindo endereços).   | Administrador                                   | Média      | Quando admin consultar perfil por id, então retorna dados de conta e lista de endereços do usuário.                                         |
| RF12 | O sistema deve permitir cadastrar endereço para o usuário autenticado.                                 | Usuário                                         | Alta       | Dado usuário autenticado e campos obrigatórios (rua/cidade), quando criar endereço, então registro é salvo para o dono da conta.            |
| RF13 | O sistema deve permitir listar endereços do usuário autenticado.                                       | Usuário                                         | Alta       | Quando consultar `me`, então retorna somente os endereços do próprio usuário.                                                               |
| RF14 | O sistema deve permitir editar endereço do usuário autenticado.                                        | Usuário                                         | Média      | Quando editar endereço pertencente ao usuário com campos válidos, então as alterações são persistidas.                                      |
| RF15 | O sistema deve permitir excluir endereço do usuário autenticado quando não houver vínculo com pedidos. | Usuário                                         | Média      | Quando tentar excluir endereço sem pedidos vinculados, então endereço é removido; com vínculo, operação é bloqueada.                        |
| RF16 | O sistema deve permitir ao administrador listar todos os endereços.                                    | Administrador                                   | Baixa      | Quando admin consultar lista de endereços, então recebe registros globais ordenados.                                                        |
| RF17 | O sistema deve permitir listar produtos para compra.                                                   | Usuário/Visitante autenticado na área de compra | Alta       | Quando consultar produtos, então recebe catálogo com disponibilidade.                                                                       |
| RF18 | O sistema deve permitir ao administrador cadastrar produto com preço e disponibilidade.                | Administrador                                   | Alta       | Quando admin enviar nome e preço válidos, então produto é criado no banco.                                                                  |
| RF19 | O sistema deve permitir ao administrador alterar disponibilidade de produto.                           | Administrador                                   | Alta       | Quando admin alterar disponibilidade (`true/false`), então status do produto é atualizado.                                                  |
| RF20 | O sistema deve permitir adicionar itens ao carrinho, alterar quantidade, remover e limpar carrinho.    | Usuário                                         | Alta       | Quando operar carrinho, então estado local reflete inclusão/edição/remoção dentro dos limites definidos.                                    |
| RF21 | O sistema deve permitir criar pedido com um ou múltiplos itens.                                        | Usuário                                         | Alta       | Dado carrinho válido, quando finalizar compra, então pedido é criado com status inicial `PENDENTE`.                                         |
| RF22 | O sistema deve validar regras de pedido (quantidade, produto, pagamento e endereço para entrega).      | Sistema                                         | Alta       | Quando qualquer regra obrigatória for violada, então API retorna erro e pedido não é criado.                                                |
| RF23 | O sistema deve permitir listar as encomendas do usuário com paginação e filtro por data.               | Usuário                                         | Alta       | Quando consultar encomendas, então retorna coleção paginada e aceita filtros de intervalo de datas válidas.                                 |
| RF24 | O sistema deve permitir ao usuário cancelar pedido próprio não finalizado.                             | Usuário                                         | Alta       | Quando cancelar pedido próprio em estado permitido, então status muda para `CANCELADO`.                                                     |
| RF25 | O sistema deve permitir consultar histórico de pedidos do usuário.                                     | Usuário                                         | Média      | Quando consultar histórico, então retorna pedidos do usuário com itens e dados relacionados.                                                |
| RF26 | O sistema deve permitir ao administrador listar todos os pedidos com paginação/filtro.                 | Administrador                                   | Alta       | Quando admin consultar pedidos, então recebe lista paginada global com dados de cliente/produto/endereço.                                   |
| RF27 | O sistema deve permitir ao administrador finalizar pedidos.                                            | Administrador                                   | Alta       | Quando admin finalizar um pedido válido, então status muda para `COMPLETADO`.                                                               |
| RF28 | O sistema deve permitir controle de vendas por período com resumo financeiro.                          | Administrador                                   | Alta       | Quando admin selecionar período válido, então retorna vendas `COMPLETADO`, total de vendas e valor arrecadado.                              |
| RF29 | O sistema deve permitir exportar relatório de vendas em PDF no painel administrativo.                  | Administrador                                   | Média      | Quando acionar exportação, então arquivo PDF de controle de vendas é gerado/downloadado.                                                    |
| RF30 | O sistema deve permitir atendimento por chat entre usuário e suporte.                                  | Usuário/Administrador                           | Alta       | Quando usuário ou suporte envia mensagem válida, então mensagem é persistida e exibida na conversa correta.                                 |
| RF31 | O sistema deve permitir limpar conversa de atendimento do usuário.                                     | Usuário                                         | Média      | Quando usuário limpar conversa, então mensagens vinculadas são removidas e interface é atualizada.                                          |
| RF32 | O sistema deve atualizar chat em tempo real via WebSocket.                                             | Usuário/Administrador                           | Alta       | Quando houver nova mensagem/limpeza de conversa, então clientes conectados autorizados recebem evento em tempo real.                        |

## Requisitos Não Funcionais (RNF)

| ID    | Requisito não funcional                                                                      | Categoria                  | Prioridade | Critério de aceitação                                                                                  |
| ----- | -------------------------------------------------------------------------------------------- | -------------------------- | ---------- | ------------------------------------------------------------------------------------------------------ |
| RNF01 | O sistema deve usar autenticação baseada em JWT com expiração de sessão.                     | Segurança                  | Alta       | Tokens são exigidos nas rotas protegidas e possuem validade configurada (1h no login atual).           |
| RNF02 | O sistema deve armazenar senhas com hash criptográfico.                                      | Segurança                  | Alta       | Nenhuma senha é persistida em texto puro; autenticação compara hash com `bcrypt`.                      |
| RNF03 | O fluxo de recuperação de senha deve usar token seguro, expirável e de uso único.            | Segurança                  | Alta       | Código é armazenado em hash, expira em janela curta e é invalidado após uso.                           |
| RNF04 | O sistema deve aplicar controle de acesso por papel nas APIs administrativas.                | Segurança/Autorização      | Alta       | Rotas admin retornam `403` para usuários autenticados sem role adequada.                               |
| RNF05 | O sistema deve expor API em padrão JSON e comunicação em tempo real para atendimento.        | Interoperabilidade         | Média      | Endpoints REST retornam JSON e canal `/atendimentos/ws` entrega eventos de chat.                       |
| RNF06 | O sistema deve garantir integridade relacional dos dados com PostgreSQL e Prisma.            | Confiabilidade             | Alta       | Entidades possuem relacionamentos consistentes e operações críticas usam transações quando necessário. |
| RNF07 | O sistema deve suportar paginação e filtros de data para reduzir carga em listagens.         | Desempenho                 | Média      | Endpoints de pedidos retornam lotes paginados e aceitam intervalo de datas.                            |
| RNF08 | O sistema deve ser configurável por variáveis de ambiente.                                   | Portabilidade/Configuração | Alta       | Execução depende de `.env` para banco, CORS, SMTP e parâmetros de ambiente.                            |
| RNF09 | O sistema deve oferecer implantação local via Docker para serviços de banco e administração. | Implantação                | Média      | `docker compose` sobe PostgreSQL e pgAdmin com healthcheck.                                            |
| RNF10 | O front-end deve ser responsivo e manter navegação em diferentes tamanhos de tela.           | Usabilidade                | Média      | Layout possui navegação desktop/mobile com adaptação dos componentes principais.                       |
| RNF11 | O sistema deve disponibilizar recursos básicos de acessibilidade visual.                     | Acessibilidade             | Média      | Usuário pode ajustar zoom e alto contraste com persistência em `localStorage`.                         |
| RNF12 | O código deve ser tipado e de fácil manutenção com TypeScript e migrations versionadas.      | Manutenibilidade           | Média      | Back-end/front-end em TypeScript e banco evoluído por migrations Prisma versionadas.                   |

## Observações para o TCC

- Prioridades foram classificadas em `Alta`, `Média` e `Baixa` com base no impacto operacional atual.
- Os requisitos foram derivados da implementação existente; não representam escopo futuro não implementado.
- Se desejar, a próxima etapa é mapear cada requisito para **casos de uso** e **regras de negócio (RN)** numeradas.

## Fluxograma do Processo do Usuário

```mermaid
flowchart TD
	A[Início] --> B[Entrar na plataforma]

	subgraph ACESSO[1) Acesso e autenticação]
	B --> C{Já possui conta?}
	C -- Não --> D[Preencher cadastro<br/>nome, telefone, e-mail, senha]
	D --> E[Conta criada]
	E --> F[Realizar login]
	C -- Sim --> F
	F --> G{Credenciais válidas?}
	G -- Não --> H[Exibir erro de login]
	H --> I{Esqueceu a senha?}
	I -- Sim --> J[Solicitar código de redefinição]
	J --> K[Informar código + nova senha]
	K --> F
	I -- Não --> F
	G -- Sim --> L[Autenticação concluída]
	end

	subgraph COMPRA[2) Processo de compra]
	L --> M[Listar produtos disponíveis]
	M --> N[Selecionar produto(s), unidade e quantidade]
	N --> O[Adicionar ao carrinho]
	O --> P[Revisar carrinho<br/>editar/remover itens]
	P --> Q{Carrinho possui itens?}
	Q -- Não --> N
	Q -- Sim --> R[Escolher tipo de entrega]
	R --> S{Entrega em domicílio?}
	S -- Sim --> T[Selecionar ou cadastrar endereço]
	S -- Não --> U[Seguir sem endereço]
	T --> V[Selecionar forma de pagamento]
	U --> V
	V --> W[Confirmar e finalizar pedido]
	W --> X{Validações aprovadas?}
	X -- Não --> Y[Exibir erro de validação<br/>ex.: produto indisponível, quantidade inválida, endereço obrigatório]
	Y --> P
	X -- Sim --> Z[Pedido registrado com status PENDENTE]
	end

	subgraph POS[3) Pós-compra]
	Z --> AA[Acompanhar Minhas Encomendas<br/>com paginação e filtro por data]
	AA --> AB{Deseja cancelar pedido?}
	AB -- Não --> AC[Fim do fluxo do usuário]
	AB -- Sim --> AD[Solicitar cancelamento]
	AD --> AE{Pedido elegível para cancelamento?}
	AE -- Sim --> AF[Status atualizado para CANCELADO]
	AE -- Não --> AG[Exibir motivo<br/>ex.: pedido já finalizado]
	AF --> AC
	AG --> AC
	end
```

## Fluxograma do Processo do Administrador

```mermaid
flowchart TD
	A[Início] --> B[Login no sistema]

	subgraph ACESSO_ADMIN[1) Validação de acesso administrativo]
	B --> C{Credenciais válidas?}
	C -- Não --> D[Exibir erro de autenticação]
	D --> B
	C -- Sim --> E{Perfil é ADMIN?}
	E -- Não --> F[Bloquear acesso administrativo<br/>retornar 403]
	F --> G[Fim sem acesso ao painel]
	E -- Sim --> H[Abrir Painel Administrativo]
	end

	subgraph PRODUTOS[2) Gestão de produtos]
	H --> I[Listar produtos]
	I --> J{Ação desejada}
	J -- Cadastrar --> K[Informar nome, preço e disponibilidade]
	K --> L[Salvar produto]
	J -- Atualizar disponibilidade --> M[Selecionar produto e alterar status]
	M --> N[Persistir disponibilidade]
	L --> O[Retornar feedback de sucesso/erro]
	N --> O
	O --> H
	end

	subgraph PEDIDOS_VENDAS[3) Gestão de pedidos e vendas]
	H --> P[Listar pedidos com paginação e filtro]
	P --> Q{Deseja finalizar pedido?}
	Q -- Sim --> R[Finalizar pedido]
	R --> S[Atualizar status para COMPLETADO]
	Q -- Não --> T[Manter status atual]
	S --> H
	T --> H
	H --> U[Acessar controle de vendas]
	U --> V[Selecionar período<br/>pré-definido ou customizado]
	V --> W[Visualizar resumo<br/>total de vendas e valor arrecadado]
	W --> X{Exportar relatório?}
	X -- Sim --> Y[Gerar e baixar PDF]
	X -- Não --> H
	Y --> H
	end

	subgraph USUARIOS_ATENDIMENTO[4) Gestão de usuários e suporte]
	H --> Z[Listar usuários]
	Z --> AA{Operação de usuário}
	AA -- Consultar perfil --> AB[Visualizar perfil completo + endereços]
	AA -- Atualizar --> AC[Editar dados do usuário]
	AA -- Excluir --> AD[Excluir conta conforme regras]
	AB --> H
	AC --> H
	AD --> H
	H --> AE[Atendimento em tempo real]
	AE --> AF[Listar conversas]
	AF --> AG[Abrir conversa por usuário]
	AG --> AH[Responder mensagem como suporte]
	AH --> AI[Disparar evento WebSocket]
	AI --> H
	end

	H --> AJ[Encerrar sessão administrativa]
	AJ --> AK[Fim do fluxo do administrador]
```
