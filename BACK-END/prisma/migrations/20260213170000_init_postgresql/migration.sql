-- CreateTable
CREATE TABLE "Usuario"
(
    "id" SERIAL NOT NULL,
    "nome" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Endereco"
(
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "rua" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "cep" TEXT NOT NULL,

    CONSTRAINT "Endereco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Produto"
(
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "disponivel" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Produto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pedido"
(
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "produtoId" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "unidade" TEXT NOT NULL,
    "tipoEntrega" TEXT NOT NULL,
    "formaPagamento" TEXT NOT NULL DEFAULT 'PIX',
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemPedido"
(
    "id" SERIAL NOT NULL,
    "pedidoId" INTEGER NOT NULL,
    "produtoId" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL,

    CONSTRAINT "ItemPedido_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- AddForeignKey
ALTER TABLE "Endereco" ADD CONSTRAINT "Endereco_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id");

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id");

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id");

-- AddForeignKey
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id");

-- AddForeignKey
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id");
