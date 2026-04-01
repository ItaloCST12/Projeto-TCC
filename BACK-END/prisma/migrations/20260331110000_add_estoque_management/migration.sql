-- AlterTable
ALTER TABLE "public"."Produto"
  ADD COLUMN "estoque" INTEGER,
  ADD COLUMN "estoqueMinimo" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "alertaEstoqueBaixo" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."MovimentacaoEstoque"
(
    "id" SERIAL NOT NULL,
    "produtoId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "motivo" TEXT,
    "pedidoId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimentacaoEstoque_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MovimentacaoEstoque_produtoId_createdAt_idx" ON "public"."MovimentacaoEstoque"("produtoId", "createdAt");

-- CreateIndex
CREATE INDEX "MovimentacaoEstoque_tipo_idx" ON "public"."MovimentacaoEstoque"("tipo");

-- AddForeignKey
ALTER TABLE "public"."MovimentacaoEstoque"
  ADD CONSTRAINT "MovimentacaoEstoque_produtoId_fkey"
  FOREIGN KEY ("produtoId") REFERENCES "public"."Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MovimentacaoEstoque"
  ADD CONSTRAINT "MovimentacaoEstoque_pedidoId_fkey"
  FOREIGN KEY ("pedidoId") REFERENCES "public"."Pedido"("id") ON DELETE SET NULL ON UPDATE CASCADE;
