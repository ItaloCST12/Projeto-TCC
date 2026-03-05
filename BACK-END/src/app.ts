import express from "express";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import net from "net";
import routes from "./routes";
import { initAtendimentoSocket } from "./socket/atendimento.socket";
import { iniciarConciliacaoPixAutomatica } from "./models/pagamento.service";

const envPaths = [
  path.resolve(process.cwd(), "..", ".env"),
  path.resolve(process.cwd(), ".env"),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

const app = express();
const portaInicial = Number.parseInt((process.env.PORT || "3333").trim(), 10);
const PORT = Number.isFinite(portaInicial) && portaInicial > 0 ? portaInicial : 3333;
const fallbackStaticDir = path.resolve(process.cwd(), "public");
const staticCandidates = [
  fallbackStaticDir,
  path.resolve(process.cwd(), "FRONT-END"),
  path.resolve(process.cwd(), "..", "public"),
  path.resolve(process.cwd(), "..", "FRONT-END"),
];

const staticDir =
  staticCandidates.find((dir) => fs.existsSync(path.join(dir, "index.html"))) ??
  fallbackStaticDir;
const apiPrefixes = [
  "/auth",
  "/usuarios",
  "/enderecos",
  "/produtos",
  "/pedidos",
  "/pagamentos",
  "/atendimentos",
];

app.use(express.json());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",").map((origin) => origin.trim()) || true,
    credentials: true,
  }),
);
app.use(express.static(staticDir));
app.use(routes);

app.get("/", (_req, res) => {
  res.sendFile(path.join(staticDir, "index.html"));
});

app.get(/.*/, (req, res, next) => {
  if (apiPrefixes.some((prefix) => req.path.startsWith(prefix))) {
    return next();
  }

  return res.sendFile(path.join(staticDir, "index.html"));
});

const server = http.createServer(app);

initAtendimentoSocket(server);
const pararConciliacaoPix = iniciarConciliacaoPixAutomatica();

server.on("close", () => {
  pararConciliacaoPix();
});

const obterPortaDisponivel = (portaInicialTeste: number) =>
  new Promise<number>((resolve, reject) => {
    const testar = (portaTeste: number) => {
      const servidorTeste = net.createServer();

      servidorTeste.once("error", (error: NodeJS.ErrnoException) => {
        if (error.code === "EADDRINUSE") {
          testar(portaTeste + 1);
          return;
        }

        reject(error);
      });

      servidorTeste.once("listening", () => {
        servidorTeste.close(() => resolve(portaTeste));
      });

      servidorTeste.listen(portaTeste);
    };

    testar(portaInicialTeste);
  });

const iniciarServidor = async () => {
  const portaDisponivel = await obterPortaDisponivel(PORT);
  if (portaDisponivel !== PORT) {
    console.warn(`[SERVER] Porta ${PORT} em uso. Subindo na porta ${portaDisponivel}.`);
  }

  server.listen(portaDisponivel, () => {
    console.log(`Server is running on http://localhost:${portaDisponivel}`);
  });
};

void iniciarServidor();
