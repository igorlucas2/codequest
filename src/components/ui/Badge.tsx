import type { HTMLAttributes } from "react";

type Variante = "neutro" | "sucesso" | "erro" | "ouro" | "arcano";

const VARIANTES: Record<Variante, string> = {
  neutro: "bg-fundo-fosco text-texto-suave",
  sucesso: "bg-sucesso/15 text-sucesso",
  erro: "bg-erro/15 text-erro",
  ouro: "bg-ouro/15 text-ouro",
  arcano: "bg-arcano/15 text-arcano",
};

type Props = HTMLAttributes<HTMLSpanElement> & {
  variante?: Variante;
};

// Selo/etiqueta curto (status, contagem, rótulo) — pra parar de reescrever
// "rounded-full px-2 py-0.5 text-xs" com uma cor diferente em cada tela.
export default function Badge({ variante = "neutro", className = "", children, ...resto }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${VARIANTES[variante]} ${className}`}
      {...resto}
    >
      {children}
    </span>
  );
}
