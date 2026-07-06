import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { usuarioAtual } from "@/lib/auth";
import { getApp } from "@/content/apps";
import { acumuloDoApp } from "@/lib/servidores";

// Remove um app do servidor. Coleta o que já tinha acumulado antes de
// desinstalar, pra não perder créditos já rendidos.
export async function POST(req: Request) {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { appId } = await req.json().catch(() => ({}));
  const app = getApp(String(appId ?? ""));
  if (!app) return NextResponse.json({ erro: "App inválido." }, { status: 400 });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [linhas] = await conn.query(
      "SELECT ultima_coleta FROM apps_instalados WHERE usuario_id = ? AND app_id = ? LIMIT 1 FOR UPDATE",
      [u.id, app.id],
    );
    const instalado = (linhas as { ultima_coleta: Date }[])[0];
    if (!instalado) {
      await conn.rollback();
      return NextResponse.json({ erro: "Você não tem esse app instalado." }, { status: 404 });
    }

    const coletado = acumuloDoApp({ appId: app.id, ultimaColeta: instalado.ultima_coleta });
    if (coletado > 0) {
      await conn.query("UPDATE usuarios SET moedas = moedas + ? WHERE id = ?", [coletado, u.id]);
    }
    await conn.query("DELETE FROM apps_instalados WHERE usuario_id = ? AND app_id = ?", [u.id, app.id]);

    await conn.commit();
    return NextResponse.json({ ok: true, coletado });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
