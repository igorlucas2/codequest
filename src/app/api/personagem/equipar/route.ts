import { NextResponse } from "next/server";
import { transacao, SaidaTransacao } from "@/lib/db";
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

  const idsDoTipo = ITENS.filter((i) => i.tipo === item.tipo).map((i) => i.id);

  try {
    return await transacao(async (conn) => {
      // Trava todas as linhas de inventário deste tipo antes de decidir —
      // sem isso, dois pedidos concorrentes pra itens diferentes do mesmo
      // tipo podiam intercalar e deixar os dois marcados equipado=1.
      const [posse] = await conn.query(
        `SELECT item_id FROM inventario WHERE usuario_id = ? AND item_id IN (${idsDoTipo
          .map(() => "?")
          .join(",")}) FOR UPDATE`,
        [u.id, ...idsDoTipo],
      );
      const possuiItem = (posse as { item_id: string }[]).some((p) => p.item_id === item.id);
      if (!possuiItem)
        throw new SaidaTransacao(
          NextResponse.json({ erro: "Você não tem esse item." }, { status: 403 }),
        );

      if (equipar) {
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
    });
  } catch (e) {
    if (e instanceof SaidaTransacao) return e.resposta;
    throw e;
  }
}
