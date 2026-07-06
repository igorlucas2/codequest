"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { intervaloDigitacaoMs, atrasoConexaoMs } from "@/lib/velocidade";

export type LinhaTerminal = {
  texto: string;
  tipo?: "comando" | "saida" | "sucesso" | "erro" | "info" | "limpar";
};

// Sentinela: onComando pode retornar isto pra limpar a tela (como o "clear" de
// um terminal de verdade), em vez de acrescentar linhas ao histórico.
export const LIMPAR_TERMINAL: LinhaTerminal[] = [{ texto: "", tipo: "limpar" }];

export const CORES: Record<NonNullable<LinhaTerminal["tipo"]>, string> = {
  comando: "text-esmeralda",
  saida: "text-texto",
  sucesso: "text-esmeralda",
  erro: "text-erro",
  info: "text-ouro",
  limpar: "text-texto",
};

const DURACAO_BOOT_MS = 500;

function esperar(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

type LinhaDigitando = { texto: string; tipo: LinhaTerminal["tipo"]; mostrado: number };

type EstadoTerminal = {
  historico: LinhaTerminal[];
  fila: LinhaTerminal[];
  digitando: LinhaDigitando | null;
};

type AcaoTerminal =
  | { tipo: "comando_echo"; texto: string }
  | { tipo: "enfileirar"; linhas: LinhaTerminal[] }
  | { tipo: "resetar"; linhas: LinhaTerminal[] }
  | { tipo: "tick" };

// Máquina de estados da "digitação": a cada tick, ou avança os caracteres
// mostrados da linha atual, ou (quando ela termina) a move pro histórico e
// puxa a próxima da fila. Fica tudo num reducer pra evitar setState em cascata
// dentro de efeitos (cada mudança nasce de uma única ação discreta).
function reduzir(estado: EstadoTerminal, acao: AcaoTerminal): EstadoTerminal {
  switch (acao.tipo) {
    case "comando_echo":
      return {
        ...estado,
        historico: [...estado.historico, { texto: acao.texto, tipo: "comando" }],
      };
    case "enfileirar":
      return { ...estado, fila: [...estado.fila, ...acao.linhas] };
    case "resetar":
      return { historico: [], fila: acao.linhas, digitando: null };
    case "tick": {
      const { digitando, fila, historico } = estado;
      if (digitando) {
        if (digitando.mostrado >= digitando.texto.length) {
          return {
            ...estado,
            historico: [...historico, { texto: digitando.texto, tipo: digitando.tipo }],
            digitando: null,
          };
        }
        return {
          ...estado,
          digitando: {
            ...digitando,
            mostrado: Math.min(digitando.texto.length, digitando.mostrado + 2),
          },
        };
      }
      if (fila.length > 0) {
        const [proxima, ...resto] = fila;
        return { ...estado, fila: resto, digitando: { texto: proxima.texto, tipo: proxima.tipo, mostrado: 0 } };
      }
      return estado;
    }
  }
}

// Terminal de "PC invadido" estilo Deus Ex: histórico de linhas + prompt onde o
// jogador digita comandos. As respostas do `onComando` são exibidas com efeito
// de digitação (como um sistema remoto realmente respondendo), e as linhas
// iniciais tocam como uma sequência de boot/conexão. O componente só cuida da
// UI/histórico; quem decide o que cada comando faz é o `onComando` do
// chamador (fase de código real ou puzzle de invasão com comandos fictícios).
export default function Terminal({
  linhasIniciais = [],
  prompt = ">",
  onComando,
  desabilitado = false,
  placeholder = "digite um comando...",
  autoFoco = true,
  velocidade = 11, // padrão = stats base de um runner sem hardware equipado
  preencherAltura = false,
}: {
  linhasIniciais?: LinhaTerminal[];
  prompt?: string;
  onComando: (comando: string) => LinhaTerminal[] | Promise<LinhaTerminal[]>;
  desabilitado?: boolean;
  placeholder?: string;
  autoFoco?: boolean;
  velocidade?: number;
  // Quando o terminal está sozinho dentro de uma janela do desktop (que já
  // tem altura definida), ele deve esticar e ocupar todo o espaço disponível
  // em vez de só o tanto do seu conteúdo — diferente do uso "encaixado" nas
  // fases da trilha (dentro de um MonitorFrame compacto, sem altura própria).
  preencherAltura?: boolean;
}) {
  const [estado, dispatch] = useReducer(reduzir, linhasIniciais, (linhas) => ({
    historico: [],
    fila: linhas,
    digitando: null,
  }));
  const [valor, setValor] = useState("");
  const [aguardando, setAguardando] = useState(false);
  const [boot, setBoot] = useState(true);
  const [comandosAnteriores, setComandosAnteriores] = useState<string[]>([]);
  const indiceHistoricoRef = useRef<number | null>(null);
  const fimRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const ocupado = aguardando || estado.digitando !== null || estado.fila.length > 0;

  // Breve flicker de "conexão estabelecida" ao montar o terminal.
  useEffect(() => {
    const id = setTimeout(() => setBoot(false), DURACAO_BOOT_MS);
    return () => clearTimeout(id);
  }, []);

  // Relógio único da digitação: o efeito só assina o timer (sistema externo);
  // quem decide o que muda a cada tick é o reducer.
  useEffect(() => {
    const id = setInterval(() => dispatch({ tipo: "tick" }), intervaloDigitacaoMs(velocidade));
    return () => clearInterval(id);
  }, [velocidade]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: "end" });
  }, [estado.historico, estado.digitando]);

  async function enviar() {
    const comando = valor.trim();
    if (!comando || ocupado || desabilitado) return;

    dispatch({ tipo: "comando_echo", texto: `${prompt} ${comando}` });
    setComandosAnteriores((c) => [...c, comando]);
    indiceHistoricoRef.current = null;
    setValor("");
    setAguardando(true);
    try {
      const resposta = await onComando(comando);
      // Simula o tempo de acesso ao servidor: hardware melhor (stats.velocidade)
      // encurta essa espera, mas ela nunca some de vez.
      await esperar(atrasoConexaoMs(velocidade));
      if (resposta.length === 1 && resposta[0].tipo === "limpar") {
        dispatch({ tipo: "resetar", linhas: linhasIniciais });
      } else {
        dispatch({ tipo: "enfileirar", linhas: resposta });
      }
    } finally {
      setAguardando(false);
    }
  }

  function navegarHistorico(direcao: -1 | 1) {
    if (comandosAnteriores.length === 0) return;
    const atual = indiceHistoricoRef.current;
    const base = atual === null ? comandosAnteriores.length : atual;
    const proximo = Math.max(0, Math.min(comandosAnteriores.length - 1, base + direcao));
    indiceHistoricoRef.current = proximo;
    setValor(comandosAnteriores[proximo] ?? "");
  }

  return (
    <div
      className={`codigo rounded-xl border border-esmeralda/30 bg-black/70 p-4 shadow-[0_0_24px_rgba(43,255,136,0.08)] ${
        boot ? "terminal-glitch" : ""
      } ${preencherAltura ? "flex flex-1 min-h-0 flex-col" : ""}`}
      onClick={() => inputRef.current?.focus()}
    >
      <div className={`${preencherAltura ? "flex-1 min-h-0" : "max-h-72"} space-y-1 overflow-y-auto pr-1`}>
        {estado.historico.map((linha, i) => (
          <p key={i} className={`whitespace-pre-wrap ${CORES[linha.tipo ?? "saida"]}`}>
            {linha.texto}
          </p>
        ))}
        {estado.digitando && (
          <p className={`whitespace-pre-wrap ${CORES[estado.digitando.tipo ?? "saida"]}`}>
            {estado.digitando.texto.slice(0, estado.digitando.mostrado)}
            <span className="animate-pulse">▋</span>
          </p>
        )}
        {aguardando && estado.digitando === null && (
          <p className="animate-pulse text-esmeralda/50">conectando ao servidor...</p>
        )}
        <div ref={fimRef} />
      </div>

      <div className="mt-2 flex items-center gap-2 border-t border-esmeralda/20 pt-2">
        <span className="shrink-0 whitespace-nowrap text-esmeralda">{prompt}</span>
        <input
          ref={inputRef}
          value={valor}
          disabled={desabilitado || ocupado}
          autoFocus={autoFoco}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") enviar();
            if (e.key === "ArrowUp") {
              e.preventDefault();
              navegarHistorico(-1);
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              navegarHistorico(1);
            }
          }}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          className="codigo min-w-0 flex-1 bg-transparent text-esmeralda outline-none placeholder:text-esmeralda/30 disabled:opacity-40"
        />
        <span className="w-2 animate-pulse text-esmeralda">▋</span>
      </div>
    </div>
  );
}