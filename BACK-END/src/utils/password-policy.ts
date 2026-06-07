export const PASSWORD_LENGTH = 8;

export const PASSWORD_POLICY_MESSAGE =
  "A senha deve ter exatamente 8 caracteres e incluir letra maiúscula, letra minúscula, número e caractere especial.";

/**
 * Verifica a força da senha e retorna a lista de requisitos não atendidos.
 * Lista vazia significa senha válida pela política.
 */
export const validarForcaSenha = (senha: string): string[] => {
  const valor = senha ?? "";
  const erros: string[] = [];

  if (valor.length !== PASSWORD_LENGTH) {
    erros.push(`Ter exatamente ${PASSWORD_LENGTH} caracteres`);
  }
  if (!/[a-z]/.test(valor)) {
    erros.push("Incluir uma letra minúscula");
  }
  if (!/[A-Z]/.test(valor)) {
    erros.push("Incluir uma letra maiúscula");
  }
  if (!/[0-9]/.test(valor)) {
    erros.push("Incluir um número");
  }
  if (!/[^A-Za-z0-9]/.test(valor)) {
    erros.push("Incluir um caractere especial");
  }

  return erros;
};

/** Lança erro com a mensagem da política caso a senha não seja forte. */
export const assertSenhaForte = (senha: string) => {
  if (validarForcaSenha(senha).length > 0) {
    throw new Error(PASSWORD_POLICY_MESSAGE);
  }
};
