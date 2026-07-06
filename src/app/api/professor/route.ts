import { NextResponse } from "next/server";
import { consultar } from "@/lib/db";
import { usuarioAtual } from "@/lib/auth";

// Painel do professor: lista os alunos com resumo de progresso.
// Só acessível para usuários com papel 'professor'.
export async function GET() {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  if (u.papel !== "professor")
    return NextResponse.json({ erro: "Acesso restrito." }, { status: 403 });

  const alunos = await consultar<{
    id: number;
    nome: string;
    email: string;
    fases_concluidas: number;
    xp_total: number | null;
    ultima_atividade: string | null;
  }>(
    `SELECT u.id, u.nome, u.email,
            COUNT(p.id) AS fases_concluidas,
            COALESCE(SUM(p.xp), 0) AS xp_total,
            MAX(p.concluida_em) AS ultima_atividade
       FROM usuarios u
       LEFT JOIN progresso p ON p.usuario_id = u.id
      WHERE u.papel = 'aluno'
      GROUP BY u.id, u.nome, u.email
      ORDER BY xp_total DESC, u.nome ASC`,
  );

  return NextResponse.json({ alunos });
}
