import { Request, Response } from "express";
import { UsuarioService } from "../models/usuario.service";

const usuarioService = new UsuarioService();

export const getPerfil = async (req: Request, res: Response) => {
  try {
    const usuarioId = req.usuario?.usuarioId;
    if (!usuarioId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }
    const perfil = await usuarioService.getPerfil(usuarioId);
    res.json(perfil);
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
};

export const atualizarMeuTelefone = async (req: Request, res: Response) => {
  try {
    const usuarioId = req.usuario?.usuarioId;
    if (!usuarioId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const { telefone } = req.body as { telefone?: string | null };
    const perfil = await usuarioService.atualizarMeuTelefone(usuarioId, telefone);
    res.json(perfil);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const getPerfilUsuarioAdmin = async (req: Request, res: Response) => {
  try {
    const idParam = req.params.id;
    if (!idParam) {
      return res.status(400).json({ error: "ID do usuário não fornecido" });
    }

    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const perfil = await usuarioService.getPerfilCompletoAdmin(id);
    if (!perfil) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    return res.json(perfil);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
};

export const deletarUsuario = async (req: Request, res: Response) => {
  try {
    const idParam = req.params.id;
    if (!idParam) {
      throw new Error("ID do usuário não fornecido");
    }
    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      throw new Error("ID inválido");
    }
    await usuarioService.deletarUsuario(id);
    res.status(200).json({ message: "Usuário excluído com sucesso" });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const listarUsuarios = async (_req: Request, res: Response) => {
  try {
    const usuarios = await usuarioService.listarUsuarios();
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

export const atualizarUsuario = async (req: Request, res: Response) => {
  try {
    const idParam = req.params.id;
    if (!idParam) {
      throw new Error("ID do usuário não fornecido");
    }

    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      throw new Error("ID inválido");
    }

    const { nome, email, telefone, role } = req.body as {
      nome?: string;
      email?: string;
      telefone?: string | null;
      role?: "ADMIN" | "USER";
    };

    const usuarioLogadoId = req.usuario?.usuarioId;
    if (usuarioLogadoId && usuarioLogadoId === id && role === "USER") {
      return res
        .status(400)
        .json({ error: "Você não pode remover seu próprio acesso de administrador" });
    }

    const payload: {
      nome?: string;
      email?: string;
      telefone?: string | null;
      role?: "ADMIN" | "USER";
    } = {};

    if (typeof nome === "string") {
      payload.nome = nome;
    }

    if (typeof email === "string") {
      payload.email = email;
    }

    if (typeof telefone === "string") {
      payload.telefone = telefone;
    }

    if (role === "ADMIN" || role === "USER") {
      payload.role = role;
    }

    const usuario = await usuarioService.atualizarUsuario(id, payload);

    res.json(usuario);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};
