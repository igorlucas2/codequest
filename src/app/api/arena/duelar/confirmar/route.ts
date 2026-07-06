import { NextResponse } from "next/server";
import { transacao, SaidaTransacao } from "@/lib/db";
import { usuarioAtual } from "@/lib/auth";
import { carregarCombatente } from "@/lib/personagem";
import { resolverDuelo } from "@/lib/combate";
import { normalizar } from "@/lib/texto";
import { concederItemPorVitoria } from "@/lib/conquistasPvp";
import type { RodadaCombate } from "@/lib/rodadasCombate";

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
// Folga extra pro total (não por rodada): cobre a latência da própria
// requisição de confirmação e o tempo de leitura da narrativa entre
// rodadas, que não entram no elapsedMs de nenhuma rodada individual.
const FOLGA_TOTAL_MS = 3000;

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
  criado_em: string | Date;
};

export async function POST(req: Request) {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const corpo = await req.json().catch(() => ({}));
  const duelId = Number(corpo.duelId);
  const rodadas: unknown = corpo.rodadas;
  if (!duelId || !Array.isArray(rodadas))
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });

  let dados;
  try {
    dados = await transacao(async (conn) => {
      // FOR UPDATE trava a linha do duelo: uma segunda confirmação
      // concorrente para o MESMO duelId fica bloqueada aqui até esta
      // transação commitar (e apagar a linha) — quando ela for liberada, o
      // SELECT não encontra mais nada e cai no 404 abaixo. É isso que
      // impede o duplo crédito de moedas que existia antes.
      const [linhas] = await conn.query(
        `SELECT *, (criado_em < (NOW() - INTERVAL 3 MINUTE)) AS expirado
           FROM duelos_pendentes WHERE id = ? AND desafiante_id = ? FOR UPDATE`,
        [duelId, u.id],
      );
      const pendente = (linhas as LinhaPendente[])[0];
      if (!pendente)
        throw new SaidaTransacao(
          NextResponse.json({ erro: "Duelo não encontrado." }, { status: 404 }),
        );

      if (pendente.expirado) {
        await conn.query("DELETE FROM duelos_pendentes WHERE id = ?", [duelId]);
        throw new SaidaTransacao(
          NextResponse.json({ erro: "Duelo expirado. Tente invadir de novo." }, { status: 410 }),
        );
      }

      const esperadas = pendente.rounds;
      if (rodadas.length !== esperadas.length)
        throw new SaidaTransacao(
          NextResponse.json({ erro: "Número de rodadas não confere." }, { status: 400 }),
        );

      // Soma dos elapsedMs relatados não pode superar o tempo real de
      // parede desde que o duelo foi proposto (criado_em) — cada rodada
      // acontece em sequência no tempo real, então a soma delas é um piso
      // físico do quanto já se passou. Um cliente automatizado que responde
      // instantaneamente mas declara elapsedMs plausíveis por rodada é
      // pego aqui, mesmo passando nos dois checks por rodada abaixo.
      const tempoRealDecorridoMs = Date.now() - new Date(pendente.criado_em).getTime();
      const somaElapsedRelatado = rodadas.reduce((soma: number, r: unknown) => {
        const elapsedMs = typeof (r as { elapsedMs?: unknown })?.elapsedMs === "number"
          ? (r as { elapsedMs: number }).elapsedMs
          : 0;
        return soma + Math.max(0, elapsedMs);
      }, 0);
      const tempoTotalPlausivel = somaElapsedRelatado <= tempoRealDecorridoMs + FOLGA_TOTAL_MS;

      const acertos = esperadas.map((rodada, i) => {
        const enviada = rodadas[i] as { texto?: unknown; elapsedMs?: unknown };
        const texto = typeof enviada?.texto === "string" ? enviada.texto : "";
        const elapsedMs = typeof enviada?.elapsedMs === "number" ? enviada.elapsedMs : -1;

        const textoCorreto = normalizar(texto) === normalizar(rodada.resposta);
        const dentroDoTempo = elapsedMs <= rodada.limiteMs + FOLGA_MS;
        const minimoPlausivel = Math.max(
          MS_MINIMO_PISO,
          rodada.resposta.length * MS_MINIMO_POR_CARACTERE,
        );
        const plausivel = elapsedMs >= minimoPlausivel;

        return textoCorreto && dentroDoTempo && plausivel && tempoTotalPlausivel;
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

      // Cooldown: já ganhou moedas deste oponente na última hora? Checado
      // dentro da mesma transação que trava o duelo, então não corre risco
      // de duas confirmações verem "0 recentes" ao mesmo tempo.
      let moedasGanhas = 0;
      if (voceGanhou) {
        const [recente] = await conn.query(
          `SELECT COUNT(*) AS n FROM batalhas
            WHERE desafiante_id = ? AND oponente_id = ? AND moedas_premio > 0
              AND criado_em > (NOW() - INTERVAL 1 HOUR)`,
          [u.id, pendente.oponente_id],
        );
        if (((recente as { n: number }[])[0]?.n ?? 0) === 0) {
          moedasGanhas = premioPorVitoria(pendente.nivel_oponente);
        }
      }

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

      return { resultado, voceGanhou, moedasGanhas, pendente };
    });
  } catch (e) {
    if (e instanceof SaidaTransacao) return e.resposta;
    throw e;
  }

  const { resultado, voceGanhou, moedasGanhas, pendente } = dados;

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
