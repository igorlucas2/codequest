"use client";

import { useReducer, useRef, useState } from "react";
import "@/app/desktop.css";
import { geracaoPorNotebook } from "@/content/geracoesPc";
import IconeDesktop from "@/components/desktop/IconeDesktop";
import Janela, { type JanelaEstado } from "@/components/desktop/Janela";
import Taskbar from "@/components/desktop/Taskbar";
import {
  ALTURA_DESKTOP,
  ALTURA_RESERVADA_TASKBAR,
  LARGURA_MINIMA_JANELA,
  ALTURA_MINIMA_JANELA,
} from "@/components/desktop/limitesDesktop";
import BootScreen from "@/components/desktop/BootScreen";
import EsteComputador from "@/components/desktop/programas/EsteComputador";
import LeiaMe from "@/components/desktop/programas/LeiaMe";
import Lixeira from "@/components/desktop/programas/Lixeira";
import Alvos from "@/components/desktop/programas/Alvos";
import Invasor, { type PayloadInvasor } from "@/components/desktop/programas/Invasor";
import Historico from "@/components/desktop/programas/Historico";
import Ssh from "@/components/desktop/programas/Ssh";

export type ProgramaId =
  | "computador"
  | "leiame"
  | "lixeira"
  | "alvos"
  | "invasor"
  | "historico"
  | "ssh";

const PROGRAMAS: Record<
  ProgramaId,
  { rotuloIcone: string; titulo: string; icone: string; largura: number; altura: number }
> = {
  computador: {
    rotuloIcone: "Este Computador",
    titulo: "Este Computador",
    icone: "💻",
    largura: 380,
    altura: 340,
  },
  leiame: {
    rotuloIcone: "Leia-me",
    titulo: "leia-me.txt — Bloco de Notas",
    icone: "📄",
    largura: 420,
    altura: 320,
  },
  lixeira: {
    rotuloIcone: "Lixeira",
    titulo: "Lixeira",
    icone: "🗑️",
    largura: 300,
    altura: 220,
  },
  alvos: {
    rotuloIcone: "Alvos",
    titulo: "Alvos — Servidores na Rede",
    icone: "⚡",
    largura: 380,
    altura: 420,
  },
  invasor: {
    // Sem ícone no desktop (ver ORDEM_ICONES) — só abre de dentro de "Alvos".
    rotuloIcone: "Invasor",
    titulo: "Invasor — Painel de Ataque",
    icone: "🎯",
    largura: 520,
    altura: 420,
  },
  historico: {
    rotuloIcone: "Histórico",
    titulo: "Histórico — Registro de Invasões",
    icone: "📜",
    largura: 380,
    altura: 420,
  },
  ssh: {
    // Programa único e genérico — conecta em qualquer alvo via "ssh
    // usuario@host" (node-alpha ou o IP do próprio servidor), igual um
    // terminal de verdade. Reaproveita o ícone que já era do "Terminal".
    rotuloIcone: "Terminal",
    titulo: "Terminal — Deck Pessoal",
    icone: "🖥️",
    largura: 560,
    altura: 420,
  },
};

// Ordem de exibição dos ícones no desktop. "invasor" fica de fora de
// propósito: não é algo que se clica direto, só abre como resultado de
// invadir alguém dentro de "Alvos".
const ORDEM_ICONES: ProgramaId[] = [
  "ssh",
  "computador",
  "alvos",
  "historico",
  "leiame",
  "lixeira",
];

type EstadoDesktop = {
  janelas: JanelaEstado[];
  proximoZ: number;
};

type AcaoDesktop =
  | { tipo: "abrir"; programaId: ProgramaId; payload?: unknown }
  | { tipo: "fechar"; id: string }
  | { tipo: "focar"; id: string }
  | { tipo: "minimizar"; id: string }
  | { tipo: "restaurar"; id: string }
  | { tipo: "mover"; id: string; x: number; y: number }
  | { tipo: "redimensionar"; id: string; largura: number; altura: number }
  | { tipo: "organizar"; larguraArea: number };

const ESTADO_INICIAL: EstadoDesktop = { janelas: [], proximoZ: 10 };

// Cada ação nasce de um evento discreto do usuário (clicar num ícone, na
// taskbar, arrastar) — sem efeitos escondidos, fácil de seguir o estado.
function reduzirDesktop(estado: EstadoDesktop, acao: AcaoDesktop): EstadoDesktop {
  switch (acao.tipo) {
    case "abrir": {
      const existente = estado.janelas.find((j) => j.id === acao.programaId);
      const z = estado.proximoZ;
      if (existente) {
        return {
          proximoZ: z + 1,
          // payload novo substitui o antigo (é assim que "invadir outro
          // alvo" reaproveita a mesma janela "Invasor"); sem payload novo,
          // mantém o que já tinha.
          janelas: estado.janelas.map((j) =>
            j.id === acao.programaId
              ? { ...j, minimizada: false, zIndex: z, payload: acao.payload ?? j.payload }
              : j,
          ),
        };
      }
      const p = PROGRAMAS[acao.programaId];
      const n = estado.janelas.length;
      const yMaximo = Math.max(0, ALTURA_DESKTOP - ALTURA_RESERVADA_TASKBAR - p.altura);
      const nova: JanelaEstado = {
        id: acao.programaId,
        titulo: p.titulo,
        icone: p.icone,
        // Longe o suficiente da coluna de ícones (top:16/left:16, ~76px de
        // largura) pra não cobri-la assim que a primeira janela abre.
        x: 140 + n * 32,
        // Limitado pra não nascer com o rodapé embaixo da taskbar.
        y: Math.min(40 + n * 32, yMaximo),
        largura: p.largura,
        altura: p.altura,
        zIndex: z,
        minimizada: false,
        payload: acao.payload,
      };
      return { proximoZ: z + 1, janelas: [...estado.janelas, nova] };
    }
    case "fechar":
      return { ...estado, janelas: estado.janelas.filter((j) => j.id !== acao.id) };
    case "focar":
      return {
        proximoZ: estado.proximoZ + 1,
        janelas: estado.janelas.map((j) =>
          j.id === acao.id ? { ...j, zIndex: estado.proximoZ } : j,
        ),
      };
    case "minimizar":
      return {
        ...estado,
        janelas: estado.janelas.map((j) => (j.id === acao.id ? { ...j, minimizada: true } : j)),
      };
    case "restaurar":
      return {
        proximoZ: estado.proximoZ + 1,
        janelas: estado.janelas.map((j) =>
          j.id === acao.id ? { ...j, minimizada: false, zIndex: estado.proximoZ } : j,
        ),
      };
    case "mover":
      return {
        ...estado,
        janelas: estado.janelas.map((j) =>
          j.id === acao.id ? { ...j, x: acao.x, y: acao.y } : j,
        ),
      };
    case "redimensionar":
      return {
        ...estado,
        janelas: estado.janelas.map((j) =>
          j.id === acao.id ? { ...j, largura: acao.largura, altura: acao.altura } : j,
        ),
      };
    case "organizar": {
      const visiveis = estado.janelas.filter((j) => !j.minimizada);
      if (visiveis.length < 2) return estado;

      const MARGEM = 8;
      const alturaArea = ALTURA_DESKTOP - ALTURA_RESERVADA_TASKBAR;
      const colunas = Math.ceil(Math.sqrt(visiveis.length));
      const linhas = Math.ceil(visiveis.length / colunas);
      const celulaLargura = Math.max(
        LARGURA_MINIMA_JANELA,
        Math.floor((acao.larguraArea - MARGEM * (colunas + 1)) / colunas),
      );
      const celulaAltura = Math.max(
        ALTURA_MINIMA_JANELA,
        Math.floor((alturaArea - MARGEM * (linhas + 1)) / linhas),
      );

      const idsVisiveis = new Set(visiveis.map((j) => j.id));
      let i = 0;
      return {
        ...estado,
        janelas: estado.janelas.map((j) => {
          if (!idsVisiveis.has(j.id)) return j;
          const linha = Math.floor(i / colunas);
          const coluna = i % colunas;
          i++;
          return {
            ...j,
            x: MARGEM + coluna * (celulaLargura + MARGEM),
            y: MARGEM + linha * (celulaAltura + MARGEM),
            largura: celulaLargura,
            altura: celulaAltura,
          };
        }),
      };
    }
  }
}

export default function Desktop({
  equipados,
  velocidade,
}: {
  equipados: string[];
  velocidade: number;
}) {
  const geracao = geracaoPorNotebook(equipados);
  const [ligado, setLigado] = useState(false);
  const [estado, dispatch] = useReducer(reduzirDesktop, ESTADO_INICIAL);
  const desktopRef = useRef<HTMLDivElement>(null);

  if (!ligado) {
    return <BootScreen geracao={geracao} velocidade={velocidade} aoConcluir={() => setLigado(true)} />;
  }

  const janelaAtiva =
    [...estado.janelas]
      .filter((j) => !j.minimizada)
      .sort((a, b) => b.zIndex - a.zIndex)[0]?.id ?? null;

  return (
    <div className="desktop" data-geracao={geracao} ref={desktopRef}>
      <div className="desktop-icones">
        {ORDEM_ICONES.map((id) => (
          <IconeDesktop
            key={id}
            rotulo={PROGRAMAS[id].rotuloIcone}
            icone={PROGRAMAS[id].icone}
            geracao={geracao}
            onAbrir={() => dispatch({ tipo: "abrir", programaId: id })}
          />
        ))}
      </div>

      {estado.janelas.map((j) => (
        <Janela
          key={j.id}
          janela={j}
          geracao={geracao}
          ativa={j.id === janelaAtiva}
          onFechar={() => dispatch({ tipo: "fechar", id: j.id })}
          onFocar={() => dispatch({ tipo: "focar", id: j.id })}
          onMinimizar={() => dispatch({ tipo: "minimizar", id: j.id })}
          onMover={(x, y) => dispatch({ tipo: "mover", id: j.id, x, y })}
          onRedimensionar={(largura, altura) =>
            dispatch({ tipo: "redimensionar", id: j.id, largura, altura })
          }
        >
          {j.id === "computador" && <EsteComputador geracao={geracao} />}
          {j.id === "leiame" && <LeiaMe geracao={geracao} />}
          {j.id === "lixeira" && <Lixeira geracao={geracao} />}
          {j.id === "alvos" && (
            <Alvos
              onAbrirInvasor={(payload) =>
                dispatch({ tipo: "abrir", programaId: "invasor", payload })
              }
            />
          )}
          {j.id === "invasor" && Boolean(j.payload) && (
            <Invasor
              key={(j.payload as PayloadInvasor).duelId}
              payload={j.payload as PayloadInvasor}
            />
          )}
          {j.id === "historico" && <Historico />}
          {j.id === "ssh" && <Ssh velocidade={velocidade} />}
        </Janela>
      ))}

      <Taskbar
        janelas={estado.janelas}
        geracao={geracao}
        janelaAtivaId={janelaAtiva}
        programas={ORDEM_ICONES.map((id) => ({
          id,
          rotulo: PROGRAMAS[id].rotuloIcone,
          icone: PROGRAMAS[id].icone,
        }))}
        onAbrirPrograma={(id) => dispatch({ tipo: "abrir", programaId: id as ProgramaId })}
        onClicarJanela={(j) => {
          if (j.minimizada || j.id !== janelaAtiva) {
            dispatch({ tipo: "restaurar", id: j.id });
          } else {
            dispatch({ tipo: "minimizar", id: j.id });
          }
        }}
        onOrganizar={() =>
          dispatch({ tipo: "organizar", larguraArea: desktopRef.current?.clientWidth ?? 700 })
        }
      />
    </div>
  );
}
