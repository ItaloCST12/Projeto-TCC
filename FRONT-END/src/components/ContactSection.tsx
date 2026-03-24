import { Phone, Mail, MapPin } from "lucide-react";

const ContactSection = () => {
  return (
    <section id="contato" className="section-wrap bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="section-heading mb-4">
            Entre em <span className="text-primary">Contato</span>
          </h2>
          <p className="section-description">
            Faça sua encomenda ou tire suas dúvidas. Estamos prontos para atender você!
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <a
            href="https://wa.me/5596991583439?text=Ol%C3%A1%21%20Gostaria%20de%20fazer%20um%20pedido."
            target="_blank"
            rel="noopener noreferrer"
            className="glass-card flex flex-col items-center p-8 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover group"
          >
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4 group-hover:bg-primary/20 transition-colors">
              <Phone className="h-7 w-7 text-primary" />
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground mb-1">WhatsApp</h3>
            <p className="text-muted-foreground text-sm">(96) 99158-3439</p>
          </a>

          <a
            href="mailto:contato@fazendabispo.com"
            className="glass-card flex flex-col items-center p-8 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover group"
          >
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4 group-hover:bg-primary/20 transition-colors">
              <Mail className="h-7 w-7 text-primary" />
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground mb-1">E-mail</h3>
            <p className="text-muted-foreground text-sm">contato@fazendabispo.com</p>
          </a>

          <div className="glass-card flex flex-col items-center p-8 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover">
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
