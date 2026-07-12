"use client";

import { useEffect, useRef } from "react";

type Ponto = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  profundidade: number;
  fase: number;
};

// Fundo interativo: uma malha de nos que se movimenta e se acende perto do
// cursor. Em reduced-motion ela continua viva, mas se desloca mais devagar.
export default function DeckMesh() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const preferenciaMovimento = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduzir = preferenciaMovimento.matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const mouse = { x: -9999, y: -9999 };
    let w = 0;
    let h = 0;
    let pontos: Ponto[] = [];
    let raf = 0;
    let ultimoFrame = performance.now();

    const redimensionar = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const qtd = Math.max(28, Math.min(90, Math.floor((w * h) / 17000)));
      pontos = Array.from({ length: qtd }, () => {
        const angulo = Math.random() * Math.PI * 2;
        const velocidade = 14 + Math.random() * 18;
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          vx: Math.cos(angulo) * velocidade,
          vy: Math.sin(angulo) * velocidade,
          profundidade: 0.55 + Math.random() * 0.65,
          fase: Math.random() * Math.PI * 2,
        };
      });
    };

    const desenhar = (agora = performance.now(), deltaSegundos = 0) => {
      ctx.clearRect(0, 0, w, h);
      const g = ctx.createRadialGradient(w / 2, h * 0.22, 0, w / 2, h * 0.22, Math.max(w, h) * 0.85);
      g.addColorStop(0, "rgba(70,50,16,0.4)");
      g.addColorStop(1, "rgba(11,8,5,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      for (const p of pontos) {
        const fatorMovimento = reduzir ? 0.4 : 1;
        p.x += p.vx * p.profundidade * deltaSegundos * fatorMovimento;
        p.y += p.vy * p.profundidade * deltaSegundos * fatorMovimento;
        if (p.x < -8) p.x = w + 8;
        if (p.x > w + 8) p.x = -8;
        if (p.y < -8) p.y = h + 8;
        if (p.y > h + 8) p.y = -8;
      }

      for (let i = 0; i < pontos.length; i++) {
        const a = pontos[i];
        const pulso = (Math.sin(agora * 0.0022 + a.fase) + 1) / 2;
        for (let j = i + 1; j < pontos.length; j++) {
          const b = pontos[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 132) {
            const brilhoLinha = (0.08 + pulso * 0.1) * (1 - d / 132);
            ctx.strokeStyle = `rgba(232,178,58,${brilhoLinha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
        const dm = Math.hypot(a.x - mouse.x, a.y - mouse.y);
        const perto = dm < 170;
        if (perto) {
          ctx.strokeStyle = `rgba(255,207,94,${(1 - dm / 170) * 0.5})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }

        const raio = (1.15 + pulso * 0.85) * a.profundidade;
        ctx.fillStyle = `rgba(232,178,58,${0.07 + pulso * 0.09})`;
        ctx.beginPath();
        ctx.arc(a.x, a.y, raio * 3.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = perto
          ? "rgba(255,215,106,0.95)"
          : `rgba(232,178,58,${0.48 + pulso * 0.35})`;
        ctx.beginPath();
        ctx.arc(a.x, a.y, perto ? raio + 1 : raio, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const loop = (agora: number) => {
      const deltaSegundos = Math.min((agora - ultimoFrame) / 1000, 0.04);
      ultimoFrame = agora;
      desenhar(agora, deltaSegundos);
      raf = requestAnimationFrame(loop);
    };
    const aoMover = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const aoSair = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };
    const aoMudarPreferencia = (evento: MediaQueryListEvent) => {
      reduzir = evento.matches;
      ultimoFrame = performance.now();
    };
    const aoMudarVisibilidade = () => {
      ultimoFrame = performance.now();
    };

    redimensionar();
    window.addEventListener("resize", redimensionar);
    window.addEventListener("mousemove", aoMover);
    window.addEventListener("mouseout", aoSair);
    document.addEventListener("visibilitychange", aoMudarVisibilidade);
    preferenciaMovimento.addEventListener("change", aoMudarPreferencia);
    ultimoFrame = performance.now();
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", redimensionar);
      window.removeEventListener("mousemove", aoMover);
      window.removeEventListener("mouseout", aoSair);
      document.removeEventListener("visibilitychange", aoMudarVisibilidade);
      preferenciaMovimento.removeEventListener("change", aoMudarPreferencia);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 block h-full w-full"
    />
  );
}
