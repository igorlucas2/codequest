import "server-only";
import { consultar } from "@/lib/db";
import { calcularStats, type Stats } from "@/lib/stats";
import { sanitizarFicha, modificadoresOrigem, type Ficha } from "@/content/classes";
import { bonusDoTier, multiplicarPorFrota } from "@/lib/servidores";
import type { ServidorTierId } from "@/content/servidores";
import { calcularEstagioRunner, type EstagioRunner } from "@/content/estagiosRunner";
import { carregarRanksTodos } from "@/lib/augments";
import { modsDeAugments, tituloEmergente } from "@/content/augments";

// Representa um aluno pronto para exibir/duelar: ficha + stats calculados do banco.
export type Combatente = {
  id: number;
  nome: string;
  ficha: Ficha;
  stats: Stats;
  servidorTier: ServidorTierId;
  estagioRunner: EstagioRunner;
};

// Carrega todos os alunos com XP, itens equipados, servidor e ficha, já com stats.
export async function carregarAlunosComStats(): Promise<Combatente[]> {
  const usuarios = await consultar<{ id: number; nome: string; avatar: unknown }>(
    "SELECT id, nome, avatar FROM usuarios WHERE papel = 'aluno'",
  );

  const xpRows = await consultar<{ usuario_id: number; xp: string }>(
    "SELECT usuario_id, COALESCE(SUM(xp),0) AS xp FROM progresso GROUP BY usuario_id",
  );
  const contratosRows = await consultar<{ usuario_id: number; n: number }>(
    "SELECT usuario_id, COUNT(*) AS n FROM progresso GROUP BY usuario_id",
  );
  const eqRows = await consultar<{ usuario_id: number; item_id: string }>(
    "SELECT usuario_id, item_id FROM inventario WHERE equipado = 1",
  );
  const vitoriasRows = await consultar<{ vencedor_id: number; n: number }>(
    "SELECT vencedor_id, COUNT(*) AS n FROM batalhas WHERE vencedor_id IS NOT NULL GROUP BY vencedor_id",
  );
  const servidorRows = await consultar<{
    usuario_id: number;
    tier: ServidorTierId;
    servidores_extras: number;
  }>("SELECT usuario_id, tier, servidores_extras FROM servidores");

  const xpPorUsuario = new Map<number, number>();
  for (const r of xpRows) xpPorUsuario.set(r.usuario_id, Number(r.xp));

  const contratosPorUsuario = new Map<number, number>();
  for (const r of contratosRows) contratosPorUsuario.set(r.usuario_id, Number(r.n));

  const vitoriasPorUsuario = new Map<number, number>();
  for (const r of vitoriasRows) vitoriasPorUsuario.set(r.vencedor_id, Number(r.n));

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

  const ranksPorUsuario = await carregarRanksTodos();

  return usuarios.map((u) => {
    const xp = xpPorUsuario.get(u.id) ?? 0;
    const contratos = contratosPorUsuario.get(u.id) ?? 0;
    const vitorias = vitoriasPorUsuario.get(u.id) ?? 0;
    const equipados = equipadosPorUsuario.get(u.id) ?? [];
    const ficha = sanitizarFicha(u.avatar);

    // Identidade e stats de combate vêm da build de augments: os mods de combate
    // são a soma dos ranks, e a "classe" é o título que emerge da build.
    const ranks = ranksPorUsuario.get(u.id) ?? {};
    ficha.classe = tituloEmergente(ranks);
    const augMods = modsDeAugments(ranks);
    const origem = modificadoresOrigem(ficha.raca);
    const mods = {
      ataque: (origem.ataque ?? 0) + (augMods.ataque ?? 0),
      defesa: (origem.defesa ?? 0) + (augMods.defesa ?? 0),
      vida: (origem.vida ?? 0) + (augMods.vida ?? 0),
      velocidade: augMods.velocidade ?? 0,
    };
    const estagioRunner = calcularEstagioRunner({ xp, contratos, vitorias });

    // Servidor ainda não provisionado (nunca visitou /servidores) = tier 'node' padrão.
    const servidorTier = tierPorUsuario.get(u.id) ?? "node";
    const servidoresExtras = extrasPorUsuario.get(u.id) ?? 0;
    const bonusServidor = bonusDoTier(servidorTier);
    mods.ataque = (mods.ataque ?? 0) + (estagioRunner.mods.ataque ?? 0);
    mods.defesa = (mods.defesa ?? 0) + multiplicarPorFrota(bonusServidor.defesa, servidoresExtras);
    mods.defesa = (mods.defesa ?? 0) + (estagioRunner.mods.defesa ?? 0);
    mods.vida = (mods.vida ?? 0) + multiplicarPorFrota(bonusServidor.vida, servidoresExtras);
    mods.vida = (mods.vida ?? 0) + (estagioRunner.mods.vida ?? 0);

    return {
      id: u.id,
      nome: u.nome,
      ficha,
      // velocidade dos augments entra pelo bônus de velocidade (calcularStats
      // não lê mods.velocidade — só ataque/defesa/vida).
      stats: calcularStats(xp, equipados, mods, mods.velocidade),
      servidorTier,
      estagioRunner,
    };
  });
}

export async function carregarCombatente(id: number): Promise<Combatente | null> {
  const todos = await carregarAlunosComStats();
  return todos.find((c) => c.id === id) ?? null;
}
