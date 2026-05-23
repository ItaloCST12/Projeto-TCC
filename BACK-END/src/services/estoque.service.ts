import { Prisma } from "@prisma/client";
import prisma from "../models/client";

const TIPOS_MOVIMENTACAO = ["ENTRADA", "SAIDA", "AJUSTE", "DEVOLUCAO"] as const;
type TipoMovimentacao = (typeof TIPOS_MOVIMENTACAO)[number];

type TamanhoProduto = "grande" | "medio" | "pequeno";

type ProdutoComConfiguracaoTamanho = {
  precoAbacaxiGrande?: unknown;
  precoAbacaxiMedio?: unknown;
  precoAbacaxiPequeno?: unknown;
  estoqueAbacaxiGrande?: number;
  estoqueAbacaxiMedio?: number;
  estoqueAbacaxiPequeno?: number;
};

const normalizarTexto = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const isProdutoComTamanhos = (produto?: ProdutoComConfiguracaoTamanho | null) => {
  if (!produto) {
    return false;
  }

  return Boolean(
    produto.precoAbacaxiGrande !== null && produto.precoAbacaxiGrande !== undefined ||
      produto.precoAbacaxiMedio !== null && produto.precoAbacaxiMedio !== undefined ||
      produto.precoAbacaxiPequeno !== null && produto.precoAbacaxiPequeno !== undefined ||
      Number(produto.estoqueAbacaxiGrande ?? 0) > 0 ||
      Number(produto.estoqueAbacaxiMedio ?? 0) > 0 ||
      Number(produto.estoqueAbacaxiPequeno ?? 0) > 0,
  );
};

const normalizarTamanhoProduto = (tamanho?: string | null): TamanhoProduto | null => {
  if (!tamanho?.trim()) {
    return null;
  }

  const tamanhoNormalizado = normalizarTexto(tamanho);
  if (tamanhoNormalizado.includes("grande")) {
    return "grande";
  }
  if (tamanhoNormalizado.includes("medio")) {
    return "medio";
  }
  if (tamanhoNormalizado.includes("pequeno")) {
    return "pequeno";
  }

  throw new Error("Tamanho inválido");
};

const resolverTamanhoPorUnidade = (unidade?: string | null): TamanhoProduto => {
  const unidadeNormalizada = normalizarTexto(unidade ?? "");
  if (unidadeNormalizada.includes("grande")) {
    return "grande";
  }
  if (unidadeNormalizada.includes("pequeno")) {
    return "pequeno";
  }

  return "medio";
};

const getLabelTamanho = (tamanho: TamanhoProduto) => {
  if (tamanho === "grande") {
    return "Grande";
  }
  if (tamanho === "pequeno") {
    return "Pequeno";
  }

  return "Médio";
};

const getEstoquePorTamanho = (
  produto: {
    estoqueAbacaxiGrande: number;
    estoqueAbacaxiMedio: number;
    estoqueAbacaxiPequeno: number;
  },
  tamanho: TamanhoProduto,
) => {
  if (tamanho === "grande") {
    return produto.estoqueAbacaxiGrande;
  }
  if (tamanho === "pequeno") {
    return produto.estoqueAbacaxiPequeno;
  }

  return produto.estoqueAbacaxiMedio;
};

const getEstoqueTotalPorTamanhos = (produto: {
  estoqueAbacaxiGrande: number;
  estoqueAbacaxiMedio: number;
  estoqueAbacaxiPequeno: number;
}) =>
  produto.estoqueAbacaxiGrande +
  produto.estoqueAbacaxiMedio +
  produto.estoqueAbacaxiPequeno;

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
  async ajustarEstoquesAbacaxi(
    produtoId: number,
    estoques: { grande: number; medio: number; pequeno: number },
    motivo?: string,
  ) {
    if (!Number.isInteger(produtoId) || produtoId <= 0) {
      throw new Error("Produto inválido");
    }

    const estoqueGrande = Math.trunc(estoques.grande);
    const estoqueMedio = Math.trunc(estoques.medio);
    const estoquePequeno = Math.trunc(estoques.pequeno);

    if (estoqueGrande < 0 || estoqueMedio < 0 || estoquePequeno < 0) {
      throw new Error("Estoque inválido para os tamanhos");
    }

    return prisma.$transaction(async (tx) => {
      const produto = await tx.produto.findUnique({
        where: { id: produtoId },
        select: {
          id: true,
          nome: true,
          excluido: true,
          disponivel: true,
          precoAbacaxiGrande: true,
          precoAbacaxiMedio: true,
          precoAbacaxiPequeno: true,
          estoqueAbacaxiGrande: true,
          estoqueAbacaxiMedio: true,
          estoqueAbacaxiPequeno: true,
        },
      });

      if (!produto || produto.excluido) {
        throw new Error("Produto não encontrado");
      }

      if (!isProdutoComTamanhos(produto)) {
        throw new Error("Ajuste por tamanhos é permitido apenas para produtos com tamanhos");
      }

      const estoqueTotal = estoqueGrande + estoqueMedio + estoquePequeno;
      const motivoBase = motivo?.trim() ? motivo.trim() : "Ajuste manual de estoque por tamanhos";

      const produtoAtualizado = await tx.produto.update({
        where: { id: produtoId },
        data: {
          estoqueAbacaxiGrande: estoqueGrande,
          estoqueAbacaxiMedio: estoqueMedio,
          estoqueAbacaxiPequeno: estoquePequeno,
          estoque: estoqueTotal,
          disponivel: estoqueTotal === 0 ? false : produto.disponivel,
        },
      });

      await tx.movimentacaoEstoque.createMany({
        data: [
          {
            produtoId,
            tipo: "AJUSTE",
            quantidade: estoqueGrande,
            motivo: `${motivoBase} • Tamanho: Grande`,
          },
          {
            produtoId,
            tipo: "AJUSTE",
            quantidade: estoqueMedio,
            motivo: `${motivoBase} • Tamanho: Médio`,
          },
          {
            produtoId,
            tipo: "AJUSTE",
            quantidade: estoquePequeno,
            motivo: `${motivoBase} • Tamanho: Pequeno`,
          },
        ],
      });

      return produtoAtualizado;
    });
  }

  async ajustarEstoque(
    produtoId: number,
    tipo: string,
    quantidade: number,
    motivo?: string,
    pedidoId?: number,
    tamanho?: string,
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
          precoAbacaxiGrande: true,
          precoAbacaxiMedio: true,
          precoAbacaxiPequeno: true,
          estoqueAbacaxiGrande: true,
          estoqueAbacaxiMedio: true,
          estoqueAbacaxiPequeno: true,
        },
      });

      if (!produto || produto.excluido) {
        throw new Error("Produto não encontrado");
      }

      if (produto.estoque === null) {
        throw new Error("Estoque do produto não está configurado");
      }

      const produtoComTamanhos = isProdutoComTamanhos(produto);
      const tamanhoProduto = normalizarTamanhoProduto(tamanho);

      if (tamanhoProduto && !produtoComTamanhos) {
        throw new Error("Ajuste por tamanho é permitido apenas para produtos com tamanhos");
      }

      const motivoBase = motivo?.trim() ? motivo.trim() : null;
      const motivoFinal = tamanhoProduto
        ? [motivoBase, `Tamanho: ${getLabelTamanho(tamanhoProduto)}`]
            .filter(Boolean)
            .join(" • ")
        : motivoBase;

      if (produtoComTamanhos && tamanhoProduto) {
        const estoqueAtualTamanho = getEstoquePorTamanho(produto, tamanhoProduto);
        let novoEstoqueTamanho = estoqueAtualTamanho;

        if (tipoMovimentacao === "SAIDA") {
          if (estoqueAtualTamanho < quantidade) {
            throw new Error(
              `Estoque insuficiente para ${produto.nome} (${getLabelTamanho(tamanhoProduto)}). Disponível: ${estoqueAtualTamanho}`,
            );
          }
          novoEstoqueTamanho = estoqueAtualTamanho - quantidade;
        }

        if (tipoMovimentacao === "ENTRADA" || tipoMovimentacao === "DEVOLUCAO") {
          novoEstoqueTamanho = estoqueAtualTamanho + quantidade;
        }

        if (tipoMovimentacao === "AJUSTE") {
          novoEstoqueTamanho = quantidade;
        }

        const novoEstoqueGrande =
          tamanhoProduto === "grande" ? novoEstoqueTamanho : produto.estoqueAbacaxiGrande;
        const novoEstoqueMedio =
          tamanhoProduto === "medio" ? novoEstoqueTamanho : produto.estoqueAbacaxiMedio;
        const novoEstoquePequeno =
          tamanhoProduto === "pequeno" ? novoEstoqueTamanho : produto.estoqueAbacaxiPequeno;

        const estoqueTotalAbacaxi = getEstoqueTotalPorTamanhos({
          estoqueAbacaxiGrande: novoEstoqueGrande,
          estoqueAbacaxiMedio: novoEstoqueMedio,
          estoqueAbacaxiPequeno: novoEstoquePequeno,
        });

        const produtoAtualizado = await tx.produto.update({
          where: { id: produtoId },
          data: {
            estoqueAbacaxiGrande: novoEstoqueGrande,
            estoqueAbacaxiMedio: novoEstoqueMedio,
            estoqueAbacaxiPequeno: novoEstoquePequeno,
            estoque: estoqueTotalAbacaxi,
            disponivel: estoqueTotalAbacaxi === 0 ? false : produto.disponivel,
          },
        });

        await tx.movimentacaoEstoque.create({
          data: {
            produtoId,
            tipo: tipoMovimentacao,
            quantidade: Math.trunc(quantidade),
            motivo: motivoFinal,
            pedidoId: pedidoId ?? null,
          },
        });

        return produtoAtualizado;
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
          motivo: motivoFinal,
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
        precoAbacaxiGrande: true,
        precoAbacaxiMedio: true,
        precoAbacaxiPequeno: true,
        estoqueAbacaxiGrande: true,
        estoqueAbacaxiMedio: true,
        estoqueAbacaxiPequeno: true,
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
            unidade: true,
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
            unidade: item.unidade,
          }))
        : [{ produtoId: pedido.produtoId, quantidade: pedido.quantidade, unidade: pedido.unidade }];

    for (const item of itens) {
      const produto = await tx.produto.findUnique({
        where: { id: item.produtoId },
        select: {
          id: true,
          nome: true,
          estoque: true,
          estoqueAbacaxiGrande: true,
          estoqueAbacaxiMedio: true,
          estoqueAbacaxiPequeno: true,
          precoAbacaxiGrande: true,
          precoAbacaxiMedio: true,
          precoAbacaxiPequeno: true,
          disponivel: true,
          excluido: true,
        },
      });

      if (!produto || produto.excluido || produto.estoque === null) {
        continue;
      }

      if (isProdutoComTamanhos(produto)) {
        const tamanho = resolverTamanhoPorUnidade(item.unidade);
        const estoqueTamanhoAtual = getEstoquePorTamanho(produto, tamanho);

        if (operacao === "SAIDA" && estoqueTamanhoAtual < item.quantidade) {
          throw new Error(
            `Estoque insuficiente para ${produto.nome} (${getLabelTamanho(tamanho)}). Disponível: ${estoqueTamanhoAtual}`,
          );
        }

        const novoEstoqueTamanho =
          operacao === "SAIDA"
            ? estoqueTamanhoAtual - item.quantidade
            : estoqueTamanhoAtual + item.quantidade;

        const novoEstoqueGrande =
          tamanho === "grande" ? novoEstoqueTamanho : produto.estoqueAbacaxiGrande;
        const novoEstoqueMedio =
          tamanho === "medio" ? novoEstoqueTamanho : produto.estoqueAbacaxiMedio;
        const novoEstoquePequeno =
          tamanho === "pequeno" ? novoEstoqueTamanho : produto.estoqueAbacaxiPequeno;

        const estoqueTotalAbacaxi = getEstoqueTotalPorTamanhos({
          estoqueAbacaxiGrande: novoEstoqueGrande,
          estoqueAbacaxiMedio: novoEstoqueMedio,
          estoqueAbacaxiPequeno: novoEstoquePequeno,
        });

        await tx.produto.update({
          where: { id: produto.id },
          data: {
            estoqueAbacaxiGrande: novoEstoqueGrande,
            estoqueAbacaxiMedio: novoEstoqueMedio,
            estoqueAbacaxiPequeno: novoEstoquePequeno,
            estoque: estoqueTotalAbacaxi,
            disponivel: estoqueTotalAbacaxi === 0 ? false : produto.disponivel,
          },
        });

        await tx.movimentacaoEstoque.create({
          data: {
            produtoId: produto.id,
            tipo: operacao,
            quantidade: item.quantidade,
            motivo: `${motivo} • Tamanho: ${getLabelTamanho(tamanho)}`,
            pedidoId,
          },
        });

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
