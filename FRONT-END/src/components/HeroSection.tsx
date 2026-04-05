import heroFarm from "@/assets/img2.jpeg";

const HeroSection = () => {
  return (
    <section
      id="inicio"
      className="relative min-h-[88vh] flex items-center justify-center overflow-hidden"
    >
      {/* Background image */}
      <img
        src={heroFarm}
        alt="Vista aérea da Fazenda Bispo com plantação de cítricos"
        className="absolute inset-0 w-full h-full object-cover brightness-[0.95] contrast-[1.02] saturate-[1.03]"
        loading="eager"
      />
      {/* Overlay suave para preservar aspecto natural e legibilidade */}
      <div
        className="absolute inset-0 hero-overlay"
        style={{ background: "linear-gradient(180deg, rgba(0, 0, 0, 0.28) 0%, rgba(120, 53, 15, 0.16) 46%, rgba(0, 0, 0, 0.34) 100%)" }}
      />

      <div className="relative z-10 container mx-auto max-w-5xl px-4 text-center">
        <h1
          className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold !text-white mb-5 animate-fade-in-up drop-shadow-[0_6px_18px_rgba(0,0,0,0.45)]"
        >
          Do campo à sua mesa,<br />
          <span className="!text-white">fresquinho e natural</span>
        </h1>
        <p
          className="max-w-3xl mx-auto text-base sm:text-lg md:text-xl text-primary-foreground/95 mb-8 animate-fade-in-up drop-shadow-[0_3px_12px_rgba(0,0,0,0.4)]"
          style={{ animationDelay: "0.2s" }}
        >
         Há mais de 20 anos, a Fazenda Bispo leva frutas frescas e selecionadas direto do campo para sua família. Encomende laranjas, tangerinas, limões e abacaxis com qualidade e confiança desde 2002.
        </p>
        <div
          className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up"
          style={{ animationDelay: "0.4s" }}
        >
          <a
            href="#produtos"
            className="inline-flex items-center justify-center min-w-52 px-8 py-3 rounded-xl bg-secondary text-secondary-foreground font-bold text-lg shadow-lg shadow-secondary/35 hover:-translate-y-[1px] hover:bg-secondary/95 transition-all"
          >
            Ver Produtos
          </a>
          <a
            href="/login"
            className="inline-flex items-center justify-center min-w-52 px-8 py-3 rounded-xl border-2 border-primary bg-primary text-primary-foreground font-extrabold text-lg shadow-lg shadow-primary/35 hover:bg-primary/90 hover:border-primary/90 hover:-translate-y-[1px] transition-all"
          >
            Entrar
          </a>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
