-- CreateTable
CREATE TABLE "public"."PagamentoPixEvento" (
    "id" SERIAL NOT NULL,
    "pagamentoPixId" INTEGER,
    "tipo" TEXT NOT NULL,
    "sucesso" BOOLEAN NOT NULL DEFAULT true,
    "mensagem" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PagamentoPixEvento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PagamentoPixEvento_pagamentoPixId_tipo_idx" ON "public"."PagamentoPixEvento"("pagamentoPixId", "tipo");

-- CreateIndex
CREATE INDEX "PagamentoPixEvento_createdAt_idx" ON "public"."PagamentoPixEvento"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."PagamentoPixEvento" ADD CONSTRAINT "PagamentoPixEvento_pagamentoPixId_fkey" FOREIGN KEY ("pagamentoPixId") REFERENCES "public"."PagamentoPix"("id") ON DELETE SET NULL ON UPDATE CASCADE;
