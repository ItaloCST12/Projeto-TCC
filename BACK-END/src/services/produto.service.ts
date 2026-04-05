import prisma from "../models/client";

const normalizarNomeProduto = (nome: string) => {
  const nomeSemEspacosExtras = nome.trim().replace(/\s+/g, " ");
  if (!nomeSemEspacosExtras) {
    return "";
  }

  const nomeMinusculo = nomeSemEspacosExtras.toLocaleLowerCase("pt-BR");
  return `${nomeMinusculo.charAt(0).toLocaleUpperCase("pt-BR")}${nomeMinusculo.slice(1)}`;
};

export class ProdutoService {
  async getProdutos() {
    return prisma.produto.findMany({
      where: { excluido: false },
      orderBy: { nome: "asc" },
    });
  }

  async atualizarDisponibilidade(id: number, disponivel: boolean) {
    const produto = await prisma.produto.findUnique({
      where: { id },
      select: { id: true, excluido: true },
    });

    if (!produto || produto.excluido) {
      throw new Error("Produto não encontrado");
    }

    return await prisma.produto.update({
      where: { id },
      data: { disponivel },
    });
  }

  async cadastrarProduto(
    nome: string,
    preco: number,
    disponivel: boolean = true,
    estoque: number,
    imagemUrl?: string,
  ) {
    const estoqueNormalizado = Math.max(0, Math.trunc(estoque));
    const nomeNormalizado = normalizarNomeProduto(nome);

    if (!nomeNormalizado) {
      throw new Error("Nome do produto é obrigatório");
    }

    return await prisma.produto.create({
      data: {
        nome: nomeNormalizado,
        preco,
        disponivel,
        estoque: estoqueNormalizado,
        imagemUrl: imagemUrl ?? null,
      },
    });
  }

  async atualizarProduto(
    id: number,
    data: {
      nome?: string;
      preco?: number;
      disponivel?: boolean;
      imagemUrl?: string;
      precoAbacaxiGrande?: number | null;
      precoAbacaxiMedio?: number | null;
      precoAbacaxiPequeno?: number | null;
    },
  ) {
    if (Object.keys(data).length === 0) {
      throw new Error("Nenhum campo válido para atualização");
    }

    const produto = await prisma.produto.findUnique({
      where: { id },
      select: { id: true, excluido: true },
    });

    if (!produto || produto.excluido) {
      throw new Error("Produto não encontrado");
    }

    const nomeNormalizado =
      data.nome !== undefined ? normalizarNomeProduto(data.nome) : undefined;

    if (data.nome !== undefined && !nomeNormalizado) {
      throw new Error("Nome do produto é obrigatório");
    }

    return await prisma.produto.update({
      where: { id },
      data: {
        ...data,
        ...(nomeNormalizado !== undefined ? { nome: nomeNormalizado } : {}),
      },
    });
  }

  async excluirProduto(id: number) {
    const produto = await prisma.produto.findUnique({
      where: { id },
      select: { id: true, excluido: true },
    });

    if (!produto || produto.excluido) {
      throw new Error("Produto não encontrado");
    }

    const totalPedidosVinculados = await prisma.pedido.count({
      where: { produtoId: id },
    });

    const totalItensVinculados = await prisma.itemPedido.count({
      where: { produtoId: id },
    });

    if (totalPedidosVinculados > 0 || totalItensVinculados > 0) {
      return await prisma.produto.update({
        where: { id },
        data: { excluido: true, disponivel: false },
      });
    }

    return await prisma.produto.delete({
      where: { id },
    });
  }
}
