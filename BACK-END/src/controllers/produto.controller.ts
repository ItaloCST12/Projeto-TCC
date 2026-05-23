import { Request, Response } from "express";
import { ProdutoService } from "../services/produto.service";

const produtoService = new ProdutoService();

const parseBoolean = (value: unknown, defaultValue: boolean) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "off"].includes(normalized)) {
      return false;
    }
  }

  return defaultValue;
};

const getImagemUrlFromFile = (req: Request) => {
  if (!req.file) {
    return undefined;
  }

  const cloudinaryPath =
    (req.file as Express.Multer.File & { path?: string }).path?.trim() || "";
  if (cloudinaryPath.startsWith("http://") || cloudinaryPath.startsWith("https://")) {
    return cloudinaryPath;
  }

  return `/uploads/produtos/${req.file.filename}`;
};

const parsePrecoOpcional = (value: unknown) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Preço informado é inválido");
  }

  return parsed;
};

const parsePrecoObrigatorio = (value: unknown, campo: string) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Campo ${campo} inválido`);
  }

  return parsed;
};

const parseEstoqueObrigatorio = (value: unknown, campo: string) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Campo ${campo} inválido`);
  }

  return Math.trunc(parsed);
};

export const getProdutos = async (_req: Request, res: Response) => {
  try {
    const produtos = await produtoService.getProdutos();
    res.json(produtos);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

export const atualizarDisponibilidade = async (req: Request, res: Response) => {
  try {
    const idParam = req.params.id;
    if (!idParam) {
      throw new Error("ID do produto não fornecido");
    }
    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      throw new Error("ID inválido");
    }
    const { disponivel } = req.body;
    if (typeof disponivel !== "boolean") {
      throw new Error(
        "Disponibilidade deve ser um valor booleano (true/false)",
      );
    }
    const produto = await produtoService.atualizarDisponibilidade(
      id,
      disponivel,
    );
    res.json(produto);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const cadastrarProduto = async (req: Request, res: Response) => {
  try {
    const { nome, preco, disponivel, estoque } = req.body;
    if (!nome || typeof nome !== "string") {
      throw new Error("Nome do produto é obrigatório");
    }

    const possuiCamposTamanho = [
      req.body.precoAbacaxiGrande,
      req.body.precoAbacaxiMedio,
      req.body.precoAbacaxiPequeno,
      req.body.estoqueAbacaxiGrande,
      req.body.estoqueAbacaxiMedio,
      req.body.estoqueAbacaxiPequeno,
    ].some((value) => value !== undefined && value !== null && String(value).trim() !== "");

    const controlaTamanhos = parseBoolean(req.body.controlaTamanhos, possuiCamposTamanho);

    const imagemUrl = getImagemUrlFromFile(req);

    if (controlaTamanhos) {
      const precoGrande = parsePrecoObrigatorio(req.body.precoAbacaxiGrande, "precoAbacaxiGrande");
      const precoMedio = parsePrecoObrigatorio(req.body.precoAbacaxiMedio, "precoAbacaxiMedio");
      const precoPequeno = parsePrecoObrigatorio(req.body.precoAbacaxiPequeno, "precoAbacaxiPequeno");

      const estoqueGrande = parseEstoqueObrigatorio(
        req.body.estoqueAbacaxiGrande,
        "estoqueAbacaxiGrande",
      );
      const estoqueMedio = parseEstoqueObrigatorio(
        req.body.estoqueAbacaxiMedio,
        "estoqueAbacaxiMedio",
      );
      const estoquePequeno = parseEstoqueObrigatorio(
        req.body.estoqueAbacaxiPequeno,
        "estoqueAbacaxiPequeno",
      );

      const precoBase =
        req.body.preco !== undefined
          ? parsePrecoObrigatorio(req.body.preco, "preco")
          : precoMedio;

      const estoqueTotal = estoqueGrande + estoqueMedio + estoquePequeno;

      const produtoComTamanhos = await produtoService.cadastrarProduto(
        nome.trim(),
        precoBase,
        parseBoolean(disponivel, true),
        estoqueTotal,
        imagemUrl,
        {
          precoTamanhos: {
            grande: precoGrande,
            medio: precoMedio,
            pequeno: precoPequeno,
          },
          estoqueTamanhos: {
            grande: estoqueGrande,
            medio: estoqueMedio,
            pequeno: estoquePequeno,
          },
        },
      );

      return res.status(201).json(produtoComTamanhos);
    }

    const precoNumber = parsePrecoObrigatorio(preco, "preco");
    const estoqueNumber = parseEstoqueObrigatorio(estoque, "estoque");

    const produto = await produtoService.cadastrarProduto(
      nome.trim(),
      precoNumber,
      parseBoolean(disponivel, true),
      estoqueNumber,
      imagemUrl,
    );
    res.status(201).json(produto);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const atualizarProduto = async (req: Request, res: Response) => {
  try {
    const idParam = req.params.id;
    if (!idParam) {
      throw new Error("ID do produto não fornecido");
    }

    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      throw new Error("ID inválido");
    }

    const nome =
      typeof req.body.nome === "string" ? req.body.nome.trim() : undefined;
    const preco =
      req.body.preco !== undefined ? Number(req.body.preco) : undefined;
    const disponivel =
      req.body.disponivel !== undefined
        ? parseBoolean(req.body.disponivel, true)
        : undefined;
    const precoAbacaxiGrande = parsePrecoOpcional(req.body.precoAbacaxiGrande);
    const precoAbacaxiMedio = parsePrecoOpcional(req.body.precoAbacaxiMedio);
    const precoAbacaxiPequeno = parsePrecoOpcional(req.body.precoAbacaxiPequeno);
    const imagemUrl = getImagemUrlFromFile(req);

    if (preco !== undefined && (!Number.isFinite(preco) || preco < 0)) {
      throw new Error("Preço do produto inválido");
    }

    const produto = await produtoService.atualizarProduto(id, {
      ...(nome ? { nome } : {}),
      ...(preco !== undefined ? { preco } : {}),
      ...(disponivel !== undefined ? { disponivel } : {}),
      ...(precoAbacaxiGrande !== undefined
        ? { precoAbacaxiGrande }
        : {}),
      ...(precoAbacaxiMedio !== undefined
        ? { precoAbacaxiMedio }
        : {}),
      ...(precoAbacaxiPequeno !== undefined
        ? { precoAbacaxiPequeno }
        : {}),
      ...(imagemUrl ? { imagemUrl } : {}),
    });

    res.json(produto);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const excluirProduto = async (req: Request, res: Response) => {
  try {
    const idParam = req.params.id;
    if (!idParam) {
      throw new Error("ID do produto não fornecido");
    }

    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      throw new Error("ID inválido");
    }

    await produtoService.excluirProduto(id);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};
