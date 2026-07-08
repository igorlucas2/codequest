import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/auth";
import {
  carregarSistemaComputador,
  salvarSistemaComputador,
} from "@/lib/computadorSistema";
import type { EstadoSistemaOperacional } from "@/components/desktop/persistenciaDesktop";

export async function GET() {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Nao autenticado." }, { status: 401 });

  const sistema = await carregarSistemaComputador(u.id, u.nome, u.email);
  return NextResponse.json(sistema);
}

export async function PATCH(req: Request) {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Nao autenticado." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const estado = body && typeof body === "object" ? (body as { estado?: unknown }).estado : null;
  if (!estado || typeof estado !== "object") {
    return NextResponse.json({ erro: "Estado do sistema invalido." }, { status: 400 });
  }

  const sistema = await salvarSistemaComputador(
    u.id,
    u.nome,
    u.email,
    estado as Partial<EstadoSistemaOperacional>,
  );
  return NextResponse.json(sistema);
}
