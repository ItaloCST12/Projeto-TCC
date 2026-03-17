import { Router } from "express";
import {
  getProdutos,
  atualizarDisponibilidade,
  cadastrarProduto,
  atualizarProduto,
  excluirProduto,
} from "../controllers/produto.controller";
import { authMiddleware, adminMiddleware } from "../middlewares/auth.middleware";
import { uploadProdutoImagem } from "../middlewares/upload.middleware";

const router = Router();

router.post(
  "/cadastrarProduto",
  authMiddleware,
  adminMiddleware,
  uploadProdutoImagem.single("imagem"),
  cadastrarProduto,
);
router.get("/", getProdutos);
router.patch(
  "/:id",
  authMiddleware,
  adminMiddleware,
  uploadProdutoImagem.single("imagem"),
  atualizarProduto,
);
router.patch(
  "/:id/disponibilidade",
  authMiddleware,
  adminMiddleware,
  atualizarDisponibilidade,
);
router.delete("/:id", authMiddleware, adminMiddleware, excluirProduto);

export default router;
