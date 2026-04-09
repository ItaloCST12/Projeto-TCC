import { Router, Request } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import * as AuthController from "../controllers/auth.controller";

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const FORGOT_PASSWORD_WINDOW_MINUTES = parsePositiveInt(
  process.env.FORGOT_PASSWORD_WINDOW_MINUTES,
  15,
);
const FORGOT_PASSWORD_MAX_REQUESTS = parsePositiveInt(
  process.env.FORGOT_PASSWORD_MAX_REQUESTS,
  5,
);

const getForgotPasswordRequestKey = (req: Request) => {
  const emailRaw = req.body && typeof req.body.email === "string" ? req.body.email : "";
  const email = emailRaw.trim().toLowerCase() || "sem-email";
  return `${ipKeyGenerator(req.ip || req.socket.remoteAddress || "")}::${email}`;
};

const buildForgotPasswordRateLimitMessage = (req: Request) => {
  const resetTimeMs = req.rateLimit?.resetTime?.getTime();
  const remainingMs =
    typeof resetTimeMs === "number" ? Math.max(0, resetTimeMs - Date.now()) : 0;
  const waitMinutes =
    remainingMs > 0 ? Math.max(1, Math.ceil(remainingMs / (60 * 1000))) : FORGOT_PASSWORD_WINDOW_MINUTES;

  return {
    error: `Muitas solicitações de redefinição. Tente novamente em ${waitMinutes} minuto${waitMinutes > 1 ? "s" : ""}.`,
  };
};

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas tentativas. Tente novamente em 15 minutos." },
});

const forgotPasswordRequestLimiter = rateLimit({
  windowMs: FORGOT_PASSWORD_WINDOW_MINUTES * 60 * 1000,
  max: FORGOT_PASSWORD_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getForgotPasswordRequestKey,
  handler: (req, res, _next, options) => {
    res.status(options.statusCode).json(buildForgotPasswordRateLimitMessage(req));
  },
});

const forgotPasswordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas tentativas de redefinição. Tente novamente em 15 minutos." },
});

const router = Router();

router.post("/login", authLimiter, AuthController.login);
router.post("/register", authLimiter, AuthController.register);
router.post(
  "/forgot-password/request",
  forgotPasswordRequestLimiter,
  AuthController.requestForgotPassword,
);
router.post("/forgot-password", forgotPasswordResetLimiter, AuthController.forgotPassword);

export default router;
