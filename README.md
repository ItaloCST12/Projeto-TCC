<div align="center">

<h1>🍍 Fazenda Bispo — Plataforma de Pedidos Online</h1>

<p>Sistema fullstack para venda de frutas, gestão de pedidos e atendimento ao cliente em tempo real.</p>

<p>
  <a href="https://github.com/ItaloCST12/Projeto-TCC/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/licença-ISC-blue?style=flat-square" alt="Licença ISC" />
  </a>
  <img src="https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker" />
</p>

</div>

---

## Sumário

- [Sobre o Projeto](#sobre-o-projeto)
- [Funcionalidades](#funcionalidades)
- [Arquitetura](#arquitetura)
- [Tech Stack](#tech-stack)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Executando o Projeto](#executando-o-projeto)
- [Endpoints da API](#endpoints-da-api)
- [Testes](#testes)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Contribuindo](#contribuindo)
- [Licença](#licença)

---

## Sobre o Projeto

A **Plataforma Fazenda Bispo** é uma aplicação web fullstack desenvolvida como Trabalho de Conclusão de Curso. O sistema permite que clientes naveguem em um catálogo de frutas (abacaxis, laranjas, limões e tangerinas), montem pedidos personalizados e acompanhem o status da entrega, enquanto administradores gerenciam o estoque, os pedidos e realizam atendimento em tempo real via chat.

### Perfis de usuário

| Perfil              | Acesso                                                                |
| ------------------- | --------------------------------------------------------------------- |
| **Cliente**         | Catálogo, carrinho, pedidos, histórico de entregas e chat com suporte |
| **Administrador**   | Tudo do cliente + painel de entregas, gestão de produtos e estoque    |
| **Suporte (admin)** | Chat em tempo real com todos os clientes, notificações e histórico    |

---

## Funcionalidades

- **Autenticação segura** — Registro, login com JWT, recuperação de senha por e-mail (Resend)
- **Catálogo de produtos** — CRUD completo com upload de imagens, soft delete e preços por tamanho/unidade
- **Carrinho & Pedidos** — Múltiplos itens por pedido, seleção de endereço e acompanhamento de status
- **Pagamento manual** — Opções PIX ou dinheiro, sem processamento automático de pagamentos
- **Chat em tempo real** — Atendimento via WebSocket com autenticação JWT e envio de imagens
- **Notificações Push** — Web Push VAPID para alertas fora do site
- **Painel administrativo** — Gestão de entregas, pedidos e visão geral da plataforma
- **Gestão de estoque** — Movimentações, ajustes e resumo por produto (somente admin)
- **Geração de PDF** — Exportação de relatórios e comprovantes via jsPDF
- **Acessibilidade** — Integração com VLibras (Libras), design responsivo e mobile-first
- **Segurança** — Helmet, CORS configurado, rate-limit, hash de senhas com bcryptjs

---

## Arquitetura

O frontend é compilado para dentro de `BACK-END/public/` e servido como SPA pelo próprio Express, unificando frontend e backend na mesma porta.

```
┌─────────────────────┐      HTTP/WS      ┌──────────────────────┐      Prisma      ┌──────────────┐
│     Frontend        │ ────────────────► │      Backend         │ ───────────────► │  PostgreSQL  │
│  React 18 + Vite    │                   │  Express 5 + ws      │                  │     16       │
│  TailwindCSS        │ ◄──────────────── │  Node.js + TypeScript│ ◄─────────────── │              │
└─────────────────────┘   JSON / Events   └──────────────────────┘     Queries      └──────────────┘
```

**Fluxo de dados:**

1. O cliente faz requisições REST ou abre uma conexão WebSocket autenticada com JWT
2. O backend valida, processa e persiste via Prisma no PostgreSQL
3. Eventos em tempo real (chat, notificações) são emitidos via WebSocket para os clientes conectados

---

## Tech Stack

### Backend

| Tecnologia             | Função                            |
| ---------------------- | --------------------------------- |
| **Node.js 20**         | Runtime                           |
| **Express 5**          | Framework HTTP                    |
| **TypeScript 5**       | Tipagem estática                  |
| **Prisma**             | ORM e migrations                  |
| **ws**                 | WebSocket — chat em tempo real    |
| **jsonwebtoken**       | Autenticação JWT                  |
| **bcryptjs**           | Hash de senhas                    |
| **Helmet**             | Headers de segurança HTTP         |
| **express-rate-limit** | Proteção contra brute-force       |
| **Resend**             | Envio transacional de e-mails     |
| **web-push**           | Notificações push VAPID           |
| **Multer**             | Upload de arquivos (imagens)      |
| **Cloudinary**         | Armazenamento de imagens em nuvem |

### Frontend

| Tecnologia            | Função                                |
| --------------------- | ------------------------------------- |
| **React 18**          | Biblioteca de UI                      |
| **Vite + SWC**        | Build tool e dev server               |
| **TypeScript 5**      | Tipagem estática                      |
| **TailwindCSS 3**     | Estilização utility-first             |
| **shadcn/ui + Radix** | Componentes acessíveis e estilizáveis |
| **TanStack Query**    | Cache, sincronização e estado async   |
| **React Router 6**    | Roteamento SPA                        |
| **Sonner**            | Notificações toast                    |
| **jsPDF**             | Geração de PDF no navegador           |
| **Lucide React**      | Biblioteca de ícones                  |

### Infraestrutura

| Tecnologia         | Função                          |
| ------------------ | ------------------------------- |
| **Docker Compose** | Banco de dados e pgAdmin locais |
| **PostgreSQL 16**  | Banco de dados relacional       |
| **Vitest**         | Testes unitários (back + front) |

---

## Pré-requisitos

Certifique-se de ter instalado:

- [Node.js](https://nodejs.org/) **20 ou superior**
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — necessário para o banco de dados local
- `npm` (incluído com o Node.js)

---

## Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/ItaloCST12/Projeto-TCC.git
cd Projeto-TCC
```

### 2. Configure as variáveis de ambiente

```bash
# Copie os arquivos de exemplo
cp .env.example .env
cp FRONT-END/.env.example FRONT-END/.env
```

> Preencha os valores no `.env` conforme a seção [Variáveis de Ambiente](#variáveis-de-ambiente).

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

### 6. (Opcional) Popule com dados iniciais

> ⚠️ **Somente para ambiente de desenvolvimento local.** Não execute estes scripts em produção.

```bash
# Cria o usuário administrador padrão
node BACK-END/scripts/create-admin.js

# Importa o catálogo de produtos
node BACK-END/scripts/seed-produtos.js
```

---

## Segurança

- **Nunca versione credenciais.** Os arquivos `.env` estão no `.gitignore`; nunca os adicione ao repositório.
- **Rotacione segredos regularmente.** `JWT_SECRET`, chaves VAPID e API keys de terceiros devem ser substituídas periodicamente e imediatamente em caso de exposição.
- **Restrinja o CORS em produção.** Defina `CORS_ORIGIN` com o domínio exato do frontend; evite usar `*`.
- **Use HTTPS em produção.** Tokens JWT e cookies de sessão nunca devem trafegar em texto plano.
- **Não exponha detalhes de erros ao cliente.** O backend retorna mensagens genéricas; logs detalhados ficam apenas no servidor.
- **Reporte vulnerabilidades** abrindo uma [issue privada](https://github.com/ItaloCST12/Projeto-TCC/issues) ou entrando em contato diretamente com o mantenedor.

---

## Variáveis de Ambiente

> **Importante:** nunca versione o arquivo `.env`. Ele já está listado no `.gitignore`.

### Backend — `.env`

| Variável                | Descrição                               |  Obrigatória  |
| ----------------------- | --------------------------------------- | :-----------: |
| `DATABASE_URL`          | Connection string do PostgreSQL         |      ✅       |
| `JWT_SECRET`            | Segredo para assinatura dos tokens JWT  |      ✅       |
| `PORT`                  | Porta do servidor (padrão: `3333`)      |       —       |
| `NODE_ENV`              | `development` ou `production`           |       —       |
| `CORS_ORIGIN`           | URLs do frontend separadas por vírgula  | ✅ (produção) |
| `RESEND_API_KEY`        | API key do [Resend](https://resend.com) | ✅ (produção) |
| `RESEND_FROM`           | E-mail remetente                        | ✅ (produção) |
| `APP_NAME`              | Nome exibido nos e-mails                |       —       |
| `VAPID_PUBLIC_KEY`      | Chave pública VAPID                     |   ✅ (push)   |
| `VAPID_PRIVATE_KEY`     | Chave privada VAPID                     |   ✅ (push)   |
| `VAPID_SUBJECT`         | E-mail de contato para VAPID            |   ✅ (push)   |
| `CLOUDINARY_CLOUD_NAME` | Nome da conta Cloudinary                | ✅ (produção) |
| `CLOUDINARY_API_KEY`    | API key do Cloudinary                   | ✅ (produção) |
| `CLOUDINARY_API_SECRET` | API secret do Cloudinary                | ✅ (produção) |

### Frontend — `FRONT-END/.env`

| Variável                | Descrição                                  |  Obrigatória  |
| ----------------------- | ------------------------------------------ | :-----------: |
| `VITE_API_URL`          | URL base da API (vazio em dev com proxy)   | ✅ (produção) |
| `VITE_VAPID_PUBLIC_KEY` | Chave pública VAPID para notificações push |   ✅ (push)   |

### Docker local — variáveis no `.env`

| Variável            | Descrição                   |
| ------------------- | --------------------------- |
| `POSTGRES_USER`     | Usuário do PostgreSQL       |
| `POSTGRES_PASSWORD` | Senha do PostgreSQL         |
| `DB_NAME`           | Nome do banco de dados      |
| `PGPORT`            | Porta exposta do PostgreSQL |
| `PGADMIN_PORT`      | Porta do pgAdmin            |
| `PGADMIN_ROOT_USER` | E-mail de acesso ao pgAdmin |
| `PGADMIN_PASSWORD`  | Senha do pgAdmin            |

---

## Executando o Projeto

### Modo desenvolvimento

Abra dois terminais na raiz do projeto:

```bash
# Terminal 1 — Backend com hot-reload (tsx watch)
npm --prefix BACK-END run dev

# Terminal 2 — Frontend com HMR
npm --prefix FRONT-END run dev
```

| Serviço  | URL                           |
| -------- | ----------------------------- |
| Frontend | http://localhost:8080         |
| Backend  | http://localhost:3333         |
| pgAdmin  | http://localhost:`<PGADMIN_PORT>` |

> O frontend possui proxy configurado no Vite: todas as chamadas para `/auth`, `/produtos`, `/pedidos`, `/atendimentos`, etc., são redirecionadas automaticamente para `http://localhost:3333`.

### Build de produção

```bash
# Compila o frontend (Vite → BACK-END/public/) e faz typecheck do backend
npm run build

# Inicia o servidor unificado
npm run start
```

> Após o build, o Express serve o frontend compilado e a API REST na mesma porta.

---

## Endpoints da API

Todos os endpoints protegidos exigem o header `Authorization: Bearer <token>`.  
Endpoints marcados com **(admin)** também requerem o papel `ADMIN`.

### Autenticação — `/auth`

| Método | Rota                            | Autenticação | Descrição               |
| ------ | ------------------------------- | :----------: | ----------------------- |
| `POST` | `/auth/register`                |      —       | Registrar novo usuário  |
| `POST` | `/auth/login`                   |      —       | Login, retorna JWT      |
| `POST` | `/auth/forgot-password/request` |      —       | Solicitar link de reset |
| `POST` | `/auth/forgot-password`         |      —       | Confirmar nova senha    |

### Usuários — `/usuarios`

| Método  | Rota                 | Autenticação | Descrição                     |
| ------- | -------------------- | :----------: | ----------------------------- |
| `GET`   | `/usuarios/me`       |      ✅      | Perfil do usuário autenticado |
| `PUT`   | `/usuarios/me`       |      ✅      | Atualizar nome e telefone     |
| `PATCH` | `/usuarios/me/senha` |      ✅      | Alterar senha                 |

### Produtos — `/produtos`

| Método   | Rota                            | Autenticação | Descrição                |
| -------- | ------------------------------- | :----------: | ------------------------ |
| `GET`    | `/produtos`                     |      —       | Listar produtos ativos   |
| `POST`   | `/produtos/cadastrarProduto`    |  ✅ (admin)  | Criar produto com imagem |
| `PATCH`  | `/produtos/:id`                 |  ✅ (admin)  | Atualizar produto        |
| `PATCH`  | `/produtos/:id/disponibilidade` |  ✅ (admin)  | Ativar/desativar produto |
| `DELETE` | `/produtos/:id`                 |  ✅ (admin)  | Soft delete              |

### Pedidos — `/pedidos`

| Método  | Rota                  | Autenticação | Descrição                      |
| ------- | --------------------- | :----------: | ------------------------------ |
| `POST`  | `/pedidos`            |      ✅      | Criar pedido                   |
| `GET`   | `/pedidos/me`         |      ✅      | Pedidos do usuário autenticado |
| `GET`   | `/pedidos`            |  ✅ (admin)  | Listar todos os pedidos        |
| `PATCH` | `/pedidos/:id/status` |  ✅ (admin)  | Atualizar status do pedido     |

### Endereços — `/enderecos`

| Método   | Rota             | Autenticação | Descrição            |
| -------- | ---------------- | :----------: | -------------------- |
| `POST`   | `/enderecos`     |      ✅      | Cadastrar endereço   |
| `GET`    | `/enderecos/me`  |      ✅      | Endereços do usuário |
| `PUT`    | `/enderecos/:id` |      ✅      | Atualizar endereço   |
| `DELETE` | `/enderecos/:id` |      ✅      | Remover endereço     |

### Atendimento — `/atendimentos`

| Método   | Rota                                          | Autenticação | Descrição                             |
| -------- | --------------------------------------------- | :----------: | ------------------------------------- |
| `GET`    | `/atendimentos/me`                            |      ✅      | Histórico de mensagens do usuário     |
| `POST`   | `/atendimentos/me`                            |      ✅      | Enviar mensagem (com imagem opcional) |
| `DELETE` | `/atendimentos/me`                            |      ✅      | Limpar própria conversa               |
| `GET`    | `/atendimentos/admin/conversas`               |  ✅ (admin)  | Listar todas as conversas             |
| `GET`    | `/atendimentos/admin/conversas/:id`           |  ✅ (admin)  | Mensagens de um usuário específico    |
| `POST`   | `/atendimentos/admin/conversas/:id/responder` |  ✅ (admin)  | Responder como suporte                |
| `WS`     | `ws://…/atendimentos/ws`                      |      ✅      | Canal WebSocket em tempo real         |

### Notificações — `/notificacoes`

| Método   | Rota                             | Autenticação | Descrição                     |
| -------- | -------------------------------- | :----------: | ----------------------------- |
| `GET`    | `/notificacoes`                  |      ✅      | Listar notificações           |
| `PATCH`  | `/notificacoes/lidas`            |      ✅      | Marcar todas como lidas       |
| `DELETE` | `/notificacoes`                  |      ✅      | Limpar todas as notificações  |
| `POST`   | `/notificacoes/push/subscribe`   |      ✅      | Inscrever dispositivo em push |
| `DELETE` | `/notificacoes/push/unsubscribe` |      ✅      | Cancelar inscrição push       |

### Estoque — `/produtos`

| Método | Rota                                  | Autenticação | Descrição                         |
| ------ | ------------------------------------- | :----------: | --------------------------------- |
| `POST` | `/produtos/:id/estoque`               |  ✅ (admin)  | Registrar movimentação de estoque |
| `GET`  | `/produtos/:id/estoque/movimentacoes` |  ✅ (admin)  | Histórico de movimentações        |
| `GET`  | `/produtos/estoque/resumo`            |  ✅ (admin)  | Resumo geral de estoque           |

---

## Testes

O projeto usa **Vitest** no backend e no frontend.

```bash
# Rodar todos os testes (backend)
npm --prefix BACK-END run test

# Rodar todos os testes (frontend)
npm --prefix FRONT-END run test

# Modo watch — backend
npm --prefix BACK-END run test:watch

# Modo watch — frontend
npm --prefix FRONT-END run test:watch
```

> O frontend usa `jsdom` como ambiente de testes e `@testing-library/react` para renderização de componentes.

---

## Estrutura do Projeto

```
Projeto-TCC/
├── BACK-END/
│   ├── prisma/
│   │   ├── schema.prisma         # Schema do banco de dados
│   │   └── migrations/           # Histórico de migrations
│   ├── public/                   # Build do frontend (gerado pelo Vite)
│   ├── scripts/                  # Seeds e utilitários de linha de comando
│   └── src/
│       ├── controllers/          # Handlers das rotas (request → response)
│       ├── middlewares/          # Auth JWT, upload, rate-limit
│       ├── models/               # Cliente Prisma
│       ├── routes/               # Definição e agrupamento de rotas
│       ├── services/             # Regras de negócio
│       ├── socket/               # WebSocket — atendimento em tempo real
│       ├── types/                # Declarações de tipos TypeScript
│       ├── utils/                # Helpers (e-mail, push, etc.)
│       └── app.ts                # Entry point — servidor Express
│
├── FRONT-END/
│   ├── public/                   # Assets públicos (sw, robots.txt)
│   └── src/
│       ├── assets/               # Imagens e recursos estáticos
│       ├── components/
│       │   └── ui/               # Componentes shadcn/ui
│       ├── hooks/                # Custom hooks React
│       ├── lib/                  # API client, auth e utilitários
│       ├── pages/                # Páginas da aplicação (Chat, Home, etc.)
│       ├── test/                 # Setup do ambiente de testes
│       ├── App.tsx               # Roteamento principal
│       └── main.tsx              # Entry point do React
│
├── docker/                       # Scripts de inicialização do banco
├── docker-compose.yml            # Infraestrutura local (PostgreSQL + pgAdmin)
└── package.json                  # Scripts raiz (monorepo)
```

---

## Contribuindo

Contribuições são bem-vindas! Siga os passos abaixo:

1. Faça um fork do projeto
2. Crie uma branch para sua feature
   ```bash
   git checkout -b feature/minha-feature
   ```
3. Implemente e teste suas mudanças
   ```bash
   npm --prefix BACK-END run test
   npm --prefix FRONT-END run test
   ```
4. Commit seguindo o padrão [Conventional Commits](https://www.conventionalcommits.org/)
   ```bash
   git commit -m "feat: adiciona minha feature"
   ```
5. Faça o push e abra um Pull Request
   ```bash
   git push origin feature/minha-feature
   ```

### Convenções de código

| Tema            | Regra                                                            |
| --------------- | ---------------------------------------------------------------- |
| **Commits**     | `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`         |
| **TypeScript**  | Tipagem explícita, sem uso de `any`                              |
| **Arquitetura** | Separação em camadas: `routes → controllers → services → models` |
| **Segurança**   | Nunca versione `.env`; valide entradas nas bordas do sistema     |

### Reportar bugs

Abra uma [issue](https://github.com/ItaloCST12/Projeto-TCC/issues) com:

- Descrição clara e objetiva do problema
- Passos para reproduzir
- Comportamento esperado vs. comportamento atual
- Ambiente (SO, versão do Node.js, navegador)
- Logs ou screenshots relevantes

---

## Licença

Distribuído sob a licença **ISC**. Consulte o arquivo [`LICENSE`](LICENSE) para mais detalhes.

---

<div align="center">

Desenvolvido por [Ítalo](https://github.com/ItaloCST12)

</div>
