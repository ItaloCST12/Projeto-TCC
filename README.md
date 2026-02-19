# Projeto TCC

API e frontend com banco de dados **PostgreSQL** (SQLite removido).

## Requisitos

- Node.js 20+
- Docker Desktop

## Configuração de ambiente

Arquivo principal de ambiente: `.env` na raiz.

Valores de banco atualmente usados:

- `POSTGRES_USER=postgres`
- `POSTGRES_PASSWORD=secret`
- `DB_NAME=meta`
- `PGPORT=55432`
- `DATABASE_URL=postgresql://postgres:secret@localhost:55432/meta?schema=public`

## Subir banco (PostgreSQL + pgAdmin)

Na raiz do projeto:

```bash
docker compose up -d postgres pgadmin
```

Acesso pgAdmin:

- URL: `http://localhost:7082`
- Email: valor de `PGADMIN_ROOT_USER`
- Senha: valor de `PGADMIN_PASSWORD`

## Backend

Instalar dependências:

```bash
npm --prefix BACK-END install
```

Validar migrations:

```bash
npm --prefix BACK-END exec prisma migrate status
```

Rodar backend:

```bash
npm run dev
```

## Frontend

O frontend está em `FRONT-END/` e é servido pelo backend em `http://localhost:3333`.

## Endereços (entrega)

As rotas de endereço exigem autenticação JWT (`Authorization: Bearer <token>`).

- `POST /enderecos`
  - Cria endereço para o usuário logado.
  - Body JSON:

```json
{
  "rua": "Rua das Flores",
  "numero": "123",
  "cidade": "São Paulo",
  "cep": "01001-000"
}
```

`numero` é opcional.

- `GET /enderecos/me`
  - Lista os endereços do usuário logado.

## Observações

- O projeto está padronizado para PostgreSQL.
- Arquivos e configurações legadas de SQLite foram removidos.
