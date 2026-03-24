import { Resend } from "resend";

type SendResetPasswordEmailInput = {
  toEmail: string;
  resetCode: string;
  expiresInMinutes: number;
};

type SendResetPasswordEmailResult = {
  delivered: boolean;
  skipped: boolean;
};

const isProduction = process.env.NODE_ENV === "production";

const getResendConfig = () => {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  const appName = process.env.APP_NAME?.trim() || "Fazenda Bispo";

  if (!apiKey || !from) {
    return null;
  }

  return { apiKey, from, appName };
};

export const sendResetPasswordEmail = async (
  input: SendResetPasswordEmailInput,
): Promise<SendResetPasswordEmailResult> => {
  const config = getResendConfig();

  if (!config) {
    if (isProduction) {
      throw new Error("Serviço de e-mail não configurado");
    }

    return { delivered: false, skipped: true };
  }

  const resend = new Resend(config.apiKey);

  const { error } = await resend.emails.send({
    from: config.from,
    to: input.toEmail,
    subject: `${config.appName} • Redefinição de senha`,
    text: [
      `Olá,`,
      "",
      "Recebemos uma solicitação para redefinir sua senha.",
      `Código de redefinição: ${input.resetCode}`,
      `Validade: ${input.expiresInMinutes} minutos.`,
      "",
      "Se você não solicitou essa alteração, ignore este e-mail.",
    ].join("\n"),
    html: `
      <p>Olá,</p>
      <p>Recebemos uma solicitação para redefinir sua senha.</p>
      <p><strong>Código de redefinição:</strong> ${input.resetCode}</p>
      <p><strong>Validade:</strong> ${input.expiresInMinutes} minutos.</p>
      <p>Se você não solicitou essa alteração, ignore este e-mail.</p>
    `,
  });

  if (error) {
    throw new Error(`Falha ao enviar e-mail: ${error.message}`);
  }

  return { delivered: true, skipped: false };
};