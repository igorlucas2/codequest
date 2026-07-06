import type { ButtonHTMLAttributes, ReactNode } from "react";
import Spinner from "@/components/Spinner";

type Variante = "primario" | "perigo" | "sucesso" | "fantasma";
type Tamanho = "sm" | "md";

const VARIANTES: Record<Variante, string> = {
  primario: "bg-primaria text-white hover:bg-primaria-forte",
  sucesso: "bg-sucesso text-fundo hover:opacity-90",
  perigo: "bg-erro/20 text-erro hover:bg-erro/30",
  fantasma: "bg-transparent text-texto-suave hover:bg-fundo-card hover:text-texto",
};

const TAMANHOS: Record<Tamanho, string> = {
  sm: "gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold",
  md: "gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante;
  tamanho?: Tamanho;
  carregando?: boolean;
  children: ReactNode;
};

// Botão padrão do app — consolida as variantes de cor (primário/perigo/sucesso/
// fantasma) e o par disabled+Spinner que se repetia em cada tela com ação
// assíncrona (Loja, Servidores, Personagem, Alvos...).
export default function Button({
  variante = "primario",
  tamanho = "md",
  carregando = false,
  disabled,
  className = "",
  children,
  ...resto
}: Props) {
  return (
    <button
      disabled={disabled || carregando}
      className={`flex shrink-0 items-center justify-center transition disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTES[variante]} ${TAMANHOS[tamanho]} ${className}`}
      {...resto}
    >
      {carregando && <Spinner tamanho={tamanho === "sm" ? 12 : 14} />}
      {children}
    </button>
  );
}
