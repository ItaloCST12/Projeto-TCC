import { Request, Response } from 'express';
import { UsuarioService } from '../services/usuario.service';

const usuarioService = new UsuarioService();

export const cadastrar = async (req: Request, res: Response) => {
  try {
    const { nome, email, senha, password } = req.body;
    if (!nome || nome.trim() === '') {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }
    const senhaFinal = senha || password;
    if (!senhaFinal) {
      return res.status(400).json({ error: 'Senha é obrigatória' });
    }
    const usuario = await usuarioService.cadastrar(nome.trim(), email, senhaFinal);
    res.status(201).json(usuario);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, senha } = req.body;
    const token = await usuarioService.login(email, senha);
    res.json(token);
  } catch (error) {
    res.status(401).json({ error: (error as Error).message });
  }
};

export const getPerfil = async (req: Request, res: Response) => {
  try {
    const usuarioId = (req as any).usuario.usuarioId;
    const perfil = await usuarioService.getPerfil(usuarioId);
    res.json(perfil);
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
};

export const deletarUsuario = async (req: Request, res: Response) => {
  try {
    const idParam = req.params.id;
    if (!idParam) {
      throw new Error('ID do usuário não fornecido');
    }
    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      throw new Error('ID inválido');
    }
    await usuarioService.deletarUsuario(id);
    res.status(200).json({ message: 'Usuário deletado com sucesso' });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

