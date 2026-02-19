import { Router } from "express";
import {
	criarEndereco,
	listarEnderecosUsuario,
} from "../controllers/endereco.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/", authMiddleware, criarEndereco);
router.get("/me", authMiddleware, listarEnderecosUsuario);

export default router;
