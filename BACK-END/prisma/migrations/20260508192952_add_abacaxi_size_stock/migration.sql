-- AlterTable
ALTER TABLE "public"."Produto" ADD COLUMN     "estoqueAbacaxiGrande" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "estoqueAbacaxiMedio" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "estoqueAbacaxiPequeno" INTEGER NOT NULL DEFAULT 0;

UPDATE "public"."Produto"
SET "estoqueAbacaxiMedio" = "estoque"
WHERE LOWER("nome") = 'abacaxi' AND "estoque" > 0;
