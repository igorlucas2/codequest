import { NextResponse } from "next/server";
import { transacao, SaidaTransacao } from "@/lib/db";
import { usuarioAtual } from "@/lib/auth";
import { getSistemaOperacional } from "@/content/sistemasOperacionais";
import { garantirServidor, carregarEstadoOperacional } from "@/lib/servidores";

// Instala (compra) um sistema operacional no servidor: valida saldo no
// servidor, nunca no cliente — mesmo padrão transacional de upgrade/comprar.
// Comprar um novo SO é "formatar e reinstalar": substitui o anterior.
export async function POST(req: Request) {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { osId } = await req.json().catch(() => ({}));
  const so = getSistemaOperacional(String(osId ?? ""));
  if (!so) return NextResponse.json({ erro: "Sistema operacional inválido." }, { status: 400 });

  await garantirServidor(u.id);
  const estado = await carregarEstadoOperacional(u.id);
  if (estado.ligado) {
    return NextResponse.json(
      { erro: "Desligue o servidor no Datacenter antes de instalar ou trocar o sistema operacional." },
      { status: 400 },
    );
  }

  try {
    return await transacao(async (conn) => {
      // Trava a linha do servidor antes de checar "já instalado?" — sem
      // isso, um duplo clique trocando pra dois SOs diferentes podia
      // debitar moedas duas vezes e persistir só um (last-write-wins).
      const [linhaServidor] = await conn.query(
        "SELECT sistema_operacional FROM servidores WHERE usuario_id = ? FOR UPDATE",
        [u.id],
      );
      const atual = (linhaServidor as { sistema_operacional: string | null }[])[0]?.sistema_operacional ?? null;
      if (atual === so.id) {
        throw new SaidaTransacao(
          NextResponse.json({ erro: "Esse sistema operacional já está instalado." }, { status: 409 }),
        );
      }

      const [linhas] = await conn.query("SELECT moedas FROM usuarios WHERE id = ? FOR UPDATE", [u.id]);
      const moedas = (linhas as { moedas: number }[])[0]?.moedas ?? 0;
      if (moedas < so.preco) {
        throw new SaidaTransacao(NextResponse.json({ erro: "Moedas insuficientes." }, { status: 402 }));
      }

      await conn.query("UPDATE usuarios SET moedas = moedas - ? WHERE id = ?", [so.preco, u.id]);
      // Reinstalação = SO novo, serviço sshd ainda não ligado (mesmo que o SO
      // anterior já tivesse sido habilitado) — precisa habilitar de novo.
      await conn.query(
        "UPDATE servidores SET sistema_operacional = ?, ssh_habilitado = 0 WHERE usuario_id = ?",
        [so.id, u.id],
      );

      return NextResponse.json({ ok: true, sistemaOperacional: so.id, moedas: moedas - so.preco });
    });
  } catch (e) {
    if (e instanceof SaidaTransacao) return e.resposta;
    throw e;
  }
}
