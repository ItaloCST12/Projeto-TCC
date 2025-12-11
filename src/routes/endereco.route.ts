import { Router } from "express";
import { criarEndereco,} from "../controllers/endereco.controller";

const router = Router();

router.post("/", criarEndereco);

export default router;
