import prisma from "../models/client";
import type { Prisma } from "@prisma/client";

export class UsuarioService {
  async getPerfil(usuarioId: number) {
    return prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        role: true,
      },
    });
  }

  async getPerfilCompletoAdmin(usuarioId: number) {
    return prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        role: true,
        enderecos: {
          orderBy: { id: "desc" },
          select: {
            id: true,
            rua: true,
            numero: true,
            cidade: true,
            cep: true,
          },
        },
      },
    });
  }

  async deletarUsuario(id: number) {
    const usuario = await prisma.usuario.findUnique({ where: { id } });

    if (!usuario) {
      throw new Error("Usuário não encontrado");
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.atendimentoMensagem.deleteMany({
        where: { usuarioId: id },
      });

      await tx.itemPedido.deleteMany({
        where: {
          pedido: {
            usuarioId: id,
          },
        },
      });

      await tx.pedido.deleteMany({
        where: { usuarioId: id },
      });

      await tx.endereco.deleteMany({
        where: { usuarioId: id },
      });

      await tx.usuario.delete({ where: { id } });
    });

    return { id };
  }

  async listarUsuarios() {
    return prisma.usuario.findMany({
      orderBy: { id: "asc" },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        role: true,
      },
    });
  }

  async atualizarMeuTelefone(usuarioId: number, telefone?: string | null) {
    const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });

    if (!usuario) {
      throw new Error("Usuário não encontrado");
    }

    const telefoneLimpo = typeof telefone === "string" ? telefone.trim() : "";

    return prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        telefone: telefoneLimpo ? telefoneLimpo : null,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        role: true,
      },
    });
  }

  async atualizarUsuario(
    id: number,
    data: {
      nome?: string;
      email?: string;
      telefone?: string | null;
      role?: "ADMIN" | "USER";
    },
  ) {
    const payload: {
      nome?: string;
      email?: string;
      telefone?: string | null;
      role?: "ADMIN" | "USER";
    } = {};

    if (typeof data.nome === "string") {
      payload.nome = data.nome.trim();
    }

    if (typeof data.email === "string") {
      payload.email = data.email.trim();
    }

    if (typeof data.telefone === "string") {
      payload.telefone = data.telefone.trim() ? data.telefone.trim() : null;
    }

    if (data.role === "ADMIN" || data.role === "USER") {
      payload.role = data.role;
    }

    if (Object.keys(payload).length === 0) {
      throw new Error("Nenhum campo válido para atualização");
    }

    return prisma.usuario.update({
      where: { id },
      data: payload,
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        role: true,
      },
    });
  }
}

export const getByEmail = async (email: string) => {
  return prisma.usuario.findUnique({
    where: { email },
  });
};
