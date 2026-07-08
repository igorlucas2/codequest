import { NextResponse } from "next/server";
import { executar } from "@/lib/db";
import { usuarioAtual } from "@/lib/auth";
import { getSistemaOperacional, type SistemaOperacionalId } from "@/content/sistemasOperacionais";
import { garantirServidor, carregarEstadoOperacional, carregarMidiasSistema } from "@/lib/servidores";

export async function POST(req: Request) {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { osId } = await req.json().catch(() => ({}));
  const proximaMidia = osId === null || osId === "" ? null : getSistemaOperacional(String(osId ?? ""));
  if (osId !== null && osId !== "" && !proximaMidia) {
    return NextResponse.json({ erro: "Mídia inválida." }, { status: 400 });
  }

  await garantirServidor(u.id);
  const estado = await carregarEstadoOperacional(u.id);
  if (estado.ligado) {
    return NextResponse.json({ erro: "Desligue o servidor antes de inserir ou remover mídia de boot." }, { status: 400 });
  }

  if (proximaMidia) {
    const midias = await carregarMidiasSistema(u.id);
    if (!midias.midiasSo.includes(proximaMidia.id as SistemaOperacionalId)) {
      return NextResponse.json({ erro: "Você ainda não comprou essa mídia no Mercado." }, { status: 403 });
    }
  }

  await executar("UPDATE servidores SET midia_boot = ? WHERE usuario_id = ?", [
    proximaMidia?.id ?? null,
    u.id,
  ]);
  return NextResponse.json({ ok: true, midiaBoot: proximaMidia?.id ?? null });
}
