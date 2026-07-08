"use client";

import { memo, type Dispatch, type ReactNode } from "react";
import { useArrastarJanela } from "@/components/desktop/useArrastarJanela";
import { useRedimensionarJanela } from "@/components/desktop/useRedimensionarJanela";
import {
  ALTURA_DESKTOP,
  ALTURA_RESERVADA_TASKBAR,
  ALTURA_MINIMA_JANELA,
  ALTURA_MINIMA_VISIVEL_ARRASTE,
} from "@/components/desktop/limitesDesktop";
import type { GeracaoPcId } from "@/content/geracoesPc";
import type { AcaoDesktop } from "@/components/desktop/Desktop";

const Y_MAXIMO_ARRASTE = ALTURA_DESKTOP - ALTURA_RESERVADA_TASKBAR - ALTURA_MINIMA_VISIVEL_ARRASTE;

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
  maximizada?: boolean;
  restaurar?: {
    x: number;
    y: number;
    largura: number;
    altura: number;
  };
  // Dado específico do programa hospedado (ex: qual oponente o "Invasor"
  // está mirando). Opaco aqui de propósito — só quem renderiza o conteúdo
  // (Desktop.tsx) sabe interpretar o formato de cada programa.
  payload?: unknown;
};

function Janela({
  janela,
  geracao,
  ativa,
  dispatch,
  children,
}: {
  janela: JanelaEstado;
  geracao: GeracaoPcId;
  ativa: boolean;
  // Recebe o dispatch do reducer (identidade estável entre renders) em vez
  // de 5 callbacks pré-fechados por janela — Desktop.tsx fechava uma arrow
  // function nova a cada render pra cada janela, o que invalidava o memo()
  // abaixo mesmo sem nada daquela janela específica ter mudado.
  dispatch: Dispatch<AcaoDesktop>;
  children: ReactNode;
}) {
  const arraste = useArrastarJanela(janela.x, janela.y, Y_MAXIMO_ARRASTE, (x, y) =>
    dispatch({ tipo: "mover", id: janela.id, x, y }),
  );
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
    (largura, altura) => dispatch({ tipo: "redimensionar", id: janela.id, largura, altura }),
  );

  // O ".desktop" tem largura fluida (fica bem mais estreito num celular do
  // que nos ~800px de um monitor em tela cheia), mas cada janela nasce com
  // uma largura/posição em pixels pensada pra tela cheia. Em vez de medir o
  // container em JS, deixamos o CSS resolver: a largura nunca passa da
  // largura disponível, e o "left" nunca deixa a janela vazar pra fora —
  // funciona pra qualquer tamanho de container automaticamente.
  const largura = `min(${janela.largura}px, calc(100% - 16px))`;
  const left = `min(${janela.x}px, calc(100% - ${largura} - 8px))`;
  const estiloNormal = {
    left,
    top: janela.y,
    width: largura,
    height: janela.altura,
  };
  const estiloMaximizado = {
    left: 8,
    top: 8,
    width: "calc(100% - 16px)",
    height: ALTURA_DESKTOP - ALTURA_RESERVADA_TASKBAR - 16,
  };

  return (
    <div
      className={`janela janela--${geracao} ${ativa ? "janela--ativa" : ""} ${
        janela.maximizada ? "janela--maximizada" : ""
      }`}
      // Minimizar esconde via CSS em vez de desmontar (return null): o
      // programa hospedado mantém seu estado local (histórico do
      // terminal, timer de combate do Invasor) enquanto minimizado.
      style={{
        display: janela.minimizada ? "none" : undefined,
        ...(janela.maximizada ? estiloMaximizado : estiloNormal),
        zIndex: janela.zIndex,
      }}
      onPointerDownCapture={() => dispatch({ tipo: "focar", id: janela.id })}
    >
      <div
        className="janela-titulo"
        onDoubleClick={() => dispatch({ tipo: "maximizar", id: janela.id })}
        onPointerDown={janela.maximizada ? undefined : arraste.onPointerDown}
        onPointerMove={janela.maximizada ? undefined : arraste.onPointerMove}
        onPointerUp={janela.maximizada ? undefined : arraste.onPointerUp}
      >
        <span className="janela-titulo-texto">
          <span className="mr-1">{janela.icone === "msn" ? <MsnIconePequeno /> : janela.icone}</span>
          {janela.titulo}
        </span>
        {/* Impede que o pointerdown chegue no arraste da barra de título —
            sem isso, o clique nos botões acaba virando início de arraste. */}
        <div className="janela-botoes" onPointerDown={(e) => e.stopPropagation()}>
          <button onClick={() => dispatch({ tipo: "minimizar", id: janela.id })} aria-label="Minimizar">
            _
          </button>
          <button
            onClick={() => dispatch({ tipo: "maximizar", id: janela.id })}
            aria-label={janela.maximizada ? "Restaurar janela" : "Maximizar janela"}
            title={janela.maximizada ? "Restaurar" : "Maximizar"}
          >
            {janela.maximizada ? "▣" : "□"}
          </button>
          <button onClick={() => dispatch({ tipo: "fechar", id: janela.id })} aria-label="Fechar">
            ×
          </button>
        </div>
      </div>
      <div className="janela-corpo">{children}</div>
      {!janela.maximizada && (
        <div
          className="janela-redimensionar"
          onPointerDown={redimensionar.onPointerDown}
          onPointerMove={redimensionar.onPointerMove}
          onPointerUp={redimensionar.onPointerUp}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

// Toda janela reexecuta o corpo a cada pointermove de QUALQUER janela sendo
// arrastada (o estado de todas vive no reducer do Desktop) — memo evita que
// as que não mudaram re-renderizem à toa.
export default memo(Janela);

function MsnIconePequeno() {
  return <span className="msn-program-icon msn-program-icon--small" aria-hidden="true" />;
}
