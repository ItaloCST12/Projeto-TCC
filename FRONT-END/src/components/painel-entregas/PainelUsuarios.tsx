import { ReactNode } from "react";

type PainelUsuariosProps = {
  children: ReactNode;
};

const PainelUsuarios = ({ children }: PainelUsuariosProps) => {
  return <>{children}</>;
};

export default PainelUsuarios;
