-- Remove estruturas legadas da integração Mercado Pago/PIX
DROP TABLE IF EXISTS "public"."PagamentoPixEvento";
DROP TABLE IF EXISTS "public"."PagamentoPix";

-- Ajusta o default para pagamento offline
ALTER TABLE "public"."Pedido"
ALTER COLUMN "formaPagamento"
SET
DEFAULT 'DINHEIRO';
