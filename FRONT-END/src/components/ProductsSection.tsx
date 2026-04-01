import abacaxiImg from "@/assets/abacaxi.jpg";
import laranjaImg from "@/assets/laranja.jpg";
import tangerinaImg from "@/assets/tangerina.jpg";
import limaoImg from "@/assets/limao.jpg";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

type ProductCard = {
  name: string;
  price: string;
  unit: string;
  image: string;
  description: string;
  disponivel?: boolean;
};

const productCards: ProductCard[] = [
  {
    name: "Abacaxi",
    price: "R$ 3,00 a R$ 7,00",
    unit: "kg (pequeno, médio e grande)",
    image: abacaxiImg,
    description: "Doce e suculento, perfeito para sucos e sobremesas.",
  },
  {
    name: "Laranja",
    price: "R$ 50,00",
    unit: "saca",
    image: laranjaImg,
    description: "Rica em vitamina C, ideal para suco natural.",
  },
  {
    name: "Tangerina",
    price: "R$ 5,00",
    unit: "kilo",
    image: tangerinaImg,
    description: "Fácil de descascar, sabor adocicado e refrescante.",
  },
  {
    name: "Limão",
    price: "R$ 60,00",
    unit: "saca",
    image: limaoImg,
    description: "Versátil na cozinha, aroma intenso e muito suco.",
  },
];

type ApiProduto = {
  id: number;
  nome: string;
  disponivel: boolean;
};

const ProductsSection = () => {
  const [apiProducts, setApiProducts] = useState<ApiProduto[]>([]);
  const [loading, setLoading] = useState(true);
  const [buscaProduto, setBuscaProduto] = useState("");

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const produtos = await apiRequest<ApiProduto[]>("/produtos");
        setApiProducts(produtos);
      } catch {
        setApiProducts([]);
      } finally {
        setLoading(false);
      }
    };

    void loadProducts();
  }, []);

  const productLookup = useMemo(() => {
    return new Map(productCards.map((item) => [item.name.toLowerCase(), item]));
  }, []);

  const productsToShow = useMemo(() => {
    if (apiProducts.length === 0) {
      return productCards;
    }

    return apiProducts.map((apiProduct) => {
      const mapped = productLookup.get(apiProduct.nome.toLowerCase());

      return {
        name: apiProduct.nome,
        disponivel: apiProduct.disponivel,
        price: mapped?.price ?? "Consulte",
        unit: mapped?.unit ?? "unidade",
        image: mapped?.image ?? abacaxiImg,
        description:
          mapped?.description ?? "Produto fresco vendido na fazenda.",
      };
    });
  }, [apiProducts, productLookup]);

  const produtosFiltrados = useMemo(() => {
    const termo = buscaProduto.trim().toLowerCase();
    if (!termo) {
      return productsToShow;
    }

    return productsToShow.filter((produto) =>
      produto.name.toLowerCase().includes(termo),
    );
  }, [buscaProduto, productsToShow]);

  return (
    <section id="produtos" className="section-wrap bg-muted/45">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="section-heading mb-4">
            Nossos <span className="text-secondary">Produtos</span>
          </h2>
          <p className="section-description">
            Frutas cítricas colhidas no auge do frescor diretamente da Fazenda Bispo. Confira nossa seleção, com opções por tamanho e preços acessíveis. Itens sazonais podem estar temporariamente indisponíveis, avise-nos para notificações!
          </p>
        </div>

        <label className="mb-6 mx-auto max-w-md inline-flex w-full items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={buscaProduto}
            onChange={(event) => setBuscaProduto(event.target.value)}
            className="w-full bg-transparent outline-none"
            placeholder="Buscar produto por nome"
            aria-label="Buscar produto por nome"
          />
        </label>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={`landing-skeleton-${index}`} className="glass-card p-4 space-y-3">
                <Skeleton className="aspect-square w-full rounded-lg" />
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-6 w-1/3" />
              </div>
            ))}
          </div>
        ) : produtosFiltrados.length === 0 ? (
          <p className="text-center text-muted-foreground">
            Nenhum produto encontrado para "{buscaProduto}".
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {produtosFiltrados.map((product) => (
            <div
              key={product.name}
              className="glass-card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover group"
            >
              <div className="aspect-square overflow-hidden bg-background">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-display text-xl font-semibold text-foreground">
                    {product.name}
                  </h3>
                  {product.disponivel === false && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground whitespace-nowrap">
                      Indisponível
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed mb-3">{product.description}</p>
                <div>
                  <div>
                    <span className="text-2xl font-bold text-primary">{product.price}</span>
                    <span className="text-muted-foreground text-sm ml-1">/ {product.unit}</span>
                  </div>
                </div>
              </div>
            </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ProductsSection;
