# Projeto TCC

Sistema web para **gestao de pedidos, usuarios e atendimento** com backend em Node.js/TypeScript, frontend React (Vite) e banco PostgreSQL.

![Logo do projeto](BACK-END/public/favicon.svg)

## Sumario

- [Sobre o Projeto](#sobre-o-projeto)
- [Tecnologias Utilizadas](#tecnologias-utilizadas)
- [Requisitos e Dependencias](#requisitos-e-dependencias)
- [Variaveis de Ambiente](#variaveis-de-ambiente)
- [Instalacao e Configuracao](#instalacao-e-configuracao)
- [Como Rodar o Projeto](#como-rodar-o-projeto)
- [Exemplos de Uso](#exemplos-de-uso)
- [Navegacao e Usabilidade](#navegacao-e-usabilidade)
- [Contribuindo](#contribuindo)
- [Como Reportar Bugs](#como-reportar-bugs)

## Sobre o Projeto

### O que o projeto faz

Este projeto oferece:

- Cadastro e autenticacao de usuarios.
- Gestao de enderecos.
- Catalogo de produtos.
- Criacao e acompanhamento de pedidos.
- Fluxo de pagamento (incluindo PIX no backend).
- Atendimento em tempo real via WebSocket.

### Qual problema ele resolve

Resolve a necessidade de centralizar, em uma unica plataforma, o fluxo de venda e atendimento:

1. Usuario se cadastra e faz login.
2. Usuario escolhe produtos e cria pedidos.
3. Administracao acompanha pedidos e vendas.
4. Suporte responde clientes pelo chat de atendimento.

### Para quem e destinado

- **Usuarios finais**: para realizar pedidos e acompanhar encomendas.
- **Administradores**: para gerenciar produtos, pedidos e relatorios.
- **Equipe de suporte**: para atendimento em tempo real.

## Tecnologias Utilizadas

- **Backend**: Node.js, TypeScript, Express, Prisma, WebSocket (`ws`), JWT.
- **Frontend**: React, Vite, TypeScript, Tailwind (configurado no front).
- **Banco de dados**: PostgreSQL.
- **Infra local**: Docker Compose, pgAdmin.

## Requisitos e Dependencias

- Node.js 20+
- Docker Desktop
- npm

Dependencias principais (backend):

- `express`
- `prisma` e `@prisma/client`
- `jsonwebtoken`
- `bcryptjs`
- `ws`

Dependencias principais (frontend):

- `react`
- `vite`

## Variaveis de Ambiente

Arquivo principal: `.env` na raiz do projeto.

### Banco de dados

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=secret
DB_NAME=meta
PGPORT=55432
DATABASE_URL=postgresql://postgres:secret@localhost:55432/meta?schema=public
```

### SMTP (recuperacao de senha)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-app
SMTP_FROM="Projeto TCC <seu-email@gmail.com>"
APP_NAME=Projeto TCC
```

## Instalacao e Configuracao

1. Clone o repositorio:

```bash
git clone https://github.com/ItaloCST12/Projeto-TCC.git
cd Projeto-TCC-main
```

2. Suba PostgreSQL e pgAdmin:

```bash
docker compose up -d postgres pgadmin
```

3. Instale dependencias do backend e frontend:

```bash
npm --prefix BACK-END install
npm --prefix FRONT-END install
```

4. Aplique migrations do banco:

```bash
npx prisma migrate deploy --schema BACK-END/prisma/schema.prisma
```

## Como Rodar o Projeto

### Backend (desenvolvimento)

```bash
npm --prefix BACK-END run dev
```

### Frontend (desenvolvimento)

```bash
npm --prefix FRONT-END run dev
```

### Build completo

```bash
npm run build
```

## Exemplos de Uso

### Autenticacao

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/forgot-password/request`
- `POST /auth/forgot-password`

### Enderecos

- `POST /enderecos`
- `GET /enderecos/me`

Exemplo de payload para criar endereco:

```json
{
  "rua": "Rua das Flores",
  "numero": "123",
  "cidade": "Sao Paulo",
  "cep": "01001-000"
}
```

### Pagamentos

- `GET /pagamentos/formas`

## Navegacao e Usabilidade

### Menu Principal

Links principais disponiveis na interface:

- Inicio
- Produtos
- Carrinho
- Minhas Encomendas
- Atendimento
- Login
- Cadastro
- Perfil

### Fluxo de Acao

Para realizar a funcao principal (fazer pedido), o usuario passa por:

1. Tela inicial (entrada no sistema).
2. Login/Cadastro (se ainda nao autenticado).
3. Tela de produtos (selecao de itens).
4. Carrinho (ajuste de quantidade e revisao).
5. Endereco e forma de entrega.
6. Confirmacao de pagamento.
7. Tela de Minhas Encomendas (acompanhamento do status).

### Acessibilidade

Melhoria de usabilidade aplicada:

- Uso de botoes com melhor contraste visual.
- Rotulos e nomes de acoes mais intuitivos.
- Ajustes de responsividade para facilitar uso em telas menores.

## Contribuindo

Contribuicoes sao bem-vindas.

### Como contribuir com o codigo

1. Crie uma branch a partir da `main`.
2. Implemente sua melhoria/correcao.
3. Rode validacoes locais.
4. Abra um Pull Request com descricao clara.

### Padroes e boas praticas do projeto

- Use TypeScript com tipagem clara.
- Mantenha separacao por camadas (rotas, controllers, models).
- Escreva nomes de funcoes e arquivos autoexplicativos.
- Evite alterar comportamento sem atualizar a documentacao.
- Prefira commits pequenos e objetivos.

Checklist sugerido antes do PR:

- [ ] Codigo compila sem erros.
- [ ] Imports e estrutura seguem o padrao do projeto.
- [ ] README/docs atualizados quando necessario.
- [ ] Mudanca testada localmente.

## Como Reportar Bugs

Para reportar bug, abra uma issue no GitHub com:

1. **Titulo objetivo** do problema.
2. **Passo a passo** para reproduzir.
3. **Comportamento esperado** e **comportamento atual**.
4. Ambiente (SO, Node, navegador, versao do projeto).
5. Prints, logs e mensagens de erro (se houver).

Link do repositorio:

- [Projeto TCC no GitHub](https://github.com/ItaloCST12/Projeto-TCC)
