"use client";

import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

// Topologia de rede: SVG desenhado à mão (irmão do ServidorRack), sem lib de
// grafo — coordenadas fixas por zona, sem layout dinâmico. Roteador backbone
// no centro, 3 clusters de zona em ângulos fixos, e um "pacote" que anima ao
// longo do caminho quando o jogador testa uma conexão.

export type MembroZona = { id: number; nome: string; voce: boolean };
export type ZonaTopologia = { id: number; nome: string; corLed: string; membros: MembroZona[] };
export type TesteConexao = { destinoZonaId: number; resultado: "sucesso" | "bloqueado"; motivo?: string } | null;

const BACKBONE = { x: 150, y: 110 };
// Posição fixa do cluster por zona (0/1/2) — topo-esquerda, topo-direita, embaixo.
const POSICAO_ZONA: Record<number, { x: number; y: number }> = {
  0: { x: 62, y: 48 },
  1: { x: 238, y: 48 },
  2: { x: 150, y: 190 },
};
const MAX_MEMBROS_VISIVEIS = 8;

export default function TopologiaRede({
  zonas,
  minhaZonaId,
  teste = null,
}: {
  zonas: ZonaTopologia[];
  minhaZonaId: number;
  teste?: TesteConexao;
}) {
  const reduzido = usePrefersReducedMotion();
  const origem = POSICAO_ZONA[minhaZonaId];
  const destino = teste ? POSICAO_ZONA[teste.destinoZonaId] : null;
  const corTeste = teste?.resultado === "sucesso" ? "#2bff88" : "#ff2e63";

  // Mesma zona: sem trajeto pra animar (sempre alcança) — só uma confirmação
  // instantânea, sem circle/animateMotion.
  const mostrarTrajeto = teste && teste.destinoZonaId !== minhaZonaId && destino;
  const caminho =
    mostrarTrajeto && teste.resultado === "sucesso"
      ? `M ${origem.x} ${origem.y} L ${BACKBONE.x} ${BACKBONE.y} L ${destino!.x} ${destino!.y}`
      : mostrarTrajeto
        ? `M ${origem.x} ${origem.y} L ${BACKBONE.x} ${BACKBONE.y}`
        : null;

  return (
    <svg viewBox="0 0 300 220" className="h-auto w-full max-w-md" style={{ filter: "drop-shadow(0 0 6px rgba(44,230,255,0.15))" }}>
      {/* Linhas dos clusters até o backbone */}
      {zonas.map((zona) => {
        const pos = POSICAO_ZONA[zona.id];
        return (
          <line
            key={`linha-${zona.id}`}
            x1={pos.x}
            y1={pos.y}
            x2={BACKBONE.x}
            y2={BACKBONE.y}
            stroke={zona.corLed}
            strokeOpacity={0.35}
            strokeWidth={2}
          />
        );
      })}

      {/* Roteador backbone */}
      <g>
        <rect x={BACKBONE.x - 14} y={BACKBONE.y - 10} width={28} height={20} rx={4} fill="#0b0f1e" stroke="#2ce6ff" strokeOpacity={0.7} strokeWidth={1.5} />
        <text x={BACKBONE.x} y={BACKBONE.y + 26} textAnchor="middle" fontSize={8} fill="#8a93b3">
          backbone
        </text>
      </g>

      {/* Clusters de zona */}
      {zonas.map((zona) => {
        const pos = POSICAO_ZONA[zona.id];
        const membros = zona.membros.slice(0, MAX_MEMBROS_VISIVEIS);
        const excedente = zona.membros.length - membros.length;
        const colunas = 4;

        return (
          <g key={`zona-${zona.id}`}>
            <rect
              x={pos.x - 42}
              y={pos.y - 26}
              width={84}
              height={52}
              rx={8}
              fill="#0b0f1e"
              stroke={zona.corLed}
              strokeOpacity={0.5}
              strokeWidth={1.5}
            />
            <text x={pos.x} y={pos.y - 30} textAnchor="middle" fontSize={9} fontWeight={700} fill={zona.corLed}>
              {zona.nome}
            </text>
            {membros.map((m, i) => {
              const col = i % colunas;
              const row = Math.floor(i / colunas);
              const mx = pos.x - 27 + col * 15;
              const my = pos.y - 8 + row * 15;
              return (
                <g key={m.id}>
                  {m.voce && (
                    <circle cx={mx} cy={my} r={7} fill="none" stroke={zona.corLed} strokeWidth={1.5}>
                      {!reduzido && <animate attributeName="opacity" values="1;0.25;1" dur="1.6s" repeatCount="indefinite" />}
                    </circle>
                  )}
                  <circle cx={mx} cy={my} r={4} fill={zona.corLed} fillOpacity={m.voce ? 1 : 0.55} />
                </g>
              );
            })}
            {excedente > 0 && (
              <text x={pos.x + 30} y={pos.y + 20} fontSize={7} fill="#8a93b3">
                +{excedente}
              </text>
            )}
          </g>
        );
      })}

      {/* Confirmação instantânea (mesma zona: sempre alcança, sem trajeto) */}
      {teste && teste.destinoZonaId === minhaZonaId && (
        <text x={origem.x} y={origem.y - 34} textAnchor="middle" fontSize={9} fill="#2bff88">
          ✓ mesma sub-rede
        </text>
      )}

      {/* Pacote animado (zona diferente) */}
      {caminho && (
        <circle key={`${teste?.destinoZonaId}-${teste?.resultado}`} r={4} fill={corTeste}>
          {/* Movimento reduzido: mantém o resultado (freeze no fim do
              trajeto), só sem a animação de percurso em si. */}
          <animateMotion dur={reduzido ? "0.01s" : "1.1s"} begin="0s" fill="freeze" path={caminho} />
        </circle>
      )}

      {/* Rótulo de bloqueio junto ao backbone */}
      {teste?.resultado === "bloqueado" && (
        <text x={BACKBONE.x} y={BACKBONE.y - 18} textAnchor="middle" fontSize={7} fill="#ff2e63">
          ✗ sem rota de saída
        </text>
      )}
    </svg>
  );
}
