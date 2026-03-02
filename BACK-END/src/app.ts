import express from "express";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import routes from "./routes";
import { initAtendimentoSocket } from "./socket/atendimento.socket";

const envPaths = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "..", ".env"),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

const app = express();
const PORT = process.env.PORT || 3333;
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

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
