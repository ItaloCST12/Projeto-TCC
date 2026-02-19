import { Router } from "express";
import { getFormasPagamento } from "../controllers/pagamento.controller";

const router = Router();

router.get("/formas", getFormasPagamento);

export default router;
