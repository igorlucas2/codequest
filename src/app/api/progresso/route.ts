import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { usuarioAtual } from "@/lib/auth";
import { getFase, moedasDaFase } from "@/content/trilha1";

// Marca uma fase como concluída para o usuário logado.
// XP e moedas são decididos pelo servidor (a partir do conteúdo), nunca pelo cliente.
export async function POST(req: Request) {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { fase_ordem } = await req.json().catch(() => ({}));
  const ordem = Number(fase_ordem);
  const fase = getFase(ordem);
  if (!fase)
    return NextResponse.json({ erro: "Fase inválida." }, { status: 400 });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // INSERT IGNORE: se já concluída, affectedRows = 0 (não repete recompensa).
    const [res] = await conn.query(
      "INSERT IGNORE INTO progresso (usuario_id, fase_ordem, xp) VALUES (?, ?, ?)",
      [u.id, ordem, fase.xp],
    );
    const primeiraVez = (res as { affectedRows: number }).affectedRows > 0;

    let moedasGanhas = 0;
    if (primeiraVez) {
      moedasGanhas = moedasDaFase(fase);
      await conn.query("UPDATE usuarios SET moedas = moedas + ? WHERE id = ?", [
        moedasGanhas,
        u.id,
      ]);
    }

    await conn.commit();
    return NextResponse.json({
      ok: true,
      primeiraVez,
      xpGanho: primeiraVez ? fase.xp : 0,
      moedasGanhas,
    });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
