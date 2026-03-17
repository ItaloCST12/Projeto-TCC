import { Router } from "express";
import {
	criarEndereco,
	atualizarEnderecoUsuario,
	excluirEnderecoUsuario,
	listarEnderecosUsuario,
	listarTodosEnderecos,
	buscarCepViaCep,
} from "../controllers/endereco.controller";
import { adminMiddleware, authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.post("/", authMiddleware, criarEndereco);
router.patch("/:id", authMiddleware, atualizarEnderecoUsuario);
router.delete("/:id", authMiddleware, excluirEnderecoUsuario);
router.get("/cep/:cep", authMiddleware, buscarCepViaCep);
router.get("/me", authMiddleware, listarEnderecosUsuario);
router.get("/", authMiddleware, adminMiddleware, listarTodosEnderecos);

export default router;
