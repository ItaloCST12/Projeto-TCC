import prisma from "../models/client";
import bcrypt from "bcryptjs";
import * as UserService from "./usuario.service";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendResetPasswordEmail } from "./email.service";
import { AUTH_SECRET } from "../utils/auth-secret";

const RESET_TOKEN_EXPIRATION_MINUTES = 15;

const hashResetToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const login = async (data: { email: string; password?: string }) => {
  if (!data.email || !data.password) {
    throw new Error("Email e senha são obrigatórios");
  }

  const user = await UserService.getByEmail(data.email);

  if (!user) {
    throw new Error("Usuário não encontrado");
  }

  const isPasswordValid = await bcrypt.compare(data.password, user.password);
  if (!isPasswordValid) {
    throw new Error("Credenciais inválidas");
  }

  const token = jwt.sign(
    { usuarioId: user.id, email: user.email, role: user.role },
    AUTH_SECRET,
    { expiresIn: "1h" },
  );

  return {
    token,
    usuario: {
      id: user.id,
      nome: user.nome,
      email: user.email,
      telefone: user.telefone,
      role: user.role,
    },
  };
};

export const me = async (userId: string) => {
  const user = await prisma.usuario.findUnique({
    where: { id: Number(userId) },
  });
  if (!user) {
    throw new Error("Usuário não encontrado!");
  }

  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

export const register = async (data: {
  nome: string;
  email: string;
  telefone: string;
  password: string;
  role?: string;
}) => {
  if (!data.nome?.trim()) {
    throw new Error("Nome é obrigatório");
  }

  if (!data.email?.trim()) {
    throw new Error("E-mail é obrigatório");
  }

  if (!data.password) {
    throw new Error("Senha é obrigatória");
  }

  if (!data.telefone?.trim()) {
    throw new Error("Telefone é obrigatório");
  }

  const usuarioExistente = await prisma.usuario.findUnique({
    where: { email: data.email },
  });
  if (usuarioExistente) {
    throw new Error("E-mail já cadastrado");
  }
  return prisma.usuario.create({
    data: {
      nome: data.nome.trim(),
      email: data.email.trim(),
      telefone: data.telefone.trim(),
      password: data.password,
      role: data.role ?? "USER",
    },
    select: {
      id: true,
      nome: true,
      email: true,
      telefone: true,
      role: true,
    },
  });
};

export const redefinirSenha = async (data: {
  email: string;
  novaSenhaHash: string;
}) => {
  if (!data.email?.trim()) {
    throw new Error("E-mail é obrigatório");
  }

  if (!data.novaSenhaHash) {
    throw new Error("Nova senha é obrigatória");
  }

  const usuario = await prisma.usuario.findUnique({
    where: { email: data.email.trim() },
  });

  if (!usuario) {
    throw new Error("Usuário não encontrado");
  }

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { password: data.novaSenhaHash },
  });

  return { message: "Senha redefinida com sucesso" };
};

export const solicitarRedefinicaoSenha = async (data: { email: string }) => {
  if (!data.email?.trim()) {
    throw new Error("E-mail é obrigatório");
  }

  const usuario = await prisma.usuario.findUnique({
    where: { email: data.email.trim() },
  });

  if (!usuario) {
    return {
      message:
        "Se o e-mail estiver cadastrado, você receberá instruções para redefinir a senha.",
    };
  }

  const token = crypto.randomBytes(24).toString("hex");
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRATION_MINUTES * 60 * 1000);

  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: {
        usuarioId: usuario.id,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    }),
    prisma.passwordResetToken.create({
      data: {
        usuarioId: usuario.id,
        tokenHash,
        expiresAt,
      },
    }),
  ]);

  const payload: { message: string; resetToken?: string } = {
    message:
      "Se o e-mail estiver cadastrado, você receberá instruções para redefinir a senha.",
  };

  try {
    const emailResult = await sendResetPasswordEmail({
      toEmail: usuario.email,
      resetCode: token,
      expiresInMinutes: RESET_TOKEN_EXPIRATION_MINUTES,
    });

    if (process.env.NODE_ENV !== "production" && emailResult.skipped) {
      payload.resetToken = token;
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      payload.resetToken = token;
      console.error("Falha ao enviar e-mail de redefinição:", (error as Error).message);
      return payload;
    }

    console.error("Falha ao enviar e-mail de redefinição:", (error as Error).message);
  }

  return payload;
};

export const redefinirSenhaComCodigo = async (data: {
  email: string;
  codigo: string;
  novaSenhaHash: string;
}) => {
  if (!data.email?.trim()) {
    throw new Error("E-mail é obrigatório");
  }

  if (!data.codigo?.trim()) {
    throw new Error("Código de redefinição é obrigatório");
  }

  if (!data.novaSenhaHash) {
    throw new Error("Nova senha é obrigatória");
  }

  const usuario = await prisma.usuario.findUnique({
    where: { email: data.email.trim() },
  });

  if (!usuario) {
    throw new Error("Código de redefinição inválido ou expirado");
  }

  const codigoHash = hashResetToken(data.codigo.trim());
  const agora = new Date();

  const resetToken = await prisma.passwordResetToken.findFirst({
    where: {
      usuarioId: usuario.id,
      tokenHash: codigoHash,
      usedAt: null,
      expiresAt: {
        gt: agora,
      },
    },
  });

  if (!resetToken) {
    throw new Error("Código de redefinição inválido ou expirado");
  }

  await prisma.$transaction([
    prisma.usuario.update({
      where: { id: usuario.id },
      data: { password: data.novaSenhaHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: agora },
    }),
    prisma.passwordResetToken.updateMany({
      where: {
        usuarioId: usuario.id,
        usedAt: null,
      },
      data: {
        usedAt: agora,
      },
    }),
  ]);

  return { message: "Senha redefinida com sucesso" };
};
