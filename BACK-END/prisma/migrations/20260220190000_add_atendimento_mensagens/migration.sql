-- CreateTable
CREATE TABLE "AtendimentoMensagem"
(
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "autor" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AtendimentoMensagem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AtendimentoMensagem"
ADD CONSTRAINT "AtendimentoMensagem_usuarioId_fkey"
FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id")
ON DELETE RESTRICT ON
UPDATE CASCADE;
