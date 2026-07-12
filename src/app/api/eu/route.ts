import { NextResponse } from "next/server";
import { consultar } from "@/lib/db";
import { usuarioAtual } from "@/lib/auth";
import { sanitizarFicha, modificadoresOrigem } from "@/content/classes";
import { sanitizarNiveis, velocidadeHardware } from "@/content/componentes";
import { calcularStats } from "@/lib/stats";
import { carregarInfraServidor, bonusDoTier, multiplicarPorFrota } from "@/lib/servidores";
import { calcularEstagioRunner, ESTAGIOS_RUNNER } from "@/content/estagiosRunner";
import { carregarRanksDe } from "@/lib/augments";
import { modsDeAugments, tituloEmergente, praxisDisponivel } from "@/content/augments";

// Retorna o usuário logado + progresso + moedas + ficha (classe/raça/cores) +
// inventário + stats calculados.
export async function GET() {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ usuario: null });

  const [dados] = await consultar<{
    moedas: number;
    avatar: unknown;
    tour_visto: number;
    componentes: unknown;
    respecs: number;
    respec_marca_contratos: number;
  }>(
    "SELECT moedas, avatar, tour_visto, componentes, respecs, respec_marca_contratos FROM usuarios WHERE id = ? LIMIT 1",
    [u.id],
  );
  const niveisComponentes = sanitizarNiveis(dados?.componentes);

  const progressoLinhas = await consultar<{ fase_ordem: number; xp: number; concluida_em: Date | string }>(
    "SELECT fase_ordem, xp, concluida_em FROM progresso WHERE usuario_id = ?",
    [u.id],
  );
  const fasesConcluidas = progressoLinhas.map((l) => l.fase_ordem);
  const xp = progressoLinhas.reduce((s, l) => s + l.xp, 0);
  const [vitoriasLinha] = await consultar<{ n: number }>(
    "SELECT COUNT(*) AS n FROM batalhas WHERE vencedor_id = ?",
    [u.id],
  );
  const vitorias = Number(vitoriasLinha?.n ?? 0);
  const estagioRunner = calcularEstagioRunner({
    xp,
    contratos: fasesConcluidas.length,
    vitorias,
  });
  const historico = progressoLinhas
    .map((l) => ({
      faseOrdem: l.fase_ordem,
      xp: l.xp,
      concluidaEm: l.concluida_em ? new Date(l.concluida_em).toISOString() : null,
    }))
    .sort((a, b) => {
      const dataA = a.concluidaEm ? new Date(a.concluidaEm).getTime() : 0;
      const dataB = b.concluidaEm ? new Date(b.concluidaEm).getTime() : 0;
      return dataB - dataA;
    });

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

  // Identidade e stats de combate vêm da build de augments (ver
  // content/augments.ts): os mods são a soma dos ranks e a "classe" é o título
  // que emerge da build. A origem (linguagem) ainda dá um mod permanente.
  const ranks = await carregarRanksDe(u.id);
  ficha.classe = tituloEmergente(ranks);
  const augMods = modsDeAugments(ranks);
  const origem = modificadoresOrigem(ficha.raca);

  // Bônus de firewall/integridade do tier do servidor entram no mesmo bucket de
  // mods. Servidores extras são cópias idênticas da frota, então multiplica.
  const { tier, servidoresExtras } = await carregarInfraServidor(u.id);
  const bonusServidor = bonusDoTier(tier);
  const mods = {
    ataque: (origem.ataque ?? 0) + (augMods.ataque ?? 0) + (estagioRunner.mods.ataque ?? 0),
    defesa:
      (origem.defesa ?? 0) +
      (augMods.defesa ?? 0) +
      multiplicarPorFrota(bonusServidor.defesa, servidoresExtras) +
      (estagioRunner.mods.defesa ?? 0),
    vida:
      (origem.vida ?? 0) +
      (augMods.vida ?? 0) +
      multiplicarPorFrota(bonusServidor.vida, servidoresExtras) +
      (estagioRunner.mods.vida ?? 0),
  };
  const bonusVelocidade = velocidadeHardware(niveisComponentes) + (augMods.velocidade ?? 0);

  const estagioIndex = ESTAGIOS_RUNNER.findIndex((e) => e.id === estagioRunner.id);
  const praxis = praxisDisponivel(ranks, fasesConcluidas.length, estagioIndex);

  return NextResponse.json({
    usuario: u,
    moedas: dados?.moedas ?? 0,
    ficha,
    progresso: { fasesConcluidas, xp, historico },
    inventario,
    equipados,
    componentes: niveisComponentes,
    stats: calcularStats(xp, equipados, mods, bonusVelocidade),
    tourVisto: dados?.tour_visto === 1,
    vitorias,
    estagioRunner,
    augments: ranks,
    praxis,
    respecs: Number(dados?.respecs ?? 0),
    respecMarcaContratos: Number(dados?.respec_marca_contratos ?? 0),
  });
}
