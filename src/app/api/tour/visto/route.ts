import { NextResponse } from "next/server";
import { executar } from "@/lib/db";
import { usuarioAtual } from "@/lib/auth";

// Marca que o jogador já viu (ou pulou) o tour de onboarding — não mostra
// de novo em próximos logins.
export async function POST() {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  await executar("UPDATE usuarios SET tour_visto = 1 WHERE id = ?", [u.id]);

  return NextResponse.json({ ok: true });
}
