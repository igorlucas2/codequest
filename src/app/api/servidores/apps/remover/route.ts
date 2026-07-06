import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { usuarioAtual } from "@/lib/auth";
import { getApp } from "@/content/apps";
import { acumuloDoApp, carregarInfraServidor } from "@/lib/servidores";
import { CUSTO_INTERNET_MENSAL } from "@/content/servidores";

// Remove um app do servidor. Coleta o que já tinha acumulado antes de
// desinstalar, pra não perder créditos já rendidos — sujeito ao mesmo
// aluguel de internet que /coletar aplica (senão, remover-e-reinstalar
// vira um jeito de coletar sem pagar o aluguel).
export async function POST(req: Request) {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { appId } = await req.json().catch(() => ({}));
  const app = getApp(String(appId ?? ""));
  if (!app) return NextResponse.json({ erro: "App inválido." }, { status: 400 });

  const { internetAtiva } = await carregarInfraServidor(u.id);

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

    const bruto = acumuloDoApp({ appId: app.id, ultimaColeta: instalado.ultima_coleta });
    const custoInternet = internetAtiva ? CUSTO_INTERNET_MENSAL : 0;
    const coletado = Math.max(0, bruto - custoInternet);
    if (coletado > 0) {
      await conn.query("UPDATE usuarios SET moedas = moedas + ? WHERE id = ?", [coletado, u.id]);
      await conn.query(
        "UPDATE servidores SET total_coletado = total_coletado + ? WHERE usuario_id = ?",
        [coletado, u.id],
      );
    }
    await conn.query("DELETE FROM apps_instalados WHERE usuario_id = ? AND app_id = ?", [u.id, app.id]);

    await conn.commit();
    return NextResponse.json({ ok: true, coletado, bruto, custoInternet });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
