import { NextResponse } from "next/server";
import { consultar } from "@/lib/db";
import { usuarioAtual } from "@/lib/auth";

type LinhaBatalha = {
  id: number;
  desafiante_id: number;
  oponente_id: number;
  vencedor_id: number | null;
  moedas_premio: number;
  criado_em: string;
  nome_desafiante: string;
  nome_oponente: string;
};

// Últimas invasões envolvendo o jogador — tanto como atacante quanto como
// alvo defendido. Só leitura (sem cooldown/recompensa aqui, isso já foi
// decidido e gravado em /api/arena/duelar/confirmar).
export async function GET() {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const linhas = await consultar<LinhaBatalha>(
    `SELECT b.id, b.desafiante_id, b.oponente_id, b.vencedor_id, b.moedas_premio, b.criado_em,
            ud.nome AS nome_desafiante, uo.nome AS nome_oponente
       FROM batalhas b
       JOIN usuarios ud ON ud.id = b.desafiante_id
       JOIN usuarios uo ON uo.id = b.oponente_id
      WHERE b.desafiante_id = ? OR b.oponente_id = ?
      ORDER BY b.criado_em DESC
      LIMIT 20`,
    [u.id, u.id],
  );

  const registros = linhas.map((l) => {
    const souAtacante = l.desafiante_id === u.id;
    return {
      id: l.id,
      oponenteNome: souAtacante ? l.nome_oponente : l.nome_desafiante,
      souAtacante,
      venceu: l.vencedor_id === u.id,
      moedasGanhas: souAtacante ? l.moedas_premio : 0,
      criadoEm: l.criado_em,
    };
  });

  return NextResponse.json({ registros });
}
