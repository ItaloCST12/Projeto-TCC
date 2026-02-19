import { Router } from "express";
import {
  getProdutos,
  atualizarDisponibilidade,
  cadastrarProduto,
} from "../controllers/produto.controller";
import { authMiddleware, adminMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post(
  "/cadastrarProduto",
  authMiddleware,
  adminMiddleware,
  cadastrarProduto,
);
router.get("/", getProdutos);
router.patch(
  "/:id/disponibilidade",
  authMiddleware,
  adminMiddleware,
  atualizarDisponibilidade,
);

export default router;
