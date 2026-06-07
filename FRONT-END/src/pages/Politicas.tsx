import { CreditCard, ShieldCheck, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";

const Politicas = () => {
  return (
    <div className="min-h-screen bg-background pb-28 sm:pb-32 lg:pb-16 pt-20">
      <Navbar />
      <header className="border-b border-border/70 bg-card/40 backdrop-blur supports-[backdrop-filter]:bg-card/35">
        <div className="container mx-auto px-4 py-6 sm:py-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Fazenda Bispo</p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">Políticas da Empresa</h1>
            <p className="mt-2 text-base sm:text-lg text-muted-foreground max-w-2xl">
              Informações sobre pagamentos, entregas, garantias e suporte da Fazenda Bispo.
            </p>
          </div>

          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent transition-colors"
          >
            Voltar para o Início
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 sm:py-10 space-y-6">
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <article className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 text-primary">
              <CreditCard className="h-5 w-5" />
              <h2 className="text-xl font-semibold text-foreground">Pagamentos</h2>
            </div>
            <ul className="mt-4 space-y-2 text-base sm:text-[1.02rem] text-muted-foreground leading-relaxed">
              <li>Aceitamos apenas PIX e dinheiro.</li>
              <li>Pagamento em PIX e dinheiro é realizado na entrega ou na retirada do pedido.</li>
              <li>Nenhum pagamento é processado pela plataforma.</li>
              <li>O cliente combina a forma de pagamento no momento da confirmação do pedido.</li>
            </ul>
          </article>

          <article className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 text-primary">
              <Truck className="h-5 w-5" />
              <h2 className="text-xl font-semibold text-foreground">Entregas</h2>
            </div>
            <ul className="mt-4 space-y-2 text-base sm:text-[1.02rem] text-muted-foreground leading-relaxed">
              <li>Entregamos em Santana, Macapá e Porto Grande.</li>
              <li>Não cobramos taxa de entrega.</li>
              <li>Você pode verificar as atualizações do seu pedido pela plataforma.</li>
              <li>Dias de entrega: Domingo e Segunda-Feira.</li>
            </ul>
          </article>

          <article className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck className="h-5 w-5" />
              <h2 className="text-xl font-semibold text-foreground">Garantias e suporte</h2>
            </div>
            <ul className="mt-4 space-y-2 text-base sm:text-[1.02rem] text-muted-foreground leading-relaxed">
              <li>Se houver problema de qualidade, analisamos e resolvemos em até 24 horas.</li>
              <li>Produtos com avaria podem ser trocados com registro por foto no recebimento.</li>
              <li>Canal de suporte ativo pelo WhatsApp durante todo o horário de atendimento e também pelo chat interno da plataforma.</li>
            </ul>
          </article>
        </section>
      </main>
    </div>
  );
};

export default Politicas;
