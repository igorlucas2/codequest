import { NextResponse } from "next/server";
import { consultar, executar } from "@/lib/db";
import { usuarioAtual } from "@/lib/auth";
import { sanitizarFicha } from "@/content/classes";

// Salva apenas os cosméticos da ficha (cores, modo de avatar, foto). A
// identidade NÃO muda por aqui: `classe` (especialização) só via
// /api/personagem/especializacao (custo/cooldown) e `raca` (origem) é
// permanente. Preservamos esses dois do valor atual e ignoramos o que o
// cliente mandar, senão a troca livre voltaria por esta porta.
export async function POST(req: Request) {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const corpo = await req.json().catch(() => ({}));

  const [linha] = await consultar<{ avatar: unknown }>(
    "SELECT avatar FROM usuarios WHERE id = ? LIMIT 1",
    [u.id],
  );
  const atual = sanitizarFicha(linha?.avatar);
  const enviada = sanitizarFicha(corpo?.ficha);
  const ficha = { ...enviada, classe: atual.classe, raca: atual.raca };

  await executar("UPDATE usuarios SET avatar = ? WHERE id = ?", [
    JSON.stringify(ficha),
    u.id,
  ]);

  return NextResponse.json({ ok: true, ficha });
}
