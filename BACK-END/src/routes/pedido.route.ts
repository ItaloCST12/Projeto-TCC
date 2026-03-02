import { Router } from "express";
import {
  cancelarPedidoUsuario,
  criarPedido,
  getHistoricoUsuario,
  getMinhasEncomendas,
  getControleVendas,
  getTodosPedidos,
  finalizarPedido,
} from "../controllers/pedido.controller";
import { authMiddleware, adminMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/", authMiddleware, criarPedido);
router.get("/minhas-encomendas", authMiddleware, getMinhasEncomendas);
router.patch("/:id/cancelar", authMiddleware, cancelarPedidoUsuario);
router.get("/historico", authMiddleware, getHistoricoUsuario);
router.get("/controle-vendas", authMiddleware, adminMiddleware, getControleVendas);
router.get("/", authMiddleware, adminMiddleware, getTodosPedidos);
router.patch(
  "/:id/finalizar",
  authMiddleware,
  adminMiddleware,
  finalizarPedido,
);

export default router;
