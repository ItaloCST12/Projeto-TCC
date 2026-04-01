import { ReactNode } from "react";

type PainelProdutosProps = {
  children: ReactNode;
};

const PainelProdutos = ({ children }: PainelProdutosProps) => {
  return <>{children}</>;
};

export default PainelProdutos;
