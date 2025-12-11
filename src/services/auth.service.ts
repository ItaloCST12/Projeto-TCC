import prisma from '../prisma/client'
import * as bcrypt from 'bcrypt'
import * as UserService from './usuario.service'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || "secret"

export const login = async (data: { email: string, password: string }) => {
    if (!data.email || !data.password) {
        throw new Error('Email e senha são obrigatórios');
    }
    
    const user = await UserService.getByEmail(data.email);
    
    if (user === null || user === undefined) {
        throw new Error('Usuario não encontrado!');
    }

    const isPasswordValid = await bcrypt.compare(data.password, (user as any).password as string);
    if (!isPasswordValid) {
        throw new Error('Credenciais inválidas');
    }

    const token = jwt.sign(
        { usuarioId: (user as any).id, email: (user as any).email, role: (user as any).role },
        JWT_SECRET,
        { expiresIn: "1h" }
    )

    return { token, usuario: { id: (user as any).id, nome: (user as any).nome, email: (user as any).email, role: (user as any).role } }
}

export const me = async (userId: string) => {
    const user = await prisma.usuario.findUnique({ where: { id: Number(userId) } });
    if (!user) {
        throw new Error('Usuário não encontrado!');
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
}

export const register = async (data: { nome: string; email: string; password: string; role?: string }) => {
    const usuarioExistente = await prisma.usuario.findUnique({
        where: { email: data.email }
    });
    if (usuarioExistente) {
        throw new Error('Email já cadastrado');
    }
    return await prisma.usuario.create({
        data: {
            nome: data.nome,
            email: data.email,
            password: data.password,
            role: data.role ?? 'USER'
        },
        select: {
            id: true,
            nome: true,
            email: true,
            role: true
        }
    });
}
