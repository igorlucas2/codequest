import { NextResponse } from "next/server";
import { executar } from "@/lib/db";
import { usuarioAtual } from "@/lib/auth";
import { garantirServidor } from "@/lib/servidores";

const CANVAS_LARGURA = 560;
const CANVAS_ALTURA = 360;

type Ponto = { x: number; y: number };

function pontoValido(p: unknown): p is Ponto {
  return (
    typeof p === "object" &&
    p !== null &&
    typeof (p as Ponto).x === "number" &&
    typeof (p as Ponto).y === "number" &&
    Number.isFinite((p as Ponto).x) &&
    Number.isFinite((p as Ponto).y)
  );
}

function grampear(p: Ponto): Ponto {
  return {
    x: Math.max(0, Math.min(CANVAS_LARGURA, p.x)),
    y: Math.max(0, Math.min(CANVAS_ALTURA, p.y)),
  };
}

// Salva a posição de cada equipamento na Sala de Equipamentos — só um
// detalhe de UI (não afeta jogo/economia), então a validação aqui é
// estrutural (formato certo, dentro dos limites do canvas), não de regra
// de negócio.
export async function POST(req: Request) {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const corpo = await req.json().catch(() => null);
  if (!corpo || !pontoValido(corpo.internet) || !Array.isArray(corpo.servidores)) {
    return NextResponse.json({ erro: "Layout inválido." }, { status: 400 });
  }
  if (corpo.switch !== null && !pontoValido(corpo.switch)) {
    return NextResponse.json({ erro: "Layout inválido." }, { status: 400 });
  }
  if (!corpo.servidores.every(pontoValido)) {
    return NextResponse.json({ erro: "Layout inválido." }, { status: 400 });
  }

  const layout = {
    internet: grampear(corpo.internet),
    switch: corpo.switch ? grampear(corpo.switch) : null,
    servidores: (corpo.servidores as Ponto[]).map(grampear),
  };

  await garantirServidor(u.id);
  await executar("UPDATE servidores SET layout_equipamentos = ? WHERE usuario_id = ?", [
    JSON.stringify(layout),
    u.id,
  ]);

  return NextResponse.json({ ok: true });
}
