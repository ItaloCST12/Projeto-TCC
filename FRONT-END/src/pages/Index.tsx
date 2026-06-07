import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import ProductsSection from "@/components/ProductsSection";
import ContactSection from "@/components/ContactSection";

const Index = () => {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) {
      return;
    }

    const id = location.hash.replace("#", "");
    if (!id) {
      return;
    }

    // Aguarda a renderização das seções antes de rolar até a âncora.
    const timeout = window.setTimeout(() => {
      const targetElement = document.getElementById(id);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 120);

    return () => window.clearTimeout(timeout);
  }, [location]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pb-28 sm:pb-32 lg:pb-0">
        <HeroSection />
        <AboutSection />
        <ProductsSection />
        <ContactSection />
      </main>
    </div>
  );
};

export default Index;
