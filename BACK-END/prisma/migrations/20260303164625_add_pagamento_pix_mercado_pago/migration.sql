-- CreateTable
CREATE TABLE "public"."PagamentoPix" (
    "id" SERIAL NOT NULL,
    "pedidoId" INTEGER NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'MERCADO_PAGO',
    "providerTransactionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "qrCode" TEXT,
    "qrCodeBase64" TEXT,
    "ticketUrl" TEXT,
    "expiresAt" TIMESTAMP(3),
    "valor" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PagamentoPix_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PagamentoPix_pedidoId_key" ON "public"."PagamentoPix"("pedidoId");

-- CreateIndex
CREATE UNIQUE INDEX "PagamentoPix_providerTransactionId_key" ON "public"."PagamentoPix"("providerTransactionId");

-- CreateIndex
CREATE INDEX "PagamentoPix_status_idx" ON "public"."PagamentoPix"("status");

-- AddForeignKey
ALTER TABLE "public"."PagamentoPix" ADD CONSTRAINT "PagamentoPix_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "public"."Pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
