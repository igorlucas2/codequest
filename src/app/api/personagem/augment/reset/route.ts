import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { usuarioAtual } from "@/lib/auth";
import { custoRespec, RESPEC_COOLDOWN_CONTRATOS } from "@/content/classes";

// Reinstala o cyberware do zero: zera todos os ranks (devolvendo o Praxis pra
// redistribuir) por um custo em créditos que dobra a cada uso, mais um cooldown
// em contratos. Reaproveita a mesma economia de "respec" — pra reconstruir a
// build ser um compromisso, não um ajuste de última hora antes de um duelo.
export async function POST() {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [linhas] = await conn.query(
      "SELECT moedas, respecs, respec_marca_contratos FROM usuarios WHERE id = ? FOR UPDATE",
      [u.id],
    );
    const linha = (
      linhas as { moedas: number; respecs: number; respec_marca_contratos: number }[]
    )[0];
    if (!linha) {
      await conn.rollback();
      return NextResponse.json({ erro: "Usuário não encontrado." }, { status: 404 });
    }

    const [totalRows] = await conn.query(
      "SELECT COALESCE(SUM(rank_atual),0) AS total FROM augments_runner WHERE usuario_id = ?",
      [u.id],
    );
    const totalRanks = Number((totalRows as { total: number }[])[0]?.total ?? 0);
    if (totalRanks <= 0) {
      await conn.rollback();
      return NextResponse.json({ erro: "Nenhum augment instalado pra reinstalar." }, { status: 400 });
    }

    const respecs = Number(linha.respecs ?? 0);
    const custo = custoRespec(respecs);

    const [contratosRows] = await conn.query(
      "SELECT COUNT(*) AS n FROM progresso WHERE usuario_id = ?",
      [u.id],
    );
    const contratos = Number((contratosRows as { n: number }[])[0]?.n ?? 0);

    if (respecs >= 1) {
      const liberaEm = Number(linha.respec_marca_contratos ?? 0) + RESPEC_COOLDOWN_CONTRATOS;
      if (contratos < liberaEm) {
        await conn.rollback();
        return NextResponse.json(
          { erro: `Conclua mais ${liberaEm - contratos} contrato(s) antes de reinstalar a build.` },
          { status: 429 },
        );
      }
    }

    if (linha.moedas < custo) {
      await conn.rollback();
      return NextResponse.json(
        { erro: `Créditos insuficientes: reinstalar custa ${custo} cr.` },
        { status: 402 },
      );
    }

    await conn.query("DELETE FROM augments_runner WHERE usuario_id = ?", [u.id]);
    await conn.query(
      "UPDATE usuarios SET moedas = moedas - ?, respecs = respecs + 1, respec_marca_contratos = ? WHERE id = ?",
      [custo, contratos, u.id],
    );

    await conn.commit();
    return NextResponse.json({ ok: true, moedas: linha.moedas - custo, custo, praxisDevolvido: totalRanks });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
