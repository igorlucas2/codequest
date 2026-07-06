import { NextResponse } from "next/server";
import { executar } from "@/lib/db";
import { usuarioAtual } from "@/lib/auth";
import { garantirServidor } from "@/lib/servidores";

// Contrata a internet — pré-requisito pra configurar rede (ver
// Servidor → Rede). Sem custo de ativação; o custo é recorrente, descontado
// a cada coleta (ver api/servidores/coletar e CUSTO_INTERNET_MENSAL).
export async function POST() {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  await garantirServidor(u.id);
  await executar("UPDATE servidores SET internet_ativa = 1 WHERE usuario_id = ?", [u.id]);

  return NextResponse.json({ ok: true });
}
