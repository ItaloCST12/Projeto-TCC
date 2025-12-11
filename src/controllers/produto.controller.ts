import { Request, Response } from 'express';
import { ProdutoService } from '../services/produto.service';  

const produtoService = new ProdutoService(); 

export const getProdutos = async (req: Request, res: Response) => {
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
      throw new Error('ID do produto não fornecido');
    }
    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      throw new Error('ID inválido');
    }
    const { disponivel } = req.body;
    if (typeof disponivel !== 'boolean') {
      throw new Error('Disponibilidade deve ser um valor booleano (true/false)');
    }
    const produto = await produtoService.atualizarDisponibilidade(id, disponivel);
    res.json(produto);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const cadastrarProduto = async (req: Request, res: Response) => {
  try {
    const { nome, disponivel } = req.body;
    if (!nome || typeof nome !== 'string') {
      throw new Error('Nome do produto é obrigatório');
    }
    const produto = await produtoService.cadastrarProduto(nome, disponivel ?? true);
    res.status(201).json(produto);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};