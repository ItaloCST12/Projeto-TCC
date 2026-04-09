import express from "express";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import http from "http";
import net from "net";
import routes from "./routes";
import { initAtendimentoSocket } from "./socket/atendimento.socket";

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
app.set("trust proxy", 1);
const portaInicial = Number.parseInt((process.env.PORT || "3333").trim(), 10);
const PORT = Number.isFinite(portaInicial) && portaInicial > 0 ? portaInicial : 3333;
const fallbackStaticDir = path.resolve(process.cwd(), "public");
const staticCandidates = [
  path.resolve(process.cwd(), "public"),
  path.resolve(process.cwd(), "BACK-END", "public"),
  path.resolve(process.cwd(), "..", "BACK-END", "public"),
  path.resolve(process.cwd(), "..", "public"),
  path.resolve(process.cwd(), "FRONT-END"),
  path.resolve(process.cwd(), "..", "FRONT-END"),
];

const isBuildIndex = (dir: string) => {
  const indexPath = path.join(dir, "index.html");
  if (!fs.existsSync(indexPath)) {
    return false;
  }

  const indexContent = fs.readFileSync(indexPath, "utf-8");
  // Build output references /assets/*.js; dev index references /src/main.tsx.
  const referencesSrcEntry = indexContent.includes("/src/main.tsx");
  const referencesAssets = indexContent.includes("/assets/");
  return !referencesSrcEntry && referencesAssets;
};

const buildDir = staticCandidates.find((dir) => isBuildIndex(dir));
const staticDir =
  buildDir ??
  staticCandidates.find((dir) => fs.existsSync(path.join(dir, "index.html"))) ??
  fallbackStaticDir;
const apiPrefixes = [
  "/auth",
  "/usuarios",
  "/enderecos",
  "/produtos",
  "/pedidos",
  "/atendimentos",
  "/notificacoes",
];

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-eval'",
          "blob:",
          "https://vlibras.gov.br",
          "https://www.vlibras.gov.br",
          "https://cdn.jsdelivr.net",
        ],
        styleSrc: ["'self'", "https:", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: ["'self'", "https:", "wss:", "blob:"],
        fontSrc: ["'self'", "https:", "data:"],
        frameSrc: ["'self'", "blob:", "https:"],
        workerSrc: ["'self'", "blob:"],
        childSrc: ["'self'", "blob:"],
        upgradeInsecureRequests: null,
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(express.json());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",").map((origin) => origin.trim()) || true,
    credentials: true,
  }),
);
app.use(
  express.static(staticDir, {
    index: false,
  }),
);
app.use(routes);

app.get("/", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.sendFile(path.join(staticDir, "index.html"));
});

app.get(/.*/, (req, res, next) => {
  const isApiRoute = apiPrefixes.some((prefix) => req.path.startsWith(prefix));
  const isStaticFileRequest = path.extname(req.path) !== "";

  if (isApiRoute || isStaticFileRequest) {
    return next();
  }

  res.setHeader("Cache-Control", "no-store");
  return res.sendFile(path.join(staticDir, "index.html"));
});

const server = http.createServer(app);

initAtendimentoSocket(server);

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
