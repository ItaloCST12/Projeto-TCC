import { Router } from "express";

import usuarioRoutes from "./usuario.route";
import authRoutes from "./auth.route";
import enderecoRoutes from "./endereco.route";
import produtoRoutes from "./produto.route";
import pedidoRoutes from "./pedido.route";
import pagamentoRoutes from "./pagamento.route";

const router = Router();

// rotas principais da API
router.use("/usuarios", usuarioRoutes);
router.use("/auth", authRoutes);
router.use("/enderecos", enderecoRoutes);
router.use("/produtos", produtoRoutes);
router.use("/pedidos", pedidoRoutes);
router.use("/pagamentos", pagamentoRoutes);

export default router;
