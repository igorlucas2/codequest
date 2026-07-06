import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/auth";
import { consultar } from "@/lib/db";
import { carregarAlunosComStats } from "@/lib/personagem";
import { getApp } from "@/content/apps";

// Ranking da turma: por poder de invasão (com vitórias) ou por receita dos
// apps instalados no servidor — ordenação de fato acontece no cliente, aqui
// só entregamos os dois números por aluno.
export async function GET() {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const alunos = await carregarAlunosComStats();

  const vitoriasRows = await consultar<{ vencedor_id: number; n: number }>(
    "SELECT vencedor_id, COUNT(*) AS n FROM batalhas WHERE vencedor_id IS NOT NULL GROUP BY vencedor_id",
  );
  const vitoriasPorUsuario = new Map<number, number>();
  for (const r of vitoriasRows) vitoriasPorUsuario.set(r.vencedor_id, Number(r.n));

  const appsRows = await consultar<{ usuario_id: number; app_id: string }>(
    "SELECT usuario_id, app_id FROM apps_instalados",
  );
  const receitaPorUsuario = new Map<number, number>();
  for (const r of appsRows) {
    const crPorHora = getApp(r.app_id)?.crPorHora ?? 0;
    receitaPorUsuario.set(r.usuario_id, (receitaPorUsuario.get(r.usuario_id) ?? 0) + crPorHora);
  }

  const ranking = alunos
    .map((a) => ({
      id: a.id,
      nome: a.nome,
      ficha: a.ficha,
      nivel: a.stats.nivel,
      poder: a.stats.poder,
      vitorias: vitoriasPorUsuario.get(a.id) ?? 0,
      receita: receitaPorUsuario.get(a.id) ?? 0,
    }))
    .sort((a, b) => b.poder - a.poder || b.vitorias - a.vitorias);

  return NextResponse.json({ ranking, meuId: u.id });
}
