import { NextResponse } from "next/server";
import { pool, consultar } from "@/lib/db";
import { usuarioAtual } from "@/lib/auth";
import { limiteExcedido } from "@/lib/rateLimit";

// Senha do núcleo do minigame de invasão (fica só no servidor: o cliente não
// deve conseguir ler a resposta lendo o bundle de JS).
const SENHA_NUCLEO = "nodealpha2077";
const PREMIO_INVASAO = 25;

function normalizar(texto: string) {
  return texto.trim().toLowerCase().replace(/\s+/g, "");
}

// Tenta decifrar a senha do núcleo. Recompensa em créditos só é concedida
// 1x a cada 24h (mesmo padrão de cooldown da arena), pra não virar farm.
export async function POST(req: Request) {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { senha } = await req.json().catch(() => ({}));
  if (typeof senha !== "string" || !senha.trim())
    return NextResponse.json({ erro: "Senha inválida." }, { status: 400 });

  // A recompensa já tem cooldown diário, mas nada impedia tentar adivinhar a
  // senha em loop — sem prêmio em jogo, mas ainda um scan de força bruta.
  if (limiteExcedido(`invasao:${u.id}`, 20, 5 * 60 * 1000)) {
    return NextResponse.json(
      { erro: "Muitas tentativas. Aguarde alguns minutos e tente de novo." },
      { status: 429 },
    );
  }

  const correta = normalizar(senha) === SENHA_NUCLEO;
  if (!correta) {
    return NextResponse.json({ ok: true, correta: false, moedasGanhas: 0 });
  }

  const [recente] = await consultar<{ n: number }>(
    `SELECT COUNT(*) AS n FROM invasoes
      WHERE usuario_id = ? AND moedas_premio > 0 AND criado_em > (NOW() - INTERVAL 1 DAY)`,
    [u.id],
  );
  const jaResgatadoHoje = (recente?.n ?? 0) > 0;
  const moedasGanhas = jaResgatadoHoje ? 0 : PREMIO_INVASAO;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      "INSERT INTO invasoes (usuario_id, moedas_premio) VALUES (?, ?)",
      [u.id, moedasGanhas],
    );
    if (moedasGanhas > 0) {
      await conn.query("UPDATE usuarios SET moedas = moedas + ? WHERE id = ?", [
        moedasGanhas,
        u.id,
      ]);
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }

  return NextResponse.json({ ok: true, correta: true, moedasGanhas, jaResgatadoHoje });
}
