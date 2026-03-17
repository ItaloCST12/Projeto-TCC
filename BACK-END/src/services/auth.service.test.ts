import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma client
vi.mock("../models/client", () => ({
  default: {
    usuario: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    passwordResetToken: {
      updateMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock email service
vi.mock("./email.service", () => ({
  sendResetPasswordEmail: vi.fn().mockResolvedValue({ skipped: true }),
}));

// Mock auth-secret
vi.mock("../utils/auth-secret", () => ({
  AUTH_SECRET: "test-secret-key-for-testing",
}));

import prisma from "../models/client";
import * as AuthService from "./auth.service";
import bcrypt from "bcryptjs";

describe("AuthService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("login", () => {
    it("deve lançar erro se email não for informado", async () => {
      await expect(
        AuthService.login({ email: "", password: "12345678" }),
      ).rejects.toThrow("Email e senha são obrigatórios");
    });

    it("deve lançar erro se senha não for informada", async () => {
      await expect(
        AuthService.login({ email: "test@email.com" }),
      ).rejects.toThrow("Email e senha são obrigatórios");
    });

    it("deve lançar erro se usuário não existir", async () => {
      vi.mocked(prisma.usuario.findUnique).mockResolvedValue(null);

      await expect(
        AuthService.login({ email: "naoexiste@email.com", password: "12345678" }),
      ).rejects.toThrow("Usuário não encontrado");
    });

    it("deve lançar erro se senha estiver incorreta", async () => {
      const hashedPassword = await bcrypt.hash("senhaCorreta", 10);
      vi.mocked(prisma.usuario.findUnique).mockResolvedValue({
        id: 1,
        nome: "Test",
        email: "test@email.com",
        telefone: "11999999999",
        password: hashedPassword,
        role: "USER",
      } as any);

      await expect(
        AuthService.login({ email: "test@email.com", password: "senhaErrada" }),
      ).rejects.toThrow("Credenciais inválidas");
    });

    it("deve retornar token e dados do usuário com credenciais válidas", async () => {
      const hashedPassword = await bcrypt.hash("senhaCorreta", 10);
      vi.mocked(prisma.usuario.findUnique).mockResolvedValue({
        id: 1,
        nome: "Test User",
        email: "test@email.com",
        telefone: "11999999999",
        password: hashedPassword,
        role: "USER",
      } as any);

      const result = await AuthService.login({
        email: "test@email.com",
        password: "senhaCorreta",
      });

      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe("string");
      expect(result.usuario).toEqual({
        id: 1,
        nome: "Test User",
        email: "test@email.com",
        telefone: "11999999999",
        role: "USER",
      });
    });
  });

  describe("register", () => {
    it("deve lançar erro se nome estiver vazio", async () => {
      await expect(
        AuthService.register({
          nome: "",
          email: "t@t.com",
          telefone: "11999",
          password: "hash",
        }),
      ).rejects.toThrow("Nome é obrigatório");
    });

    it("deve lançar erro se email estiver vazio", async () => {
      await expect(
        AuthService.register({
          nome: "Test",
          email: "",
          telefone: "11999",
          password: "hash",
        }),
      ).rejects.toThrow("E-mail é obrigatório");
    });

    it("deve lançar erro se senha estiver vazia", async () => {
      await expect(
        AuthService.register({
          nome: "Test",
          email: "t@t.com",
          telefone: "11999",
          password: "",
        }),
      ).rejects.toThrow("Senha é obrigatória");
    });

    it("deve lançar erro se telefone estiver vazio", async () => {
      await expect(
        AuthService.register({
          nome: "Test",
          email: "t@t.com",
          telefone: "",
          password: "hash",
        }),
      ).rejects.toThrow("Telefone é obrigatório");
    });

    it("deve lançar erro se email já estiver cadastrado", async () => {
      vi.mocked(prisma.usuario.findUnique).mockResolvedValue({
        id: 1,
        email: "t@t.com",
      } as any);

      await expect(
        AuthService.register({
          nome: "Test",
          email: "t@t.com",
          telefone: "11999",
          password: "hash",
        }),
      ).rejects.toThrow("E-mail já cadastrado");
    });

    it("deve criar usuário com role USER por padrão", async () => {
      vi.mocked(prisma.usuario.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.usuario.create).mockResolvedValue({
        id: 1,
        nome: "Test",
        email: "t@t.com",
        telefone: "11999",
        role: "USER",
      } as any);

      const result = await AuthService.register({
        nome: "Test",
        email: "t@t.com",
        telefone: "11999",
        password: "hashedpass",
      });

      expect(prisma.usuario.create).toHaveBeenCalledWith({
        data: {
          nome: "Test",
          email: "t@t.com",
          telefone: "11999",
          password: "hashedpass",
          role: "USER",
        },
        select: {
          id: true,
          nome: true,
          email: true,
          telefone: true,
          role: true,
        },
      });
      expect(result.role).toBe("USER");
    });
  });

  describe("solicitarRedefinicaoSenha", () => {
    it("deve lançar erro se email estiver vazio", async () => {
      await expect(
        AuthService.solicitarRedefinicaoSenha({ email: "" }),
      ).rejects.toThrow("E-mail é obrigatório");
    });

    it("deve retornar mensagem genérica se usuário não existir (sem vazar info)", async () => {
      vi.mocked(prisma.usuario.findUnique).mockResolvedValue(null);

      const result = await AuthService.solicitarRedefinicaoSenha({
        email: "naoexiste@email.com",
      });

      expect(result.message).toContain("Se o e-mail estiver cadastrado");
    });
  });

  describe("redefinirSenha", () => {
    it("deve lançar erro se email estiver vazio", async () => {
      await expect(
        AuthService.redefinirSenha({ email: "", novaSenhaHash: "hash" }),
      ).rejects.toThrow("E-mail é obrigatório");
    });

    it("deve lançar erro se nova senha estiver vazia", async () => {
      await expect(
        AuthService.redefinirSenha({ email: "t@t.com", novaSenhaHash: "" }),
      ).rejects.toThrow("Nova senha é obrigatória");
    });

    it("deve lançar erro se usuário não existir", async () => {
      vi.mocked(prisma.usuario.findUnique).mockResolvedValue(null);

      await expect(
        AuthService.redefinirSenha({
          email: "naoexiste@email.com",
          novaSenhaHash: "hash",
        }),
      ).rejects.toThrow("Usuário não encontrado");
    });
  });
});
