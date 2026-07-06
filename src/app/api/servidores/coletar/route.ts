import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { usuarioAtual } from "@/lib/auth";
import { acumuloDoApp, carregarInfraServidor } from "@/lib/servidores";
import { CUSTO_INTERNET_MENSAL } from "@/content/servidores";

// Coleta os créditos acumulados de TODOS os apps instalados de uma vez,
// creditando o saldo e resetando o relógio de acúmulo de cada app. Se a
// internet estiver contratada, desconta o aluguel mensal do total bruto
// antes de creditar — nunca puxa do saldo já existente (o desconto só come
// o que acabou de ser coletado, nunca deixa o líquido ficar negativo).
export async function POST() {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { internetAtiva } = await carregarInfraServidor(u.id);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [linhas] = await conn.query(
      "SELECT app_id, ultima_coleta FROM apps_instalados WHERE usuario_id = ? FOR UPDATE",
      [u.id],
    );
    const instalados = linhas as { app_id: string; ultima_coleta: Date }[];

    const bruto = instalados.reduce(
      (soma, a) => soma + acumuloDoApp({ appId: a.app_id, ultimaColeta: a.ultima_coleta }),
      0,
    );
    const custoInternet = internetAtiva ? CUSTO_INTERNET_MENSAL : 0;
    const liquido = Math.max(0, bruto - custoInternet);

    // Só credita E zera o relógio quando sobra algo líquido — se o bruto
    // não cobre nem o aluguel, zerar mesmo assim faria o jogador perder o
    // acúmulo parcial sem receber nada em troca (uma armadilha permanente,
    // já que não existe endpoint pra cancelar a internet). Deixa continuar
    // acumulando até valer a pena coletar.
    if (liquido > 0) {
      await conn.query("UPDATE usuarios SET moedas = moedas + ? WHERE id = ?", [liquido, u.id]);
      await conn.query("UPDATE apps_instalados SET ultima_coleta = NOW() WHERE usuario_id = ?", [u.id]);
      // Contador cumulativo de moedas de fato coletadas (nunca decresce) —
      // usado pelo Ranking pra medir receita real em vez de potencial
      // instalado (ver api/ranking/route.ts).
      await conn.query(
        "UPDATE servidores SET total_coletado = total_coletado + ? WHERE usuario_id = ?",
        [liquido, u.id],
      );
    }

    await conn.commit();
    return NextResponse.json({ ok: true, coletado: liquido, bruto, custoInternet, liquido });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
