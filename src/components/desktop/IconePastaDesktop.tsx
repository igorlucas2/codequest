"use client";

import { useEffect, useRef, useState } from "react";
import type { GeracaoPcId } from "@/content/geracoesPc";
import type { PastaDesktop } from "@/components/desktop/pastasDesktop";

type EstadoMenu = "fechado" | "opcoes" | "renomeando";

// Ícone de uma pasta criada pelo usuário na área de trabalho. Duplo-clique
// abre; botão direito mostra Abrir/Renomear/Excluir. Renomear troca o rótulo
// por um input inline (mesmo padrão de menu-popup do IconeDesktop de programa).
export default function IconePastaDesktop({
  pasta,
  geracao,
  onAbrir,
  onRenomear,
  onExcluir,
}: {
  pasta: PastaDesktop;
  geracao: GeracaoPcId;
  onAbrir: () => void;
  onRenomear: (nome: string) => void;
  onExcluir: () => void;
}) {
  const [menu, setMenu] = useState<EstadoMenu>("fechado");
  const [rascunho, setRascunho] = useState(pasta.nome);
  const ancoraRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (menu === "fechado") return;
    function aoClicarFora(e: PointerEvent) {
      if (ancoraRef.current && !ancoraRef.current.contains(e.target as Node)) {
        setMenu("fechado");
      }
    }
    document.addEventListener("pointerdown", aoClicarFora);
    return () => document.removeEventListener("pointerdown", aoClicarFora);
  }, [menu]);

  function confirmarRenomear() {
    const nome = rascunho.trim();
    if (nome && nome !== pasta.nome) onRenomear(nome);
    setMenu("fechado");
  }

  return (
    <div className="menu-popup-ancora" ref={ancoraRef}>
      <button
        className={`icone-desktop icone-desktop--${geracao}`}
        onDoubleClick={onAbrir}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onAbrir();
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenu((m) => (m === "fechado" ? "opcoes" : "fechado"));
        }}
        title={`Abrir ${pasta.nome}`}
        aria-label={`Abrir pasta ${pasta.nome}`}
      >
        <span className="icone-desktop-emoji">📁</span>
        {menu === "renomeando" ? (
          <input
            autoFocus
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") confirmarRenomear();
              if (e.key === "Escape") setMenu("fechado");
            }}
            onBlur={confirmarRenomear}
            className="w-[72px] rounded border border-borda bg-fundo px-1 text-center text-[11px] text-texto outline-none"
          />
        ) : (
          <span className="icone-desktop-rotulo">{pasta.nome}</span>
        )}
      </button>

      {menu === "opcoes" && (
        <div className={`menu-popup menu-popup--abaixo menu-popup--${geracao}`}>
          <button
            className={`menu-popup-item menu-popup-item--${geracao}`}
            onClick={() => {
              onAbrir();
              setMenu("fechado");
            }}
          >
            Abrir
          </button>
          <button
            className={`menu-popup-item menu-popup-item--${geracao}`}
            onClick={() => {
              setRascunho(pasta.nome);
              setMenu("renomeando");
            }}
          >
            Renomear
          </button>
          <button
            className={`menu-popup-item menu-popup-item--${geracao}`}
            onClick={() => {
              onExcluir();
              setMenu("fechado");
            }}
          >
            Excluir
          </button>
        </div>
      )}
    </div>
  );
}
