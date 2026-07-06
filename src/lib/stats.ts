// Cálculo dos atributos de combate do personagem.
// Regra central do jogo: o poder vem de ESTUDAR (nível) + classe/raça + itens.

import { getItem, type Atributos } from "@/content/itens";
import { nivelPorXp } from "@/lib/progresso";

export type Stats = {
  nivel: number;
  vida: number;
  ataque: number;
  defesa: number;
  // Velocidade de acesso a terminais/servidores (vem de hardware: notebook,
  // RAM, peças). Não entra no "poder" de combate — é uma progressão à parte.
  velocidade: number;
  poder: number; // número único para ranking/comparação
};

// Atributos base só pelo nível (estudo).
export function statsBase(nivel: number) {
  return {
    vida: 30 + nivel * 10,
    ataque: 5 + nivel * 2,
    defesa: 2 + nivel * 1,
    velocidade: 10 + nivel * 1,
  };
}

// Calcula os stats finais a partir do XP, dos itens equipados e dos
// modificadores de classe/raça.
export function calcularStats(
  xp: number,
  itensEquipados: string[],
  mods: Atributos = {},
): Stats {
  const nivel = nivelPorXp(xp);
  const base = statsBase(nivel);
  let vida = base.vida + (mods.vida ?? 0);
  let ataque = base.ataque + (mods.ataque ?? 0);
  let defesa = base.defesa + (mods.defesa ?? 0);
  let velocidade = base.velocidade;

  for (const id of itensEquipados) {
    const item = getItem(id);
    if (!item) continue;
    vida += item.atributos.vida ?? 0;
    ataque += item.atributos.ataque ?? 0;
    defesa += item.atributos.defesa ?? 0;
    velocidade += item.atributos.velocidade ?? 0;
  }

  // Nunca deixar atributos negativos quebrarem o jogo.
  vida = Math.max(1, vida);
  ataque = Math.max(1, ataque);
  defesa = Math.max(0, defesa);
  velocidade = Math.max(1, velocidade);

  const poder = ataque * 2 + defesa * 2 + Math.round(vida / 3);
  return { nivel, vida, ataque, defesa, velocidade, poder };
}
