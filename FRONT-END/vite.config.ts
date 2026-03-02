import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/auth": "http://localhost:3333",
      "/usuarios": "http://localhost:3333",
      "/enderecos": "http://localhost:3333",
      "/produtos": "http://localhost:3333",
      "/pedidos": "http://localhost:3333",
      "/pagamentos": "http://localhost:3333",
      "/atendimentos": "http://localhost:3333",
    },
  },
  build: {
    outDir: "../BACK-END/public",
    emptyOutDir: true,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
