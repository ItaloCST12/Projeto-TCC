-- Fill null stock values before making the column required
UPDATE "public"."Produto"
SET "estoque" = 0
WHERE "estoque" IS NULL;

-- AlterTable
ALTER TABLE "public"."Produto"
  ALTER COLUMN "estoque"
SET
NOT NULL,
ALTER COLUMN "estoque"
SET
DEFAULT 0;
