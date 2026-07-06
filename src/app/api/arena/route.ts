import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/auth";
import { carregarAlunosComStats } from "@/lib/personagem";
import { carregarConfigRede, alcancaZona } from "@/lib/rede";
import { carregarInfraServidor } from "@/lib/servidores";
import { setorDoUsuario } from "@/content/rede";

// Lista os possíveis oponentes (outros alunos) para a arena. Cada um ganha
// a própria zona de rede + se está alcançável a partir da zona/config do
// requisitante — alvos de outra zona continuam visíveis (melhor pra ensinar
// que esconder), só aparecem trancados até o gateway estar configurado.
export async function GET() {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const minhaZona = setorDoUsuario(u.id);
  const minhaConfig = await carregarConfigRede(u.id);
  const { internetAtiva } = await carregarInfraServidor(u.id);

  const alunos = await carregarAlunosComStats();
  const oponentes = alunos
    .filter((a) => a.id !== u.id)
    .sort((a, b) => b.stats.poder - a.stats.poder)
    .map((a) => {
      const zonaId = setorDoUsuario(a.id);
      const alcance = alcancaZona(minhaZona, zonaId, minhaConfig, internetAtiva);
      return {
        ...a,
        zonaId,
        alcancavel: alcance.ok,
        motivoBloqueio: alcance.ok ? null : alcance.motivo,
      };
    });

  return NextResponse.json({ oponentes });
}
