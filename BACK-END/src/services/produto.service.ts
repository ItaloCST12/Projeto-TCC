import prisma from "../models/client";

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

    return await prisma.produto.create({
      data: {
        nome,
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

    return await prisma.produto.update({
      where: { id },
      data,
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
