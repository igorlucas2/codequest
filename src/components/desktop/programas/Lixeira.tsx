"use client";

import type { GeracaoPcId } from "@/content/geracoesPc";

const ESTILO: Record<GeracaoPcId, string> = {
  win98: "text-black",
  xp: "text-black",
  neon: "text-texto",
};

// Janela só de flavor, sem lógica nenhuma — a piada da lixeira sempre vazia.
export default function Lixeira({ geracao }: { geracao: GeracaoPcId }) {
  return (
    <div className={`flex h-full flex-col items-center justify-center gap-2 text-center text-sm ${ESTILO[geracao]}`}>
      <span className="text-3xl">🗑️</span>
      <p className="font-semibold">A Lixeira está vazia.</p>
      <p className="text-xs opacity-70">0 itens. Nada aqui... ainda.</p>
    </div>
  );
}
