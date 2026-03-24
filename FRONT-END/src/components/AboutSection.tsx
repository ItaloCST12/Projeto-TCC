import { Sprout, Sun, Heart } from "lucide-react";

const features = [
  {
    icon: Sprout,
    title: "Cultivo Responsável",
    description: "Priorizamos o natural: sem agrotóxicos, apenas fertilizantes como adubo químico para um solo saudável e plantas vigorosas. Nosso manejo garante frutas nutritivas e seguras para você.",
  },
  {
    icon: Sun,
    title: "Colheita no Ponto Certo",
    description: "Cada fruta é colhida no momento ideal, selecionada por tamanhos (pequeno, médio e grande) para frescor máximo. Isso preserva o sabor autêntico e os benefícios à saúde.",
  },
  {
    icon: Heart,
    title: "Herança Familiar",
    description: "Iniciada há 20 anos por Adaílson em um terreno improdutivo, a fazenda começou com o plantio das primeiras laranjeiras. Hoje celebramos nossa trajetória de perseverança e dedicação às próximas gerações.",
  },
];

const AboutSection = () => {
  return (
    <section id="historia" className="section-wrap bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="section-heading mb-4">
            A Jornada da Fazenda <span className="text-primary">Bispo</span>
          </h2>
          <p className="section-description">
           Nascida da visão de Adaílson em 2002, a Fazenda Bispo transforma terras improdutivas em fontes de vida. Com 20 anos de tradição, cultivamos com amor e responsabilidade, oferecendo frutas que carregam a essência da nossa dedicação familiar e respeito pela terra.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="glass-card p-7 text-center transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover"
            >
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
                <feature.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
