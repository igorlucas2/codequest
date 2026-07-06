import "server-only";

// Gera as rodadas de digitação cronometrada de uma invasão PvP. Reaproveita
// os mesmos comandos reais de Python já usados na trilha (não inventa um
// pool separado) — o texto não é segredo de prova (é mostrado ao próprio
// jogador pra ele retiver), só não pode vir do mesmo módulo que o gabarito
// de validação da Trilha, daí importar de trilha1Gabarito (server-only) em
// vez de trilha1.ts.
import { POOL_COMANDOS_COMBATE } from "@/content/trilha1Gabarito";

export type RodadaCombate = { resposta: string; limiteMs: number };

const RODADAS_POR_DUELO = 5;
const TAMANHO_JANELA = 5;

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
  const inicio = clamp(nivelOponente - 1, 0, POOL_COMANDOS_COMBATE.length - TAMANHO_JANELA);
  const janela = POOL_COMANDOS_COMBATE.slice(inicio, inicio + TAMANHO_JANELA);
  const ordem = embaralhar(janela).slice(0, RODADAS_POR_DUELO);

  return ordem.map((resposta, i) => ({
    resposta,
    limiteMs: clamp(8000 - i * 700 - nivelOponente * 250, 3000, 8000),
  }));
}
