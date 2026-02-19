import { EnderecoService } from "../services/endereco.service";
import { Request, Response } from "express";

const enderecoService = new EnderecoService();

export const criarEndereco = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const usuarioId = req.usuario?.usuarioId;
    if (!usuarioId) {
      res.status(401).json({ error: "Usuário não autenticado" });
      return;
    }

    const { rua, numero, cidade, cep } = req.body;
    if (!rua || !cidade || !cep) {
      res
        .status(400)
        .json({ error: "Campos obrigatórios: rua, cidade e cep" });
      return;
    }

    const endereco = await enderecoService.criarEndereco(
      usuarioId,
      rua,
      numero,
      cidade,
      cep,
    );

    res.status(201).json(endereco);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const listarEnderecosUsuario = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const usuarioId = req.usuario?.usuarioId;
    if (!usuarioId) {
      res.status(401).json({ error: "Usuário não autenticado" });
      return;
    }

    const enderecos = await enderecoService.listarEnderecosUsuario(usuarioId);
    res.json(enderecos);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};
