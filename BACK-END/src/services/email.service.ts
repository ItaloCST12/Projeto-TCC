import nodemailer from "nodemailer";

type SendResetPasswordEmailInput = {
  toEmail: string;
  resetCode: string;
  expiresInMinutes: number;
};

type SendResetPasswordEmailResult = {
  delivered: boolean;
  skipped: boolean;
};

const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (!value) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
};

const isProduction = process.env.NODE_ENV === "production";

const getSmtpConfig = () => {
  const host = process.env.SMTP_HOST?.trim();
  const portRaw = process.env.SMTP_PORT?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.SMTP_FROM?.trim();
  const appName = process.env.APP_NAME?.trim() || "Fazenda Bispo";

  if (!host || !portRaw || !user || !pass || !from) {
    return null;
  }

  const port = Number(portRaw);
  if (!Number.isInteger(port) || port <= 0) {
    return null;
  }

  const secure = parseBoolean(process.env.SMTP_SECURE, port === 465);

  return {
    host,
    port,
    secure,
    user,
    pass,
    from,
    appName,
  };
};

export const sendResetPasswordEmail = async (
  input: SendResetPasswordEmailInput,
): Promise<SendResetPasswordEmailResult> => {
  const smtpConfig = getSmtpConfig();

  if (!smtpConfig) {
    if (isProduction) {
      throw new Error("Serviço de e-mail não configurado");
    }

    return { delivered: false, skipped: true };
  }

  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.pass,
    },
  });

  await transporter.sendMail({
    from: smtpConfig.from,
    to: input.toEmail,
    subject: `${smtpConfig.appName} • Redefinição de senha`,
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

  return { delivered: true, skipped: false };
};