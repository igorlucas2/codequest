import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

// Arraste de itens dentro de um canvas de tamanho fixo (Sala de
// Equipamentos) — mesma estrutura de Pointer Events + captura do
// useArrastarJanela.ts do desktop, mas deliberadamente SEM a física de mola
// de lá (um equipamento "arremessando" pra fora do canvas ao soltar seria
// ruim aqui — o que importa é posicionar com precisão) e com teto nos dois
// eixos (o canvas é uma área pequena e fixa, diferente da tela inteira).
//
// Uma única chamada do hook controla N itens arrastáveis (quantidade
// dinâmica — servidores extras variam) via id de string. API "plana" (sem
// factory por item) de propósito: os métodos recebem o evento + os dados
// do item na hora da chamada (dentro de um handler inline no JSX), nunca
// são chamados durante o render — só assim o item arrastado no momento
// pode variar sem violar as Rules of Hooks nem o lint de refs.
export function useArrastarNoCanvas(larguraCanvas: number, alturaCanvas: number) {
  const arrastando = useRef<{ id: string; dx: number; dy: number } | null>(null);

  function onPointerDown(e: ReactPointerEvent<HTMLElement>, id: string, x: number, y: number) {
    e.currentTarget.setPointerCapture(e.pointerId);
    arrastando.current = { id, dx: e.clientX - x, dy: e.clientY - y };
  }

  function onPointerMove(e: ReactPointerEvent<HTMLElement>, aoMover: (id: string, x: number, y: number) => void) {
    const estado = arrastando.current;
    if (!estado) return;
    const novoX = Math.max(0, Math.min(larguraCanvas, e.clientX - estado.dx));
    const novoY = Math.max(0, Math.min(alturaCanvas, e.clientY - estado.dy));
    aoMover(estado.id, novoX, novoY);
  }

  function onPointerUp(e: ReactPointerEvent<HTMLElement>, aoSoltar?: () => void) {
    arrastando.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
    aoSoltar?.();
  }

  return { onPointerDown, onPointerMove, onPointerUp };
}
