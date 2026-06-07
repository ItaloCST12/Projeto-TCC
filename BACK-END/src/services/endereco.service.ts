import prisma from "../models/client";

type DadosEnderecoComparacao = {
  rua?: string | null;
  numero?: string | null;
  cidade?: string | null;
  cep?: string | null;
};

const normalizarCampoEndereco = (valor?: string | null) =>
  (valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const normalizarNumeroEndereco = (valor?: string | null) =>
  normalizarCampoEndereco(valor).replace(/\s+/g, "");

const normalizarCepEndereco = (valor?: string | null) =>
  (valor ?? "").replace(/\D/g, "");

const montarChaveEndereco = (endereco: DadosEnderecoComparacao) =>
  [
    normalizarCampoEndereco(endereco.rua),
    normalizarNumeroEndereco(endereco.numero),
    normalizarCampoEndereco(endereco.cidade),
    normalizarCepEndereco(endereco.cep),
  ].join("|");

export class EnderecoService {
  async criarEndereco(
    usuarioId: number,
    rua: string,
    numero: string | undefined,
    cidade: string,
    cep: string | undefined,
  ) {
    const ruaNormalizada = rua.trim();
    const numeroNormalizado = numero?.trim() ? numero.trim() : null;
    const cidadeNormalizada = cidade.trim();
    const cepNormalizado = cep?.trim() ?? "";

    const chaveNovoEndereco = montarChaveEndereco({
      rua: ruaNormalizada,
      numero: numeroNormalizado,
      cidade: cidadeNormalizada,
      cep: cepNormalizado,
    });

    const enderecosUsuario = await prisma.endereco.findMany({
      where: { usuarioId },
      select: {
        rua: true,
        numero: true,
        cidade: true,
        cep: true,
      },
    });

    const enderecoDuplicado = enderecosUsuario.some(
      (enderecoExistente) =>
        montarChaveEndereco(enderecoExistente) === chaveNovoEndereco,
    );

    if (enderecoDuplicado) {
      throw new Error("Endereço já cadastrado.");
    }

    return prisma.endereco.create({
      data: {
        usuarioId,
        rua: ruaNormalizada,
        numero: numeroNormalizado,
        cidade: cidadeNormalizada,
        cep: cepNormalizado,
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

    const ruaFinal = payload.rua ?? endereco.rua;
    const numeroFinal =
      Object.prototype.hasOwnProperty.call(payload, "numero")
        ? payload.numero ?? null
        : endereco.numero;
    const cidadeFinal = payload.cidade ?? endereco.cidade;
    const cepFinal = payload.cep ?? endereco.cep;

    const chaveEnderecoAtualizado = montarChaveEndereco({
      rua: ruaFinal,
      numero: numeroFinal,
      cidade: cidadeFinal,
      cep: cepFinal,
    });

    const outrosEnderecosUsuario = await prisma.endereco.findMany({
      where: {
        usuarioId,
        id: { not: enderecoId },
      },
      select: {
        rua: true,
        numero: true,
        cidade: true,
        cep: true,
      },
    });

    const enderecoDuplicado = outrosEnderecosUsuario.some(
      (enderecoExistente) =>
        montarChaveEndereco(enderecoExistente) === chaveEnderecoAtualizado,
    );

    if (enderecoDuplicado) {
      throw new Error("Endereço já cadastrado.");
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
