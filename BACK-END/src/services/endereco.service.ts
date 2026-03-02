import prisma from "../prisma/client";

export class EnderecoService {
  async criarEndereco(
    usuarioId: number,
    rua: string,
    numero: string | undefined,
    cidade: string,
    cep: string | undefined,
  ) {
    return prisma.endereco.create({
      data: {
        usuarioId,
        rua,
        numero: numero?.trim() ? numero.trim() : null,
        cidade,
        cep: cep?.trim() ?? "",
      },
    });
  }

  async listarEnderecosUsuario(usuarioId: number) {
    return prisma.endereco.findMany({
      where: { usuarioId },
      orderBy: { id: "desc" },
    });
  }

  async listarTodosEnderecos() {
    return prisma.endereco.findMany({
      orderBy: { id: "desc" },
    });
  }

  async atualizarEnderecoUsuario(
    usuarioId: number,
    enderecoId: number,
    data: {
      rua?: string;
      numero?: string;
      cidade?: string;
      cep?: string;
    },
  ) {
    const endereco = await prisma.endereco.findFirst({
      where: {
        id: enderecoId,
        usuarioId,
      },
    });

    if (!endereco) {
      throw new Error("Endereço não encontrado para este usuário");
    }

    const payload: {
      rua?: string;
      numero?: string | null;
      cidade?: string;
      cep?: string;
    } = {};

    if (typeof data.rua === "string") {
      payload.rua = data.rua.trim();
    }

    if (typeof data.numero === "string") {
      payload.numero = data.numero.trim() ? data.numero.trim() : null;
    }

    if (typeof data.cidade === "string") {
      payload.cidade = data.cidade.trim();
    }

    if (typeof data.cep === "string") {
      payload.cep = data.cep.trim();
    }

    if (Object.keys(payload).length === 0) {
      throw new Error("Nenhum campo válido para atualização");
    }

    return prisma.endereco.update({
      where: { id: enderecoId },
      data: payload,
    });
  }

  async excluirEnderecoUsuario(usuarioId: number, enderecoId: number) {
    const endereco = await prisma.endereco.findFirst({
      where: {
        id: enderecoId,
        usuarioId,
      },
    });

    if (!endereco) {
      throw new Error("Endereço não encontrado para este usuário");
    }

    const pedidosComEndereco = await prisma.pedido.count({
      where: {
        enderecoId,
      },
    });

    if (pedidosComEndereco > 0) {
      throw new Error(
        "Não é possível excluir este endereço pois ele está vinculado a pedidos",
      );
    }

    return prisma.endereco.delete({
      where: { id: enderecoId },
    });
  }
}
