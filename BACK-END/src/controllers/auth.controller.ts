import { Request, Response } from "express";
import * as AuthService from "../services/auth.service";
import bcrypt from "bcryptjs";

export const login = async (request: Request, response: Response) => {
  const { email, password, senha } = request.body;
  try {
    if (!email) {
      return response.status(400).json({ error: "Email é obrigatório" });
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
    const { nome, email, password, senha, role } = req.body;

    if (!nome || nome.trim() === "") {
      return res.status(400).json({ error: "Nome é obrigatório" });
    }

    const senhaFinal = password || senha;
    if (!senhaFinal) {
      return res.status(400).json({ error: "Senha é obrigatória" });
    }

    const hashedPassword = await bcrypt.hash(senhaFinal, 10);
    const usuario = await AuthService.register({
      nome: nome.trim(),
      email,
      password: hashedPassword,
      role: role === "ADMIN" ? "ADMIN" : "USER",
    });
    return res.status(201).json(usuario);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
};
