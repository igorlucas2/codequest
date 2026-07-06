import { useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { animate } from "framer-motion";

// Arraste de janela via Pointer Events puro (sem lib): a barra de título
// captura o ponteiro no pointerdown, então continua recebendo move/up mesmo
// se o cursor sair do elemento — sem precisar de listener global em window.
//
// Ao soltar, se o ponteiro estava em movimento, a janela "desliza" um pouco
// na direção da velocidade e assenta com física de mola — em vez de travar
// seca na posição exata do último pointermove (o padrão 1:1 sem inércia).
export function useArrastarJanela(
  x: number,
  y: number,
  aoMover: (x: number, y: number) => void,
) {
  const offset = useRef<{ dx: number; dy: number } | null>(null);
  const posicaoAtual = useRef({ x, y });
  const ultimoMovimento = useRef<{ t: number; x: number; y: number } | null>(null);
  const velocidade = useRef({ x: 0, y: 0 });
  const paradas = useRef<Array<{ stop: () => void }>>([]);

  useEffect(() => {
    posicaoAtual.current = { x, y };
  }, [x, y]);

  function pararAnimacoes() {
    for (const controle of paradas.current) controle.stop();
    paradas.current = [];
  }

  function onPointerDown(e: ReactPointerEvent<HTMLElement>) {
    pararAnimacoes();
    e.currentTarget.setPointerCapture(e.pointerId);
    offset.current = { dx: e.clientX - x, dy: e.clientY - y };
    ultimoMovimento.current = { t: performance.now(), x, y };
    velocidade.current = { x: 0, y: 0 };
  }

  function onPointerMove(e: ReactPointerEvent<HTMLElement>) {
    if (!offset.current) return;
    const novoX = Math.max(0, e.clientX - offset.current.dx);
    const novoY = Math.max(0, e.clientY - offset.current.dy);

    const agora = performance.now();
    if (ultimoMovimento.current) {
      const dt = agora - ultimoMovimento.current.t;
      if (dt > 0) {
        velocidade.current = {
          x: (novoX - ultimoMovimento.current.x) / dt,
          y: (novoY - ultimoMovimento.current.y) / dt,
        };
      }
    }
    ultimoMovimento.current = { t: agora, x: novoX, y: novoY };

    aoMover(novoX, novoY);
  }

  function onPointerUp(e: ReactPointerEvent<HTMLElement>) {
    offset.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);

    const reduzido =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const { x: vx, y: vy } = velocidade.current;
    const rapidoOSuficiente = Math.abs(vx) > 0.05 || Math.abs(vy) > 0.05;
    if (reduzido || !rapidoOSuficiente) return;

    // Anima a partir da própria posição de soltura com a velocidade do
    // arraste como impulso inicial — mesmo início e fim fazem a mola
    // deslizar um pouco na direção do movimento e assentar sozinha.
    const inicioX = posicaoAtual.current.x;
    const inicioY = posicaoAtual.current.y;
    const controleX = animate(inicioX, inicioX, {
      type: "spring",
      velocity: vx * 1000,
      stiffness: 260,
      damping: 26,
      onUpdate: (v) => aoMover(Math.max(0, v), posicaoAtual.current.y),
    });
    const controleY = animate(inicioY, inicioY, {
      type: "spring",
      velocity: vy * 1000,
      stiffness: 260,
      damping: 26,
      onUpdate: (v) => aoMover(posicaoAtual.current.x, Math.max(0, v)),
    });
    paradas.current = [controleX, controleY];
  }

  return { onPointerDown, onPointerMove, onPointerUp };
}
