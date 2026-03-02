import { Router } from "express";
import {
  getPerfil,
  deletarUsuario,
  listarUsuarios,
  atualizarUsuario,
  atualizarMeuTelefone,
  getPerfilUsuarioAdmin,
} from "../controllers/usuario.controller";
import { authMiddleware, adminMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/perfil", authMiddleware, getPerfil);
router.patch("/perfil", authMiddleware, atualizarMeuTelefone);
router.get("/:id/perfil", authMiddleware, adminMiddleware, getPerfilUsuarioAdmin);
router.get("/", authMiddleware, adminMiddleware, listarUsuarios);
router.patch("/:id", authMiddleware, adminMiddleware, atualizarUsuario);
router.delete("/:id", authMiddleware, adminMiddleware, deletarUsuario);

export default router;
