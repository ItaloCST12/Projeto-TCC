import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import WhatsAppFloatingButton from "./components/WhatsAppFloatingButton";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Encomenda from "./pages/Encomenda";
import Carrinho from "./pages/Carrinho";
import MinhasEncomendas from "./pages/MinhasEncomendas";
import Perfil from "./pages/Perfil";
import Chat from "./pages/Chat";
import PainelEntregas from "./pages/PainelEntregas";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/encomenda" element={<Encomenda />} />
          <Route path="/carrinho" element={<Carrinho />} />
          <Route path="/minhas-encomendas" element={<MinhasEncomendas />} />
          <Route path="/perfil" element={<Perfil />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/painel-entregas" element={<PainelEntregas />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <WhatsAppFloatingButton />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
