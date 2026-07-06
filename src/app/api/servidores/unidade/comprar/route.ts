import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { usuarioAtual } from "@/lib/auth";
import { custoUnidadeNoTier } from "@/content/servidores";
import { getSwitchTier } from "@/content/switches";
import { garantirServidor, carregarInfraServidor } from "@/lib/servidores";

// Compra um servidor extra — cópia idêntica do rack principal (mesmo tier/
// SO/rede), só soma capacidade e bônus de combate (ver plano). A partir do
// 2º servidor, exige um switch com portas suficientes pra frota inteira.
export async function POST() {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  await garantirServidor(u.id);
  const { tier, servidoresExtras, switchTier } = await carregarInfraServidor(u.id);
  const custo = custoUnidadeNoTier(tier);
  const numeroTotalApos = 1 + servidoresExtras + 1;

  if (numeroTotalApos > 1) {
    const portas = switchTier ? (getSwitchTier(switchTier)?.portas ?? 0) : 0;
    if (portas < numeroTotalApos) {
      return NextResponse.json(
        { erro: "Compre um switch com portas suficientes antes de adicionar outro servidor." },
        { status: 409 },
      );
    }
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [linhas] = await conn.query("SELECT moedas FROM usuarios WHERE id = ? FOR UPDATE", [u.id]);
    const moedas = (linhas as { moedas: number }[])[0]?.moedas ?? 0;
    if (moedas < custo) {
      await conn.rollback();
      return NextResponse.json({ erro: "Moedas insuficientes." }, { status: 402 });
    }

    await conn.query("UPDATE usuarios SET moedas = moedas - ? WHERE id = ?", [custo, u.id]);
    await conn.query("UPDATE servidores SET servidores_extras = servidores_extras + 1 WHERE usuario_id = ?", [
      u.id,
    ]);

    await conn.commit();
    return NextResponse.json({ ok: true, moedas: moedas - custo });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
