import { Router } from "express";
import * as AuthController from '../controllers/auth.controller';

const router = Router();

router.post("/login", AuthController.login);

export default router;