-- CreateEnum
CREATE TYPE "TipoVendaProduto" AS ENUM
('KILO', 'SACA', 'UNIDADE');

-- AlterTable
ALTER TABLE "Produto"
ADD COLUMN "tipoVenda" "TipoVendaProduto" NOT NULL DEFAULT 'UNIDADE';

-- Backfill de produtos antigos para manter o comportamento atual do catálogo.
UPDATE "Produto"
SET "tipoVenda" = 'SACA'
WHERE "nome"
ILIKE '%laranja%'
   OR "nome" ILIKE '%limao%'
   OR "nome" ILIKE '%limão%';

UPDATE "Produto"
SET "tipoVenda" = 'KILO'
WHERE "nome"
ILIKE '%tangerina%';
