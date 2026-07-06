import { NextResponse } from "next/server";
import { consultar } from "@/lib/db";
import { usuarioAtual } from "@/lib/auth";
import { sanitizarFicha, modificadoresDe } from "@/content/classes";
import { calcularStats } from "@/lib/stats";
import { carregarInfraServidor, bonusDoTier, multiplicarPorFrota } from "@/lib/servidores";

// Retorna o usuário logado + progresso + moedas + ficha (classe/raça/cores) +
// inventário + stats calculados.
export async function GET() {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ usuario: null });

  const [dados] = await consultar<{ moedas: number; avatar: unknown; tour_visto: number }>(
    "SELECT moedas, avatar, tour_visto FROM usuarios WHERE id = ? LIMIT 1",
    [u.id],
  );

  const progressoLinhas = await consultar<{ fase_ordem: number; xp: number }>(
    "SELECT fase_ordem, xp FROM progresso WHERE usuario_id = ?",
    [u.id],
  );
  const fasesConcluidas = progressoLinhas.map((l) => l.fase_ordem);
  const xp = progressoLinhas.reduce((s, l) => s + l.xp, 0);

  const inventarioLinhas = await consultar<{ item_id: string; equipado: number }>(
    "SELECT item_id, equipado FROM inventario WHERE usuario_id = ?",
    [u.id],
  );
  const inventario = inventarioLinhas.map((l) => ({
    itemId: l.item_id,
    equipado: l.equipado === 1,
  }));
  const equipados = inventario.filter((i) => i.equipado).map((i) => i.itemId);

  const ficha = sanitizarFicha(dados?.avatar);
  const mods = modificadoresDe(ficha.classe, ficha.raca);

  // Bônus de firewall/integridade do tier do servidor entram no mesmo bucket
  // de mods que classe/raça já usam — nenhuma mudança em calcularStats.
  // Servidores extras são cópias idênticas da frota, então o bônus multiplica.
  const { tier, servidoresExtras } = await carregarInfraServidor(u.id);
  const bonusServidor = bonusDoTier(tier);
  mods.defesa = (mods.defesa ?? 0) + multiplicarPorFrota(bonusServidor.defesa, servidoresExtras);
  mods.vida = (mods.vida ?? 0) + multiplicarPorFrota(bonusServidor.vida, servidoresExtras);

  return NextResponse.json({
    usuario: u,
    moedas: dados?.moedas ?? 0,
    ficha,
    progresso: { fasesConcluidas, xp },
    inventario,
    equipados,
    stats: calcularStats(xp, equipados, mods),
    tourVisto: dados?.tour_visto === 1,
  });
}
