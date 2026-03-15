import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as AuthController from "../controllers/auth.controller";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas tentativas. Tente novamente em 15 minutos." },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas solicitações de redefinição. Tente novamente em 15 minutos." },
});

const router = Router();

router.post("/login", authLimiter, AuthController.login);
router.post("/register", authLimiter, AuthController.register);
router.post("/forgot-password/request", forgotPasswordLimiter, AuthController.requestForgotPassword);
router.post("/forgot-password", forgotPasswordLimiter, AuthController.forgotPassword);

export default router;
