import "server-only";
import { consultar } from "@/lib/db";
import type { RanksMap } from "@/content/augments";

// Carrega os ranks de augment de um runner como um mapa aug_id -> rank.
export async function carregarRanksDe(userId: number): Promise<RanksMap> {
  const linhas = await consultar<{ aug_id: string; rank_atual: number }>(
    "SELECT aug_id, rank_atual FROM augments_runner WHERE usuario_id = ?",
    [userId],
  );
  const mapa: RanksMap = {};
  for (const l of linhas) mapa[l.aug_id] = Number(l.rank_atual);
  return mapa;
}

// Carrega os ranks de todos os runners de uma vez (para listas: ranking, arena).
export async function carregarRanksTodos(): Promise<Map<number, RanksMap>> {
  const linhas = await consultar<{ usuario_id: number; aug_id: string; rank_atual: number }>(
    "SELECT usuario_id, aug_id, rank_atual FROM augments_runner",
  );
  const out = new Map<number, RanksMap>();
  for (const l of linhas) {
    const mapa = out.get(l.usuario_id) ?? {};
    mapa[l.aug_id] = Number(l.rank_atual);
    out.set(l.usuario_id, mapa);
  }
  return out;
}
