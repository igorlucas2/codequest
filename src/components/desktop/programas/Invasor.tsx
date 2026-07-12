"use client";

import { useEffect, useMemo, useReducer, useRef } from "react";
import { motion } from "framer-motion";
import CyberAvatar from "@/components/CyberAvatar";
import ServidorRack from "@/components/ServidorRack";
import { useSessao } from "@/components/Sessao";
import { normalizar } from "@/lib/texto";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { tocarAcerto, tocarErro, tocarVitoria, tocarDerrota } from "@/lib/som";
import { getServidorTier, type ServidorTierId } from "@/content/servidores";
import type { Ficha } from "@/content/classes";
import type { Turno } from "@/lib/combate";
import "./invasor.css";

type Lado = {
  id: number;
  nome: string;
  ficha: Ficha;
  vida: number;
  ataque: number;
  defesa: number;
  servidorTier: ServidorTierId;
};

export type Rodada = { resposta: string; limiteMs: number };

// Proposta devolvida por POST /api/arena/duelar: as rodadas ainda não foram
// jogadas, o resultado ainda não existe.
export type PropostaDuelo = {
  duelId: number;
  voce: Lado;
  oponente: Lado;
  rounds: Rodada[];
};

export type ResultadoDuelo = {
  voce: Lado;
  oponente: Lado;
  turnos: Turno[];
  vencedorId: number;
  voceGanhou: boolean;
  moedasGanhas: number;
  itemDesbloqueado: { id: string; nome: string; icone: string } | null;
};

// duelId marca cada ataque; Desktop.tsx usa key={duelId} pra remontar este
// componente do zero a cada novo alvo, sem precisar de lógica de reset aqui.
export type PayloadInvasor = {
  duelId: number;
  proposta: PropostaDuelo;
};

type RespostaRodada = { texto: string; elapsedMs: number };
type Fase = "briefing" | "rodada" | "sincronizando" | "resultado" | "erro";

type EstadoInvasao = {
  fase: Fase;
  rounds: Rodada[];
  indice: number;
  respostas: RespostaRodada[];
  restanteMs: number;
  texto: string;
  feedback: "acerto" | "erro" | null;
  motivoFalha: "tempo" | "comando" | null;
  inicioTs: number;
  resultado: ResultadoDuelo | null;
  mensagemErro: string | null;
};

type AcaoInvasao =
  | { tipo: "iniciar" }
  | { tipo: "tick"; agora: number }
  | { tipo: "digitar"; valor: string }
  | { tipo: "enviar_rodada"; agora: number }
  | { tipo: "confirmar_sucesso"; resultado: ResultadoDuelo }
  | { tipo: "confirmar_erro"; mensagem: string };

function registrarRodada(
  estado: EstadoInvasao,
  resposta: RespostaRodada,
  agora: number,
  feedback: "acerto" | "erro",
  motivoFalha: "tempo" | "comando" | null = null,
): EstadoInvasao {
  const respostas = [...estado.respostas, resposta];
  const proximoIndice = estado.indice + 1;
  if (proximoIndice >= estado.rounds.length) {
    return { ...estado, respostas, fase: "sincronizando", feedback, motivoFalha, texto: "" };
  }
  return {
    ...estado,
    respostas,
    indice: proximoIndice,
    texto: "",
    feedback,
    motivoFalha,
    restanteMs: estado.rounds[proximoIndice].limiteMs,
    inicioTs: agora,
  };
}

function reduzir(estado: EstadoInvasao, acao: AcaoInvasao): EstadoInvasao {
  if (acao.tipo === "iniciar") {
    if (estado.fase !== "briefing") return estado;
    return {
      ...estado,
      fase: "rodada",
      indice: 0,
      texto: "",
      feedback: null,
      restanteMs: estado.rounds[0]?.limiteMs ?? 0,
      inicioTs: Date.now(),
    };
  }
  if (acao.tipo === "confirmar_sucesso") {
    if (estado.fase !== "sincronizando") return estado;
    return { ...estado, fase: "resultado", resultado: acao.resultado };
  }
  if (acao.tipo === "confirmar_erro") {
    if (estado.fase !== "sincronizando") return estado;
    return { ...estado, fase: "erro", mensagemErro: acao.mensagem };
  }
  if (estado.fase !== "rodada") return estado;

  switch (acao.tipo) {
    case "tick": {
      const rodada = estado.rounds[estado.indice];
      const restante = rodada.limiteMs - (acao.agora - estado.inicioTs);
      if (restante <= 0) {
        return registrarRodada(
          estado,
          { texto: estado.texto, elapsedMs: acao.agora - estado.inicioTs },
          acao.agora,
          "erro",
          "tempo",
        );
      }
      return { ...estado, restanteMs: restante };
    }
    case "digitar":
      return { ...estado, texto: acao.valor };
    case "enviar_rodada": {
      const rodada = estado.rounds[estado.indice];
      const elapsedMs = acao.agora - estado.inicioTs;
      const acertouLocal = normalizar(estado.texto) === normalizar(rodada.resposta);
      return registrarRodada(
        estado,
        { texto: estado.texto, elapsedMs },
        acao.agora,
        acertouLocal ? "acerto" : "erro",
        acertouLocal ? null : "comando",
      );
    }
    default:
      return estado;
  }
}

function dicaSintaxe(resposta: string): string {
  const limpa = resposta.trim();
  if (limpa.startsWith("print(")) return "Parece uma chamada de função: preserve print(...), aspas e parênteses.";
  if (limpa.startsWith("if ")) return "Parece uma condição: confira os dois pontos no final e a indentação.";
  if (limpa.startsWith("for ")) return "Parece um loop: preserve range(...), o nome da variável e os dois pontos.";
  if (limpa.startsWith("def ")) return "Parece uma definição de função: mantenha o nome, parênteses e os dois pontos.";
  if (limpa.includes("=")) return "Parece uma atribuição: confira o nome da variável, o espaço e o valor exato.";
  return "Copie a sintaxe exatamente como aparece, inclusive espaços e caracteres especiais.";
}

// Invasão PvP: digitação cronometrada decide o duelo de verdade. Fases:
// digitar as rodadas -> sincronizar com o servidor (que recalcula tudo e não
// confia no que o cliente alega) -> revelar/mostrar o resultado real.
export default function Invasor({ payload }: { payload: PayloadInvasor }) {
  const { proposta } = payload;
  const { voce, oponente, rounds } = proposta;
  const { recarregar } = useSessao();
  const inputRef = useRef<HTMLInputElement>(null);

  const briefing = useMemo(() => {
    const mediaSegundos = rounds.length
      ? Math.round(rounds.reduce((soma, rodada) => soma + rodada.limiteMs, 0) / rounds.length / 100) / 10
      : 0;
    return {
      rodadas: rounds.length,
      tempoMedio: mediaSegundos,
    };
  }, [rounds]);

  const [estado, dispatch] = useReducer(reduzir, rounds, (rounds): EstadoInvasao => ({
    fase: "briefing",
    rounds,
    indice: 0,
    respostas: [],
    restanteMs: rounds[0]?.limiteMs ?? 0,
    texto: "",
    feedback: null,
    motivoFalha: null,
    inicioTs: Date.now(),
    resultado: null,
    mensagemErro: null,
  }));

  useEffect(() => {
    if (estado.fase !== "rodada") return;
    inputRef.current?.focus();
  }, [estado.fase, estado.indice]);

  // Relógio único da rodada: só assina o timer (sistema externo); quem
  // decide o que muda a cada tick é o reducer.
  useEffect(() => {
    if (estado.fase !== "rodada") return;
    const id = setInterval(() => dispatch({ tipo: "tick", agora: Date.now() }), 100);
    return () => clearInterval(id);
  }, [estado.fase]);

  // Feedback sonoro (cosmético, client-side): toca a cada rodada encerrada.
  // Usa o tamanho de "respostas" (cresce 1 a 1, sempre) como gatilho — não
  // "indice", que fica parado na última rodada (a que leva a "sincronizando"),
  // e não dispararia de novo se o resultado repetisse o da rodada anterior.
  useEffect(() => {
    if (estado.respostas.length === 0) return;
    if (estado.feedback === "acerto") tocarAcerto();
    else if (estado.feedback === "erro") tocarErro();
  }, [estado.respostas.length, estado.feedback]);

  // Ao completar as rodadas, sincroniza com o servidor (única fonte de
  // verdade do resultado) e recarrega moedas se a invasão valer prêmio.
  useEffect(() => {
    if (estado.fase !== "sincronizando") return;
    let cancelado = false;
    fetch("/api/arena/duelar/confirmar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        duelId: payload.duelId,
        rodadas: estado.respostas.map((r) => ({ texto: r.texto, elapsedMs: r.elapsedMs })),
      }),
    })
      .then(async (r) => {
        const d = await r.json();
        if (cancelado) return;
        if (r.ok) {
          dispatch({ tipo: "confirmar_sucesso", resultado: d });
          await recarregar();
        } else {
          dispatch({ tipo: "confirmar_erro", mensagem: d.erro ?? "Falha ao confirmar a invasão." });
        }
      })
      .catch(() => {
        if (!cancelado) dispatch({ tipo: "confirmar_erro", mensagem: "Falha de conexão com o servidor." });
      });
    return () => {
      cancelado = true;
    };
  }, [estado.fase, estado.respostas, payload.duelId, recarregar]);

  if (estado.fase === "erro") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm">
        <p className="text-lg">⚠️</p>
        <p className="text-erro">{estado.mensagemErro}</p>
        <p className="text-xs text-texto-suave">Feche esta janela e tente invadir de novo.</p>
      </div>
    );
  }

  if (estado.fase === "resultado" && estado.resultado) {
    return <Replay resultado={estado.resultado} />;
  }

  if (estado.fase === "briefing") {
    return (
      <div className="flex h-full flex-col gap-3 text-sm">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <Lutador lado={voce} hp={voce.vida} />
          <span className="text-lg font-black text-erro">VS</span>
          <Lutador lado={oponente} hp={oponente.vida} espelhado />
        </div>

        <div className="rounded-xl border border-borda bg-black/40 p-3 text-xs text-texto-suave">
          <p className="text-sm font-semibold text-texto">Antes de entrar</p>
          <p className="mt-1">{briefing.rodadas} rodadas, uma por vez, com tempo curto e crescente pressão.</p>
          <p className="mt-1 text-esmeralda">
            Regra: copie o comando exatamente como aparece e pressione Enter.
          </p>
          <p className="mt-1">Tempo médio desta invasão: cerca de {briefing.tempoMedio}s por rodada.</p>
        </div>

        <div className="codigo rounded-xl border border-esmeralda/30 bg-black/70 p-3 text-center text-esmeralda">
          <p className="text-xs uppercase tracking-[0.2em] text-esmeralda/60">modo invasão</p>
          <p className="mt-2 text-base font-bold">Seu alvo é {oponente.nome}.</p>
          <p className="mt-1 text-xs text-texto-suave">Leia com calma. Quando começar, o relógio não espera.</p>
          <p className="mt-2 text-xs text-esmeralda/80">Dica geral: {dicaSintaxe(rounds[0]?.resposta ?? "")}</p>
        </div>

        <button
          type="button"
          onClick={() => dispatch({ tipo: "iniciar" })}
          className="rounded-lg bg-esmeralda px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90"
        >
          Iniciar invasão
        </button>
      </div>
    );
  }

  if (estado.fase === "sincronizando") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm">
        <p className="animate-pulse text-esmeralda">sincronizando com o servidor da Rede...</p>
      </div>
    );
  }

  const rodada = estado.rounds[estado.indice];
  const pctTempo = Math.max(0, Math.min(100, (estado.restanteMs / rodada.limiteMs) * 100));

  return (
    <div className="flex h-full flex-col gap-3 text-sm">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <Lutador lado={voce} hp={voce.vida} />
        <span className="text-lg font-black text-erro">VS</span>
        <Lutador lado={oponente} hp={oponente.vida} espelhado />
      </div>

      <div className="flex items-center justify-between text-xs text-texto-suave">
        <span>
          Rodada {estado.indice + 1}/{estado.rounds.length}
        </span>
        {estado.feedback && (
          <span className={estado.feedback === "acerto" ? "text-sucesso" : "text-erro"}>
            {estado.feedback === "acerto"
              ? "✅ comando aceito"
              : estado.motivoFalha === "tempo"
                ? "⏱️ tempo esgotado"
                : "❌ comando inválido"}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-texto-suave">
        <span>Digite exatamente e pressione Enter.</span>
        <span>{Math.max(0, Math.ceil(estado.restanteMs / 1000))}s</span>
      </div>

      {estado.feedback === "erro" && estado.motivoFalha === "comando" && (
        <p className="rounded-lg border border-ouro/30 bg-ouro/10 px-3 py-2 text-xs text-ouro">
          {dicaSintaxe(rodada.resposta)}
        </p>
      )}

      {estado.feedback === "erro" && estado.motivoFalha === "tempo" && (
        <p className="rounded-lg border border-erro/30 bg-erro/10 px-3 py-2 text-xs text-erro">
          Você ficou sem tempo. Leia primeiro o formato do comando, depois digite.
        </p>
      )}

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-fundo">
        <div
          className={`h-full rounded-full transition-all ${
            pctTempo > 50 ? "bg-esmeralda" : pctTempo > 20 ? "bg-ouro" : "bg-erro"
          }`}
          style={{ width: `${pctTempo}%` }}
        />
      </div>

      <div
        key={`cmd-${estado.indice}`}
        className={`codigo rounded-xl border border-esmeralda/30 bg-black/70 p-3 text-center text-esmeralda ${
          estado.feedback === "acerto"
            ? "invasor-flash--acerto"
            : estado.feedback === "erro"
              ? "invasor-flash--erro"
              : ""
        }`}
      >
        {rodada.resposta}
      </div>

      <input
        ref={inputRef}
        value={estado.texto}
        onChange={(e) => dispatch({ tipo: "digitar", valor: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === "Enter") dispatch({ tipo: "enviar_rodada", agora: Date.now() });
        }}
        placeholder="digite o comando..."
        spellCheck={false}
        autoComplete="off"
        className="codigo w-full rounded-lg border border-esmeralda/40 bg-black/50 px-3 py-2 text-esmeralda outline-none placeholder:text-esmeralda/30 focus:border-esmeralda"
      />

      <p className="text-center text-xs text-texto-suave">
        Dica: se o comando tiver espaços, sublinhados ou parênteses, copie tudo sem alterar a sintaxe.
      </p>
    </div>
  );
}

const VELOCIDADE_TURNO_MS = 650;

type EstadoNarracao = {
  turnos: Turno[];
  idxRevelado: number;
  hp: Record<number, number>;
  terminado: boolean;
};

type AcaoNarracao = { tipo: "tick" } | { tipo: "pular" };

function reduzirNarracao(estado: EstadoNarracao, acao: AcaoNarracao): EstadoNarracao {
  if (estado.terminado) return estado;
  if (acao.tipo === "pular") {
    const hp = { ...estado.hp };
    for (const t of estado.turnos) hp[t.defensorId] = t.vidaDefensor;
    return { ...estado, idxRevelado: estado.turnos.length, hp, terminado: true };
  }
  if (estado.idxRevelado >= estado.turnos.length) {
    return { ...estado, terminado: true };
  }
  const t = estado.turnos[estado.idxRevelado];
  const idx = estado.idxRevelado + 1;
  return {
    ...estado,
    idxRevelado: idx,
    hp: { ...estado.hp, [t.defensorId]: t.vidaDefensor },
    terminado: idx >= estado.turnos.length,
  };
}

// Replay do duelo já resolvido pelo servidor: narra turno a turno (estilo
// terminal) o que realmente aconteceu, antes de mostrar o resultado final.
function Replay({ resultado }: { resultado: ResultadoDuelo }) {
  const { voce, oponente, turnos } = resultado;
  const reduzido = usePrefersReducedMotion();

  const [estado, dispatch] = useReducer(reduzirNarracao, {
    turnos,
    idxRevelado: 0,
    hp: { [voce.id]: voce.vida, [oponente.id]: oponente.vida },
    terminado: turnos.length === 0,
  });

  useEffect(() => {
    if (estado.terminado) return;
    const id = setInterval(() => dispatch({ tipo: "tick" }), VELOCIDADE_TURNO_MS);
    return () => clearInterval(id);
  }, [estado.terminado]);

  useEffect(() => {
    if (!estado.terminado) return;
    if (resultado.voceGanhou) tocarVitoria();
    else tocarDerrota();
  }, [estado.terminado, resultado.voceGanhou]);

  const nomePor = (id: number) => (id === voce.id ? voce.nome : oponente.nome);

  return (
    <div className="flex h-full flex-col gap-3 text-sm">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <Lutador lado={voce} hp={estado.hp[voce.id]} />
        <span className="text-lg font-black text-erro">VS</span>
        <Lutador lado={oponente} hp={estado.hp[oponente.id]} espelhado />
      </div>

      <div className="codigo flex-1 overflow-y-auto rounded-xl border border-esmeralda/30 bg-black/70 p-3 text-xs text-esmeralda">
        {turnos.slice(0, estado.idxRevelado).map((t, i) => (
          <p key={i} className="whitespace-pre-wrap">
            {nomePor(t.atacanteId)} lançou um exploit e causou {t.dano} de dano na integridade!
          </p>
        ))}
        {!estado.terminado && (
          <p className="animate-pulse text-esmeralda/50">processando próximo turno...</p>
        )}
      </div>

      {estado.terminado ? (
        <motion.div
          className="text-center"
          initial={reduzido ? false : { opacity: 0, scale: resultado.voceGanhou ? 0.7 : 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={
            reduzido
              ? { duration: 0 }
              : resultado.voceGanhou
                ? { type: "spring", stiffness: 340, damping: 14 }
                : { duration: 0.25, ease: "easeOut" }
          }
        >
          <p
            className={`text-lg font-extrabold ${
              resultado.voceGanhou ? "text-sucesso" : "text-erro"
            }`}
          >
            {resultado.voceGanhou ? "🏆 Invasão concluída!" : "💀 Você foi ejetado..."}
          </p>
          {resultado.moedasGanhas > 0 ? (
            <p className="text-ouro">+{resultado.moedasGanhas} ◈</p>
          ) : resultado.voceGanhou ? (
            <p className="text-xs text-texto-suave">
              (Sem créditos: você já invadiu este runner há pouco.)
            </p>
          ) : (
            <p className="text-xs text-texto-suave">
              Estude mais e melhore seu cyberware para vencer!
            </p>
          )}
          {resultado.itemDesbloqueado && (
            <motion.p
              className="mt-2 text-sm font-semibold text-destaque"
              initial={reduzido ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduzido ? 0 : 0.2, delay: reduzido ? 0 : 0.25 }}
            >
              🎁 Item exclusivo desbloqueado: {resultado.itemDesbloqueado.icone} {resultado.itemDesbloqueado.nome}!
            </motion.p>
          )}
        </motion.div>
      ) : (
        <button
          onClick={() => dispatch({ tipo: "pular" })}
          className="text-xs text-texto-suave hover:text-texto"
        >
          Pular animação →
        </button>
      )}
    </div>
  );
}

function Lutador({ lado, hp, espelhado = false }: { lado: Lado; hp: number; espelhado?: boolean }) {
  const capacidadeTier = getServidorTier(lado.servidorTier)?.capacidade ?? 2;
  const pct = Math.max(0, Math.min(100, (hp / lado.vida) * 100));
  return (
    <div className="flex flex-col items-center gap-1">
      <CyberAvatar
        classe={lado.ficha.classe}
        corPele={lado.ficha.corPele}
        corPrincipal={lado.ficha.corPrincipal}
        avatarModo={lado.ficha.avatarModo}
        fotoUrl={lado.ficha.fotoUrl}
        tamanho={56}
        className={`${espelhado ? "-scale-x-100" : ""} rounded-lg`}
      />
      <p className="max-w-[100px] truncate text-xs font-semibold">{lado.nome}</p>
      <ServidorRack
        tier={lado.servidorTier}
        capacidadeUsada={capacidadeTier}
        capacidadeTotal={capacidadeTier}
        tamanho={32}
      />
      <div className="h-2 w-full max-w-[100px] overflow-hidden rounded-full bg-fundo">
        <div
          className={`h-full rounded-full transition-all ${
            pct > 50 ? "bg-sucesso" : pct > 20 ? "bg-ouro" : "bg-erro"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-texto-suave">
        {hp}/{lado.vida} 🧬
      </p>
    </div>
  );
}
