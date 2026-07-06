import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { LARGURA_MINIMA_JANELA, ALTURA_MINIMA_JANELA } from "@/components/desktop/limitesDesktop";

// Redimensionar arrastando o canto inferior-direito — mesmo mecanismo de
// Pointer Events + captura do useArrastarJanela.ts, mas em arquivo separado
// de propósito: aquele hook ganhou física de mola (framer-motion) pro
// soltar do arraste, o que não faz sentido pra resize (a janela "arremessar"
// e ultrapassar o tamanho final pareceria quebrado, não gostoso).
export function useRedimensionarJanela(
  x: number,
  largura: number,
  altura: number,
  alturaMaxima: number,
  aoRedimensionar: (largura: number, altura: number) => void,
) {
  const inicio = useRef<{ pointerX: number; pointerY: number; largura: number; altura: number } | null>(null);

  function onPointerDown(e: ReactPointerEvent<HTMLElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    inicio.current = { pointerX: e.clientX, pointerY: e.clientY, largura, altura };
  }

  function onPointerMove(e: ReactPointerEvent<HTMLElement>) {
    if (!inicio.current) return;

    // Largura máxima é medida ao vivo (container ".desktop" tem largura
    // fluida) — evita precisar passar essa medida por toda a árvore
    // Desktop → Janela → hook só pra isso.
    const desktopEl = (e.target as HTMLElement).closest(".desktop") as HTMLElement | null;
    const larguraMaxima = Math.max(
      LARGURA_MINIMA_JANELA,
      (desktopEl?.clientWidth ?? Infinity) - x - 8,
    );

    const novaLargura = Math.min(
      larguraMaxima,
      Math.max(LARGURA_MINIMA_JANELA, inicio.current.largura + (e.clientX - inicio.current.pointerX)),
    );
    const novaAltura = Math.min(
      alturaMaxima,
      Math.max(ALTURA_MINIMA_JANELA, inicio.current.altura + (e.clientY - inicio.current.pointerY)),
    );
    aoRedimensionar(novaLargura, novaAltura);
  }

  function onPointerUp(e: ReactPointerEvent<HTMLElement>) {
    inicio.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  return { onPointerDown, onPointerMove, onPointerUp };
}
