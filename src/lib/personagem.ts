import "server-only";
import { consultar } from "@/lib/db";
import { calcularStats, type Stats } from "@/lib/stats";
import { sanitizarFicha, modificadoresDe, type Ficha } from "@/content/classes";
import { bonusDoTier, multiplicarPorFrota } from "@/lib/servidores";
import type { ServidorTierId } from "@/content/servidores";

// Representa um aluno pronto para exibir/duelar: ficha + stats calculados do banco.
export type Combatente = {
  id: number;
  nome: string;
  ficha: Ficha;
  stats: Stats;
  servidorTier: ServidorTierId;
};

// Carrega todos os alunos com XP, itens equipados, servidor e ficha, já com stats.
export async function carregarAlunosComStats(): Promise<Combatente[]> {
  const usuarios = await consultar<{ id: number; nome: string; avatar: unknown }>(
    "SELECT id, nome, avatar FROM usuarios WHERE papel = 'aluno'",
  );

  const xpRows = await consultar<{ usuario_id: number; xp: string }>(
    "SELECT usuario_id, COALESCE(SUM(xp),0) AS xp FROM progresso GROUP BY usuario_id",
  );
  const eqRows = await consultar<{ usuario_id: number; item_id: string }>(
    "SELECT usuario_id, item_id FROM inventario WHERE equipado = 1",
  );
  const servidorRows = await consultar<{
    usuario_id: number;
    tier: ServidorTierId;
    servidores_extras: number;
  }>("SELECT usuario_id, tier, servidores_extras FROM servidores");

  const xpPorUsuario = new Map<number, number>();
  for (const r of xpRows) xpPorUsuario.set(r.usuario_id, Number(r.xp));

  const equipadosPorUsuario = new Map<number, string[]>();
  for (const r of eqRows) {
    const lista = equipadosPorUsuario.get(r.usuario_id) ?? [];
    lista.push(r.item_id);
    equipadosPorUsuario.set(r.usuario_id, lista);
  }

  const tierPorUsuario = new Map<number, ServidorTierId>();
  const extrasPorUsuario = new Map<number, number>();
  for (const r of servidorRows) {
    tierPorUsuario.set(r.usuario_id, r.tier);
    extrasPorUsuario.set(r.usuario_id, r.servidores_extras);
  }

  return usuarios.map((u) => {
    const xp = xpPorUsuario.get(u.id) ?? 0;
    const equipados = equipadosPorUsuario.get(u.id) ?? [];
    const ficha = sanitizarFicha(u.avatar);
    const mods = modificadoresDe(ficha.classe, ficha.raca);

    // Servidor ainda não provisionado (nunca visitou /servidores) = tier 'node' padrão.
    const servidorTier = tierPorUsuario.get(u.id) ?? "node";
    const servidoresExtras = extrasPorUsuario.get(u.id) ?? 0;
    const bonusServidor = bonusDoTier(servidorTier);
    mods.defesa = (mods.defesa ?? 0) + multiplicarPorFrota(bonusServidor.defesa, servidoresExtras);
    mods.vida = (mods.vida ?? 0) + multiplicarPorFrota(bonusServidor.vida, servidoresExtras);

    return {
      id: u.id,
      nome: u.nome,
      ficha,
      stats: calcularStats(xp, equipados, mods),
      servidorTier,
    };
  });
}

export async function carregarCombatente(id: number): Promise<Combatente | null> {
  const todos = await carregarAlunosComStats();
  return todos.find((c) => c.id === id) ?? null;
}
