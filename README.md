# Projeto TCC

API e frontend com banco de dados **PostgreSQL**.

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

O frontend React (Vite) está em `FRONT-END/` e é servido pelo backend em `http://localhost:3333` após o build.

Instalar dependências do frontend:

```bash
npm --prefix FRONT-END install
```

Gerar build do frontend no backend (`BACK-END/public`):

```bash
npm run build:front
```

Para build completo (frontend + backend):

```bash
npm run build
```

## Autenticação

Rotas oficiais de autenticação:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/forgot-password/request` (solicita envio do código por e-mail)
- `POST /auth/forgot-password` (confirma código e redefine senha)

### Recuperação de senha por e-mail (SMTP)

Para envio real de código de redefinição, configure no `.env`:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE` (`true` ou `false`)
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM` (ex.: `Fazenda Bispo <no-reply@seudominio.com>`)
- `APP_NAME` (opcional, nome exibido no assunto)

Exemplo:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-app
SMTP_FROM="Fazenda Bispo <seu-email@gmail.com>"
APP_NAME=Fazenda Bispo
```

Sem SMTP configurado, em ambiente de desenvolvimento o código é retornado na resposta da API para testes. Em produção, o código não é retornado.

As rotas legadas de autenticação em `/usuarios` (`/usuarios/cadastrar` e `/usuarios/login`) foram removidas para manter a API centralizada em `/auth`.

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
