import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement>;

// Campo de texto padrão do app (usado hoje em /entrar) — moldura neon sutil,
// foco em ciano.
export default function Input({ className = "", ...resto }: Props) {
  return (
    <input
      className={`w-full rounded-xl border border-borda bg-fundo-card px-4 py-3 outline-none focus:border-primaria ${className}`}
      {...resto}
    />
  );
}
