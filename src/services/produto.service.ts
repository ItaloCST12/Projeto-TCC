import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ProdutoService {
  async getProdutos() {
    return await prisma.produto.findMany();
  }

  async atualizarDisponibilidade(id: number, disponivel: boolean) {
    return await prisma.produto.update({
      where: { id },
      data: { disponivel }
    });
  }

  async cadastrarProduto(nome: string, disponivel: boolean = true) {
    return await prisma.produto.create({
      data: { nome, disponivel }
    });
  }
}