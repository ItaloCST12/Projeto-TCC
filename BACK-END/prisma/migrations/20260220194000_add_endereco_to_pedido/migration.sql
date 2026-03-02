-- AlterTable
ALTER TABLE "Pedido"
ADD COLUMN "enderecoId" INTEGER;

-- AddForeignKey
ALTER TABLE "Pedido"
ADD CONSTRAINT "Pedido_enderecoId_fkey"
FOREIGN KEY ("enderecoId") REFERENCES "Endereco"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
