import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class EnderecoService {
  async criarEndereco(usuarioId: number, rua: string, cidade: string, cep: string) {
    return prisma.endereco.create({
      data: { usuarioId, rua, cidade, cep },
    });
  }
}