const jwtSecret = (process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET || "").trim();

if (!jwtSecret) {
  throw new Error("Configuração ausente: defina ACCESS_TOKEN_SECRET (ou JWT_SECRET) no ambiente.");
}

if (jwtSecret.length < 32) {
  throw new Error("Configuração insegura: ACCESS_TOKEN_SECRET deve ter ao menos 32 caracteres.");
}

const secretosFracosConhecidos = new Set([
  "secret",
  "123456",
  "12345678",
  "senha",
  "password",
  "admin",
]);

if (secretosFracosConhecidos.has(jwtSecret.toLowerCase())) {
  throw new Error("Configuração insegura: ACCESS_TOKEN_SECRET está fraco ou padrão.");
}

export const AUTH_SECRET = jwtSecret;
