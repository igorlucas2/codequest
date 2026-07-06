"use client";

import type { ServidorTierId } from "@/content/servidores";
import { getServidorTier } from "@/content/servidores";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

// Visual do servidor do runner: um rack com uma "blade" por unidade de
// capacidade, preenchida (cor do tier) até a capacidade em uso, e vazia
// (contorno) no resto. LED no canto colorido pelo tier atual. SVG desenhado à
// mão — sem API externa, sem geração (diferente do CyberAvatar, que busca um
// SVG gerado pela nossa própria API de avatar).
export default function ServidorRack({
  tier,
  capacidadeUsada,
  capacidadeTotal,
  tamanho = 160,
}: {
  tier: ServidorTierId;
  capacidadeUsada: number;
  capacidadeTotal: number;
  tamanho?: number;
}) {
  const reduzido = usePrefersReducedMotion();
  const info = getServidorTier(tier);
  const cor = info?.corLed ?? "#2ce6ff";
  const largura = Math.round(tamanho * 0.7);

  const gap = 4;
  const topo = 14;
  const alturaUtil = 100 - topo - 8;
  const alturaBlade = capacidadeTotal > 0 ? (alturaUtil - gap * (capacidadeTotal - 1)) / capacidadeTotal : 0;

  return (
    <svg
      width={largura}
      height={tamanho}
      viewBox="0 0 70 100"
      style={{ filter: `drop-shadow(0 0 8px ${cor}66)` }}
    >
      {/* Moldura do rack */}
      <rect x={4} y={4} width={62} height={92} rx={6} fill="#0b0f1e" stroke={cor} strokeOpacity={0.6} strokeWidth={1.5} />

      {/* LED do tier */}
      <circle cx={54} cy={11} r={2.4} fill={cor}>
        {!reduzido && <animate attributeName="opacity" values="1;0.35;1" dur="1.6s" repeatCount="indefinite" />}
      </circle>

      {/* Blades: uma por unidade de capacidade */}
      {Array.from({ length: capacidadeTotal }).map((_, i) => {
        const ativa = i < capacidadeUsada;
        const y = topo + i * (alturaBlade + gap);
        return (
          <rect
            key={i}
            x={10}
            y={y}
            width={50}
            height={Math.max(2, alturaBlade)}
            rx={1.5}
            fill={ativa ? cor : "transparent"}
            fillOpacity={ativa ? 0.85 : 0}
            stroke={cor}
            strokeOpacity={ativa ? 0.9 : 0.25}
            strokeWidth={1}
          />
        );
      })}
    </svg>
  );
}
