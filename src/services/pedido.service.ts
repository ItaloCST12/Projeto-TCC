import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class PedidoService {
  async criarPedido(
    usuarioId: number, 
    produtoId: number, 
    quantidade: number, 
    unidade: string, 
    tipoEntrega: string,
    items?: { produtoId: number; quantidade: number }[]
  ) {
    return prisma.pedido.create({
      data: { 
        usuarioId, 
        produtoId, 
        quantidade, 
        unidade, 
        tipoEntrega, 
        status: 'PENDENTE',
        ...(items && { items: { create: items } })
      },
      include: { 
        items: { include: { produto: true } },
        produto: true
      }
    });
  }

  async getHistoricoUsuario(usuarioId: number) {
    return prisma.pedido.findMany({ 
      where: { usuarioId },
      include: { 
        items: { include: { produto: true } },
        produto: true
      }
    });
  }

  async getTodosPedidos() {
    return prisma.pedido.findMany();
  }

  async finalizarPedido(id: number) {
    return prisma.pedido.update({
      where: { id },
      data: { status: 'COMPLETADO' },
    });
  }
}