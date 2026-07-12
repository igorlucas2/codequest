import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement>;

// Campo de texto padrao do app, com o mesmo recorte angular do shell.
export default function Input({ className = "", ...resto }: Props) {
  return (
    <input
      className={`deck-cut w-full border border-borda bg-fundo px-4 py-3 outline-none transition placeholder:text-texto-suave/70 focus:border-primaria focus:bg-fundo-card ${className}`}
      {...resto}
    />
  );
}
