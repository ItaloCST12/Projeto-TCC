import { Router } from "express";
import {
  limparMinhaConversa,
  enviarMensagemUsuario,
  listarConversaUsuarioAdmin,
  listarConversasAdmin,
  listarMinhasMensagens,
  responderComoSuporte,
} from "../controllers/atendimento.controller";
import { adminMiddleware, authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/me", authMiddleware, listarMinhasMensagens);
router.post("/me", authMiddleware, enviarMensagemUsuario);
router.delete("/me", authMiddleware, limparMinhaConversa);

router.get("/admin/conversas", authMiddleware, adminMiddleware, listarConversasAdmin);
router.get(
  "/admin/conversas/:usuarioId",
  authMiddleware,
  adminMiddleware,
  listarConversaUsuarioAdmin,
);
router.post(
  "/admin/conversas/:usuarioId/responder",
  authMiddleware,
  adminMiddleware,
  responderComoSuporte,
);

export default router;
