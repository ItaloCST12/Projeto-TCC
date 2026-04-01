import { Prisma } from "@prisma/client";
import prisma from "../models/client";

const TIPOS_MOVIMENTACAO = ["ENTRADA", "SAIDA", "AJUSTE", "DEVOLUCAO"] as const;
type TipoMovimentacao = (typeof TIPOS_MOVIMENTACAO)[number];

type FiltroMovimentacoes = {
  produtoId?: number;
  page: number;
  pageSize: number;
  dataInicio?: Date;
  dataFim?: Date;
};

const normalizarTipoMovimentacao = (tipo: string): TipoMovimentacao => {
  const normalizado = tipo.trim().toUpperCase();
  if (!TIPOS_MOVIMENTACAO.includes(normalizado as TipoMovimentacao)) {
    throw new Error("Tipo de movimentação inválido");
  }

  return normalizado as TipoMovimentacao;
};

export class EstoqueService {
  async ajustarEstoque(
    produtoId: number,
    tipo: string,
    quantidade: number,
    motivo?: string,
    pedidoId?: number,
  ) {
    const tipoMovimentacao = normalizarTipoMovimentacao(tipo);

    if (!Number.isInteger(produtoId) || produtoId <= 0) {
      throw new Error("Produto inválido");
    }

    if (!Number.isFinite(quantidade)) {
      throw new Error("Quantidade inválida");
    }

    if (tipoMovimentacao === "AJUSTE") {
      if (quantidade < 0) {
        throw new Error("Quantidade inválida");
      }
    } else if (quantidade <= 0) {
      throw new Error("Quantidade inválida");
    }

    return prisma.$transaction(async (tx) => {
      const produto = await tx.produto.findUnique({
        where: { id: produtoId },
        select: {
          id: true,
          nome: true,
          excluido: true,
          disponivel: true,
          estoque: true,
        },
      });

      if (!produto || produto.excluido) {
        throw new Error("Produto não encontrado");
      }

      if (produto.estoque === null) {
        throw new Error("Estoque do produto não está configurado");
      }

      let novoEstoque = produto.estoque;

      if (tipoMovimentacao === "SAIDA") {
        if (produto.estoque < quantidade) {
          throw new Error(`Estoque insuficiente para o produto ${produto.nome}. Disponível: ${produto.estoque}`);
        }
        novoEstoque = produto.estoque - quantidade;
      }

      if (tipoMovimentacao === "ENTRADA" || tipoMovimentacao === "DEVOLUCAO") {
        novoEstoque = produto.estoque + quantidade;
      }

      if (tipoMovimentacao === "AJUSTE") {
        novoEstoque = quantidade;
      }

      const produtoAtualizado = await tx.produto.update({
        where: { id: produtoId },
        data: {
          estoque: novoEstoque,
          disponivel: novoEstoque === 0 ? false : produto.disponivel,
        },
      });

      await tx.movimentacaoEstoque.create({
        data: {
          produtoId,
          tipo: tipoMovimentacao,
          quantidade: Math.trunc(quantidade),
          motivo: motivo?.trim() ? motivo.trim() : null,
          pedidoId: pedidoId ?? null,
        },
      });
      return produtoAtualizado;
    });
  }

  async getMovimentacoes(filtros: FiltroMovimentacoes) {
    const { produtoId, page, pageSize, dataInicio, dataFim } = filtros;
    const skip = (page - 1) * pageSize;

    const createdAt: Prisma.DateTimeFilter = {};
    if (dataInicio) {
      createdAt.gte = dataInicio;
    }
    if (dataFim) {
      createdAt.lte = dataFim;
    }

    const where: Prisma.MovimentacaoEstoqueWhereInput = {
      ...(produtoId ? { produtoId } : {}),
      ...(Object.keys(createdAt).length > 0 ? { createdAt } : {}),
    };

    const [total, data] = await Promise.all([
      prisma.movimentacaoEstoque.count({ where }),
      prisma.movimentacaoEstoque.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        include: {
          produto: {
            select: {
              id: true,
              nome: true,
            },
          },
          pedido: {
            select: {
              id: true,
            },
          },
        },
      }),
    ]);

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async getResumoEstoque() {
    const produtos = await prisma.produto.findMany({
      where: {
        excluido: false,
      },
      select: {
        id: true,
        nome: true,
        estoque: true,
        disponivel: true,
      },
      orderBy: {
        estoque: "asc",
      },
    });

    const estoqueCritico = produtos.filter((produto) => Number(produto.estoque) <= 0).length;

    return {
      data: produtos,
      resumo: {
        totalProdutos: produtos.length,
        estoqueCritico,
      },
    };
  }

  async reprocessarEstoquePedido(
    tx: Prisma.TransactionClient,
    pedidoId: number,
    operacao: "SAIDA" | "DEVOLUCAO",
    motivo: string,
  ) {
    const pedido = await tx.pedido.findUnique({
      where: { id: pedidoId },
      include: {
        items: {
          select: {
            produtoId: true,
            quantidade: true,
          },
        },
      },
    });

    if (!pedido) {
      throw new Error("Pedido não encontrado");
    }

    const itens =
      pedido.items.length > 0
        ? pedido.items.map((item) => ({
            produtoId: item.produtoId,
            quantidade: item.quantidade,
          }))
        : [{ produtoId: pedido.produtoId, quantidade: pedido.quantidade }];

    for (const item of itens) {
      const produto = await tx.produto.findUnique({
        where: { id: item.produtoId },
        select: {
          id: true,
          nome: true,
          estoque: true,
          disponivel: true,
          excluido: true,
        },
      });

      if (!produto || produto.excluido || produto.estoque === null) {
        continue;
      }

      if (operacao === "SAIDA" && produto.estoque < item.quantidade) {
        throw new Error(`Estoque insuficiente para o produto ${produto.nome}. Disponível: ${produto.estoque}`);
      }

      const novoEstoque =
        operacao === "SAIDA"
          ? produto.estoque - item.quantidade
          : produto.estoque + item.quantidade;

      await tx.produto.update({
        where: { id: produto.id },
        data: {
          estoque: novoEstoque,
          disponivel: novoEstoque === 0 ? false : produto.disponivel,
        },
      });

      await tx.movimentacaoEstoque.create({
        data: {
          produtoId: produto.id,
          tipo: operacao,
          quantidade: item.quantidade,
          motivo,
          pedidoId,
        },
      });
    }
  }
}
