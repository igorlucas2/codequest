import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/auth";
import { consultar } from "@/lib/db";
import { carregarCombatente } from "@/lib/personagem";
import { FASES } from "@/content/trilha1";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Nao autenticado." }, { status: 401 });

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ erro: "Perfil invalido." }, { status: 400 });
  }

  const combatente = await carregarCombatente(id);
  if (!combatente) {
    return NextResponse.json({ erro: "Runner nao encontrado." }, { status: 404 });
  }

  const progresso = await consultar<{ fase_ordem: number; xp: number }>(
    "SELECT fase_ordem, xp FROM progresso WHERE usuario_id = ?",
    [id],
  );

  const fasesConcluidas = progresso.map((linha) => Number(linha.fase_ordem));
  const xp = progresso.reduce((soma, linha) => soma + Number(linha.xp ?? 0), 0);

  const [vitoriasLinha] = await consultar<{ n: number }>(
    "SELECT COUNT(*) AS n FROM batalhas WHERE vencedor_id = ?",
    [id],
  );

  return NextResponse.json({
    meuId: u.id,
    perfil: {
      id: combatente.id,
      nome: combatente.nome,
      ficha: combatente.ficha,
      stats: combatente.stats,
      estagioRunner: combatente.estagioRunner,
      servidorTier: combatente.servidorTier,
      xp,
      vitorias: Number(vitoriasLinha?.n ?? 0),
      fasesConcluidas,
      totalFases: FASES.length,
    },
  });
}
