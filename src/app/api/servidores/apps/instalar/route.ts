import { NextResponse } from "next/server";
import { transacao, SaidaTransacao } from "@/lib/db";
import { usuarioAtual } from "@/lib/auth";
import { getApp } from "@/content/apps";
import { getServidorTier } from "@/content/servidores";
import {
  garantirServidor,
  carregarInfraServidorParaAtualizar,
  carregarAppsInstaladosParaAtualizar,
  carregarEstadoOperacional,
  carregarStatusSistema,
  carregarMidiasSistema,
  capacidadeUsada,
  multiplicarPorFrota,
} from "@/lib/servidores";

// Instala um app no servidor: valida capacidade disponível e saldo no
// servidor (mesmo padrão transacional de loja/comprar). Capacidade é
// agregada — servidores extras (cópias idênticas da frota) somam capacidade.
export async function POST(req: Request) {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { appId } = await req.json().catch(() => ({}));
  const app = getApp(String(appId ?? ""));
  if (!app) return NextResponse.json({ erro: "App inválido." }, { status: 400 });

  await garantirServidor(u.id);
  const estado = await carregarEstadoOperacional(u.id);
  if (!estado.online) {
    return NextResponse.json({ erro: "Ligue o servidor e aguarde o boot antes de instalar apps." }, { status: 400 });
  }
  const { sistemaOperacional } = await carregarStatusSistema(u.id);
  if (!sistemaOperacional) {
    return NextResponse.json({ erro: "Instale um sistema operacional antes de instalar apps." }, { status: 400 });
  }
  const midias = await carregarMidiasSistema(u.id);
  if (midias.midiaBoot) {
    return NextResponse.json(
      { erro: "O servidor está no instalador live. Ejete a mídia e ligue pelo disco antes de instalar apps." },
      { status: 400 },
    );
  }

  try {
    return await transacao(async (conn) => {
      // Trava a linha do servidor (capacidade) e as linhas de apps já
      // instalados antes de recalcular — sem isso, duas instalações
      // concorrentes de apps diferentes podiam ambas passar na checagem
      // de capacidade isoladamente e juntas estourá-la.
      const { tier: tierId, servidoresExtras } = await carregarInfraServidorParaAtualizar(conn, u.id);
      const tier = getServidorTier(tierId);
      const capacidadeTotal = multiplicarPorFrota(tier?.capacidade ?? 0, servidoresExtras);
      const instalados = await carregarAppsInstaladosParaAtualizar(conn, u.id);

      if (instalados.some((i) => i.appId === app.id))
        throw new SaidaTransacao(
          NextResponse.json({ erro: "Você já tem esse app instalado." }, { status: 409 }),
        );

      const usada = capacidadeUsada(instalados);
      if (usada + app.capacidade > capacidadeTotal)
        throw new SaidaTransacao(
          NextResponse.json({ erro: "Capacidade do servidor insuficiente." }, { status: 409 }),
        );

      const [linhas] = await conn.query("SELECT moedas FROM usuarios WHERE id = ? FOR UPDATE", [u.id]);
      const moedas = (linhas as { moedas: number }[])[0]?.moedas ?? 0;
      if (moedas < app.preco) {
        throw new SaidaTransacao(NextResponse.json({ erro: "Moedas insuficientes." }, { status: 402 }));
      }

      await conn.query("UPDATE usuarios SET moedas = moedas - ? WHERE id = ?", [app.preco, u.id]);
      await conn.query("INSERT INTO apps_instalados (usuario_id, app_id) VALUES (?, ?)", [u.id, app.id]);

      return NextResponse.json({ ok: true, moedas: moedas - app.preco });
    });
  } catch (e) {
    if (e instanceof SaidaTransacao) return e.resposta;
    throw e;
  }
}
