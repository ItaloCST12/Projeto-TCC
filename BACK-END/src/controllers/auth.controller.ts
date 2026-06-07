import { Request, Response } from "express";
import * as AuthService from "../services/auth.service";
import bcrypt from "bcryptjs";
import { PASSWORD_POLICY_MESSAGE, validarForcaSenha } from "../utils/password-policy";

export const login = async (request: Request, response: Response) => {
  const { email, password, senha } = request.body;
  try {
    if (!email) {
      return response.status(400).json({ error: "E-mail é obrigatório" });
    }

    const result = await AuthService.login({
      email,
      password: password || senha,
    });
    return response.json(result);
  } catch (error) {
    return response.status(401).json({ message: (error as Error).message });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { nome, email, telefone, password, senha, role } = req.body;

    if (!nome || nome.trim() === "") {
      return res.status(400).json({ error: "Nome é obrigatório" });
    }

    const senhaFinal = password || senha;
    if (!senhaFinal) {
      return res.status(400).json({ error: "Senha é obrigatória" });
    }

    if (validarForcaSenha(String(senhaFinal)).length > 0) {
      return res.status(400).json({ error: PASSWORD_POLICY_MESSAGE });
    }

    if (!telefone || String(telefone).trim() === "") {
      return res.status(400).json({ error: "Telefone é obrigatório" });
    }

    const hashedPassword = await bcrypt.hash(senhaFinal, 10);
    const usuario = await AuthService.register({
      nome: nome.trim(),
      email,
      telefone: String(telefone).trim(),
      password: hashedPassword,
      role: role === "ADMIN" ? "ADMIN" : "USER",
    });
    return res.status(201).json(usuario);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
};

export const requestForgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email?.trim()) {
      return res.status(400).json({ error: "E-mail é obrigatório" });
    }

    const result = await AuthService.solicitarRedefinicaoSenha({
      email: email.trim(),
    });

    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email, codigo, token, novaSenha, newPassword } = req.body;

    if (!email?.trim()) {
      return res.status(400).json({ error: "E-mail é obrigatório" });
    }

    const senhaFinal = novaSenha || newPassword;
    const codigoFinal = codigo || token;

    if (!codigoFinal?.trim() && !senhaFinal) {
      const result = await AuthService.solicitarRedefinicaoSenha({
        email: email.trim(),
      });

      return res.json(result);
    }

    if (!codigoFinal?.trim()) {
      return res.status(400).json({ error: "Código de redefinição é obrigatório" });
    }

    if (!senhaFinal) {
      return res.status(400).json({ error: "Nova senha é obrigatória" });
    }

    if (validarForcaSenha(String(senhaFinal)).length > 0) {
      return res.status(400).json({ error: PASSWORD_POLICY_MESSAGE });
    }

    const senhaHash = await bcrypt.hash(senhaFinal, 10);
    const result = await AuthService.redefinirSenhaComCodigo({
      email: email.trim(),
      codigo: codigoFinal.trim(),
      novaSenhaHash: senhaHash,
    });

    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
};
