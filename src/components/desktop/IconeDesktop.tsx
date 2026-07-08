"use client";

import { useEffect, useRef, useState } from "react";
import type { GeracaoPcId } from "@/content/geracoesPc";

type EstadoMenu = "fechado" | "opcoes" | "propriedades";

export default function IconeDesktop({
  rotulo,
  icone,
  geracao,
  onAbrir,
}: {
  rotulo: string;
  icone: string;
  geracao: GeracaoPcId;
  onAbrir: () => void;
}) {
  const [menu, setMenu] = useState<EstadoMenu>("fechado");
  const ancoraRef = useRef<HTMLDivElement>(null);

  // Mesmo padrão do Menu Iniciar: fecha ao clicar fora, sem overlay cobrindo
  // a tela inteira.
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

  return (
    <div className="menu-popup-ancora" ref={ancoraRef}>
      <button
        className={`icone-desktop icone-desktop--${geracao}`}
        onDoubleClick={onAbrir}
        onKeyDown={(e) => {
          // Equivalente de teclado ao duplo-clique: Enter/Espaço abrem direto
          // (não dá pra "duplo-clicar" com teclado, então um Enter já basta).
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onAbrir();
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenu((m) => (m === "fechado" ? "opcoes" : "fechado"));
        }}
        title={`Abrir ${rotulo}`}
        aria-label={`Abrir ${rotulo}`}
      >
        <span className="icone-desktop-emoji">
          {icone === "msn" ? <span className="msn-program-icon msn-program-icon--desktop" /> : icone}
        </span>
        <span className="icone-desktop-rotulo">{rotulo}</span>
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
            onClick={() => setMenu("propriedades")}
          >
            Propriedades
          </button>
        </div>
      )}

      {menu === "propriedades" && (
        <div className={`menu-popup menu-popup--abaixo menu-popup--${geracao}`}>
          <p className="menu-popup-titulo">
            {icone} {rotulo}
          </p>
          <p className="menu-popup-texto">Tipo: Atalho de programa</p>
          <button
            className={`menu-popup-item menu-popup-item--${geracao}`}
            onClick={() => setMenu("fechado")}
          >
            Fechar
          </button>
        </div>
      )}
    </div>
  );
}
