import { NextResponse } from "next/server";
import { executar } from "@/lib/db";
import { usuarioAtual } from "@/lib/auth";
import { garantirServidor, carregarStatusSistema } from "@/lib/servidores";

// Marca o serviço sshd como habilitado — chamado depois que o jogador roda,
// no console local (ver ServidorSistema.tsx), o comando real de ligar o
// serviço da distro instalada. Não valida QUAL comando foi digitado (quem
// decide isso é o client, mesmo modelo de confiança de conteúdo público já
// usado no resto do jogo) — só confere que existe um SO instalado.
export async function POST() {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  await garantirServidor(u.id);
  const { sistemaOperacional } = await carregarStatusSistema(u.id);
  if (!sistemaOperacional) {
    return NextResponse.json({ erro: "Nenhum sistema operacional instalado." }, { status: 400 });
  }

  await executar("UPDATE servidores SET ssh_habilitado = 1 WHERE usuario_id = ?", [u.id]);

  return NextResponse.json({ ok: true });
}
