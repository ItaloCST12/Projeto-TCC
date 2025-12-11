import { Router } from "express";

import usuarioRoutes from "./usuario.route.js";
import authRoutes from "./auth.route.js";
import enderecoRoutes from "./endereco.route.js";
import produtoRoutes from "./produto.route.js";
import pedidoRoutes from "./pedido.route.js";


const router = Router();

// rotas principais da API
router.use("/usuarios", usuarioRoutes);
router.use("/auth", authRoutes);
router.use("/enderecos", (enderecoRoutes as any).default ?? (enderecoRoutes as any).router ?? enderecoRoutes);
router.use("/produtos", produtoRoutes);
router.use("/pedidos", pedidoRoutes);


export default router;
