-- DropForeignKey
ALTER TABLE "public"."Endereco" DROP CONSTRAINT "Endereco_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ItemPedido" DROP CONSTRAINT "ItemPedido_pedidoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ItemPedido" DROP CONSTRAINT "ItemPedido_produtoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Pedido" DROP CONSTRAINT "Pedido_produtoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Pedido" DROP CONSTRAINT "Pedido_usuarioId_fkey";

-- AddForeignKey
ALTER TABLE "public"."Endereco" ADD CONSTRAINT "Endereco_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Pedido" ADD CONSTRAINT "Pedido_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Pedido" ADD CONSTRAINT "Pedido_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "public"."Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ItemPedido" ADD CONSTRAINT "ItemPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "public"."Pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ItemPedido" ADD CONSTRAINT "ItemPedido_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "public"."Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
