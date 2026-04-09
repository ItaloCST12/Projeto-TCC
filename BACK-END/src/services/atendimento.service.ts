import prisma from "../models/client";

type AutorMensagem = "USUARIO" | "SUPORTE";

type AtendimentoMensagem = {
  id: number;
  usuarioId: number;
  autor: AutorMensagem;
  texto: string;
  imagemUrl: string | null;
  createdAt: Date;
};

type AtendimentoMensagemAdmin = AtendimentoMensagem & {
  nome: string;
  email: string;
};

const validarTexto = (texto: string | undefined) => {
  const textoNormalizado = texto?.trim() || "";

  if (textoNormalizado.length > 300) {
    throw new Error("Mensagem deve ter no máximo 300 caracteres");
  }

  return textoNormalizado;
};

const validarImagemUrl = (imagemUrl: string | null | undefined) => {
  const imagemNormalizada = imagemUrl?.trim() || "";

  if (!imagemNormalizada) {
    return null;
  }

  if (imagemNormalizada.length > 2048) {
    throw new Error("URL da imagem inválida");
  }

  return imagemNormalizada;
};

const validarConteudoMensagem = (texto: string | undefined, imagemUrl: string | null | undefined) => {
  const textoValido = validarTexto(texto);
  const imagemUrlValida = validarImagemUrl(imagemUrl);

  if (!textoValido && !imagemUrlValida) {
    throw new Error("Mensagem ou imagem é obrigatória");
  }

  return {
    textoValido,
    imagemUrlValida,
  };
};

export const enviarMensagem = async (
  usuarioId: number,
  autor: AutorMensagem,
  conteudo: { texto?: string; imagemUrl?: string | null },
) => {
  const { textoValido, imagemUrlValida } = validarConteudoMensagem(
    conteudo.texto,
    conteudo.imagemUrl,
  );

  const rows = await prisma.$queryRaw<AtendimentoMensagem[]>`
    INSERT INTO "AtendimentoMensagem" ("usuarioId", "autor", "texto", "imagemUrl")
    VALUES (${usuarioId}, ${autor}, ${textoValido}, ${imagemUrlValida})
    RETURNING "id", "usuarioId", "autor", "texto", "imagemUrl", "createdAt"
  `;

  const mensagem = rows[0];
  if (!mensagem) {
    throw new Error("Não foi possível salvar a mensagem");
  }

  return mensagem;
};

export const listarMensagensDoUsuario = async (usuarioId: number) => {
  return prisma.$queryRaw<AtendimentoMensagem[]>`
    SELECT "id", "usuarioId", "autor", "texto", "imagemUrl", "createdAt"
    FROM "AtendimentoMensagem"
    WHERE "usuarioId" = ${usuarioId}
    ORDER BY "createdAt" ASC
  `;
};

export const limparConversaDoUsuario = async (usuarioId: number) => {
  const count = await prisma.$executeRaw`
    DELETE FROM "AtendimentoMensagem"
    WHERE "usuarioId" = ${usuarioId}
  `;

  return { count: Number(count) };
};

export const listarConversasAdmin = async () => {
  const mensagens = await prisma.$queryRaw<AtendimentoMensagemAdmin[]>`
    SELECT
      m."id",
      m."usuarioId",
      m."autor",
      m."texto",
      m."imagemUrl",
      m."createdAt",
      COALESCE(u."nome", 'Cliente') AS "nome",
      u."email"
    FROM "AtendimentoMensagem" m
    INNER JOIN "Usuario" u ON u."id" = m."usuarioId"
    ORDER BY m."createdAt" DESC
  `;

  const resumoPorUsuario = new Map<
    number,
    {
      usuarioId: number;
      nome: string;
      email: string;
      ultimaMensagem: string;
      ultimaAtualizacao: Date;
      totalMensagens: number;
    }
  >();

  for (const mensagem of mensagens) {
    const existente = resumoPorUsuario.get(mensagem.usuarioId);

    if (!existente) {
      resumoPorUsuario.set(mensagem.usuarioId, {
        usuarioId: mensagem.usuarioId,
        nome: mensagem.nome || "Cliente",
        email: mensagem.email,
        ultimaMensagem: mensagem.texto?.trim() || (mensagem.imagemUrl ? "Imagem enviada" : "Mensagem"),
        ultimaAtualizacao: mensagem.createdAt,
        totalMensagens: 1,
      });
      continue;
    }

    existente.totalMensagens += 1;
  }

  return Array.from(resumoPorUsuario.values()).sort(
    (a, b) => b.ultimaAtualizacao.getTime() - a.ultimaAtualizacao.getTime(),
  );
};

export const listarMensagensPorUsuarioAdmin = async (usuarioId: number) => {
  return prisma.$queryRaw<AtendimentoMensagemAdmin[]>`
    SELECT
      m."id",
      m."usuarioId",
      m."autor",
      m."texto",
      m."imagemUrl",
      m."createdAt",
      COALESCE(u."nome", 'Cliente') AS "nome",
      u."email"
    FROM "AtendimentoMensagem" m
    INNER JOIN "Usuario" u ON u."id" = m."usuarioId"
    WHERE m."usuarioId" = ${usuarioId}
    ORDER BY m."createdAt" ASC
  `;
};
