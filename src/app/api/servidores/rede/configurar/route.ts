import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { usuarioAtual } from "@/lib/auth";
import {
  garantirServidor,
  carregarInfraServidor,
  carregarStatusSistema,
  carregarEstadoOperacional,
  carregarMidiasSistema,
} from "@/lib/servidores";
import { getZona, ipValidoNaZona, setorDoUsuario, MASCARA_CORRETA } from "@/content/rede";

// Grava a configuração de rede do servidor. O wizard já validou tudo
// localmente pro feedback ser instantâneo, mas o servidor RE-VALIDA os 3
// campos contra a zona calculada aqui (nunca confia em zona vinda do
// client) antes de gravar — é o único ponto que precisa validação real,
// já que "rede_configurada" é exatamente o que a regra de alcance confere.
export async function POST(req: Request) {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  await garantirServidor(u.id);
  const { internetAtiva } = await carregarInfraServidor(u.id);
  if (!internetAtiva) {
    return NextResponse.json({ erro: "Contrate a internet antes de configurar a rede." }, { status: 400 });
  }
  const { sistemaOperacional } = await carregarStatusSistema(u.id);
  if (!sistemaOperacional) {
    return NextResponse.json(
      { erro: "Instale um sistema operacional antes de configurar a rede." },
      { status: 400 },
    );
  }
  const estado = await carregarEstadoOperacional(u.id);
  if (!estado.online) {
    return NextResponse.json({ erro: "Ligue o servidor e aguarde o boot antes de configurar a rede." }, { status: 400 });
  }
  const midias = await carregarMidiasSistema(u.id);
  if (midias.midiaBoot) {
    return NextResponse.json(
      { erro: "O servidor está no instalador live. Ejete a mídia e ligue pelo disco antes de configurar IP." },
      { status: 400 },
    );
  }
  if (!estado.patchCordConectado) {
    return NextResponse.json({ erro: "Conecte o patch cord no servidor antes de configurar IP." }, { status: 400 });
  }

  const { ip, mascara, gateway } = await req.json().catch(() => ({}));
  const zonaId = setorDoUsuario(u.id);
  const zona = getZona(zonaId);
  if (!zona) return NextResponse.json({ erro: "Zona inválida." }, { status: 500 });

  if (typeof ip !== "string" || !ipValidoNaZona(ip, zonaId)) {
    return NextResponse.json(
      { erro: `IP inválido para o ${zona.nome} (precisa estar em ${zona.cidr}).` },
      { status: 400 },
    );
  }
  if (typeof mascara !== "string" || mascara !== MASCARA_CORRETA) {
    return NextResponse.json({ erro: "Máscara de sub-rede incorreta." }, { status: 400 });
  }
  if (typeof gateway !== "string" || gateway.trim() !== zona.gateway) {
    return NextResponse.json(
      { erro: `Gateway incorreto — o gateway do ${zona.nome} é ${zona.gateway}.` },
      { status: 400 },
    );
  }

  await pool.query(
    "UPDATE servidores SET rede_ip = ?, rede_mascara = ?, rede_gateway = ?, rede_configurada = 1 WHERE usuario_id = ?",
    [ip.trim(), mascara, gateway.trim(), u.id],
  );

  return NextResponse.json({ ok: true });
}
