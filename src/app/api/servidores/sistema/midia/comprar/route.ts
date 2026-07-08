import { NextResponse } from "next/server";
import { transacao, SaidaTransacao } from "@/lib/db";
import { usuarioAtual } from "@/lib/auth";
import { getSistemaOperacional, type SistemaOperacionalId } from "@/content/sistemasOperacionais";
import { garantirServidor } from "@/lib/servidores";

function parseMidias(valor: unknown): SistemaOperacionalId[] {
  try {
    const parsed = typeof valor === "string" ? JSON.parse(valor) : valor;
    return Array.isArray(parsed) ? parsed.filter((id): id is SistemaOperacionalId => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export async function POST(req: Request) {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { osId } = await req.json().catch(() => ({}));
  const so = getSistemaOperacional(String(osId ?? ""));
  if (!so) return NextResponse.json({ erro: "Sistema operacional inválido." }, { status: 400 });

  await garantirServidor(u.id);

  try {
    return await transacao(async (conn) => {
      const [linhaServidor] = await conn.query(
        "SELECT midias_so FROM servidores WHERE usuario_id = ? FOR UPDATE",
        [u.id],
      );
      const midias = parseMidias((linhaServidor as { midias_so: unknown }[])[0]?.midias_so);
      if (midias.includes(so.id)) {
        throw new SaidaTransacao(
          NextResponse.json({ erro: "Você já tem essa mídia de instalação." }, { status: 409 }),
        );
      }

      const [linhas] = await conn.query("SELECT moedas FROM usuarios WHERE id = ? FOR UPDATE", [u.id]);
      const moedas = (linhas as { moedas: number }[])[0]?.moedas ?? 0;
      if (moedas < so.preco) {
        throw new SaidaTransacao(NextResponse.json({ erro: "Moedas insuficientes." }, { status: 402 }));
      }

      const proximas = [...midias, so.id];
      await conn.query("UPDATE usuarios SET moedas = moedas - ? WHERE id = ?", [so.preco, u.id]);
      await conn.query("UPDATE servidores SET midias_so = ? WHERE usuario_id = ?", [
        JSON.stringify(proximas),
        u.id,
      ]);

      return NextResponse.json({ ok: true, midiasSo: proximas, moedas: moedas - so.preco });
    });
  } catch (e) {
    if (e instanceof SaidaTransacao) return e.resposta;
    throw e;
  }
}
