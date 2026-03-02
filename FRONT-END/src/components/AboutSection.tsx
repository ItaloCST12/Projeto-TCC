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
    description: "Tudo teve início com a aquisição de um terreno coberto por vegetação densa e improdutivo, onde o proprietário Adaílson desbravou acessos e plantou as primeiras laranjeiras. Hoje, comemoramos 20 anos de expansão contínua, transmitindo valores de perseverança e dedicação às gerações futuras",
  },
];

const AboutSection = () => {
  return (
    <section id="historia" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
            A Jornada da Fazenda <span className="text-primary">Bispo</span>
          </h2>
          <p className="max-w-2xl mx-auto text-muted-foreground text-lg">
           Nascida da visão de Adaílson em 2002, a Fazenda Bispo transforma terras improdutivas em fontes de vida. Com 20 anos de tradição, cultivamos com amor e responsabilidade, oferecendo frutas que carregam a essência da nossa dedicação familiar e respeito pela terra.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-card rounded-xl p-8 text-center shadow-card hover:shadow-card-hover transition-shadow duration-300"
            >
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-5">
                <feature.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
