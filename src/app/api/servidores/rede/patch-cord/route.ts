import { NextResponse } from "next/server";
import { executar } from "@/lib/db";
import { usuarioAtual } from "@/lib/auth";
import { garantirServidor, carregarEstadoOperacional } from "@/lib/servidores";

export async function POST(req: Request) {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { conectado } = await req.json().catch(() => ({}));
  if (typeof conectado !== "boolean") {
    return NextResponse.json({ erro: "Informe se o patch cord está conectado." }, { status: 400 });
  }

  await garantirServidor(u.id);
  const estado = await carregarEstadoOperacional(u.id);
  if (estado.ligado) {
    return NextResponse.json(
      { erro: "Desligue o servidor antes de mexer no patch cord físico." },
      { status: 400 },
    );
  }

  await executar("UPDATE servidores SET patch_cord_conectado = ? WHERE usuario_id = ?", [
    conectado ? 1 : 0,
    u.id,
  ]);
  return NextResponse.json({ ok: true, conectado });
}
