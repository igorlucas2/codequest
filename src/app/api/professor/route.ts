import { NextResponse } from "next/server";
import { consultar } from "@/lib/db";
import { usuarioAtual } from "@/lib/auth";
import { FASES } from "@/content/trilha1";

// Painel do professor: lista os alunos com resumo de progresso.
// Só acessível para usuários com papel 'professor'.
export async function GET() {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  if (u.papel !== "professor")
    return NextResponse.json({ erro: "Acesso restrito." }, { status: 403 });

  const linhas = await consultar<{
    id: number;
    nome: string;
    email: string;
    fases_concluidas: number;
    xp_total: number | null;
    fases_ids: string | null;
    ult_progresso: string | null;
    ult_batalha: string | null;
    ult_invasao: string | null;
    ult_app: string | null;
    vitorias: number;
    derrotas: number;
    servidor_tier: string | null;
  }>(
    `SELECT u.id, u.nome, u.email,
            (SELECT COUNT(*) FROM progresso p WHERE p.usuario_id = u.id) AS fases_concluidas,
            (SELECT COALESCE(SUM(p.xp), 0) FROM progresso p WHERE p.usuario_id = u.id) AS xp_total,
            (SELECT GROUP_CONCAT(p.fase_ordem) FROM progresso p WHERE p.usuario_id = u.id) AS fases_ids,
            (SELECT MAX(p.concluida_em) FROM progresso p WHERE p.usuario_id = u.id) AS ult_progresso,
            (SELECT MAX(b.criado_em) FROM batalhas b WHERE b.desafiante_id = u.id) AS ult_batalha,
            (SELECT MAX(i.criado_em) FROM invasoes i WHERE i.usuario_id = u.id) AS ult_invasao,
            (SELECT MAX(a.instalado_em) FROM apps_instalados a WHERE a.usuario_id = u.id) AS ult_app,
            (SELECT COUNT(*) FROM batalhas b WHERE b.vencedor_id = u.id) AS vitorias,
            (SELECT COUNT(*) FROM batalhas b
               WHERE (b.desafiante_id = u.id OR b.oponente_id = u.id)
                 AND b.vencedor_id IS NOT NULL AND b.vencedor_id != u.id) AS derrotas,
            (SELECT s.tier FROM servidores s WHERE s.usuario_id = u.id) AS servidor_tier
       FROM usuarios u
      WHERE u.papel = 'aluno'
      ORDER BY xp_total DESC, u.nome ASC`,
  );

  // "Última atividade" olhando só a trilha principal marcava como "sumido"
  // um aluno ativo em Arena/Servidor/apps que só não concluiu fase nova —
  // aqui pega o mais recente entre as quatro fontes reais de atividade.
  const alunos = linhas.map((l) => {
    const datas = [l.ult_progresso, l.ult_batalha, l.ult_invasao, l.ult_app]
      .filter((d): d is string => d !== null)
      .map((d) => new Date(d).getTime());
    const ultimaAtividade = datas.length > 0 ? new Date(Math.max(...datas)).toISOString() : null;

    const concluidas = new Set(
      (l.fases_ids ?? "")
        .split(",")
        .map(Number)
        .filter((n) => !Number.isNaN(n)),
    );
    const proximaFasePendente = FASES.find((f) => !concluidas.has(f.ordem))?.ordem ?? null;

    return {
      id: l.id,
      nome: l.nome,
      email: l.email,
      fasesConcluidas: l.fases_concluidas,
      xpTotal: l.xp_total ?? 0,
      ultimaAtividade,
      proximaFasePendente,
      vitorias: l.vitorias,
      derrotas: l.derrotas,
      servidorTier: l.servidor_tier,
    };
  });

  return NextResponse.json({ alunos, totalFases: FASES.length });
}
