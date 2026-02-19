import { Router } from "express";
import {
  criarPedido,
  getHistoricoUsuario,
  getTodosPedidos,
  finalizarPedido,
} from "../controllers/pedido.controller";
import { authMiddleware, adminMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/", authMiddleware, criarPedido);
router.get("/historico", authMiddleware, getHistoricoUsuario);
router.get("/", authMiddleware, adminMiddleware, getTodosPedidos);
router.patch(
  "/:id/finalizar",
  authMiddleware,
  adminMiddleware,
  finalizarPedido,
);

export default router;
