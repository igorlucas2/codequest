import { NextResponse } from "next/server";
import { executar, consultar } from "@/lib/db";
import { usuarioAtual } from "@/lib/auth";
import { carregarCombatente } from "@/lib/personagem";
import { gerarRodadas } from "@/lib/rodadasCombate";
import { carregarConfigRede, alcancaZona } from "@/lib/rede";
import { carregarInfraServidor } from "@/lib/servidores";
import { setorDoUsuario } from "@/content/rede";

const MAX_DUELOS_PENDENTES = 3;

// Propõe um duelo: gera as rodadas de digitação e guarda um snapshot dos
// stats de ambos os lados em duelos_pendentes. Não decide nada ainda — o
// resultado só é resolvido em /api/arena/duelar/confirmar, depois que o
// jogador digitar as rodadas.
export async function POST(req: Request) {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { oponenteId } = await req.json().catch(() => ({}));
  const oppId = Number(oponenteId);
  if (!oppId || oppId === u.id)
    return NextResponse.json({ erro: "Oponente inválido." }, { status: 400 });

  const eu = await carregarCombatente(u.id);
  const oponente = await carregarCombatente(oppId);
  if (!eu || !oponente)
    return NextResponse.json({ erro: "Oponente não encontrado." }, { status: 404 });

  // Ponto de aplicação real da regra de alcance de rede — o que a UI mostra
  // trancado em Alvos.tsx é só cosmético até este check aqui.
  const minhaConfig = await carregarConfigRede(u.id);
  const { internetAtiva } = await carregarInfraServidor(u.id);
  const alcance = alcancaZona(setorDoUsuario(u.id), setorDoUsuario(oppId), minhaConfig, internetAtiva);
  if (!alcance.ok) return NextResponse.json({ erro: alcance.motivo }, { status: 403 });

  const rounds = gerarRodadas(oponente.stats.nivel);

  // Faxina oportunista: sem cron por trás, então cada novo "Invadir" também
  // limpa propostas abandonadas (nunca confirmadas) de qualquer jogador.
  await executar("DELETE FROM duelos_pendentes WHERE criado_em < (NOW() - INTERVAL 3 MINUTE)");

  // Sem isso, um script pode chamar "Invadir" em loop sem nunca confirmar,
  // empilhando linhas indefinidamente (só limpas de forma oportunista acima).
  const [{ n: pendentes }] = await consultar<{ n: number }>(
    "SELECT COUNT(*) AS n FROM duelos_pendentes WHERE desafiante_id = ?",
    [u.id],
  );
  if (pendentes >= MAX_DUELOS_PENDENTES)
    return NextResponse.json(
      { erro: "Você já tem invasões pendentes demais. Conclua ou aguarde expirar antes de invadir de novo." },
      { status: 429 },
    );

  const resultado = await executar(
    `INSERT INTO duelos_pendentes
       (desafiante_id, oponente_id, rounds,
        vida_desafiante, ataque_desafiante, defesa_desafiante,
        vida_oponente, ataque_oponente, defesa_oponente, nivel_oponente)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      u.id,
      oppId,
      JSON.stringify(rounds),
      eu.stats.vida,
      eu.stats.ataque,
      eu.stats.defesa,
      oponente.stats.vida,
      oponente.stats.ataque,
      oponente.stats.defesa,
      oponente.stats.nivel,
    ],
  );

  return NextResponse.json({
    duelId: resultado.insertId,
    voce: {
      id: eu.id,
      nome: eu.nome,
      ficha: eu.ficha,
      vida: eu.stats.vida,
      ataque: eu.stats.ataque,
      defesa: eu.stats.defesa,
      servidorTier: eu.servidorTier,
    },
    oponente: {
      id: oponente.id,
      nome: oponente.nome,
      ficha: oponente.ficha,
      vida: oponente.stats.vida,
      ataque: oponente.stats.ataque,
      defesa: oponente.stats.defesa,
      servidorTier: oponente.servidorTier,
    },
    rounds,
  });
}
