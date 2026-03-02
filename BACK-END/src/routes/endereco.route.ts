import { Router } from "express";
import {
	criarEndereco,
	atualizarEnderecoUsuario,
	excluirEnderecoUsuario,
	listarEnderecosUsuario,
	listarTodosEnderecos,
} from "../controllers/endereco.controller";
import { adminMiddleware, authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/", authMiddleware, criarEndereco);
router.patch("/:id", authMiddleware, atualizarEnderecoUsuario);
router.delete("/:id", authMiddleware, excluirEnderecoUsuario);
router.get("/me", authMiddleware, listarEnderecosUsuario);
router.get("/", authMiddleware, adminMiddleware, listarTodosEnderecos);

export default router;
