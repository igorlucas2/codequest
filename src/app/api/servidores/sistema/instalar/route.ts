import { NextResponse } from "next/server";
import { transacao, SaidaTransacao } from "@/lib/db";
import { usuarioAtual } from "@/lib/auth";
import { getSistemaOperacional, type SistemaOperacionalId } from "@/content/sistemasOperacionais";
import { getServidorTier, type ServidorTierId } from "@/content/servidores";
import { garantirServidor, carregarEstadoOperacional } from "@/lib/servidores";

function dataMysql(data: Date) {
  return data.toISOString().slice(0, 19).replace("T", " ");
}

export async function POST() {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  await garantirServidor(u.id);
  const estado = await carregarEstadoOperacional(u.id);
  if (!estado.online) {
    return NextResponse.json({ erro: "Ligue o servidor e aguarde o boot pela mídia antes de instalar." }, { status: 400 });
  }

  try {
    return await transacao(async (conn) => {
      const [linhaServidor] = await conn.query(
        "SELECT tier, sistema_operacional, midia_boot, instalacao_so_id FROM servidores WHERE usuario_id = ? FOR UPDATE",
        [u.id],
      );
      const servidor = (linhaServidor as {
        tier: ServidorTierId;
        sistema_operacional: SistemaOperacionalId | null;
        midia_boot: SistemaOperacionalId | null;
        instalacao_so_id: SistemaOperacionalId | null;
      }[])[0];

      if (!servidor?.midia_boot) {
        throw new SaidaTransacao(
          NextResponse.json({ erro: "Insira uma mídia de boot antes de instalar o sistema." }, { status: 400 }),
        );
      }
      const so = getSistemaOperacional(servidor.midia_boot);
      if (!so) {
        throw new SaidaTransacao(NextResponse.json({ erro: "Mídia de boot inválida." }, { status: 400 }));
      }
      if (servidor.instalacao_so_id) {
        throw new SaidaTransacao(NextResponse.json({ erro: "Instalação já em andamento." }, { status: 409 }));
      }
      if (servidor.sistema_operacional === so.id) {
        throw new SaidaTransacao(
          NextResponse.json({ erro: "Esse sistema operacional já está instalado." }, { status: 409 }),
        );
      }

      const tier = getServidorTier(servidor.tier);
      const segundosInstalacao = Math.max(10, Math.round((tier?.tempoBootSegundos ?? 24) * 0.75));
      const finalizaEm = new Date(Date.now() + segundosInstalacao * 1000);
      await conn.query(
        "UPDATE servidores SET instalacao_so_id = ?, instalacao_finaliza_em = ? WHERE usuario_id = ?",
        [so.id, dataMysql(finalizaEm), u.id],
      );

      return NextResponse.json({
        ok: true,
        instalacao: {
          osId: so.id,
          finalizaEm: finalizaEm.toISOString(),
          restanteMs: segundosInstalacao * 1000,
        },
      });
    });
  } catch (e) {
    if (e instanceof SaidaTransacao) return e.resposta;
    throw e;
  }
}
