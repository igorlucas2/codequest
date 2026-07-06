import { NextResponse } from "next/server";
import { transacao, SaidaTransacao } from "@/lib/db";
import { usuarioAtual } from "@/lib/auth";
import { custoUnidadeNoTier } from "@/content/servidores";
import { getSwitchTier } from "@/content/switches";
import { garantirServidor, carregarInfraServidorParaAtualizar } from "@/lib/servidores";

// Compra um servidor extra — cópia idêntica do rack principal (mesmo tier/
// SO/rede), só soma capacidade e bônus de combate (ver plano). A partir do
// 2º servidor, exige um switch com portas suficientes pra frota inteira.
export async function POST() {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  await garantirServidor(u.id);

  try {
    return await transacao(async (conn) => {
      // Trava a linha do servidor antes de checar portas/frota — sem
      // isso, duas compras simultâneas liam a mesma frota "antiga" e
      // podiam ultrapassar juntas a capacidade do switch já instalado.
      const { tier, servidoresExtras, switchTier } = await carregarInfraServidorParaAtualizar(conn, u.id);
      const custo = custoUnidadeNoTier(tier);
      const numeroTotalApos = 1 + servidoresExtras + 1;

      if (numeroTotalApos > 1) {
        const portas = switchTier ? (getSwitchTier(switchTier)?.portas ?? 0) : 0;
        if (portas < numeroTotalApos) {
          throw new SaidaTransacao(
            NextResponse.json(
              { erro: "Compre um switch com portas suficientes antes de adicionar outro servidor." },
              { status: 409 },
            ),
          );
        }
      }

      const [linhas] = await conn.query("SELECT moedas FROM usuarios WHERE id = ? FOR UPDATE", [u.id]);
      const moedas = (linhas as { moedas: number }[])[0]?.moedas ?? 0;
      if (moedas < custo) {
        throw new SaidaTransacao(NextResponse.json({ erro: "Moedas insuficientes." }, { status: 402 }));
      }

      await conn.query("UPDATE usuarios SET moedas = moedas - ? WHERE id = ?", [custo, u.id]);
      await conn.query(
        "UPDATE servidores SET servidores_extras = servidores_extras + 1 WHERE usuario_id = ?",
        [u.id],
      );

      return NextResponse.json({ ok: true, moedas: moedas - custo });
    });
  } catch (e) {
    if (e instanceof SaidaTransacao) return e.resposta;
    throw e;
  }
}
