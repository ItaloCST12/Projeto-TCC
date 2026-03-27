import { Router } from "express";
import {
  listarNotificacoesRecentes,
  obterChavePublicaPush,
  registrarPushSubscription,
  marcarNotificacoesComoLidas,
  removerPushSubscription,
} from "../controllers/notificacao.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.get("/recentes", authMiddleware, listarNotificacoesRecentes);
router.get("/push/public-key", obterChavePublicaPush);
router.post("/push/inscrever", authMiddleware, registrarPushSubscription);
router.delete("/push/inscrever", authMiddleware, removerPushSubscription);
router.patch("/marcar-lidas", authMiddleware, marcarNotificacoesComoLidas);

export default router;
