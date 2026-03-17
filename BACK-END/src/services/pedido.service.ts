import { formasPagamentoDisponiveis } from "./pagamento.service";
import prisma from "../models/client";
import { Prisma } from "@prisma/client";

const MAX_QUANTIDADE_POR_ITEM = 1000;

type FiltroPedidos = {
  page: number;
  pageSize: number;
  dataInicio?: Date;
  dataFim?: Date;
};

type FiltroVendas = {
  page: number;
  pageSize: number;
  dataInicio?: Date;
  dataFim?: Date;
};

const PRECO_PADRAO_PRODUTO: Record<string, number> = {
  laranja: 50,
  tangerina: 5,
  limao: 60,
  "limão": 60,
  abacaxi: 5,
};

const resolverPrecoFallbackPorNomeUnidade = (nomeProduto?: string, unidade?: string) => {
  const nomeNormalizado = (nomeProduto || "").trim().toLowerCase();
  const unidadeNormalizada = (unidade || "").trim().toLowerCase();

  if (nomeNormalizado === "abacaxi") {
    if (unidadeNormalizada.includes("grande")) {
      return 7;
    }
    if (unidadeNormalizada.includes("pequeno")) {
      return 3;
    }
    return 5;
  }

  return PRECO_PADRAO_PRODUTO[nomeNormalizado] ?? 0;
};

const resolverPrecoComFallback = (precoBanco: number, nomeProduto?: string, unidade?: string) => {
  if ((nomeProduto || "").trim().toLowerCase() === "abacaxi") {
    return resolverPrecoFallbackPorNomeUnidade(nomeProduto, unidade);
  }

  if (precoBanco > 0) {
    return precoBanco;
  }

  return resolverPrecoFallbackPorNomeUnidade(nomeProduto, unidade);
};

export class PedidoService {
  async criarPedido(
    usuarioId: number,
    produtoId: number,
    enderecoId: number | null,
    quantidade: number,
    unidade: string,
    tipoEntrega: string,
    formaPagamento: string,
    items?: { produtoId: number; quantidade: number; unidade?: string }[],
  ) {
    const itemPrincipal = items?.[0];

    const produtoIdPrincipal =
      Number.isInteger(Number(produtoId)) && Number(produtoId) > 0
        ? Number(produtoId)
        : Number(itemPrincipal?.produtoId);

    const quantidadePrincipal =
      Number.isFinite(Number(quantidade)) && Number(quantidade) > 0
        ? Number(quantidade)
        : Number(itemPrincipal?.quantidade);

    const unidadePedido =
      unidade?.trim() || itemPrincipal?.unidade?.trim() || "";

    if (!Number.isInteger(produtoIdPrincipal) || produtoIdPrincipal <= 0) {
      throw new Error("Produto principal inválido");
    }

    if (!Number.isFinite(quantidadePrincipal) || quantidadePrincipal <= 0) {
      throw new Error("Quantidade deve ser maior que zero");
    }

    if (quantidadePrincipal > MAX_QUANTIDADE_POR_ITEM) {
      throw new Error(`Quantidade máxima por produto é ${MAX_QUANTIDADE_POR_ITEM}`);
    }

    if (!unidadePedido) {
      throw new Error("Unidade é obrigatória");
    }

    if (!tipoEntrega?.trim()) {
      throw new Error("Tipo de entrega é obrigatório");
    }

    if (tipoEntrega === "entrega" && !enderecoId) {
      throw new Error("Selecione um endereço para entrega");
    }

    if (!formaPagamento) {
      throw new Error("Forma de pagamento é obrigatória");
    }

    if (!formasPagamentoDisponiveis.includes(formaPagamento)) {
      throw new Error("Forma de pagamento inválida");
    }

    const produtoPrincipal = await prisma.produto.findUnique({
      where: { id: produtoIdPrincipal },
    });
    if (!produtoPrincipal) {
      throw new Error("Produto principal não encontrado");
    }
    if (!produtoPrincipal.disponivel) {
      throw new Error("Produto principal indisponível");
    }

    if (enderecoId) {
      if (!Number.isInteger(enderecoId) || enderecoId <= 0) {
        throw new Error("Endereço inválido");
      }

      const endereco = await prisma.endereco.findFirst({
        where: {
          id: enderecoId,
          usuarioId,
        },
      });

      if (!endereco) {
        throw new Error("Endereço não encontrado para este usuário");
      }
    }

    const itemsNormalizados =
      items && items.length > 0
        ? items.map((item) => ({
            produtoId: Number(item.produtoId),
            quantidade: Number(item.quantidade),
            unidade: item.unidade?.trim() || unidadePedido,
          }))
        : undefined;

    if (itemsNormalizados && itemsNormalizados.length > 0) {
      for (const item of itemsNormalizados) {
        if (!Number.isInteger(item.produtoId) || item.produtoId <= 0) {
          throw new Error("Produto do item inválido");
        }
        if (!Number.isFinite(item.quantidade) || item.quantidade <= 0) {
          throw new Error("Quantidade do item deve ser maior que zero");
        }

        if (item.quantidade > MAX_QUANTIDADE_POR_ITEM) {
          throw new Error(`Quantidade máxima por item é ${MAX_QUANTIDADE_POR_ITEM}`);
        }

        if (!item.unidade) {
          throw new Error("Unidade do item é obrigatória");
        }
      }

      const produtoIds = itemsNormalizados.map((item) => item.produtoId);
      const produtos = await prisma.produto.findMany({
        where: { id: { in: produtoIds } },
      });
      const produtosMap = new Map<
        number,
        { id: number; disponivel: boolean }
      >(
        produtos.map((produto: { id: number; disponivel: boolean }) => [
          produto.id,
          produto,
        ]),
      );

      for (const item of itemsNormalizados) {
        const produto = produtosMap.get(item.produtoId);
        if (!produto) {
          throw new Error(`Produto do item ${item.produtoId} não encontrado`);
        }
        if (!produto.disponivel) {
          throw new Error(`Produto do item ${item.produtoId} indisponível`);
        }
      }
    }

    const produtoIdsParaPreco = new Set<number>([produtoIdPrincipal]);
    if (itemsNormalizados) {
      for (const item of itemsNormalizados) {
        produtoIdsParaPreco.add(item.produtoId);
      }
    }

    const produtosPreco = await prisma.produto.findMany({
      where: { id: { in: Array.from(produtoIdsParaPreco) } },
      select: {
        id: true,
        nome: true,
        preco: true,
        precoAbacaxiGrande: true,
        precoAbacaxiMedio: true,
        precoAbacaxiPequeno: true,
      },
    });

    const dadosProdutoPorId = new Map<
      number,
      {
        nome: string;
        preco: number;
        precoAbacaxiGrande: number | null;
        precoAbacaxiMedio: number | null;
        precoAbacaxiPequeno: number | null;
      }
    >(
      produtosPreco.map((produto) => [
        produto.id,
        {
          nome: produto.nome,
          preco: Number(produto.preco),
          precoAbacaxiGrande:
            produto.precoAbacaxiGrande !== null
              ? Number(produto.precoAbacaxiGrande)
              : null,
          precoAbacaxiMedio:
            produto.precoAbacaxiMedio !== null
              ? Number(produto.precoAbacaxiMedio)
              : null,
          precoAbacaxiPequeno:
            produto.precoAbacaxiPequeno !== null
              ? Number(produto.precoAbacaxiPequeno)
              : null,
        },
      ]),
    );

    const resolverPrecoComRegraAbacaxi = (
      dadosProduto: {
        nome: string;
        preco: number;
        precoAbacaxiGrande: number | null;
        precoAbacaxiMedio: number | null;
        precoAbacaxiPequeno: number | null;
      } | undefined,
      unidadeItem: string,
    ) => {
      const nomeNormalizado = (dadosProduto?.nome || "").trim().toLowerCase();
      const unidadeNormalizada = (unidadeItem || "").trim().toLowerCase();

      if (nomeNormalizado === "abacaxi") {
        if (
          unidadeNormalizada.includes("grande") &&
          dadosProduto?.precoAbacaxiGrande !== null &&
          dadosProduto?.precoAbacaxiGrande !== undefined
        ) {
          return dadosProduto.precoAbacaxiGrande;
        }

        if (
          (unidadeNormalizada.includes("medio") ||
            unidadeNormalizada.includes("médio")) &&
          dadosProduto?.precoAbacaxiMedio !== null &&
          dadosProduto?.precoAbacaxiMedio !== undefined
        ) {
          return dadosProduto.precoAbacaxiMedio;
        }

        if (
          unidadeNormalizada.includes("pequeno") &&
          dadosProduto?.precoAbacaxiPequeno !== null &&
          dadosProduto?.precoAbacaxiPequeno !== undefined
        ) {
          return dadosProduto.precoAbacaxiPequeno;
        }
      }

      return resolverPrecoComFallback(
        dadosProduto?.preco ?? 0,
        dadosProduto?.nome,
        unidadeItem,
      );
    };

    const itensComValor =
      itemsNormalizados && itemsNormalizados.length > 0
        ? itemsNormalizados.map((item) => {
            const dadosProduto = dadosProdutoPorId.get(item.produtoId);
            const valorUnitario = resolverPrecoComRegraAbacaxi(
              dadosProduto,
              item.unidade,
            );
            const valorTotalItem = valorUnitario * item.quantidade;

            return {
              ...item,
              valorUnitario,
              valorTotalItem,
            };
          })
        : undefined;

    const valorTotalPedido =
      itensComValor && itensComValor.length > 0
        ? itensComValor.reduce((total, item) => total + item.valorTotalItem, 0)
        : (() => {
            const dadosProduto = dadosProdutoPorId.get(produtoIdPrincipal);
            const valorUnitarioPrincipal = resolverPrecoComRegraAbacaxi(
              dadosProduto,
              unidadePedido,
            );
            return valorUnitarioPrincipal * quantidadePrincipal;
          })();

    return prisma.pedido.create({
      data: {
        usuarioId,
        produtoId: produtoIdPrincipal,
        enderecoId: enderecoId ?? null,
        quantidade: quantidadePrincipal,
        unidade: unidadePedido,
        tipoEntrega,
        formaPagamento,
        valorTotal: valorTotalPedido,
        status: "PENDENTE",
        ...(itensComValor && { items: { create: itensComValor } }),
      },
      include: {
        items: { include: { produto: true } },
        produto: true,
        endereco: true,
      },
    });
  }

  async getHistoricoUsuario(usuarioId: number) {
    return prisma.pedido.findMany({
      where: { usuarioId },
      orderBy: { id: "desc" },
      include: {
        items: { include: { produto: true } },
        produto: true,
        endereco: true,
      },
    });
  }

  async getMinhasEncomendas(usuarioId: number, filtros: FiltroPedidos) {
    const { page, pageSize, dataInicio, dataFim } = filtros;
    const skip = (page - 1) * pageSize;

    const createdAt: Prisma.DateTimeFilter = {};
    if (dataInicio) {
      createdAt.gte = dataInicio;
    }
    if (dataFim) {
      createdAt.lte = dataFim;
    }

    const where: Prisma.PedidoWhereInput = {
      usuarioId,
      ...(Object.keys(createdAt).length > 0 ? { createdAt } : {}),
    };

    const [total, pedidos] = await Promise.all([
      prisma.pedido.count({ where }),
      prisma.pedido.findMany({
        where,
        orderBy: { id: "desc" },
        skip,
        take: pageSize,
        include: {
          items: { include: { produto: true } },
          produto: true,
          endereco: true,
        },
      }),
    ]);

    return {
      data: pedidos,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async getTodosPedidos(filtros: FiltroPedidos) {
    const { page, pageSize, dataInicio, dataFim } = filtros;
    const skip = (page - 1) * pageSize;

    const createdAt: Prisma.DateTimeFilter = {};
    if (dataInicio) {
      createdAt.gte = dataInicio;
    }
    if (dataFim) {
      createdAt.lte = dataFim;
    }

    const where: Prisma.PedidoWhereInput =
      Object.keys(createdAt).length > 0 ? { createdAt } : {};

    const [total, pedidos] = await Promise.all([
      prisma.pedido.count({ where }),
      prisma.pedido.findMany({
        where,
        orderBy: { id: "desc" },
        skip,
        take: pageSize,
        include: {
          items: {
            include: {
              produto: {
                select: {
                  id: true,
                  nome: true,
                },
              },
            },
          },
          produto: true,
          endereco: true,
          usuario: {
            select: {
              id: true,
              nome: true,
              email: true,
              telefone: true,
            },
          },
        },
      }),
    ]);

    return {
      data: pedidos,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async getControleVendas(filtros: FiltroVendas) {
    const { page, pageSize, dataInicio, dataFim } = filtros;
    const skip = (page - 1) * pageSize;

    const createdAt: Prisma.DateTimeFilter = {};
    if (dataInicio) {
      createdAt.gte = dataInicio;
    }
    if (dataFim) {
      createdAt.lte = dataFim;
    }

    const where: Prisma.PedidoWhereInput = {
      status: "COMPLETADO",
      ...(Object.keys(createdAt).length > 0 ? { createdAt } : {}),
    };

    const [totalVendas, agregadoValorTotal, pedidos] = await Promise.all([
      prisma.pedido.count({ where }),
      prisma.pedido.aggregate({
        where,
        _sum: {
          valorTotal: true,
        },
      }),
      prisma.pedido.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        include: {
          items: {
            include: {
              produto: {
                select: {
                  id: true,
                  nome: true,
                  preco: true,
                },
              },
            },
          },
          produto: {
            select: {
              id: true,
              nome: true,
              preco: true,
            },
          },
          usuario: {
            select: {
              id: true,
              nome: true,
              email: true,
            },
          },
        },
      }),
    ]);

    const pedidosComValores = pedidos.map((pedido) => {
      const itemsComValores = pedido.items.map((item) => {
        const quantidadeItem = Number(item.quantidade) || 0;
        const valorUnitarioSalvo = Number(item.valorUnitario) || 0;
        const valorTotalItemSalvo = Number(item.valorTotalItem) || 0;
        const precoProdutoItem = resolverPrecoComFallback(
          Number(item.produto?.preco) || 0,
          item.produto?.nome,
          item.unidade,
        );

        const valorUnitarioCalculado =
          valorUnitarioSalvo > 0 ? valorUnitarioSalvo : precoProdutoItem;
        const valorTotalItemCalculado =
          valorTotalItemSalvo > 0
            ? valorTotalItemSalvo
            : valorUnitarioCalculado * quantidadeItem;

        return {
          ...item,
          valorUnitario: valorUnitarioCalculado,
          valorTotalItem: valorTotalItemCalculado,
        };
      });

      const valorTotalSalvo = Number(pedido.valorTotal) || 0;
      const valorTotalItems = itemsComValores.reduce(
        (total, item) => total + Number(item.valorTotalItem || 0),
        0,
      );
      const precoProdutoPrincipal = resolverPrecoComFallback(
        Number(pedido.produto?.preco) || 0,
        pedido.produto?.nome,
        pedido.unidade,
      );
      const valorTotalProdutoPrincipal =
        precoProdutoPrincipal * (Number(pedido.quantidade) || 0);

      const valorTotalCalculado =
        valorTotalSalvo > 0
          ? valorTotalSalvo
          : valorTotalItems > 0
            ? valorTotalItems
            : valorTotalProdutoPrincipal;

      return {
        ...pedido,
        items: itemsComValores,
        valorTotal: valorTotalCalculado,
      };
    });

    const valorTotalArrecadado = Number(agregadoValorTotal._sum.valorTotal) || 0;

    return {
      data: pedidosComValores,
      pagination: {
        page,
        pageSize,
        total: totalVendas,
        totalPages: Math.max(1, Math.ceil(totalVendas / pageSize)),
      },
      resumo: {
        totalVendas,
        valorTotalArrecadado,
      },
    };
  }

  async finalizarPedido(id: number) {
    return prisma.pedido.update({
      where: { id },
      data: { status: "COMPLETADO" },
    });
  }

  async marcarPedidoProntoParaRetirada(id: number) {
    const pedido = await prisma.pedido.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        tipoEntrega: true,
      },
    });

    if (!pedido) {
      throw new Error("Pedido não encontrado");
    }

    if ((pedido.tipoEntrega || "").trim().toLowerCase() !== "retirada") {
      throw new Error("Apenas pedidos de retirada podem ser marcados como prontos");
    }

    if (pedido.status === "COMPLETADO") {
      throw new Error("Pedido já foi finalizado");
    }

    if (pedido.status === "CANCELADO") {
      throw new Error("Não é possível alterar um pedido cancelado");
    }

    if (pedido.status === "PRONTO_PARA_RETIRADA") {
      return pedido;
    }

    const pedidoAtualizado = await prisma.pedido.update({
      where: { id },
      data: { status: "PRONTO_PARA_RETIRADA" },
    });

    return pedidoAtualizado;
  }

  async marcarPedidoSaiuParaEntrega(id: number) {
    const pedido = await prisma.pedido.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        tipoEntrega: true,
      },
    });

    if (!pedido) {
      throw new Error("Pedido não encontrado");
    }

    if ((pedido.tipoEntrega || "").trim().toLowerCase() !== "entrega") {
      throw new Error("Apenas pedidos de entrega em domicílio podem sair para entrega");
    }

    if (pedido.status === "COMPLETADO") {
      throw new Error("Pedido já foi finalizado");
    }

    if (pedido.status === "CANCELADO") {
      throw new Error("Não é possível alterar um pedido cancelado");
    }

    if (pedido.status === "SAIU_PARA_ENTREGA") {
      return pedido;
    }

    const pedidoAtualizado = await prisma.pedido.update({
      where: { id },
      data: { status: "SAIU_PARA_ENTREGA" },
    });

    return pedidoAtualizado;
  }

  async cancelarPedidoUsuario(usuarioId: number, id: number) {
    const pedido = await prisma.pedido.findFirst({
      where: {
        id,
        usuarioId,
      },
    });

    if (!pedido) {
      throw new Error("Pedido não encontrado");
    }

    if (pedido.status === "COMPLETADO") {
      throw new Error("Não é possível cancelar um pedido finalizado");
    }

    if (pedido.status === "CANCELADO") {
      throw new Error("Este pedido já foi cancelado");
    }

    return prisma.pedido.update({
      where: { id },
      data: { status: "CANCELADO" },
    });
  }
}
