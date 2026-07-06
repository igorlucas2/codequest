import { NextResponse } from "next/server";
import { pool, consultar } from "@/lib/db";
import { usuarioAtual } from "@/lib/auth";
import { carregarCombatente } from "@/lib/personagem";
import { resolverDuelo } from "@/lib/combate";
import { normalizar } from "@/lib/texto";
import { concederItemPorVitoria } from "@/lib/conquistasPvp";
import type { RodadaCombate } from "@/lib/desafiosCombate";

// Prêmio por vitória. Cooldown: só rende moedas contra o MESMO oponente uma
// vez por hora, para não virar farm de moedas.
function premioPorVitoria(nivelOponente: number) {
  return 10 + nivelOponente * 2;
}

// Folga de rede/reação além do limite anunciado ao cliente, e um piso de
// tempo mínimo plausível pra digitar cada comando (rejeita respostas
// forjadas/instantâneas sem penalizar digitação humana rápida de verdade.
const FOLGA_MS = 800;
const MS_MINIMO_POR_CARACTERE = 25;
const MS_MINIMO_PISO = 150;

type LinhaPendente = {
  id: number;
  desafiante_id: number;
  oponente_id: number;
  rounds: RodadaCombate[];
  vida_desafiante: number;
  ataque_desafiante: number;
  defesa_desafiante: number;
  vida_oponente: number;
  ataque_oponente: number;
  defesa_oponente: number;
  nivel_oponente: number;
  expirado: number;
};

export async function POST(req: Request) {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const corpo = await req.json().catch(() => ({}));
  const duelId = Number(corpo.duelId);
  const rodadas: unknown = corpo.rodadas;
  if (!duelId || !Array.isArray(rodadas))
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });

  const [pendente] = await consultar<LinhaPendente>(
    `SELECT *, (criado_em < (NOW() - INTERVAL 3 MINUTE)) AS expirado
       FROM duelos_pendentes WHERE id = ? AND desafiante_id = ?`,
    [duelId, u.id],
  );
  if (!pendente)
    return NextResponse.json({ erro: "Duelo não encontrado." }, { status: 404 });

  if (pendente.expirado) {
    await pool.query("DELETE FROM duelos_pendentes WHERE id = ?", [duelId]);
    return NextResponse.json({ erro: "Duelo expirado. Tente invadir de novo." }, { status: 410 });
  }

  const esperadas = pendente.rounds;
  if (rodadas.length !== esperadas.length)
    return NextResponse.json({ erro: "Número de rodadas não confere." }, { status: 400 });

  const acertos = esperadas.map((rodada, i) => {
    const enviada = rodadas[i] as { texto?: unknown; elapsedMs?: unknown };
    const texto = typeof enviada?.texto === "string" ? enviada.texto : "";
    const elapsedMs = typeof enviada?.elapsedMs === "number" ? enviada.elapsedMs : -1;

    const textoCorreto = normalizar(texto) === normalizar(rodada.resposta);
    const dentroDoTempo = elapsedMs <= rodada.limiteMs + FOLGA_MS;
    const minimoPlausivel = Math.max(MS_MINIMO_PISO, rodada.resposta.length * MS_MINIMO_POR_CARACTERE);
    const plausivel = elapsedMs >= minimoPlausivel;

    return textoCorreto && dentroDoTempo && plausivel;
  });

  const resultado = resolverDuelo({
    jogador: {
      id: pendente.desafiante_id,
      vida: pendente.vida_desafiante,
      ataque: pendente.ataque_desafiante,
      defesa: pendente.defesa_desafiante,
    },
    oponente: {
      id: pendente.oponente_id,
      vida: pendente.vida_oponente,
      ataque: pendente.ataque_oponente,
      defesa: pendente.defesa_oponente,
    },
    acertos,
  });
  const voceGanhou = resultado.vencedorId === u.id;

  // Cooldown: já ganhou moedas deste oponente na última hora?
  let moedasGanhas = 0;
  if (voceGanhou) {
    const [recente] = await consultar<{ n: number }>(
      `SELECT COUNT(*) AS n FROM batalhas
        WHERE desafiante_id = ? AND oponente_id = ? AND moedas_premio > 0
          AND criado_em > (NOW() - INTERVAL 1 HOUR)`,
      [u.id, pendente.oponente_id],
    );
    if ((recente?.n ?? 0) === 0) {
      moedasGanhas = premioPorVitoria(pendente.nivel_oponente);
    }
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      "INSERT INTO batalhas (desafiante_id, oponente_id, vencedor_id, moedas_premio) VALUES (?, ?, ?, ?)",
      [u.id, pendente.oponente_id, resultado.vencedorId, moedasGanhas],
    );
    if (moedasGanhas > 0) {
      await conn.query("UPDATE usuarios SET moedas = moedas + ? WHERE id = ?", [
        moedasGanhas,
        u.id,
      ]);
    }
    await conn.query("DELETE FROM duelos_pendentes WHERE id = ?", [duelId]);
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }

  const [eu, oponente] = await Promise.all([
    carregarCombatente(pendente.desafiante_id),
    carregarCombatente(pendente.oponente_id),
  ]);

  // Depois de creditada a vitória em batalhas, confere se ela bateu um marco
  // de vitórias que concede um item exclusivo (não à venda no Mercado).
  const itemDesbloqueado = voceGanhou ? await concederItemPorVitoria(u.id) : null;

  return NextResponse.json({
    voce: {
      id: pendente.desafiante_id,
      nome: eu?.nome ?? "Você",
      ficha: eu?.ficha,
      vida: pendente.vida_desafiante,
      ataque: pendente.ataque_desafiante,
      defesa: pendente.defesa_desafiante,
      servidorTier: eu?.servidorTier ?? "node",
    },
    oponente: {
      id: pendente.oponente_id,
      nome: oponente?.nome ?? "Runner",
      ficha: oponente?.ficha,
      vida: pendente.vida_oponente,
      ataque: pendente.ataque_oponente,
      defesa: pendente.defesa_oponente,
      servidorTier: oponente?.servidorTier ?? "node",
    },
    turnos: resultado.turnos,
    vencedorId: resultado.vencedorId,
    voceGanhou,
    moedasGanhas,
    itemDesbloqueado: itemDesbloqueado
      ? { id: itemDesbloqueado.id, nome: itemDesbloqueado.nome, icone: itemDesbloqueado.icone }
      : null,
  });
}
