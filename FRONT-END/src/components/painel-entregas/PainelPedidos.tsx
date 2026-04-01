import { ReactNode } from "react";

type PainelPedidosProps = {
  children: ReactNode;
};

const PainelPedidos = ({ children }: PainelPedidosProps) => {
  return <>{children}</>;
};

export default PainelPedidos;
