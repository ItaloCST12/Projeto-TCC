import { Router } from "express";

import usuarioRoutes from "./usuario.route";
import authRoutes from "./auth.route";
import enderecoRoutes from "./endereco.route";
import produtoRoutes from "./produto.route";
import pedidoRoutes from "./pedido.route";
import atendimentoRoutes from "./atendimento.route";
import notificacaoRoutes from "./notificacao.route";
import estoqueRoutes from "./estoque.route";

const router = Router();

router.use("/usuarios", usuarioRoutes);
router.use("/auth", authRoutes);
router.use("/enderecos", enderecoRoutes);
router.use("/produtos", produtoRoutes);
router.use("/pedidos", pedidoRoutes);
router.use("/atendimentos", atendimentoRoutes);
router.use("/notificacoes", notificacaoRoutes);
router.use("/", estoqueRoutes);

export default router;
