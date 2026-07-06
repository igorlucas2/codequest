"use client";

import { useEffect, useReducer, useRef, useState, type MouseEvent } from "react";
import "@/app/desktop.css";
import { useToast } from "@/components/Toast";
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
import { lerLigadoSalvo, salvarLigado, lerEstadoSalvo, salvarEstado } from "@/components/desktop/persistenciaDesktop";
import EsteComputador from "@/components/desktop/programas/EsteComputador";
import LeiaMe from "@/components/desktop/programas/LeiaMe";
import Lixeira from "@/components/desktop/programas/Lixeira";
import Alvos from "@/components/desktop/programas/Alvos";
import Invasor, { type PayloadInvasor } from "@/components/desktop/programas/Invasor";
import Historico from "@/components/desktop/programas/Historico";
import Ssh from "@/components/desktop/programas/Ssh";
import Ide, { type IdeProgramaProps } from "@/components/desktop/programas/Ide";
import Projetos from "@/components/desktop/programas/Projetos";
import IconePastaDesktop from "@/components/desktop/IconePastaDesktop";
import PastaJanela from "@/components/desktop/PastaJanela";
import {
  lerPastasDesktop,
  salvarPastasDesktop,
  chavePastasDesktop,
  novoIdPasta,
  nomeUnicoPasta,
  type PastaDesktop,
} from "@/components/desktop/pastasDesktop";
import type { EntradaNotebook } from "@/lib/notebookWorkspace";

export type ProgramaId =
  | "computador"
  | "ide"
  | "projetos"
  | "leiame"
  | "lixeira"
  | "alvos"
  | "invasor"
  | "historico"
  | "ssh"
  // Janela genérica que hospeda UMA pasta do desktop por vez (payload =
  // { pastaId }), no mesmo molde do "invasor". Não entra em ORDEM_ICONES: só
  // abre ao dar duplo-clique num ícone de pasta.
  | "pasta";

const PROGRAMAS: Record<
  ProgramaId,
  { rotuloIcone: string; titulo: string; icone: string; largura: number; altura: number }
> = {
  computador: {
    rotuloIcone: "Este Computador",
    titulo: "Este Computador",
    icone: "💻",
    largura: 520,
    altura: 440,
  },
  ide: {
    rotuloIcone: "IDE",
    titulo: "CodeQuest IDE",
    icone: "⌨️",
    largura: 820,
    altura: 520,
  },
  projetos: {
    rotuloIcone: "Projetos",
    titulo: "Projetos — Arquivos do Notebook",
    icone: "📁",
    largura: 620,
    altura: 440,
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
  pasta: {
    rotuloIcone: "Pasta",
    titulo: "Pasta",
    icone: "📁",
    largura: 460,
    altura: 420,
  },
};

// Ordem de exibição dos ícones no desktop. "invasor" fica de fora de
// propósito: não é algo que se clica direto, só abre como resultado de
// invadir alguém dentro de "Alvos".
const ORDEM_ICONES: ProgramaId[] = [
  "ide",
  "projetos",
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

export type AcaoDesktop =
  | { tipo: "abrir"; programaId: ProgramaId; payload?: unknown; maximizada?: boolean }
  | { tipo: "fechar"; id: string }
  | { tipo: "focar"; id: string }
  | { tipo: "minimizar"; id: string }
  | { tipo: "restaurar"; id: string }
  | { tipo: "maximizar"; id: string }
  | { tipo: "mover"; id: string; x: number; y: number }
  | { tipo: "redimensionar"; id: string; largura: number; altura: number }
  | { tipo: "organizar"; larguraArea: number };

const ESTADO_INICIAL: EstadoDesktop = { janelas: [], proximoZ: 10 };

function ehEstadoDesktopValido(v: unknown): v is EstadoDesktop {
  if (typeof v !== "object" || v === null) return false;
  const e = v as Record<string, unknown>;
  return Array.isArray(e.janelas) && typeof e.proximoZ === "number";
}

function maximizarJanela(janela: JanelaEstado): JanelaEstado {
  return {
    ...janela,
    x: 8,
    y: 8,
    largura: 9999,
    altura: ALTURA_DESKTOP - ALTURA_RESERVADA_TASKBAR - 16,
    maximizada: true,
    restaurar: janela.maximizada
      ? janela.restaurar
      : {
          x: janela.x,
          y: janela.y,
          largura: janela.largura,
          altura: janela.altura,
        },
  };
}

function alternarMaximizada(janela: JanelaEstado): JanelaEstado {
  if (!janela.maximizada) return maximizarJanela(janela);

  const restaurar = janela.restaurar ?? {
    x: 140,
    y: 40,
    largura: Math.min(janela.largura, 820),
    altura: Math.min(janela.altura, 520),
  };

  return {
    ...janela,
    ...restaurar,
    maximizada: false,
    restaurar: undefined,
  };
}

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
              ? acao.maximizada
                ? maximizarJanela({
                    ...j,
                    minimizada: false,
                    zIndex: z,
                    payload: acao.payload ?? j.payload,
                  })
                : { ...j, minimizada: false, zIndex: z, payload: acao.payload ?? j.payload }
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
      return {
        proximoZ: z + 1,
        janelas: [...estado.janelas, acao.maximizada ? maximizarJanela(nova) : nova],
      };
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
    case "maximizar":
      return {
        proximoZ: estado.proximoZ + 1,
        janelas: estado.janelas.map((j) =>
          j.id === acao.id
            ? { ...alternarMaximizada(j), minimizada: false, zIndex: estado.proximoZ }
            : j,
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
            maximizada: false,
            restaurar: undefined,
          };
        }),
      };
    }
  }
}

export default function Desktop({
  equipados,
  velocidade,
  capacidadeRam = Infinity,
  chavePastas,
  programaInicial,
  programaInicialMaximizado = false,
  sempreLigado = false,
  usarEstadoSalvo = true,
  persistirEstado = true,
  ide,
}: {
  equipados: string[];
  velocidade: number;
  // Teto de apps abertos ao mesmo tempo (vem do nível de RAM). Padrão sem
  // limite pra usos do Desktop fora da página do Computador.
  capacidadeRam?: number;
  // Chave (ex.: `usuario-<id>`) que namespaceia as pastas do desktop no
  // localStorage. Sem ela, as pastas não persistem (usos efêmeros do Desktop).
  chavePastas?: string;
  programaInicial?: ProgramaId;
  programaInicialMaximizado?: boolean;
  sempreLigado?: boolean;
  usarEstadoSalvo?: boolean;
  persistirEstado?: boolean;
  ide?: IdeProgramaProps;
}) {
  const geracao = geracaoPorNotebook(equipados);
  const { mostrar } = useToast();
  const [ligado, setLigado] = useState(() => (sempreLigado ? true : lerLigadoSalvo()));
  const [estado, dispatch] = useReducer(
    reduzirDesktop,
    ESTADO_INICIAL,
    (inicial) => (usarEstadoSalvo ? lerEstadoSalvo(ehEstadoDesktopValido) ?? inicial : inicial),
  );
  const desktopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sempreLigado) salvarLigado(ligado);
  }, [ligado, sempreLigado]);
  useEffect(() => {
    if (persistirEstado) salvarEstado(estado);
  }, [estado, persistirEstado]);
  useEffect(() => {
    if (!ligado || !programaInicial) return;
    if (estado.janelas.some((j) => j.id === programaInicial)) return;
    dispatch({
      tipo: "abrir",
      programaId: programaInicial,
      maximizada: programaInicialMaximizado,
    });
  }, [ligado, programaInicial, programaInicialMaximizado, estado.janelas]);

  // --- Pastas da área de trabalho: duráveis (localStorage por usuário), fora
  // do estado de janelas que vive em sessionStorage e some no logout. ---
  const [pastas, setPastas] = useState<PastaDesktop[]>(() =>
    chavePastas ? lerPastasDesktop(chavePastasDesktop(chavePastas)) : [],
  );
  const [menuDesktop, setMenuDesktop] = useState<{ x: number; y: number } | null>(null);
  const menuDesktopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chavePastas) salvarPastasDesktop(chavePastasDesktop(chavePastas), pastas);
  }, [pastas, chavePastas]);

  useEffect(() => {
    if (!menuDesktop) return;
    function aoClicarFora(e: PointerEvent) {
      if (menuDesktopRef.current && !menuDesktopRef.current.contains(e.target as Node)) {
        setMenuDesktop(null);
      }
    }
    document.addEventListener("pointerdown", aoClicarFora);
    return () => document.removeEventListener("pointerdown", aoClicarFora);
  }, [menuDesktop]);

  function criarPastaDesktop() {
    setPastas((atuais) => [
      ...atuais,
      { id: novoIdPasta(), nome: nomeUnicoPasta(atuais), entradas: [] },
    ]);
    setMenuDesktop(null);
  }
  function renomearPasta(id: string, nome: string) {
    setPastas((atuais) => atuais.map((p) => (p.id === id ? { ...p, nome } : p)));
  }
  function excluirPasta(id: string) {
    setPastas((atuais) => atuais.filter((p) => p.id !== id));
    // Se a janela de pasta estava mostrando justamente esta, fecha.
    const janelaPasta = estado.janelas.find((j) => j.id === "pasta");
    if (janelaPasta && (janelaPasta.payload as { pastaId?: string })?.pastaId === id) {
      dispatch({ tipo: "fechar", id: "pasta" });
    }
  }
  function atualizarEntradasPasta(id: string, entradas: EntradaNotebook[]) {
    setPastas((atuais) => atuais.map((p) => (p.id === id ? { ...p, entradas } : p)));
  }
  function abrirPasta(id: string) {
    dispatch({ tipo: "abrir", programaId: "pasta", payload: { pastaId: id } });
  }

  // Menu de contexto do fundo da área de trabalho ("Nova pasta"). Ignora
  // cliques sobre janelas e ícones — esses têm o próprio comportamento.
  function aoContextMenuDesktop(e: MouseEvent<HTMLDivElement>) {
    const alvo = e.target as HTMLElement;
    if (alvo.closest(".janela") || alvo.closest(".menu-popup-ancora")) return;
    e.preventDefault();
    const rect = desktopRef.current?.getBoundingClientRect();
    setMenuDesktop({ x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) });
  }

  // Abertura guardada pelo teto de RAM: só bloqueia abrir um app NOVO quando já
  // se está no limite de apps abertos (reabrir/focar um já aberto sempre passa).
  // Fluxos internos (Alvos→Invasor, Projetos→IDE) e a auto-abertura usam
  // dispatch direto de propósito, pra não travar no meio de uma ação.
  function abrirPrograma(programaId: ProgramaId) {
    const jaAberto = estado.janelas.some((j) => j.id === programaId);
    if (!jaAberto && estado.janelas.length >= capacidadeRam) {
      mostrar(
        `Memória cheia (${estado.janelas.length}/${capacidadeRam} apps). Feche um app ou instale mais RAM.`,
        "erro",
      );
      return;
    }
    dispatch({ tipo: "abrir", programaId });
  }

  if (!ligado) {
    return <BootScreen geracao={geracao} velocidade={velocidade} aoConcluir={() => setLigado(true)} />;
  }

  const janelaAtiva =
    [...estado.janelas]
      .filter((j) => !j.minimizada)
      .sort((a, b) => b.zIndex - a.zIndex)[0]?.id ?? null;

  return (
    <div
      className="desktop"
      data-geracao={geracao}
      ref={desktopRef}
      onContextMenu={aoContextMenuDesktop}
    >
      <div className="desktop-icones">
        {ORDEM_ICONES.map((id) => (
          <IconeDesktop
            key={id}
            rotulo={PROGRAMAS[id].rotuloIcone}
            icone={PROGRAMAS[id].icone}
            geracao={geracao}
            onAbrir={() => abrirPrograma(id)}
          />
        ))}
        {pastas.map((p) => (
          <IconePastaDesktop
            key={p.id}
            pasta={p}
            geracao={geracao}
            onAbrir={() => abrirPasta(p.id)}
            onRenomear={(nome) => renomearPasta(p.id, nome)}
            onExcluir={() => excluirPasta(p.id)}
          />
        ))}
      </div>

      {menuDesktop && (
        <div
          ref={menuDesktopRef}
          className={`menu-popup menu-popup--${geracao}`}
          style={{ position: "absolute", left: menuDesktop.x, top: menuDesktop.y, zIndex: 9000 }}
        >
          <button
            className={`menu-popup-item menu-popup-item--${geracao}`}
            onClick={criarPastaDesktop}
          >
            Nova pasta
          </button>
        </div>
      )}

      {estado.janelas.map((j) => (
        <Janela key={j.id} janela={j} geracao={geracao} ativa={j.id === janelaAtiva} dispatch={dispatch}>
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
          {j.id === "ide" && <Ide {...ide} />}
          {j.id === "projetos" && (
            <Projetos
              workspaceId={ide?.workspaceId}
              arquivoInicial={ide?.arquivoInicial}
              readmeInicial={ide?.readmeInicial}
              onAbrirIde={() => dispatch({ tipo: "abrir", programaId: "ide" })}
            />
          )}
          {j.id === "pasta" &&
            (() => {
              const pastaId = (j.payload as { pastaId?: string })?.pastaId;
              const alvo = pastas.find((p) => p.id === pastaId);
              return alvo ? (
                <PastaJanela
                  pasta={alvo}
                  aoAtualizar={(entradas) => atualizarEntradasPasta(alvo.id, entradas)}
                />
              ) : (
                <p className="p-4 text-sm text-texto-suave">Pasta removida.</p>
              );
            })()}
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
        onAbrirPrograma={(id) => abrirPrograma(id as ProgramaId)}
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
