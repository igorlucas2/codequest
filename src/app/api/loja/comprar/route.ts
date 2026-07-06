import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { usuarioAtual } from "@/lib/auth";
import { getItem } from "@/content/itens";

// Compra um item: valida saldo e posse no servidor, desconta moedas e adiciona ao inventário.
export async function POST(req: Request) {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { itemId } = await req.json().catch(() => ({}));
  const item = getItem(String(itemId ?? ""));
  if (!item)
    return NextResponse.json({ erro: "Item inválido." }, { status: 400 });
  // Itens exclusivos só podem ser concedidos por conquistasPvp.ts (marco de
  // vitórias) — sem este bloqueio, o preço 0 desses itens nunca falha no
  // checkout de saldo e qualquer POST direto com o id concede o item.
  if (item.exclusivo)
    return NextResponse.json(
      { erro: "Este item é exclusivo — não está à venda no Mercado." },
      { status: 403 },
    );

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Trava a linha do usuário para evitar corrida em compras simultâneas.
    const [linhas] = await conn.query(
      "SELECT moedas FROM usuarios WHERE id = ? FOR UPDATE",
      [u.id],
    );
    const moedas = (linhas as { moedas: number }[])[0]?.moedas ?? 0;

    const [jaTem] = await conn.query(
      "SELECT id FROM inventario WHERE usuario_id = ? AND item_id = ? LIMIT 1",
      [u.id, item.id],
    );
    if ((jaTem as unknown[]).length > 0) {
      await conn.rollback();
      return NextResponse.json({ erro: "Você já tem esse item." }, { status: 409 });
    }

    if (moedas < item.preco) {
      await conn.rollback();
      return NextResponse.json({ erro: "Moedas insuficientes." }, { status: 402 });
    }

    await conn.query("UPDATE usuarios SET moedas = moedas - ? WHERE id = ?", [
      item.preco,
      u.id,
    ]);
    await conn.query(
      "INSERT INTO inventario (usuario_id, item_id, equipado) VALUES (?, ?, 0)",
      [u.id, item.id],
    );

    await conn.commit();
    return NextResponse.json({ ok: true, moedas: moedas - item.preco });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
