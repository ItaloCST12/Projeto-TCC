import { NextFunction, Request, Response, Router } from "express";
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

const handleProdutoUpload = (req: Request, res: Response, next: NextFunction) => {
  uploadProdutoImagem.single("imagem")(req, res, (error?: unknown) => {
    if (!error) {
      next();
      return;
    }

    const uploadError = error as { code?: string; message?: string };
    if (uploadError.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({
        error: "A imagem excede o tamanho máximo de 5MB.",
      });
      return;
    }

    res.status(400).json({
      error: uploadError.message || "Falha ao processar upload da imagem.",
    });
  });
};

router.post(
  "/cadastrarProduto",
  authMiddleware,
  adminMiddleware,
  handleProdutoUpload,
  cadastrarProduto,
);
router.get("/", getProdutos);
router.patch(
  "/:id",
  authMiddleware,
  adminMiddleware,
  handleProdutoUpload,
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
