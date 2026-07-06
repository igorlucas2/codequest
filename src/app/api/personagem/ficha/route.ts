import { NextResponse } from "next/server";
import { executar } from "@/lib/db";
import { usuarioAtual } from "@/lib/auth";
import { sanitizarFicha } from "@/content/classes";

// Salva a ficha do personagem (classe, raça, cores) — validada no servidor.
export async function POST(req: Request) {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const corpo = await req.json().catch(() => ({}));
  const ficha = sanitizarFicha(corpo?.ficha);

  await executar("UPDATE usuarios SET avatar = ? WHERE id = ?", [
    JSON.stringify(ficha),
    u.id,
  ]);

  return NextResponse.json({ ok: true, ficha });
}
