import prisma from "../prisma/client";

export class EnderecoService {
  async criarEndereco(
    usuarioId: number,
    rua: string,
    numero: string | undefined,
    cidade: string,
    cep: string,
  ) {
    return prisma.endereco.create({
      data: {
        usuarioId,
        rua,
        numero: numero?.trim() ? numero.trim() : null,
        cidade,
        cep,
      },
    });
  }

  async listarEnderecosUsuario(usuarioId: number) {
    return prisma.endereco.findMany({
      where: { usuarioId },
      orderBy: { id: "desc" },
    });
  }
}
