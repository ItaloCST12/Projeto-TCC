import { Phone, Mail, MapPin } from "lucide-react";

const ContactSection = () => {
  return (
    <section id="contato" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Entre em <span className="text-primary">Contato</span>
          </h2>
          <p className="max-w-xl mx-auto text-muted-foreground text-lg">
            Faça sua encomenda ou tire suas dúvidas. Estamos prontos para atender você!
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto">
          <a
            href="https://wa.me/5596991583439?text=Ol%C3%A1%21%20Gostaria%20de%20fazer%20um%20pedido."
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center bg-card rounded-xl p-8 shadow-card hover:shadow-card-hover transition-shadow duration-300 group"
          >
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4 group-hover:bg-primary/20 transition-colors">
              <Phone className="h-7 w-7 text-primary" />
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground mb-1">WhatsApp</h3>
            <p className="text-muted-foreground text-sm">(96) 99158-3439</p>
          </a>

          <a
            href="mailto:contato@fazendabispo.com"
            className="flex flex-col items-center bg-card rounded-xl p-8 shadow-card hover:shadow-card-hover transition-shadow duration-300 group"
          >
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4 group-hover:bg-primary/20 transition-colors">
              <Mail className="h-7 w-7 text-primary" />
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground mb-1">E-mail</h3>
            <p className="text-muted-foreground text-sm">contato@fazendabispo.com</p>
          </a>

          <div className="flex flex-col items-center bg-card rounded-xl p-8 shadow-card hover:shadow-card-hover transition-shadow duration-300">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
              <MapPin className="h-7 w-7 text-primary" />
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground mb-1">Localização</h3>
            <p className="text-muted-foreground text-sm text-center">Zona Rural, Cidade - Estado</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
