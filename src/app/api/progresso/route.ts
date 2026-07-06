import { NextResponse } from "next/server";
import { transacao, SaidaTransacao } from "@/lib/db";
import { usuarioAtual } from "@/lib/auth";
import { getFase, moedasDaFase } from "@/content/trilha1";
import { desafioResolvido, type EnvioDesafio } from "@/lib/validarTrilha";

// Marca uma fase como concluída para o usuário logado. XP e moedas são
// decididos pelo servidor (a partir do conteúdo), nunca pelo cliente — e,
// diferente de antes, o próprio "concluiu" também é decidido aqui: o
// endpoint exige a prova (envio) e recalcula se ela realmente resolve o
// desafio (ver lib/validarTrilha.ts), além de exigir que a fase anterior já
// tenha sido concluída por este usuário (desbloqueio sequencial).
export async function POST(req: Request) {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { fase_ordem, envio } = await req.json().catch(() => ({}));
  const ordem = Number(fase_ordem);
  const fase = getFase(ordem);
  if (!fase)
    return NextResponse.json({ erro: "Fase inválida." }, { status: 400 });
  if (!envio || typeof envio.tipo !== "string")
    return NextResponse.json({ erro: "Envio inválido." }, { status: 400 });

  try {
    return await transacao(async (conn) => {
      if (ordem > 1) {
        const [anterior] = await conn.query(
          "SELECT 1 FROM progresso WHERE usuario_id = ? AND fase_ordem = ? LIMIT 1",
          [u.id, ordem - 1],
        );
        if ((anterior as unknown[]).length === 0) {
          throw new SaidaTransacao(
            NextResponse.json({ erro: "Conclua o contrato anterior primeiro." }, { status: 409 }),
          );
        }
      }

      if (!desafioResolvido(ordem, envio as EnvioDesafio)) {
        throw new SaidaTransacao(
          NextResponse.json({ erro: "Resposta incorreta." }, { status: 422 }),
        );
      }

      // INSERT IGNORE: se já concluída, affectedRows = 0 (não repete recompensa).
      const [res] = await conn.query(
        "INSERT IGNORE INTO progresso (usuario_id, fase_ordem, xp) VALUES (?, ?, ?)",
        [u.id, ordem, fase.xp],
      );
      const primeiraVez = (res as { affectedRows: number }).affectedRows > 0;

      let moedasGanhas = 0;
      if (primeiraVez) {
        moedasGanhas = moedasDaFase(fase);
        await conn.query("UPDATE usuarios SET moedas = moedas + ? WHERE id = ?", [
          moedasGanhas,
          u.id,
        ]);
      }

      return NextResponse.json({
        ok: true,
        primeiraVez,
        xpGanho: primeiraVez ? fase.xp : 0,
        moedasGanhas,
      });
    });
  } catch (e) {
    if (e instanceof SaidaTransacao) return e.resposta;
    throw e;
  }
}
