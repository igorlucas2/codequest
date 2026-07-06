import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { usuarioAtual } from "@/lib/auth";
import { getItem, ITENS } from "@/content/itens";

// Equipa ou desequipa um item. Um slot por tipo: equipar um item desequipa os
// outros do mesmo tipo (arma/armadura/amuleto).
export async function POST(req: Request) {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { itemId, equipar } = await req.json().catch(() => ({}));
  const item = getItem(String(itemId ?? ""));
  if (!item)
    return NextResponse.json({ erro: "Item inválido." }, { status: 400 });

  const conn = await pool.getConnection();
  try {
    // Confirma que o usuário possui o item.
    const [posse] = await conn.query(
      "SELECT id FROM inventario WHERE usuario_id = ? AND item_id = ? LIMIT 1",
      [u.id, item.id],
    );
    if ((posse as unknown[]).length === 0)
      return NextResponse.json({ erro: "Você não tem esse item." }, { status: 403 });

    if (equipar) {
      const idsDoTipo = ITENS.filter((i) => i.tipo === item.tipo).map((i) => i.id);
      // Desequipa qualquer item do mesmo tipo e equipa o escolhido.
      await conn.query(
        `UPDATE inventario SET equipado = 0 WHERE usuario_id = ? AND item_id IN (${idsDoTipo
          .map(() => "?")
          .join(",")})`,
        [u.id, ...idsDoTipo],
      );
      await conn.query(
        "UPDATE inventario SET equipado = 1 WHERE usuario_id = ? AND item_id = ?",
        [u.id, item.id],
      );
    } else {
      await conn.query(
        "UPDATE inventario SET equipado = 0 WHERE usuario_id = ? AND item_id = ?",
        [u.id, item.id],
      );
    }

    return NextResponse.json({ ok: true });
  } finally {
    conn.release();
  }
}
