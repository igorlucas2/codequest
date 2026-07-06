import "server-only";
import { pool } from "@/lib/db";
import { MARCOS_VITORIA_PVP, getItem, type Item } from "@/content/itens";

// Depois de uma vitória em invasão, confere se o total de vitórias do
// jogador bateu em algum marco (ver MARCOS_VITORIA_PVP) e, se ainda não tiver
// o item exclusivo daquele marco, concede automaticamente (sem cobrar
// créditos — diferente de uma compra normal no Mercado).
export async function concederItemPorVitoria(usuarioId: number): Promise<Item | null> {
  const [linhas] = await pool.query(
    "SELECT COUNT(*) AS n FROM batalhas WHERE vencedor_id = ?",
    [usuarioId],
  );
  const totalVitorias = (linhas as { n: number }[])[0]?.n ?? 0;

  const marco = MARCOS_VITORIA_PVP.find((m) => m.vitorias === totalVitorias);
  if (!marco) return null;

  const item = getItem(marco.itemId);
  if (!item) return null;

  const [jaTem] = await pool.query(
    "SELECT id FROM inventario WHERE usuario_id = ? AND item_id = ? LIMIT 1",
    [usuarioId, item.id],
  );
  if ((jaTem as unknown[]).length > 0) return null;

  await pool.query(
    "INSERT INTO inventario (usuario_id, item_id, equipado) VALUES (?, ?, 0)",
    [usuarioId, item.id],
  );
  return item;
}
