import { NextResponse } from "next/server";
import { executar, consultar } from "@/lib/db";
import { usuarioAtual } from "@/lib/auth";
import { getServidorTier, type ServidorTierId } from "@/content/servidores";
import { garantirServidor, carregarEstadoOperacional } from "@/lib/servidores";

function dataMysql(data: Date) {
  return data.toISOString().slice(0, 19).replace("T", " ");
}

export async function POST(req: Request) {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { acao } = await req.json().catch(() => ({}));
  if (acao !== "ligar" && acao !== "desligar") {
    return NextResponse.json({ erro: "Ação inválida." }, { status: 400 });
  }

  await garantirServidor(u.id);

  if (acao === "desligar") {
    await executar(
      "UPDATE servidores SET servidor_ligado = 0, boot_finaliza_em = NULL, instalacao_so_id = NULL, instalacao_finaliza_em = NULL WHERE usuario_id = ?",
      [u.id],
    );
    return NextResponse.json({ ok: true, estadoOperacional: await carregarEstadoOperacional(u.id) });
  }

  const linhas = await consultar<{
    tier: ServidorTierId;
    sistema_operacional: string | null;
    midia_boot: string | null;
    servidor_ligado: number;
  }>(
    "SELECT tier, sistema_operacional, midia_boot, servidor_ligado FROM servidores WHERE usuario_id = ? LIMIT 1",
    [u.id],
  );
  const servidor = linhas[0];
  if (!servidor?.sistema_operacional && !servidor?.midia_boot) {
    return NextResponse.json(
      { erro: "Insira uma mídia de boot ou instale um sistema operacional antes de ligar o servidor." },
      { status: 400 },
    );
  }

  const estadoAtual = await carregarEstadoOperacional(u.id);
  if (estadoAtual.ligado) {
    return NextResponse.json({ ok: true, estadoOperacional: estadoAtual });
  }

  const tier = getServidorTier(servidor.tier);
  const segundos = tier?.tempoBootSegundos ?? 24;
  const bootFinalizaEm = new Date(Date.now() + segundos * 1000);
  await executar(
    "UPDATE servidores SET servidor_ligado = 1, boot_finaliza_em = ? WHERE usuario_id = ?",
    [dataMysql(bootFinalizaEm), u.id],
  );

  return NextResponse.json({ ok: true, estadoOperacional: await carregarEstadoOperacional(u.id) });
}
