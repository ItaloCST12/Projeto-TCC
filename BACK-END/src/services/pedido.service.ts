import { formasPagamentoDisponiveis } from "./pagamento.service";
import prisma from "../prisma/client";

export class PedidoService {
  async criarPedido(
    usuarioId: number,
    produtoId: number,
    quantidade: number,
    unidade: string,
    tipoEntrega: string,
    formaPagamento: string,
    items?: { produtoId: number; quantidade: number }[],
  ) {
    if (!Number.isInteger(produtoId) || produtoId <= 0) {
      throw new Error("Produto principal inválido");
    }

    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      throw new Error("Quantidade deve ser maior que zero");
    }

    if (!unidade?.trim()) {
      throw new Error("Unidade é obrigatória");
    }

    if (!tipoEntrega?.trim()) {
      throw new Error("Tipo de entrega é obrigatório");
    }

    if (!formaPagamento) {
      throw new Error("Forma de pagamento é obrigatória");
    }

    if (!formasPagamentoDisponiveis.includes(formaPagamento)) {
      throw new Error("Forma de pagamento inválida");
    }

    const produtoPrincipal = await prisma.produto.findUnique({
      where: { id: produtoId },
    });
    if (!produtoPrincipal) {
      throw new Error("Produto principal não encontrado");
    }
    if (!produtoPrincipal.disponivel) {
      throw new Error("Produto principal indisponível");
    }

    if (items && items.length > 0) {
      for (const item of items) {
        if (!Number.isInteger(item.produtoId) || item.produtoId <= 0) {
          throw new Error("Produto do item inválido");
        }
        if (!Number.isFinite(item.quantidade) || item.quantidade <= 0) {
          throw new Error("Quantidade do item deve ser maior que zero");
        }
      }

      const produtoIds = items.map((item) => item.produtoId);
      const produtos = await prisma.produto.findMany({
        where: { id: { in: produtoIds } },
      });
      const produtosMap = new Map(
        produtos.map((produto) => [produto.id, produto]),
      );

      for (const item of items) {
        const produto = produtosMap.get(item.produtoId);
        if (!produto) {
          throw new Error(`Produto do item ${item.produtoId} não encontrado`);
        }
        if (!produto.disponivel) {
          throw new Error(`Produto do item ${item.produtoId} indisponível`);
        }
      }
    }

    return prisma.pedido.create({
      data: {
        usuarioId,
        produtoId,
        quantidade,
        unidade,
        tipoEntrega,
        formaPagamento,
        status: "PENDENTE",
        ...(items && { items: { create: items } }),
      },
      include: {
        items: { include: { produto: true } },
        produto: true,
      },
    });
  }

  async getHistoricoUsuario(usuarioId: number) {
    return prisma.pedido.findMany({
      where: { usuarioId },
      include: {
        items: { include: { produto: true } },
        produto: true,
      },
    });
  }

  async getTodosPedidos() {
    return prisma.pedido.findMany();
  }

  async finalizarPedido(id: number) {
    return prisma.pedido.update({
      where: { id },
      data: { status: "COMPLETADO" },
    });
  }
}
