-- CreateTable
CREATE TABLE "public"."Notificacao"
(
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER,
    "pedidoId" INTEGER,
    "destinoRole" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notificacao_destinoRole_lida_createdAt_idx" ON "public"."Notificacao"("destinoRole", "lida", "createdAt");

-- CreateIndex
CREATE INDEX "Notificacao_usuarioId_lida_createdAt_idx" ON "public"."Notificacao"("usuarioId", "lida", "createdAt");

-- CreateIndex
CREATE INDEX "Notificacao_pedidoId_idx" ON "public"."Notificacao"("pedidoId");

-- AddForeignKey
ALTER TABLE "public"."Notificacao" ADD CONSTRAINT "Notificacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notificacao" ADD CONSTRAINT "Notificacao_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "public"."Pedido"("id") ON DELETE SET NULL ON UPDATE CASCADE;
