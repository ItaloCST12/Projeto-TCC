import heroFarm from "@/assets/img2.jpeg";

const HeroSection = () => {
  return (
    <section
      id="inicio"
      className="relative min-h-[86svh] sm:min-h-[82vh] lg:min-h-[88vh] flex items-center justify-center overflow-hidden pt-24 pb-8 sm:pt-24 sm:pb-8 lg:py-0"
    >
      {/* Background image */}
      <img
        src={heroFarm}
        alt="Vista aérea da Fazenda Bispo com plantação de cítricos"
        className="absolute inset-0 w-full h-full object-cover object-[58%_center] sm:object-center brightness-[0.78] contrast-[1.04] saturate-[0.98]"
        loading="eager"
        decoding="async"
      />
      {/* Overlay suave para preservar aspecto natural e legibilidade */}
      <div
        className="absolute inset-0 hero-overlay"
        style={{ background: "linear-gradient(180deg, rgba(0, 0, 0, 0.52) 0%, rgba(120, 53, 15, 0.3) 46%, rgba(0, 0, 0, 0.62) 100%)" }}
      />

      <div className="relative z-10 container mx-auto max-w-5xl px-4 text-center w-full">
        <h1
          className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold !text-white mb-4 sm:mb-5 animate-fade-in-up drop-shadow-[0_6px_18px_rgba(0,0,0,0.45)]"
        >
          Do campo à sua mesa,<br />
          <span className="!text-white">fresquinho e natural</span>
        </h1>
        <p
          className="max-w-3xl mx-auto text-base sm:text-lg md:text-xl text-primary-foreground/95 mb-6 sm:mb-8 animate-fade-in-up drop-shadow-[0_3px_12px_rgba(0,0,0,0.4)]"
          style={{ animationDelay: "0.2s" }}
        >
         Há mais de 20 anos, a Fazenda Bispo leva frutas frescas e selecionadas direto do campo para sua família. Encomende laranjas, tangerinas, limões e abacaxis com qualidade e confiança desde 2002.
        </p>
        <div
          className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center justify-center animate-fade-in-up w-full"
          style={{ animationDelay: "0.4s" }}
        >
          <a
            href="#produtos"
            className="inline-flex w-full max-w-[17rem] sm:w-auto sm:min-w-52 items-center justify-center px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl bg-secondary text-secondary-foreground font-bold text-base sm:text-lg shadow-lg shadow-secondary/35 hover:-translate-y-[1px] hover:bg-secondary/95 transition-all"
          >
            Ver Produtos
          </a>
          <a
            href="/login"
            className="inline-flex w-full max-w-[17rem] sm:w-auto sm:min-w-52 items-center justify-center px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl border-2 border-primary bg-primary text-primary-foreground font-extrabold text-base sm:text-lg shadow-lg shadow-primary/35 hover:bg-primary/90 hover:border-primary/90 hover:-translate-y-[1px] transition-all"
          >
            Entrar
          </a>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
