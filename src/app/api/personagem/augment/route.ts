import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { usuarioAtual } from "@/lib/auth";
import { augmentPorId, praxisDisponivel, type RanksMap } from "@/content/augments";
import { calcularEstagioRunner, ESTAGIOS_RUNNER } from "@/content/estagiosRunner";

// Instala 1 rank de um augment, gastando 1 Praxis. Praxis é derivado
// (contratos + senioridade − ranks já gastos), então a checagem e o gasto são
// validados no servidor dentro de uma transação — o cliente nunca decide.
export async function POST(req: Request) {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const corpo = await req.json().catch(() => ({}));
  const aug = augmentPorId(String(corpo?.augId ?? ""));
  if (!aug) return NextResponse.json({ erro: "Augment inválido." }, { status: 400 });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Serializa por usuário pra dois POSTs não gastarem o mesmo Praxis.
    await conn.query("SELECT id FROM usuarios WHERE id = ? FOR UPDATE", [u.id]);

    const [ranksRows] = await conn.query(
      "SELECT aug_id, rank_atual FROM augments_runner WHERE usuario_id = ?",
      [u.id],
    );
    const ranks: RanksMap = {};
    for (const r of ranksRows as { aug_id: string; rank_atual: number }[]) {
      ranks[r.aug_id] = Number(r.rank_atual);
    }

    const atual = ranks[aug.id] ?? 0;
    if (atual >= aug.max) {
      await conn.rollback();
      return NextResponse.json({ erro: "Augment já está no rank máximo." }, { status: 409 });
    }

    const [progRows] = await conn.query(
      "SELECT COUNT(*) AS contratos, COALESCE(SUM(xp),0) AS xp FROM progresso WHERE usuario_id = ?",
      [u.id],
    );
    const prog = (progRows as { contratos: number; xp: string | number }[])[0];
    const contratos = Number(prog?.contratos ?? 0);
    const xp = Number(prog?.xp ?? 0);
    const [vitRows] = await conn.query(
      "SELECT COUNT(*) AS n FROM batalhas WHERE vencedor_id = ?",
      [u.id],
    );
    const vitorias = Number((vitRows as { n: number }[])[0]?.n ?? 0);

    const estagio = calcularEstagioRunner({ xp, contratos, vitorias });
    const estagioIndex = ESTAGIOS_RUNNER.findIndex((e) => e.id === estagio.id);
    const praxis = praxisDisponivel(ranks, contratos, estagioIndex);
    if (praxis <= 0) {
      await conn.rollback();
      return NextResponse.json(
        { erro: "Sem Praxis disponível — conclua mais contratos pra ganhar mais." },
        { status: 402 },
      );
    }

    await conn.query(
      "INSERT INTO augments_runner (usuario_id, aug_id, rank_atual) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE rank_atual = rank_atual + 1",
      [u.id, aug.id],
    );

    await conn.commit();
    return NextResponse.json({ ok: true, augId: aug.id, rank: atual + 1, praxis: praxis - 1 });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
