"use client";

import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

// Visual do switch: caixa retangular com uma fileira de LEDs de porta — os
// primeiros `portasUsadas` acesos (conectados a um servidor), o resto
// apagado (livre). Mesmo estilo de SVG desenhado à mão do ServidorRack.tsx.
export default function SwitchVisual({
  portas,
  portasUsadas,
  tamanho = 160,
}: {
  portas: number;
  portasUsadas: number;
  tamanho?: number;
}) {
  const reduzido = usePrefersReducedMotion();
  const cor = "#2ce6ff";
  const vbW = 160;
  const vbH = 52;
  const altura = Math.round((tamanho * vbH) / vbW);

  const margem = 14;
  const espacoUtil = vbW - margem * 2;
  const passo = portas > 0 ? espacoUtil / portas : 0;

  return (
    <svg
      width={tamanho}
      height={altura}
      viewBox={`0 0 ${vbW} ${vbH}`}
      style={{ filter: `drop-shadow(0 0 8px ${cor}66)` }}
    >
      <rect
        x={4}
        y={4}
        width={vbW - 8}
        height={vbH - 8}
        rx={6}
        fill="#0b0f1e"
        stroke={cor}
        strokeOpacity={0.6}
        strokeWidth={1.5}
      />
      <text x={12} y={17} fontSize={7} fill="#8a93b3">
        switch
      </text>
      {Array.from({ length: portas }).map((_, i) => {
        const ativa = i < portasUsadas;
        const cx = margem + passo * i + passo / 2;
        return (
          <circle
            key={i}
            cx={cx}
            cy={vbH - 13}
            r={3}
            fill={ativa ? cor : "transparent"}
            fillOpacity={ativa ? 0.9 : 0}
            stroke={cor}
            strokeOpacity={ativa ? 0.9 : 0.3}
            strokeWidth={1}
          >
            {ativa && !reduzido && (
              <animate attributeName="opacity" values="1;0.35;1" dur="1.6s" repeatCount="indefinite" />
            )}
          </circle>
        );
      })}
    </svg>
  );
}
