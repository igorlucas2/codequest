import { NextResponse } from "next/server";
import { consultar } from "@/lib/db";
import { usuarioAtual } from "@/lib/auth";
import { garantirServidor } from "@/lib/servidores";
import { carregarConfigRede } from "@/lib/rede";
import { ZONAS, setorDoUsuario } from "@/content/rede";

// Status da rede do usuário logado: zona atribuída, configuração atual (se
// já configurou) e o roster de todas as zonas (pra desenhar a topologia).
export async function GET() {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  await garantirServidor(u.id);
  const cfg = await carregarConfigRede(u.id);
  const zonaId = setorDoUsuario(u.id);

  const alunos = await consultar<{ id: number; nome: string }>(
    "SELECT id, nome FROM usuarios WHERE papel = 'aluno'",
  );

  const zonas = ZONAS.map((zona) => ({
    id: zona.id,
    nome: zona.nome,
    corLed: zona.corLed,
    membros: alunos
      .filter((a) => setorDoUsuario(a.id) === zona.id)
      .map((a) => ({ id: a.id, nome: a.nome, voce: a.id === u.id })),
  }));

  return NextResponse.json({
    zonaId,
    zona: ZONAS[zonaId],
    config: cfg.configurada ? { ip: cfg.ip, mascara: cfg.mascara, gateway: cfg.gateway } : null,
    configurada: cfg.configurada,
    zonas,
  });
}
