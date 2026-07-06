import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { usuarioAtual } from "@/lib/auth";
import { getSwitchTier } from "@/content/switches";
import { garantirServidor, carregarInfraServidor } from "@/lib/servidores";

// Compra (ou troca) o switch — mesmo padrão de "formatar e reinstalar" do
// sistema operacional: um switch só, substitui o anterior. Não permite trocar
// pra um switch com portas insuficientes pra frota que você já tem.
export async function POST(req: Request) {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { switchId } = await req.json().catch(() => ({}));
  const sw = getSwitchTier(String(switchId ?? ""));
  if (!sw) return NextResponse.json({ erro: "Switch inválido." }, { status: 400 });

  await garantirServidor(u.id);
  const { servidoresExtras, switchTier } = await carregarInfraServidor(u.id);
  if (switchTier === sw.id) {
    return NextResponse.json({ erro: "Esse switch já está instalado." }, { status: 409 });
  }

  const numeroTotal = 1 + servidoresExtras;
  if (numeroTotal > 1 && sw.portas < numeroTotal) {
    return NextResponse.json(
      { erro: `Esse switch só tem ${sw.portas} portas — insuficiente pros seus ${numeroTotal} servidores.` },
      { status: 409 },
    );
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [linhas] = await conn.query("SELECT moedas FROM usuarios WHERE id = ? FOR UPDATE", [u.id]);
    const moedas = (linhas as { moedas: number }[])[0]?.moedas ?? 0;
    if (moedas < sw.preco) {
      await conn.rollback();
      return NextResponse.json({ erro: "Moedas insuficientes." }, { status: 402 });
    }

    await conn.query("UPDATE usuarios SET moedas = moedas - ? WHERE id = ?", [sw.preco, u.id]);
    await conn.query("UPDATE servidores SET switch_tier = ? WHERE usuario_id = ?", [sw.id, u.id]);

    await conn.commit();
    return NextResponse.json({ ok: true, switchTier: sw.id, moedas: moedas - sw.preco });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
