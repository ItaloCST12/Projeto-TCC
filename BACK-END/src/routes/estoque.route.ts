import { Router } from "express";
import { authMiddleware, adminMiddleware } from "../middlewares/auth.middleware";
import {
  ajustarEstoqueProduto,
  getMovimentacoesEstoque,
  getResumoEstoque,
} from "../controllers/estoque.controller";

const router = Router();

router.post("/produtos/:id/estoque", authMiddleware, adminMiddleware, ajustarEstoqueProduto);
router.get(
  "/produtos/:id/estoque/movimentacoes",
  authMiddleware,
  adminMiddleware,
  getMovimentacoesEstoque,
);
router.get("/produtos/estoque/resumo", authMiddleware, adminMiddleware, getResumoEstoque);

export default router;
