-- AlterTable
ALTER TABLE "Usuario" ADD "nome" TEXT;

-- CreateTable
CREATE TABLE "ItemPedido" (
    "id" INTEGER PRIMARY KEY,
    "pedidoId" INTEGER NOT NULL,
    "produtoId" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL,
    FOREIGN KEY ("pedidoId") REFERENCES "Pedido" ("id"),
    FOREIGN KEY ("produtoId") REFERENCES "Produto" ("id")
);
