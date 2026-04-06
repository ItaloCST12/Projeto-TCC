<div align="center">

# 🍍 Projeto TCC — Plataforma de Pedidos Online

**Sistema fullstack para gestão de pedidos, catálogo de produtos e atendimento em tempo real.**

![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-ISC-blue)

</div>

---

## 📋 Sumário

- [Sobre o Projeto](#-sobre-o-projeto)
- [Funcionalidades](#-funcionalidades)
- [Arquitetura](#-arquitetura)
- [Tech Stack](#-tech-stack)
- [Pré-requisitos](#-pré-requisitos)
- [Instalação](#-instalação)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [Executando o Projeto](#-executando-o-projeto)
- [Endpoints da API](#-endpoints-da-api)
- [Testes](#-testes)
- [Deploy](#-deploy)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Contribuindo](#-contribuindo)
- [Licença](#-licença)

---

## 🎯 Sobre o Projeto

Plataforma web completa voltada para a **venda e gestão de pedidos de frutas**, com foco em abacaxis, laranjas, limões e tangerinas. O sistema integra catálogo de produtos, carrinho de compras, atendimento ao cliente em tempo real via WebSocket e notificações push.

### Para quem é

| Perfil              | Uso                                                                     |
| ------------------- | ----------------------------------------------------------------------- |
| **Clientes**        | Navegar no catálogo, montar pedidos e acompanhar entregas               |
| **Administradores** | Gerenciar produtos, acompanhar pedidos, relatórios e painel de entregas |
| **Suporte**         | Atender clientes em tempo real pelo chat integrado                      |

---

## ✨ Funcionalidades

- **Autenticação JWT** — Registro, login, recuperação de senha por e-mail (Resend)
- **Catálogo de produtos** — CRUD completo com upload de imagens, soft delete e preços por tamanho
- **Carrinho & Pedidos** — Criação de pedidos com múltiplos itens, seleção de endereço e acompanhamento de status
- **Pagamento manual** — Escolha entre PIX ou dinheiro, sem processamento de pagamento na plataforma
- **Chat em tempo real** — Atendimento via WebSocket com autenticação JWT
- **Notificações Push** — Web Push com VAPID para avisos fora do site
- **Painel administrativo** — Gestão de entregas, pedidos e usuários
- **Acessibilidade** — Integração com VLibras (Libras), controles de acessibilidade e design responsivo
- **Gestão de estoque** — Controle de movimentações, ajustes e resumo de estoque por produto (admin)
- **Carrinho isolado por usuário** — Cada conta mantém seu próprio carrinho via localStorage
- **Controle de acesso admin** — Administradores visualizam produtos mas não criam pedidos
- **Geração de PDF** — Exportação de relatórios e comprovantes (jsPDF)

---

## 🏗 Arquitetura

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────┐
│   Frontend   │──────▶│     Backend      │──────▶│  PostgreSQL  │
│  React/Vite  │ HTTP  │  Express + WS    │Prisma │              │
│  TailwindCSS │◀──────│  Node.js + TS    │◀──────│              │
└──────────────┘       └──────────────────┘       └──────────────┘
```

- O **frontend** builda para dentro de `BACK-END/public/`, servido como SPA pelo Express
- O **backend** expõe API REST + WebSocket na mesma porta
- **Prisma** gerencia o schema e as migrations do PostgreSQL

---

## 🛠 Tech Stack

### Backend

| Tecnologia             | Função                      |
| ---------------------- | --------------------------- |
| **Node.js 20**         | Runtime                     |
| **Express 5**          | Framework HTTP              |
| **TypeScript**         | Tipagem estática            |
| **Prisma**             | ORM e migrations            |
| **WebSocket (ws)**     | Chat em tempo real          |
| **JWT**                | Autenticação                |
| **bcryptjs**           | Hash de senhas              |
| **Helmet**             | Segurança HTTP              |
| **express-rate-limit** | Proteção contra brute-force |
| **Resend**             | Envio de e-mails            |
| **web-push**           | Notificações push VAPID     |
| **Multer**             | Upload de arquivos          |

### Frontend

| Tecnologia            | Função                     |
| --------------------- | -------------------------- |
| **React 18**          | UI Library                 |
| **Vite**              | Build tool (SWC)           |
| **TypeScript**        | Tipagem estática           |
| **TailwindCSS**       | Estilização                |
| **shadcn/ui + Radix** | Componentes acessíveis     |
| **React Query**       | Cache e estado do servidor |
| **React Router 6**    | Roteamento SPA             |
| **Sonner**            | Notificações toast         |
| **jsPDF**             | Geração de PDF             |
| **Lucide React**      | Ícones                     |

### Infraestrutura

| Tecnologia         | Função                          |
| ------------------ | ------------------------------- |
| **Docker Compose** | Banco e pgAdmin locais          |
| **Render**         | Deploy em produção              |
| **PostgreSQL**     | Banco de dados relacional       |
| **Vitest**         | Testes unitários (back + front) |

---

## 📦 Pré-requisitos

- [Node.js](https://nodejs.org/) 20+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (para banco de dados local)
- npm ou outro gerenciador de pacotes

---

## 🚀 Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/ItaloCST12/Projeto-TCC.git
cd Projeto-TCC
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.example .env
cp FRONT-END/.env.example FRONT-END/.env
```

Edite o `.env` com suas credenciais (veja a seção [Variáveis de Ambiente](#-variáveis-de-ambiente)).

### 3. Suba o banco de dados

```bash
docker network create meta-network
docker volume create data_pgdir
docker volume create data_pgadmin
docker compose up -d postgres
```

### 4. Instale as dependências

```bash
npm --prefix BACK-END install
npm --prefix FRONT-END install
```

### 5. Execute as migrations

```bash
npx prisma migrate deploy --schema BACK-END/prisma/schema.prisma
```

### 6. (Opcional) Seed de dados iniciais

```bash
node BACK-END/scripts/create-admin.js
node BACK-END/scripts/seed-produtos.js
```

---

## 🔐 Variáveis de Ambiente

Copie o `.env.example` e preencha os valores. **Nunca versione o arquivo `.env`.**

| Variável            | Descrição                               | Obrigatória |
| ------------------- | --------------------------------------- | :---------: |
| `DATABASE_URL`      | Connection string do PostgreSQL         |     ✅      |
| `JWT_SECRET`        | Segredo para assinatura dos tokens JWT  |     ✅      |
| `PORT`              | Porta do servidor (padrão: `3333`)      |      —      |
| `NODE_ENV`          | Ambiente (`development` / `production`) |      —      |
| `CORS_ORIGIN`       | URL(s) do frontend permitidas           |  ✅ (prod)  |
| `RESEND_API_KEY`    | API key do Resend para envio de e-mails |  ✅ (prod)  |
| `RESEND_FROM`       | Remetente dos e-mails                   |  ✅ (prod)  |
| `APP_NAME`          | Nome exibido nos e-mails                |      —      |
| `VAPID_PUBLIC_KEY`  | Chave pública VAPID para web push       |  ✅ (push)  |
| `VAPID_PRIVATE_KEY` | Chave privada VAPID                     |  ✅ (push)  |
| `VAPID_SUBJECT`     | E-mail de contato para VAPID            |  ✅ (push)  |

**Frontend (`FRONT-END/.env`):**

| Variável                | Descrição                                 | Obrigatória |
| ----------------------- | ----------------------------------------- | :---------: |
| `VITE_VAPID_PUBLIC_KEY` | Chave pública VAPID para push no frontend |  ✅ (push)  |

**Docker local (apenas desenvolvimento):**

| Variável            | Descrição                   |
| ------------------- | --------------------------- |
| `POSTGRES_USER`     | Usuário do PostgreSQL       |
| `POSTGRES_PASSWORD` | Senha do PostgreSQL         |
| `DB_NAME`           | Nome do banco               |
| `PGPORT`            | Porta exposta do PostgreSQL |
| `PGADMIN_PORT`      | Porta do pgAdmin            |
| `PGADMIN_ROOT_USER` | E-mail do pgAdmin           |
| `PGADMIN_PASSWORD`  | Senha do pgAdmin            |

---

## ▶️ Executando o Projeto

### Desenvolvimento

```bash
# Terminal 1 — Backend (com hot-reload)
npm --prefix BACK-END run dev

# Terminal 2 — Frontend (com HMR)
npm --prefix FRONT-END run dev
```

O frontend roda em `http://localhost:8080` com proxy para o backend em `http://localhost:3333`.

### Build de produção

```bash
npm run build
npm run start
```

O comando `build` compila o frontend e o serve via Express na mesma porta do backend.

---

## 📡 Endpoints da API

### Autenticação (`/auth`)

| Método | Rota                            | Descrição                |
| ------ | ------------------------------- | ------------------------ |
| `POST` | `/auth/register`                | Registrar novo usuário   |
| `POST` | `/auth/login`                   | Login (retorna JWT)      |
| `POST` | `/auth/forgot-password/request` | Solicitar reset de senha |
| `POST` | `/auth/forgot-password`         | Confirmar reset de senha |

### Usuários (`/usuarios`)

| Método | Rota           | Descrição                    |
| ------ | -------------- | ---------------------------- |
| `GET`  | `/usuarios/me` | Dados do usuário autenticado |
| `PUT`  | `/usuarios/me` | Atualizar perfil             |

### Produtos (`/produtos`)

| Método   | Rota            | Descrição                 |
| -------- | --------------- | ------------------------- |
| `GET`    | `/produtos`     | Listar produtos ativos    |
| `POST`   | `/produtos`     | Criar produto (admin)     |
| `PUT`    | `/produtos/:id` | Atualizar produto (admin) |
| `DELETE` | `/produtos/:id` | Soft delete (admin)       |

### Pedidos (`/pedidos`)

| Método  | Rota                  | Descrição                |
| ------- | --------------------- | ------------------------ |
| `POST`  | `/pedidos`            | Criar pedido             |
| `GET`   | `/pedidos/me`         | Pedidos do usuário       |
| `GET`   | `/pedidos`            | Listar todos (admin)     |
| `PATCH` | `/pedidos/:id/status` | Atualizar status (admin) |

### Endereços (`/enderecos`)

| Método | Rota            | Descrição            |
| ------ | --------------- | -------------------- |
| `POST` | `/enderecos`    | Cadastrar endereço   |
| `GET`  | `/enderecos/me` | Endereços do usuário |

### Atendimento (`/atendimentos`)

| Método | Rota              | Descrição              |
| ------ | ----------------- | ---------------------- |
| `GET`  | `/atendimentos`   | Histórico de mensagens |
| `WS`   | `ws://?token=JWT` | Chat em tempo real     |

### Notificações (`/notificacoes`)

| Método  | Rota                           | Descrição           |
| ------- | ------------------------------ | ------------------- |
| `GET`   | `/notificacoes`                | Listar notificações |
| `PATCH` | `/notificacoes/:id/lida`       | Marcar como lida    |
| `POST`  | `/notificacoes/push/subscribe` | Inscrever para push |

### Estoque (`/produtos/.../estoque`)

| Método | Rota                                  | Descrição                          |
| ------ | ------------------------------------- | ---------------------------------- |
| `POST` | `/produtos/:id/estoque`               | Ajustar estoque do produto (admin) |
| `GET`  | `/produtos/:id/estoque/movimentacoes` | Movimentações do produto (admin)   |
| `GET`  | `/produtos/estoque/resumo`            | Resumo geral de estoque (admin)    |

---

## 🧪 Testes

```bash
# Testes do backend
npm --prefix BACK-END run test

# Testes do frontend
npm --prefix FRONT-END run test

# Modo watch
npm --prefix BACK-END run test:watch
npm --prefix FRONT-END run test:watch
```

Framework: **Vitest** com `jsdom` no frontend e `globals` habilitados.

---

## 🌐 Deploy

O projeto está configurado para deploy no **Render** via `render.yaml`.

O pipeline de build no Render:

1. Instala dependências do frontend e backend
2. Builda o frontend (Vite → `BACK-END/public/`)
3. Executa `prisma migrate deploy`
4. Roda seeds iniciais (admin + produtos)
5. Inicia o servidor com `npm run start`

---

## 📁 Estrutura do Projeto

```
Projeto-TCC/
├── BACK-END/
│   ├── prisma/               # Schema e migrations
│   ├── public/               # Build do frontend (gerado)
│   ├── scripts/              # Seeds e utilitários
│   └── src/
│       ├── controllers/      # Lógica das rotas
│       ├── middlewares/       # Auth, validação, rate-limit
│       ├── models/           # Acesso ao banco (Prisma)
│       ├── routes/           # Definição das rotas
│       ├── services/         # Regras de negócio
│       ├── socket/           # WebSocket (atendimento)
│       ├── types/            # Tipos TypeScript
│       ├── utils/            # Helpers e utilitários
│       └── app.ts            # Entry point do servidor
├── FRONT-END/
│   ├── public/               # Assets estáticos
│   └── src/
│       ├── components/       # Componentes React
│       │   └── ui/           # shadcn/ui components
│       ├── hooks/            # Custom hooks
│       ├── lib/              # Utilitários e API client
│       ├── pages/            # Páginas da aplicação
│       ├── test/             # Setup de testes
│       ├── App.tsx           # Roteamento principal
│       └── main.tsx          # Entry point
├── docker/                   # Scripts de inicialização do banco
├── docker-compose.yml        # Infraestrutura local
├── render.yaml               # Configuração de deploy
└── package.json              # Scripts raiz (monorepo)
```

---

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/minha-feature`)
3. Commit suas mudanças (`git commit -m 'feat: adiciona minha feature'`)
4. Push para a branch (`git push origin feature/minha-feature`)
5. Abra um Pull Request

### Convenções

- **Commits**: use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `refactor:`)
- **TypeScript**: tipagem explícita, sem `any`
- **Arquitetura**: separação por camadas (routes → controllers → services → models)
- **Testes**: rode `npm test` antes de abrir PR

### Reportar Bugs

Abra uma [issue](https://github.com/ItaloCST12/Projeto-TCC/issues) com:

1. Descrição clara do problema
2. Passos para reproduzir
3. Comportamento esperado vs. atual
4. Ambiente (SO, Node, navegador)
5. Screenshots ou logs relevantes

---

## 📄 Licença

Distribuído sob a licença ISC. Veja o arquivo `LICENSE` para mais informações.

---

<div align="center">

Feito por [Ítalo](https://github.com/ItaloCST12)

</div>
