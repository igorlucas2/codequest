"use client";

import { useEffect, useRef, useState } from "react";
import ServidorRack from "@/components/ServidorRack";
import SwitchVisual from "@/components/SwitchVisual";
import { useArrastarNoCanvas } from "@/components/useArrastarNoCanvas";
import type { ServidorTierId } from "@/content/servidores";

const CANVAS_LARGURA = 560;
const CANVAS_ALTURA = 360;

type Ponto = { x: number; y: number };
type Layout = { internet: Ponto; switch: Ponto | null; servidores: Ponto[] };

function pontoValido(p: unknown): p is Ponto {
  return (
    typeof p === "object" &&
    p !== null &&
    typeof (p as Ponto).x === "number" &&
    typeof (p as Ponto).y === "number"
  );
}

// Disposição padrão (mesma lógica visual de antes, agora como coordenadas
// explícitas): internet no topo, switch no meio (se precisar), racks numa
// fileira centralizada embaixo.
function layoutPadrao(numeroTotalServidores: number, precisaSwitch: boolean): Layout {
  const internet = { x: CANVAS_LARGURA / 2, y: 30 };
  const switchPos = precisaSwitch ? { x: CANVAS_LARGURA / 2, y: 130 } : null;
  const yRacks = precisaSwitch ? 250 : 160;
  const espaco = Math.min(120, CANVAS_LARGURA / Math.max(1, numeroTotalServidores));
  const inicioX = CANVAS_LARGURA / 2 - (espaco * (numeroTotalServidores - 1)) / 2;
  const servidores = Array.from({ length: numeroTotalServidores }, (_, i) => ({
    x: inicioX + espaco * i,
    y: yRacks,
  }));
  return { internet, switch: switchPos, servidores };
}

// Reconcilia uma base (layout salvo, ou o estado atual em memória) com o
// padrão calculado pra frota de agora — preenche só o que estiver faltando
// (ex.: comprou um servidor novo desde o último save), sem mexer no que já
// foi posicionado.
function reconciliar(
  base: Partial<Layout> | null | undefined,
  numeroTotalServidores: number,
  precisaSwitch: boolean,
): Layout {
  const padrao = layoutPadrao(numeroTotalServidores, precisaSwitch);
  const internet = pontoValido(base?.internet) ? base!.internet : padrao.internet;
  const switchPos = precisaSwitch
    ? pontoValido(base?.switch)
      ? base!.switch!
      : padrao.switch!
    : null;
  const servidores = padrao.servidores.map((def, i) => {
    const salvo = base?.servidores?.[i];
    return pontoValido(salvo) ? salvo : def;
  });
  return { internet, switch: switchPos, servidores };
}

function Cabo({ de, para, ativo = true }: { de: Ponto; para: Ponto; ativo?: boolean }) {
  const cor = ativo ? "#2ce6ff" : "#8a93b3";
  return (
    <g>
      <line x1={de.x} y1={de.y} x2={para.x} y2={para.y} stroke="#000" strokeOpacity={0.45} strokeWidth={5} strokeLinecap="round" />
      <line
        x1={de.x}
        y1={de.y}
        x2={para.x}
        y2={para.y}
        stroke={cor}
        strokeOpacity={ativo ? 0.85 : 0.4}
        strokeWidth={2}
        strokeDasharray={ativo ? undefined : "4 3"}
        strokeLinecap="round"
      />
      <rect x={de.x - 3} y={de.y - 3} width={6} height={6} fill={cor} fillOpacity={ativo ? 0.9 : 0.4} />
      <rect x={para.x - 3} y={para.y - 3} width={6} height={6} fill={cor} fillOpacity={ativo ? 0.9 : 0.4} />
    </g>
  );
}

// Sala de Equipamentos — canvas arrastável estilo Packet Tracer: cada
// equipamento (internet, switch, racks) pode ser arrastado livremente pra
// examinar o cabeamento com clareza. Layout persiste (ver
// api/servidores/layout) — arrastar só afeta a posição salva, nunca a
// mecânica de jogo (capacidade/defesa continuam vindo dos props numéricos).
export default function SalaDeEquipamentos({
  tier,
  numeroTotalServidores,
  capacidadeUsadaTotal,
  capacidadePorUnidade,
  internetAtiva,
  switchPortas,
  layoutSalvo,
  onSalvarLayout,
}: {
  tier: ServidorTierId;
  numeroTotalServidores: number;
  capacidadeUsadaTotal: number;
  capacidadePorUnidade: number;
  internetAtiva: boolean;
  switchPortas: number | null;
  layoutSalvo: unknown;
  onSalvarLayout: (layout: { internet: Ponto; switch: Ponto | null; servidores: Ponto[] }) => void;
}) {
  const precisaSwitch = numeroTotalServidores > 1;

  const [posicoes, setPosicoes] = useState<Layout>(() =>
    reconciliar(
      pontoValido((layoutSalvo as Layout)?.internet) ? (layoutSalvo as Layout) : null,
      numeroTotalServidores,
      precisaSwitch,
    ),
  );
  const posicoesRef = useRef(posicoes);

  // Reconcilia quando a frota muda (comprou servidor novo) — só preenche o
  // que falta, preserva tudo que já foi arrastado. Atualizador funcional
  // (não lê a ref durante o render) + setTimeout(0) pra não disparar
  // setState como primeira linha síncrona do efeito.
  useEffect(() => {
    const id = setTimeout(() => {
      setPosicoes((atual) => {
        const novo = reconciliar(atual, numeroTotalServidores, precisaSwitch);
        posicoesRef.current = novo;
        return novo;
      });
    }, 0);
    return () => clearTimeout(id);
  }, [numeroTotalServidores, precisaSwitch]);

  const arraste = useArrastarNoCanvas(CANVAS_LARGURA, CANVAS_ALTURA);

  function moverItem(id: string, x: number, y: number) {
    setPosicoes((atual) => {
      let novo = atual;
      if (id === "internet") novo = { ...atual, internet: { x, y } };
      else if (id === "switch" && atual.switch) novo = { ...atual, switch: { x, y } };
      else if (id.startsWith("servidor-")) {
        const idx = Number(id.slice("servidor-".length));
        const servidores = [...atual.servidores];
        servidores[idx] = { x, y };
        novo = { ...atual, servidores };
      }
      posicoesRef.current = novo;
      return novo;
    });
  }

  function aoSoltar() {
    onSalvarLayout(posicoesRef.current);
  }

  const usoPorRack: number[] = [];
  let restante = capacidadeUsadaTotal;
  for (let i = 0; i < numeroTotalServidores; i++) {
    const uso = Math.max(0, Math.min(capacidadePorUnidade, restante));
    usoPorRack.push(uso);
    restante -= uso;
  }

  return (
    <div className="min-w-0 max-w-full overflow-x-auto">
      <div
        className="relative mx-auto rounded-xl border border-borda/60"
        style={{
          width: CANVAS_LARGURA,
          height: CANVAS_ALTURA,
          backgroundImage:
            "linear-gradient(rgba(44,230,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(44,230,255,0.05) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      >
        <svg width={CANVAS_LARGURA} height={CANVAS_ALTURA} className="pointer-events-none absolute inset-0">
          {posicoes.switch ? (
            <>
              <Cabo de={posicoes.internet} para={posicoes.switch} ativo={internetAtiva} />
              {posicoes.servidores.map((s, i) => (
                <Cabo key={i} de={posicoes.switch!} para={s} />
              ))}
            </>
          ) : (
            posicoes.servidores[0] && (
              <Cabo de={posicoes.internet} para={posicoes.servidores[0]} ativo={internetAtiva} />
            )
          )}
        </svg>

        {/* Internet */}
        <div
          className="absolute flex cursor-grab touch-none select-none flex-col items-center"
          style={{ left: posicoes.internet.x, top: posicoes.internet.y, transform: "translate(-50%, -50%)" }}
          onPointerDown={(e) => arraste.onPointerDown(e, "internet", posicoes.internet.x, posicoes.internet.y)}
          onPointerMove={(e) => arraste.onPointerMove(e, moverItem)}
          onPointerUp={(e) => arraste.onPointerUp(e, aoSoltar)}
        >
          <span className={`text-2xl ${internetAtiva ? "" : "opacity-40"}`}>🌐</span>
          <span className="text-[10px] text-texto-suave">internet</span>
        </div>

        {/* Switch */}
        {posicoes.switch && switchPortas && (
          <div
            className="absolute cursor-grab touch-none select-none"
            style={{ left: posicoes.switch.x, top: posicoes.switch.y, transform: "translate(-50%, -50%)" }}
            onPointerDown={(e) => arraste.onPointerDown(e, "switch", posicoes.switch!.x, posicoes.switch!.y)}
            onPointerMove={(e) => arraste.onPointerMove(e, moverItem)}
            onPointerUp={(e) => arraste.onPointerUp(e, aoSoltar)}
          >
            <SwitchVisual portas={switchPortas} portasUsadas={numeroTotalServidores} tamanho={160} />
          </div>
        )}

        {/* Racks */}
        {posicoes.servidores.map((pos, i) => (
          <div
            key={i}
            className="absolute cursor-grab touch-none select-none"
            style={{ left: pos.x, top: pos.y, transform: "translate(-50%, -50%)" }}
            onPointerDown={(e) => arraste.onPointerDown(e, `servidor-${i}`, pos.x, pos.y)}
            onPointerMove={(e) => arraste.onPointerMove(e, moverItem)}
            onPointerUp={(e) => arraste.onPointerUp(e, aoSoltar)}
          >
            <ServidorRack
              tier={tier}
              capacidadeUsada={usoPorRack[i] ?? 0}
              capacidadeTotal={capacidadePorUnidade}
              tamanho={110}
            />
          </div>
        ))}

        {precisaSwitch && !switchPortas && (
          <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-center text-xs text-erro">
            ⚠️ Switch necessário — compre um abaixo pra conectar sua frota.
          </p>
        )}
      </div>
      <p className="mt-1 text-center text-[11px] text-texto-suave">Arraste os equipamentos pra reorganizar.</p>
    </div>
  );
}
