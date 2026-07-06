// Gera as rodadas de digitação cronometrada de uma invasão PvP. Reaproveita
// os mesmos comandos reais de Python já usados na trilha (não inventa um
// pool separado) — o texto não é segredo, já vem no bundle do cliente igual
// aos desafios de fase.
import { FASES } from "@/content/trilha1";

export type RodadaCombate = { resposta: string; limiteMs: number };

const RODADAS_POR_DUELO = 5;
const TAMANHO_JANELA = 5;

// Pool em ordem crescente de dificuldade: os 6 comandos "terminal" das fases
// 1-6, seguidos dos 4 passos do teste_final da fase 7. 10 comandos ao todo.
const POOL_COMANDOS: string[] = FASES.flatMap((fase) => {
  if (fase.desafio.tipo === "terminal") return [fase.desafio.resposta];
  if (fase.desafio.tipo === "teste_final") return fase.desafio.passos.map((p) => p.resposta);
  return [];
});

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function embaralhar<T>(lista: T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// Janela deslizante de 5 comandos posicionada pelo nível do oponente: nível 1
// pega os 5 mais fáceis, nível 6+ pega os 5 mais difíceis. Ordem embaralhada
// dentro da janela (rejogabilidade), mas o tempo por rodada segue a posição
// na sequência (rodada 1 sempre a mais generosa), não o comando sorteado.
export function gerarRodadas(nivelOponente: number): RodadaCombate[] {
  const inicio = clamp(nivelOponente - 1, 0, POOL_COMANDOS.length - TAMANHO_JANELA);
  const janela = POOL_COMANDOS.slice(inicio, inicio + TAMANHO_JANELA);
  const ordem = embaralhar(janela).slice(0, RODADAS_POR_DUELO);

  return ordem.map((resposta, i) => ({
    resposta,
    limiteMs: clamp(8000 - i * 700 - nivelOponente * 250, 3000, 8000),
  }));
}

// Rótulo de dificuldade mostrado em Alvos.tsx antes de invadir — mesma régua
// de nível usada pra escolher a janela de comandos acima.
export function dificuldadeInvasao(nivelOponente: number): { texto: string; cor: string } {
  if (nivelOponente <= 2) return { texto: "Fácil", cor: "text-esmeralda" };
  if (nivelOponente <= 4) return { texto: "Médio", cor: "text-ouro" };
  return { texto: "Difícil", cor: "text-erro" };
}
