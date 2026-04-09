import { Router } from "express";
import {
  limparMinhaConversa,
  enviarMensagemUsuario,
  listarConversaUsuarioAdmin,
  listarConversasAdmin,
  listarMinhasMensagens,
  responderComoSuporte,
} from "../controllers/atendimento.controller";
import { adminMiddleware, authMiddleware } from "../middlewares/auth.middleware";
import { uploadAtendimentoImagem } from "../middlewares/upload.middleware";

const router = Router();

router.get("/me", authMiddleware, listarMinhasMensagens);
router.post("/me", authMiddleware, uploadAtendimentoImagem.single("imagem"), enviarMensagemUsuario);
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
  uploadAtendimentoImagem.single("imagem"),
  responderComoSuporte,
);

export default router;
