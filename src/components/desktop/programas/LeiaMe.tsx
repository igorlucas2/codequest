"use client";

import type { GeracaoPcId } from "@/content/geracoesPc";

const ESTILO: Record<GeracaoPcId, string> = {
  win98: "text-black",
  xp: "text-black",
  neon: "codigo text-texto",
};

const CONTEUDO = `LEIA-ME.TXT
===========

Bem-vindo ao seu primeiro deck, runner.

Este computador é a sua porta de entrada pra Rede. Cada
notebook que você compra e equipa no Mercado muda a cara
deste desktop — e acelera tudo: o boot, a conexão, e a
digitação nos terminais.

Dicas:
 - Arraste as janelas pela barra de título.
 - Minimize pela barra de tarefas, aí embaixo.
 - No Terminal, digite "ssh usuario@host" pra conectar em
   qualquer lugar — node-alpha pra treinar invasão, ou o IP
   do seu próprio servidor.

"A informação quer ser livre." — Provérbio da Rede`;

// Janela só de flavor, sem lógica — o "Bloco de Notas" do desktop emulado.
export default function LeiaMe({ geracao }: { geracao: GeracaoPcId }) {
  return (
    <pre
      className={`h-full whitespace-pre-wrap text-sm leading-relaxed ${ESTILO[geracao]}`}
      style={geracao === "win98" ? { fontFamily: "var(--font-retro-mono)", fontSize: "1.05rem" } : undefined}
    >
      {CONTEUDO}
    </pre>
  );
}
