"use client";

import type { ReactNode } from "react";
import { useArrastarJanela } from "@/components/desktop/useArrastarJanela";
import { useRedimensionarJanela } from "@/components/desktop/useRedimensionarJanela";
import {
  ALTURA_DESKTOP,
  ALTURA_RESERVADA_TASKBAR,
  ALTURA_MINIMA_JANELA,
} from "@/components/desktop/limitesDesktop";
import type { GeracaoPcId } from "@/content/geracoesPc";

export type JanelaEstado = {
  id: string;
  titulo: string;
  icone: string;
  x: number;
  y: number;
  largura: number;
  altura: number;
  zIndex: number;
  minimizada: boolean;
  // Dado específico do programa hospedado (ex: qual oponente o "Invasor"
  // está mirando). Opaco aqui de propósito — só quem renderiza o conteúdo
  // (Desktop.tsx) sabe interpretar o formato de cada programa.
  payload?: unknown;
};

export default function Janela({
  janela,
  geracao,
  ativa,
  onFechar,
  onFocar,
  onMinimizar,
  onMover,
  onRedimensionar,
  children,
}: {
  janela: JanelaEstado;
  geracao: GeracaoPcId;
  ativa: boolean;
  onFechar: () => void;
  onFocar: () => void;
  onMinimizar: () => void;
  onMover: (x: number, y: number) => void;
  onRedimensionar: (largura: number, altura: number) => void;
  children: ReactNode;
}) {
  const arraste = useArrastarJanela(janela.x, janela.y, onMover);
  // Mesma fórmula que Desktop.tsx usa pra não deixar o rodapé da janela
  // nascer embaixo da taskbar — aqui reaproveitada como teto de altura ao
  // redimensionar, pelo mesmo motivo.
  const alturaMaxima = Math.max(
    ALTURA_MINIMA_JANELA,
    ALTURA_DESKTOP - ALTURA_RESERVADA_TASKBAR - janela.y,
  );
  const redimensionar = useRedimensionarJanela(
    janela.x,
    janela.largura,
    janela.altura,
    alturaMaxima,
    onRedimensionar,
  );

  if (janela.minimizada) return null;

  // O ".desktop" tem largura fluida (fica bem mais estreito num celular do
  // que nos ~800px de um monitor em tela cheia), mas cada janela nasce com
  // uma largura/posição em pixels pensada pra tela cheia. Em vez de medir o
  // container em JS, deixamos o CSS resolver: a largura nunca passa da
  // largura disponível, e o "left" nunca deixa a janela vazar pra fora —
  // funciona pra qualquer tamanho de container automaticamente.
  const largura = `min(${janela.largura}px, calc(100% - 16px))`;
  const left = `min(${janela.x}px, calc(100% - ${largura} - 8px))`;

  return (
    <div
      className={`janela janela--${geracao} ${ativa ? "janela--ativa" : ""}`}
      style={{
        left,
        top: janela.y,
        width: largura,
        height: janela.altura,
        zIndex: janela.zIndex,
      }}
      onPointerDownCapture={onFocar}
    >
      <div
        className="janela-titulo"
        onPointerDown={arraste.onPointerDown}
        onPointerMove={arraste.onPointerMove}
        onPointerUp={arraste.onPointerUp}
      >
        <span className="janela-titulo-texto">
          <span className="mr-1">{janela.icone}</span>
          {janela.titulo}
        </span>
        {/* Impede que o pointerdown chegue no arraste da barra de título —
            sem isso, o clique nos botões acaba virando início de arraste. */}
        <div className="janela-botoes" onPointerDown={(e) => e.stopPropagation()}>
          <button onClick={onMinimizar} aria-label="Minimizar">
            _
          </button>
          <button onClick={onFechar} aria-label="Fechar">
            ×
          </button>
        </div>
      </div>
      <div className="janela-corpo">{children}</div>
      <div
        className="janela-redimensionar"
        onPointerDown={redimensionar.onPointerDown}
        onPointerMove={redimensionar.onPointerMove}
        onPointerUp={redimensionar.onPointerUp}
        aria-hidden="true"
      />
    </div>
  );
}
