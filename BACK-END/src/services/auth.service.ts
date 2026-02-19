import prisma from "../prisma/client";
import bcrypt from "bcryptjs";
import * as UserService from "./usuario.service";
import jwt from "jsonwebtoken";
import { AUTH_SECRET } from "../utils/auth-secret";

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
  password: string;
  role?: string;
}) => {
  if (!data.nome?.trim()) {
    throw new Error("Nome é obrigatório");
  }

  if (!data.email?.trim()) {
    throw new Error("Email é obrigatório");
  }

  if (!data.password) {
    throw new Error("Senha é obrigatória");
  }

  const usuarioExistente = await prisma.usuario.findUnique({
    where: { email: data.email },
  });
  if (usuarioExistente) {
    throw new Error("Email já cadastrado");
  }
  return prisma.usuario.create({
    data: {
      nome: data.nome.trim(),
      email: data.email.trim(),
      password: data.password,
      role: data.role ?? "USER",
    },
    select: {
      id: true,
      nome: true,
      email: true,
      role: true,
    },
  });
};
