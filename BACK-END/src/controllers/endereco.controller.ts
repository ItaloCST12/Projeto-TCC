import { EnderecoService } from "../models/endereco.service";
import { Request, Response } from "express";

const enderecoService = new EnderecoService();

type ViaCepApiResponse = {
  erro?: boolean;
  cep?: string;
  logradouro?: string;
  localidade?: string;
};

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
    if (!rua || !cidade) {
      res
        .status(400)
        .json({ error: "Campos obrigatórios: rua e cidade" });
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

export const listarTodosEnderecos = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const enderecos = await enderecoService.listarTodosEnderecos();
    res.json(enderecos);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

export const atualizarEnderecoUsuario = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const usuarioId = req.usuario?.usuarioId;
    if (!usuarioId) {
      res.status(401).json({ error: "Usuário não autenticado" });
      return;
    }

    const idParam = req.params.id;
    if (!idParam) {
      res.status(400).json({ error: "ID do endereço não fornecido" });
      return;
    }

    const enderecoId = parseInt(idParam, 10);
    if (isNaN(enderecoId)) {
      res.status(400).json({ error: "ID do endereço inválido" });
      return;
    }

    const { rua, numero, cidade, cep } = req.body;

    const endereco = await enderecoService.atualizarEnderecoUsuario(
      usuarioId,
      enderecoId,
      {
        rua,
        numero,
        cidade,
        cep,
      },
    );

    res.json(endereco);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const excluirEnderecoUsuario = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const usuarioId = req.usuario?.usuarioId;
    if (!usuarioId) {
      res.status(401).json({ error: "Usuário não autenticado" });
      return;
    }

    const idParam = req.params.id;
    if (!idParam) {
      res.status(400).json({ error: "ID do endereço não fornecido" });
      return;
    }

    const enderecoId = parseInt(idParam, 10);
    if (isNaN(enderecoId)) {
      res.status(400).json({ error: "ID do endereço inválido" });
      return;
    }

    const endereco = await enderecoService.excluirEnderecoUsuario(
      usuarioId,
      enderecoId,
    );

    res.json(endereco);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const buscarCepViaCep = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const cepParam = req.params.cep;
    const cep = (cepParam || "").replace(/\D/g, "");

    if (cep.length !== 8) {
      res.status(400).json({ error: "Informe um CEP válido com 8 números." });
      return;
    }

    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);

    if (!response.ok) {
      res.status(502).json({ error: "Falha ao consultar o ViaCEP." });
      return;
    }

    const data = (await response.json()) as ViaCepApiResponse;

    if (data.erro) {
      res.status(404).json({ error: "CEP não encontrado. Verifique e tente novamente." });
      return;
    }

    const rua = data.logradouro?.trim() ?? "";
    const cidade = data.localidade?.trim() ?? "";

    if (!rua && !cidade) {
      res.status(404).json({ error: "CEP não encontrado. Verifique e tente novamente." });
      return;
    }

    res.json({
      cep: data.cep ?? cep,
      rua,
      cidade,
    });
  } catch {
    res.status(502).json({ error: "Falha ao consultar o ViaCEP." });
  }
};
