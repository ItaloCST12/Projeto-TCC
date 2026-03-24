# Diagrama de Sequência UML — Visão de Processo do Sistema

> **Sistema**: Fazenda Bispo — E-commerce Agrícola  
> **Modelo Arquitetural**: 4+1 de Kruchten — Visão de Processo  
> **Data**: Março/2026

## Sumário

1. [Visão Geral de Processo](#1-visão-geral-de-processo)
2. [Fluxo de Autenticação](#2-fluxo-de-autenticação)
3. [Fluxo de Pedidos](#3-fluxo-de-pedidos)
4. [Fluxo de Atendimento em Tempo Real](#4-fluxo-de-atendimento-em-tempo-real-websocket)
5. [Fluxo de Produtos e Integrações Externas](#5-fluxo-de-produtos-endereços-e-integrações-externas)

---

## Componentes Participantes

| Componente             | Tecnologia                               | Responsabilidade                                                             |
| ---------------------- | ---------------------------------------- | ---------------------------------------------------------------------------- |
| **Cliente (Browser)**  | React SPA + React Router                 | Interface do usuário, navegação SPA, estado local (carrinho em localStorage) |
| **Frontend React SPA** | Vite + TailwindCSS + React Query         | Renderização, gerenciamento de estado, chamadas HTTP e WebSocket             |
| **Backend Express**    | Express.js + Node.js                     | Servidor HTTP, roteamento, cadeia de middlewares, servir SPA                 |
| **Middlewares**        | helmet, cors, express-rate-limit, multer | Segurança, CORS, rate limiting, upload de arquivos                           |
| **Auth Middleware**    | jsonwebtoken (JWT)                       | Verificação de token, extração de `{usuarioId, email, role}`                 |
| **Controllers**        | Express handlers                         | Validação de entrada, orquestração de chamadas ao service                    |
| **Services**           | Lógica de negócio pura                   | Regras de negócio, cálculos de preço, comunicação com DB e APIs externas     |
| **WebSocket Server**   | ws (biblioteca nativa)                   | Conexões persistentes, broadcast de eventos em tempo real                    |
| **PostgreSQL**         | Prisma ORM                               | Persistência de dados, transações ACID                                       |
| **ViaCEP**             | API REST externa                         | Consulta de endereços por CEP                                                |
| **Resend**             | API REST externa                         | Envio de emails transacionais (recuperação de senha)                         |

---

## 1. Visão Geral de Processo

Diagrama que apresenta a interação macro entre todos os componentes do sistema, incluindo inicialização, fluxo HTTP padrão e comunicação WebSocket concorrente.

```mermaid
sequenceDiagram
    autonumber
    actor Cliente as Cliente (Browser)
    participant SPA as Frontend React SPA
    participant Express as Backend Express
    participant MW as Middlewares (Auth/Upload)
    participant Ctrl as Controllers
    participant Svc as Services
    participant WS as WebSocket Server
    participant DB as PostgreSQL (Prisma)
    participant Ext as Serviços Externos<br/>(ViaCEP / Resend / MercadoPago)

    rect rgb(230, 245, 255)
        Note over Cliente, Ext: INICIALIZAÇÃO DO SISTEMA
        Express->>DB: Prisma Client connect()
        Express->>WS: Inicializar WebSocket Server (mesma porta HTTP)
        Express->>Express: helmet() → json() → cors() → static()
        Express->>Express: Registrar rotas (/auth, /usuarios, /produtos, /pedidos, /enderecos, /atendimentos, /pagamentos)
        Express->>Express: SPA fallback (index.html)
    end

    rect rgb(255, 248, 230)
        Note over Cliente, Ext: FLUXO DE REQUISIÇÃO HTTP (PADRÃO)
        Cliente->>SPA: Interação do usuário
        SPA->>Express: HTTP Request (GET/POST/PATCH/DELETE)
        Express->>MW: Passa pela cadeia de middlewares
        MW->>Ctrl: Request autenticado/autorizado
        Ctrl->>Svc: Chamada de lógica de negócio
        Svc->>DB: Query Prisma (CRUD)
        DB-->>Svc: Resultado
        Svc-->>Ctrl: Dados processados
        Ctrl-->>Express: Response JSON
        Express-->>SPA: HTTP Response
        SPA-->>Cliente: UI atualizada (React state)
    end

    rect rgb(230, 255, 230)
        Note over Cliente, Ext: FLUXO WEBSOCKET (CONCORRENTE)
        Cliente->>WS: ws://host/atendimentos/ws?token=JWT
        WS->>MW: Validar JWT da query string
        MW-->>WS: {usuarioId, email, role}
        WS-->>Cliente: Conexão estabelecida
        Note over WS: Mantém mapa de conexões ativas<br/>(Map: usuarioId → WebSocket[])
        par Mensagem enviada pelo usuário
            Cliente->>Express: POST /atendimentos/me
            Express->>Svc: Criar mensagem no DB
            Svc->>DB: INSERT AtendimentoMensagem
            Svc->>WS: Broadcast evento
            WS-->>Cliente: emit("mensagem_nova")
        and Resposta do admin (concorrente)
            Cliente->>Express: POST /atendimentos/admin/conversas/:id/responder
            Express->>Svc: Criar mensagem SUPORTE
            Svc->>DB: INSERT AtendimentoMensagem
            Svc->>WS: Broadcast evento
            WS-->>Cliente: emit("mensagem_nova")
        end
    end
```

### Aspectos de Concorrência Evidenciados

- **HTTP e WebSocket coexistem** na mesma porta, processando requisições em paralelo via event loop do Node.js.
- **Múltiplos clientes** podem enviar mensagens simultaneamente; o WebSocket Server mantém um `Map<usuarioId, WebSocket[]>` para roteamento.
- **Broadcast assíncrono** ocorre em paralelo com o response HTTP — o cliente recebe tanto a confirmação HTTP quanto a notificação WebSocket.

---

## 2. Fluxo de Autenticação

Detalha os três processos de autenticação: registro, login (com rate limiting) e recuperação de senha (com integração de email).

```mermaid
sequenceDiagram
    autonumber
    actor User as Usuário
    participant SPA as Frontend React
    participant API as Express API
    participant AuthCtrl as Auth Controller
    participant AuthSvc as Auth Service
    participant DB as PostgreSQL
    participant Email as Resend (Email)

    rect rgb(230, 245, 255)
        Note over User, Email: 1. REGISTRO DE NOVO USUÁRIO
        User->>SPA: Preenche formulário (nome, email, senha)
        SPA->>API: POST /auth/register
        API->>AuthCtrl: register(req, res)
        AuthCtrl->>AuthSvc: findByEmail(email)
        AuthSvc->>DB: SELECT Usuario WHERE email
        DB-->>AuthSvc: null (não existe)
        AuthCtrl->>AuthSvc: createUser(nome, email, bcrypt(senha))
        AuthSvc->>DB: INSERT INTO Usuario
        DB-->>AuthSvc: Usuario criado
        AuthSvc->>AuthSvc: jwt.sign({usuarioId, email, role}, SECRET, 1h)
        AuthSvc-->>AuthCtrl: {token, usuario}
        AuthCtrl-->>API: 201 Created
        API-->>SPA: {token, usuario}
        SPA->>SPA: localStorage.setItem("token", token)
        SPA-->>User: Redireciona para Home
    end

    rect rgb(255, 248, 230)
        Note over User, Email: 2. LOGIN (Rate-Limited: 15 req/15min)
        User->>SPA: Informa email + senha
        SPA->>API: POST /auth/login
        Note over API: Rate Limiter verifica IP<br/>max 15 tentativas / 15 min
        API->>AuthCtrl: login(req, res)
        AuthCtrl->>AuthSvc: findByEmail(email)
        AuthSvc->>DB: SELECT Usuario WHERE email
        DB-->>AuthSvc: Usuario encontrado
        AuthSvc->>AuthSvc: bcrypt.compare(senha, hash)
        alt Senha válida
            AuthSvc->>AuthSvc: jwt.sign({usuarioId, email, role}, SECRET, 1h)
            AuthSvc-->>AuthCtrl: {token, usuario}
            AuthCtrl-->>API: 200 OK
            API-->>SPA: {token, usuario}
            SPA-->>User: Dashboard / Home
        else Senha inválida
            AuthSvc-->>AuthCtrl: throw Error
            AuthCtrl-->>API: 401 Unauthorized
            API-->>SPA: "Credenciais inválidas"
            SPA-->>User: Exibe mensagem de erro
        end
    end

    rect rgb(255, 230, 230)
        Note over User, Email: 3. RECUPERAÇÃO DE SENHA (2 etapas)
        User->>SPA: Clica "Esqueci minha senha"
        SPA->>API: POST /auth/forgot-password/request {email}
        API->>AuthCtrl: requestPasswordReset(req, res)
        AuthCtrl->>AuthSvc: findByEmail(email)
        AuthSvc->>DB: SELECT Usuario WHERE email
        DB-->>AuthSvc: Usuario encontrado
        AuthSvc->>AuthSvc: Gerar código 6 dígitos + SHA256 hash
        AuthSvc->>DB: DELETE tokens antigos do usuario
        AuthSvc->>DB: INSERT PasswordResetToken (hash, expiry: 15min)
        AuthSvc->>Email: Resend.emails.send({to: email, code})
        Email-->>AuthSvc: Email entregue
        AuthSvc-->>AuthCtrl: "Código enviado"
        AuthCtrl-->>API: 200 OK
        API-->>SPA: "Verifique seu email"
        SPA-->>User: Formulário de código + nova senha

        User->>SPA: Informa código + nova senha
        SPA->>API: POST /auth/forgot-password {email, code, newPassword}
        API->>AuthCtrl: resetPassword(req, res)
        AuthCtrl->>AuthSvc: SHA256(code) → hashCode
        AuthSvc->>DB: SELECT PasswordResetToken WHERE hash = hashCode AND expiresAt > now
        DB-->>AuthSvc: Token válido encontrado
        AuthSvc->>AuthSvc: bcrypt(newPassword)
        AuthSvc->>DB: UPDATE Usuario SET senha = newHash
        AuthSvc->>DB: DELETE PasswordResetToken (consumed)
        AuthSvc-->>AuthCtrl: "Senha redefinida"
        AuthCtrl-->>API: 200 OK
        API-->>SPA: Sucesso
        SPA-->>User: Redireciona para Login
    end
```

### Mecanismos de Segurança no Processo

| Mecanismo          | Descrição                                                                    |
| ------------------ | ---------------------------------------------------------------------------- |
| **Rate Limiting**  | Login limitado a 15 tentativas por IP a cada 15 minutos                      |
| **bcrypt**         | Senhas armazenadas com hash bcrypt (salt automático)                         |
| **JWT (1h)**       | Token de acesso com expiração de 1 hora; payload: `{usuarioId, email, role}` |
| **SHA256**         | Código de reset armazenado como hash — código original nunca persiste no DB  |
| **Token de Reset** | Expiração de 15 minutos; tokens anteriores são removidos antes de criar novo |

---

## 3. Fluxo de Pedidos

Processo central do sistema: criação de pedido com validação de estoque, cálculo de preço (incluindo lógica especial para abacaxi), ciclo de vida completo com transições de status, e consultas concorrentes.

```mermaid
sequenceDiagram
    autonumber
    actor Cliente as Cliente
    actor Admin as Administrador
    participant SPA as Frontend React
    participant API as Express API
    participant AuthMW as authMiddleware
    participant PedCtrl as Pedido Controller
    participant PedSvc as Pedido Service
    participant DB as PostgreSQL

    rect rgb(230, 245, 255)
        Note over Cliente, DB: CRIAÇÃO DO PEDIDO (CLIENTE)
        Cliente->>SPA: Adiciona produtos ao carrinho (localStorage)
        SPA->>SPA: Monta payload com itens, enderecoId, formaPagamento, tipoEntrega
        SPA->>API: POST /pedidos {itens[], enderecoId, formaPagamento, tipoEntrega, observacoes}
        API->>AuthMW: Verificar JWT (Bearer token)
        AuthMW->>AuthMW: jwt.verify(token) → {usuarioId, role}
        AuthMW-->>API: req.usuario = payload
        API->>PedCtrl: criarPedido(req, res)

        loop Para cada item do pedido
            PedCtrl->>PedSvc: Validar produto
            PedSvc->>DB: SELECT Produto WHERE id AND excluido=false
            DB-->>PedSvc: Produto encontrado
            Note over PedSvc: Calcular preço:<br/>Se produto = "Abacaxi":<br/>  detectar tamanho pela unidade<br/>  "kg (grande)" → precoAbacaxiGrande<br/>  "kg (médio)" → precoAbacaxiMedio<br/>  "kg (pequeno)" → precoAbacaxiPequeno<br/>Senão: preco padrão do produto
            PedSvc->>PedSvc: valorItem = precoUnitario × quantidade
        end

        alt tipoEntrega = "entrega"
            PedSvc->>DB: SELECT Endereco WHERE id AND usuarioId
            DB-->>PedSvc: Endereço pertence ao usuário ✓
        end

        PedSvc->>DB: BEGIN TRANSACTION
        PedSvc->>DB: INSERT Pedido (status=PENDENTE, valorTotal, createdAt)
        PedSvc->>DB: INSERT ItemPedido[] (produtoId, quantidade, unidade, valorUnitario)
        PedSvc->>DB: COMMIT
        DB-->>PedSvc: Pedido criado com ID
        PedSvc-->>PedCtrl: {pedido, itens}
        PedCtrl-->>API: 201 Created
        API-->>SPA: {pedido}
        SPA->>SPA: Limpar carrinho (localStorage.removeItem)
        SPA-->>Cliente: Exibe confirmação do pedido
    end

    rect rgb(255, 248, 230)
        Note over Cliente, DB: CONSULTA DE PEDIDOS (CONCORRENTE)
        par Cliente consulta seus pedidos
            Cliente->>SPA: Acessa "Minhas Encomendas"
            SPA->>API: GET /pedidos/minhas-encomendas?page=1&limit=10
            API->>AuthMW: Verificar JWT
            AuthMW-->>API: req.usuario
            API->>PedCtrl: listarPedidosUsuario(req, res)
            PedCtrl->>PedSvc: getPedidosByUsuario(usuarioId, page, limit)
            PedSvc->>DB: SELECT Pedido WHERE usuarioId ORDER BY createdAt DESC
            DB-->>PedSvc: Pedidos paginados
            PedSvc-->>PedCtrl: {pedidos[], total, page}
            PedCtrl-->>SPA: 200 OK {data, pagination}
            SPA-->>Cliente: Exibe lista de pedidos com status
        and Admin consulta todos os pedidos
            Admin->>SPA: Acessa "Painel de Entregas"
            SPA->>API: GET /pedidos (admin)
            API->>AuthMW: Verificar JWT + role=ADMIN
            API->>PedCtrl: listarTodosPedidos(req, res)
            PedCtrl->>PedSvc: getAllPedidos()
            PedSvc->>DB: SELECT Pedido JOIN Usuario JOIN ItemPedido JOIN Produto
            DB-->>PedSvc: Todos os pedidos com detalhes
            PedSvc-->>PedCtrl: pedidos[]
            PedCtrl-->>SPA: 200 OK
            SPA-->>Admin: Exibe painel com todos pedidos
        end
    end

    rect rgb(230, 255, 230)
        Note over Cliente, DB: CICLO DE VIDA DO PEDIDO (TRANSIÇÕES DE STATUS)
        Note over DB: Estado inicial: PENDENTE

        Admin->>SPA: Marca pedido como "Pronto para Retirada"
        SPA->>API: PATCH /pedidos/:id/pronto-retirada
        API->>AuthMW: Verificar JWT + role=ADMIN
        API->>PedCtrl: marcarProntoRetirada(req, res)
        PedCtrl->>PedSvc: updateStatus(id, PRONTO_PARA_RETIRADA)
        PedSvc->>DB: UPDATE Pedido SET status = 'PRONTO_PARA_RETIRADA'
        DB-->>PedSvc: OK
        PedSvc-->>PedCtrl: Pedido atualizado
        PedCtrl-->>SPA: 200 OK

        alt tipoEntrega = "entrega"
            Admin->>SPA: Marca "Saiu para Entrega"
            SPA->>API: PATCH /pedidos/:id/saiu-entrega
            API->>PedCtrl: marcarSaiuEntrega(req, res)
            PedCtrl->>PedSvc: Verifica tipoEntrega = "entrega"
            PedSvc->>DB: UPDATE Pedido SET status = 'SAIU_PARA_ENTREGA'
            DB-->>PedSvc: OK
            PedSvc-->>PedCtrl: Pedido atualizado
            PedCtrl-->>SPA: 200 OK
        end

        Admin->>SPA: Finaliza pedido
        SPA->>API: PATCH /pedidos/:id/finalizar
        API->>PedCtrl: finalizarPedido(req, res)
        PedSvc->>DB: UPDATE Pedido SET status = 'COMPLETADO'
        DB-->>PedSvc: OK
        PedCtrl-->>SPA: 200 OK
        SPA-->>Admin: Status atualizado no painel
    end

    rect rgb(255, 230, 230)
        Note over Cliente, DB: CANCELAMENTO (SOMENTE SE PENDENTE)
        Cliente->>SPA: Clica "Cancelar Pedido"
        SPA->>API: PATCH /pedidos/:id/cancelar
        API->>AuthMW: Verificar JWT (dono do pedido)
        API->>PedCtrl: cancelarPedido(req, res)
        PedCtrl->>PedSvc: Verificar status atual
        PedSvc->>DB: SELECT Pedido WHERE id AND usuarioId
        alt status = PENDENTE
            PedSvc->>DB: UPDATE Pedido SET status = 'CANCELADO'
            DB-->>PedSvc: OK
            PedCtrl-->>SPA: 200 OK "Pedido cancelado"
            SPA-->>Cliente: Confirmação de cancelamento
        else status ≠ PENDENTE
            PedSvc-->>PedCtrl: throw Error
            PedCtrl-->>SPA: 400 "Pedido não pode ser cancelado"
            SPA-->>Cliente: Exibe mensagem de erro
        end
    end
```

### Máquina de Estados do Pedido

```
PENDENTE ──────────────────┬──→ PRONTO_PARA_RETIRADA ──→ SAIU_PARA_ENTREGA ──→ COMPLETADO
   │                       │              │                                         ▲
   │                       │              └──────────── (retirada) ─────────────────┘
   └── CANCELADO           └──→ COMPLETADO (direto, se retirada)
```

| Transição                                | Ator    | Condição                     |
| ---------------------------------------- | ------- | ---------------------------- |
| PENDENTE → PRONTO_PARA_RETIRADA          | Admin   | —                            |
| PRONTO_PARA_RETIRADA → SAIU_PARA_ENTREGA | Admin   | tipoEntrega = "entrega"      |
| SAIU_PARA_ENTREGA → COMPLETADO           | Admin   | —                            |
| PRONTO_PARA_RETIRADA → COMPLETADO        | Admin   | tipoEntrega = "retirada"     |
| PENDENTE → CANCELADO                     | Cliente | Somente se status = PENDENTE |

---

## 4. Fluxo de Atendimento em Tempo Real (WebSocket)

Processo de comunicação bidirecional entre cliente e suporte via WebSocket, com broadcast concorrente de eventos e gerenciamento de conexões ativas.

```mermaid
sequenceDiagram
    autonumber
    actor User as Usuário / Admin
    participant SPA as Frontend React
    participant API as Express API
    participant AuthMW as Auth Middleware
    participant WS as WebSocket Server
    participant AteCtrl as Atendimento Controller
    participant AteSvc as Atendimento Service
    participant DB as PostgreSQL

    rect rgb(230, 245, 255)
        Note over User, DB: ESTABELECIMENTO DE CONEXÃO WEBSOCKET
        User->>SPA: Acessa página de Chat
        SPA->>WS: new WebSocket("ws://host/atendimentos/ws?token=JWT")
        WS->>WS: Extrair token da query string
        WS->>AuthMW: jwt.verify(token, SECRET)
        alt Token válido
            AuthMW-->>WS: {usuarioId, email, role}
            WS->>WS: Registrar conexão no Map<usuarioId, WebSocket[]>
            WS-->>SPA: Conexão aberta (onopen)
            SPA-->>User: Chat pronto para uso
        else Token inválido / expirado
            WS-->>SPA: close(1008, "Token inválido")
            SPA-->>User: Erro: sessão expirada
        end
    end

    rect rgb(255, 248, 230)
        Note over User, DB: CLIENTE ENVIA MENSAGEM
        User->>SPA: Digita mensagem (max 300 chars)
        SPA->>API: POST /atendimentos/me {texto}
        API->>AuthMW: Verificar JWT → usuarioId
        API->>AteCtrl: enviarMensagem(req, res)
        AteCtrl->>AteSvc: criarMensagem(usuarioId, texto, autor="USUARIO")
        AteSvc->>DB: INSERT AtendimentoMensagem {usuarioId, autor, texto, createdAt}
        DB-->>AteSvc: Mensagem criada (id, ...)
        AteSvc-->>AteCtrl: mensagem

        Note over AteCtrl, WS: BROADCAST EM TEMPO REAL (CONCORRENTE COM RESPONSE HTTP)
        par Response HTTP
            AteCtrl-->>API: 201 Created {mensagem}
            API-->>SPA: Response JSON
        and WebSocket Broadcast
            AteCtrl->>WS: broadcast("mensagem_nova", {id, usuarioId, autor, texto, createdAt})
            WS->>WS: Buscar conexões do usuarioId no Map
            WS-->>SPA: emit → User (confirmação)
            WS->>WS: Buscar conexões de ADMINs
            WS-->>SPA: emit → Todos os Admins online
        end
    end

    rect rgb(230, 255, 230)
        Note over User, DB: ADMIN RESPONDE AO CLIENTE
        User->>SPA: Admin seleciona conversa e digita resposta
        SPA->>API: POST /atendimentos/admin/conversas/:usuarioId/responder {texto}
        API->>AuthMW: Verificar JWT + role=ADMIN
        API->>AteCtrl: responderMensagem(req, res)
        AteCtrl->>AteSvc: criarMensagem(usuarioId, texto, autor="SUPORTE")
        AteSvc->>DB: INSERT AtendimentoMensagem {usuarioId, autor="SUPORTE", texto}
        DB-->>AteSvc: Mensagem criada

        par Response HTTP
            AteCtrl-->>API: 201 Created
            API-->>SPA: Response JSON ao Admin
        and WebSocket Broadcast
            AteCtrl->>WS: broadcast("mensagem_nova", {id, usuarioId, autor="SUPORTE", texto})
            WS-->>SPA: emit → Cliente alvo (notificação em tempo real)
            WS-->>SPA: emit → Todos os Admins online
        end
    end

    rect rgb(255, 230, 230)
        Note over User, DB: ADMIN LISTA CONVERSAS (PAINEL)
        User->>SPA: Admin acessa lista de conversas
        SPA->>API: GET /atendimentos/admin/conversas
        API->>AuthMW: Verificar JWT + role=ADMIN
        API->>AteCtrl: listarConversas(req, res)
        AteCtrl->>AteSvc: getConversas()
        AteSvc->>DB: SELECT DISTINCT usuarioId, COUNT(*), MAX(createdAt) FROM AtendimentoMensagem GROUP BY usuarioId
        DB-->>AteSvc: [{usuarioId, totalMensagens, ultimaMensagem}]
        AteSvc-->>AteCtrl: conversas[]
        AteCtrl-->>SPA: 200 OK
        SPA-->>User: Lista de conversas com preview
    end

    rect rgb(245, 230, 255)
        Note over User, DB: LIMPEZA DE CONVERSA
        User->>SPA: Cliente limpa histórico
        SPA->>API: DELETE /atendimentos/me
        API->>AuthMW: Verificar JWT
        API->>AteCtrl: limparConversa(req, res)
        AteCtrl->>AteSvc: deleteMensagens(usuarioId)
        AteSvc->>DB: DELETE FROM AtendimentoMensagem WHERE usuarioId
        DB-->>AteSvc: OK

        par Response HTTP
            AteCtrl-->>API: 200 OK
            API-->>SPA: Conversa limpa
        and WebSocket Broadcast
            AteCtrl->>WS: broadcast("conversa_limpada", {usuarioId})
            WS-->>SPA: emit → Cliente + Admins online
        end
        SPA-->>User: Chat limpo
    end
```

### Eventos WebSocket

| Evento             | Payload                                    | Destinatários               | Gatilho                          |
| ------------------ | ------------------------------------------ | --------------------------- | -------------------------------- |
| `mensagem_nova`    | `{id, usuarioId, autor, texto, createdAt}` | Usuário dono + todos ADMINs | POST mensagem (usuario ou admin) |
| `conversa_limpada` | `{usuarioId}`                              | Usuário dono + todos ADMINs | DELETE conversa                  |

### Modelo de Concorrência

- O WebSocket Server mantém um **Map** de conexões ativas indexado por `usuarioId`.
- Cada usuário pode ter **múltiplas conexões simultâneas** (ex.: múltiplas abas).
- O broadcast itera sobre todas as conexões registradas — se um admin tem 3 abas abertas, as 3 recebem o evento.
- As operações de **persistência (DB)** e **broadcast (WS)** ocorrem de forma **concorrente** após o processamento da mensagem.

---

## 5. Fluxo de Produtos, Endereços e Integrações Externas

Processos de gestão de catálogo (com upload de imagem e soft delete), consulta pública de produtos, e integração com API ViaCEP para autopreenchimento de endereços.

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Administrador
    actor Cliente as Cliente
    participant SPA as Frontend React
    participant API as Express API
    participant AuthMW as Auth + Admin MW
    participant Upload as Multer Middleware
    participant ProdCtrl as Produto Controller
    participant ProdSvc as Produto Service
    participant DB as PostgreSQL
    participant ViaCEP as API ViaCEP
    participant EndSvc as Endereco Service

    rect rgb(230, 245, 255)
        Note over Admin, ViaCEP: CADASTRO DE PRODUTO COM UPLOAD DE IMAGEM (ADMIN)
        Admin->>SPA: Preenche formulário + seleciona imagem
        SPA->>API: POST /produtos/cadastrarProduto (multipart/form-data)
        API->>AuthMW: JWT verify + role=ADMIN
        AuthMW-->>API: Autorizado
        API->>Upload: multer.single("imagem") — max 5MB, jpeg/png/webp
        alt Arquivo válido
            Upload->>Upload: Salvar em /public/uploads/{timestamp}-{filename}
            Upload-->>API: req.file = {path, filename, ...}
        else Arquivo inválido ou ausente
            Upload-->>API: 400 "Tipo de arquivo não suportado"
            API-->>SPA: Error response
        end
        API->>ProdCtrl: cadastrarProduto(req, res)
        ProdCtrl->>ProdSvc: create({nome, descricao, preco, imagemUrl, precoAbacaxi*})
        ProdSvc->>DB: INSERT Produto
        DB-->>ProdSvc: Produto criado
        ProdSvc-->>ProdCtrl: produto
        ProdCtrl-->>SPA: 201 Created
        SPA-->>Admin: Produto exibido na lista
    end

    rect rgb(255, 248, 230)
        Note over Admin, ViaCEP: SOFT DELETE DE PRODUTO (ADMIN)
        Admin->>SPA: Clica "Excluir" produto
        SPA->>API: DELETE /produtos/:id
        API->>AuthMW: JWT + ADMIN
        API->>ProdCtrl: deletarProduto(req, res)
        ProdCtrl->>ProdSvc: checkDependencies(produtoId)
        ProdSvc->>DB: SELECT ItemPedido WHERE produtoId
        alt Tem pedidos vinculados
            ProdSvc->>DB: UPDATE Produto SET excluido = true (Soft Delete)
            DB-->>ProdSvc: OK
            ProdSvc-->>ProdCtrl: "Produto desativado"
        else Sem pedidos vinculados
            ProdSvc->>DB: DELETE Produto WHERE id (Hard Delete)
            DB-->>PedSvc: OK
            ProdSvc-->>ProdCtrl: "Produto removido"
        end
        ProdCtrl-->>SPA: 200 OK
        SPA-->>Admin: Produto removido da lista
    end

    rect rgb(230, 255, 230)
        Note over Admin, ViaCEP: LISTAGEM DE PRODUTOS (PÚBLICO — SEM AUTH)
        Cliente->>SPA: Acessa catálogo de produtos
        SPA->>API: GET /produtos
        Note over API: Rota pública — sem autenticação
        API->>ProdCtrl: listarProdutos(req, res)
        ProdCtrl->>ProdSvc: getAll(excluido=false)
        ProdSvc->>DB: SELECT Produto WHERE excluido = false
        DB-->>ProdSvc: produtos[]
        ProdSvc-->>ProdCtrl: produtos
        ProdCtrl-->>SPA: 200 OK {produtos[]}
        SPA-->>Cliente: Exibe cards de produtos com imagem e preço
    end

    rect rgb(245, 230, 255)
        Note over Admin, ViaCEP: CADASTRO DE ENDEREÇO COM INTEGRAÇÃO VIACEP
        Cliente->>SPA: Digita CEP no campo de endereço
        SPA->>API: GET /enderecos/cep/01001000
        API->>AuthMW: JWT verify
        API->>EndSvc: lookupCep("01001000")
        EndSvc->>ViaCEP: GET https://viacep.com.br/ws/01001000/json/
        ViaCEP-->>EndSvc: {logradouro, localidade, uf, bairro, ...}
        EndSvc-->>API: {logradouro, localidade, uf, bairro}
        API-->>SPA: Dados do CEP
        SPA->>SPA: Auto-preencher campos (rua, cidade, estado, bairro)
        SPA-->>Cliente: Formulário preenchido automaticamente

        Cliente->>SPA: Completa número e complemento → Salvar
        SPA->>API: POST /enderecos {cep, logradouro, numero, complemento, bairro, cidade, estado}
        API->>AuthMW: JWT verify → usuarioId
        API->>EndSvc: createEndereco(usuarioId, dados)
        EndSvc->>DB: INSERT Endereco {usuarioId, cep, logradouro, numero, bairro, cidade, estado}
        DB-->>EndSvc: Endereço criado
        EndSvc-->>API: endereco
        API-->>SPA: 201 Created
        SPA-->>Cliente: Endereço salvo no perfil
    end
```

### Integrações Externas

| Serviço          | Protocolo        | Uso                                                | Tratamento de Falha                                          |
| ---------------- | ---------------- | -------------------------------------------------- | ------------------------------------------------------------ |
| **ViaCEP**       | HTTP GET (REST)  | Consulta de endereço por CEP                       | Retorna erro ao cliente se API indisponível                  |
| **Resend**       | HTTP POST (REST) | Envio de email de recuperação de senha             | Em dev: código retornado no response HTTP                    |
| **Mercado Pago** | —                | Schema preparado (`PagamentoPix`), integração stub | Formas de pagamento: PIX e DINHEIRO (sem processamento real) |

---

## Resumo da Visão de Processo

### Processos Principais em Tempo de Execução

| Processo                      | Tipo                    | Protocolo                | Concorrência                              |
| ----------------------------- | ----------------------- | ------------------------ | ----------------------------------------- |
| Autenticação (login/register) | Síncrono                | HTTP REST                | Independente por requisição               |
| Recuperação de senha          | Síncrono + Assíncrono   | HTTP + Email (Resend)    | Token com expiração temporal              |
| Criação de pedido             | Síncrono + Transacional | HTTP + SQL Transaction   | Validação sequencial de itens             |
| Gestão de status do pedido    | Síncrono                | HTTP REST                | Máquina de estados com guarda             |
| Chat / Atendimento            | Síncrono + Assíncrono   | HTTP + WebSocket         | Broadcast concorrente, múltiplas conexões |
| Upload de imagem              | Síncrono                | HTTP multipart/form-data | Processamento sequencial (multer)         |
| Consulta ViaCEP               | Síncrono + Externo      | HTTP proxy → API REST    | Dependência de serviço externo            |

### Fluxo de Dados Entre Camadas

```
┌─────────────┐     HTTP/WS      ┌──────────────┐    Prisma ORM    ┌────────────┐
│  Frontend    │ ◄──────────────► │   Backend    │ ◄──────────────► │ PostgreSQL │
│  React SPA   │                  │   Express    │                  │            │
└─────────────┘                  └──────┬───────┘                  └────────────┘
                                        │ HTTP
                                        ▼
                                 ┌──────────────┐
                                 │  APIs Externas│
                                 │  ViaCEP      │
                                 │  Resend      │
                                 └──────────────┘
```
