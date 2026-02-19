import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../prisma/client";
import { AUTH_SECRET } from "../utils/auth-secret";

export class UsuarioService {
  async cadastrar(nome: string, email: string, senha: string) {
    const senhaHash = await bcrypt.hash(senha, 10);
    const usuario = await prisma.usuario.create({
      data: { nome, email, password: senhaHash, role: "USER" },
      select: { id: true, nome: true, email: true, role: true },
    });
    return usuario;
  }

  async login(email: string, senha: string) {
    if (!email || !senha) {
      throw new Error("Email e senha são obrigatórios");
    }

    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario || !(await bcrypt.compare(senha, usuario.password))) {
      throw new Error("Credenciais inválidas");
    }
    const token = jwt.sign(
      { usuarioId: usuario.id, email: usuario.email, role: usuario.role },
      AUTH_SECRET,
      { expiresIn: "1h" },
    );
    return {
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
      },
    };
  }

  async getPerfil(usuarioId: number) {
    return prisma.usuario.findUnique({ where: { id: usuarioId } });
  }

  async deletarUsuario(id: number) {
    return prisma.usuario.delete({ where: { id } });
  }
}

export const getByEmail = async (email: string) => {
  return prisma.usuario.findUnique({
    where: { email },
  });
};
