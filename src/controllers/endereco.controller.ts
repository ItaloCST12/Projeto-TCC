import { EnderecoService } from '../services/endereco.service';
import { Request, Response } from 'express';

const enderecoService = new EnderecoService();

export const criarEndereco = async (req: Request, res: Response): Promise<void> => {
  try {
    const { usuarioId, rua, cidade, cep } = req.body;

    const endereco = await enderecoService.criarEndereco(
      usuarioId,
      rua,
      cidade,
      cep
    );

    res.status(201).json(endereco);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};
