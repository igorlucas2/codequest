import type { HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLDivElement> & {
  dourado?: boolean;
  arredondamento?: "xl" | "2xl";
};

const ARREDONDAMENTOS = {
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
};

// Painel .cartao/.cartao-ouro como componente — evita repetir a combinação
// de classes em toda tela nova.
export default function Card({
  dourado = false,
  arredondamento = "2xl",
  className = "",
  children,
  ...resto
}: Props) {
  return (
    <div
      className={`cartao ${dourado ? "cartao-ouro" : ""} ${ARREDONDAMENTOS[arredondamento]} ${className}`}
      {...resto}
    >
      {children}
    </div>
  );
}
