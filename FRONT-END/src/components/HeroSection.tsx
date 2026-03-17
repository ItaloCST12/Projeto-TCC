import heroFarm from "@/assets/hero-farm.jpg";

const HeroSection = () => {
  return (
    <section
      id="inicio"
      className="relative min-h-[90vh] flex items-center justify-center overflow-hidden"
    >
      {/* Background image */}
      <img
        src={heroFarm}
        alt="Vista aérea da Fazenda Bispo com plantação de cítricos"
        className="absolute inset-0 w-full h-full object-cover"
        loading="eager"
      />
      {/* Overlay */}
      <div
        className="absolute inset-0 hero-overlay"
        style={{ background: "linear-gradient(180deg, rgba(0, 0, 0, 0.46) 0%, rgba(0, 0, 0, 0.28) 100%)" }}
      />

      <div className="relative z-10 container mx-auto px-4 text-center">
        <h1
          className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold !text-white mb-6 animate-fade-in-up drop-shadow-[0_6px_18px_rgba(0,0,0,0.5)]"
        >
          Do campo à sua mesa,<br />
          <span className="!text-white">fresquinho e natural</span>
        </h1>
        <p
          className="max-w-2xl mx-auto text-lg sm:text-xl text-primary-foreground mb-8 animate-fade-in-up drop-shadow-[0_3px_12px_rgba(0,0,0,0.45)]"
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
            className="inline-flex items-center justify-center px-8 py-3 rounded-lg bg-secondary text-secondary-foreground font-bold text-lg shadow-lg shadow-secondary/40 hover:-translate-y-[1px] hover:bg-secondary/95 transition-all"
          >
            Ver Produtos
          </a>
          <a
            href="#contato"
            className="inline-flex items-center justify-center px-8 py-3 rounded-lg border-2 border-accent text-white font-bold text-lg bg-black/15 hover:bg-accent/20 hover:-translate-y-[1px] transition-all"
          >
            Entrar em Contato
          </a>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
