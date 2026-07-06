import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { usuarioAtual } from "@/lib/auth";
import { getApp } from "@/content/apps";
import { getServidorTier } from "@/content/servidores";
import {
  garantirServidor,
  carregarInfraServidor,
  carregarAppsInstalados,
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
  const { tier: tierId, servidoresExtras } = await carregarInfraServidor(u.id);
  const tier = getServidorTier(tierId);
  const capacidadeTotal = multiplicarPorFrota(tier?.capacidade ?? 0, servidoresExtras);
  const instalados = await carregarAppsInstalados(u.id);

  if (instalados.some((i) => i.appId === app.id))
    return NextResponse.json({ erro: "Você já tem esse app instalado." }, { status: 409 });

  const usada = capacidadeUsada(instalados);
  if (usada + app.capacidade > capacidadeTotal)
    return NextResponse.json({ erro: "Capacidade do servidor insuficiente." }, { status: 409 });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [linhas] = await conn.query("SELECT moedas FROM usuarios WHERE id = ? FOR UPDATE", [u.id]);
    const moedas = (linhas as { moedas: number }[])[0]?.moedas ?? 0;
    if (moedas < app.preco) {
      await conn.rollback();
      return NextResponse.json({ erro: "Moedas insuficientes." }, { status: 402 });
    }

    await conn.query("UPDATE usuarios SET moedas = moedas - ? WHERE id = ?", [app.preco, u.id]);
    await conn.query("INSERT INTO apps_instalados (usuario_id, app_id) VALUES (?, ?)", [u.id, app.id]);

    await conn.commit();
    return NextResponse.json({ ok: true, moedas: moedas - app.preco });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
