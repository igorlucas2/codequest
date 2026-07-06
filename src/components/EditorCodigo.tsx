"use client";

import { useState } from "react";
import { CORES, type LinhaTerminal } from "@/components/Terminal";

// Editor de código estilo VS Code: o aluno escreve o script (não só um
// comando de cada vez), "Salva" e "Roda" pra testar — quem decide o que
// "Rodar" valida é sempre quem usa este componente (mesmo contrato do
// onComando do Terminal, só que recebe o buffer inteiro em vez de uma linha).
export default function EditorCodigo({
  valor,
  aoMudarValor,
  saida,
  aoRodar,
  desabilitado = false,
  arquivo = "solucao.py",
  placeholder = "# escreva seu código aqui...",
}: {
  valor: string;
  aoMudarValor: (valor: string) => void;
  saida: LinhaTerminal[];
  aoRodar: () => void;
  desabilitado?: boolean;
  arquivo?: string;
  placeholder?: string;
}) {
  const [salvo, setSalvo] = useState(true);

  function rodar() {
    if (desabilitado || valor.trim().length === 0) return;
    setSalvo(true);
    aoRodar();
  }

  return (
    <div className="codigo overflow-hidden rounded-xl border border-esmeralda/30 bg-black/70 shadow-[0_0_24px_rgba(43,255,136,0.08)]">
      {/* Aba de arquivo, só pra vender o clima de editor de verdade. */}
      <div className="flex items-center gap-2 border-b border-esmeralda/20 bg-black/40 px-3 py-1.5 text-xs text-esmeralda/80">
        <span>🐍 {arquivo}</span>
        {!salvo && <span className="text-ouro" title="Alterações não salvas">●</span>}
      </div>

      <textarea
        value={valor}
        disabled={desabilitado}
        onChange={(e) => {
          aoMudarValor(e.target.value);
          setSalvo(false);
        }}
        onKeyDown={(e) => {
          const comando = e.ctrlKey || e.metaKey;
          if (comando && e.key.toLowerCase() === "s") {
            e.preventDefault();
            setSalvo(true);
          } else if (comando && e.key === "Enter") {
            e.preventDefault();
            rodar();
          }
        }}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        rows={8}
        className="w-full resize-y bg-transparent p-3 text-esmeralda outline-none placeholder:text-esmeralda/30 disabled:opacity-60"
      />

      <div className="flex items-center gap-2 border-t border-esmeralda/20 px-3 py-2">
        <button
          onClick={() => setSalvo(true)}
          disabled={desabilitado}
          className="rounded-lg border border-esmeralda/30 px-3 py-1 text-xs text-esmeralda transition hover:bg-esmeralda/10 disabled:opacity-40"
          title="Ctrl+S"
        >
          💾 Salvar
        </button>
        <button
          onClick={rodar}
          disabled={desabilitado || valor.trim().length === 0}
          className="rounded-lg bg-esmeralda px-3 py-1 text-xs font-semibold text-black transition hover:opacity-90 disabled:opacity-40"
          title="Ctrl+Enter"
        >
          ▶ Rodar
        </button>
        <span className="ml-auto hidden text-[10px] text-esmeralda/40 sm:inline">
          Ctrl+S salva · Ctrl+Enter roda
        </span>
      </div>

      <div className="max-h-48 overflow-y-auto border-t border-esmeralda/20 p-3 text-xs">
        {saida.length === 0 ? (
          <p className="text-esmeralda/40">{"// clique em ▶ Rodar pra testar seu código"}</p>
        ) : (
          saida.map((linha, i) => (
            <p key={i} className={`whitespace-pre-wrap ${CORES[linha.tipo ?? "saida"]}`}>
              {linha.texto}
            </p>
          ))
        )}
      </div>
    </div>
  );
}
