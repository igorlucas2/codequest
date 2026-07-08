import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/auth";
import {
  garantirServidor,
  carregarStatusSistema,
  carregarEstadoOperacional,
  carregarMidiasSistema,
} from "@/lib/servidores";
import { carregarConfigRede } from "@/lib/rede";

// Status mínimo pro programa "SSH" do desktop: IP configurado (se houver),
// qual sistema operacional está instalado e se o serviço sshd foi
// habilitado (via console local — ver Servidor → Sistema Operacional) — o
// suficiente pra decidir se a conexão fictícia deve ter sucesso ou explicar
// por que não.
export async function GET() {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  await garantirServidor(u.id);
  const cfg = await carregarConfigRede(u.id);
  const { sistemaOperacional, sshHabilitado } = await carregarStatusSistema(u.id);
  const estadoOperacional = await carregarEstadoOperacional(u.id);
  const midias = await carregarMidiasSistema(u.id);
  const bootandoMidia = estadoOperacional.online && midias.midiaBoot !== null;

  return NextResponse.json({
    ip: cfg.configurada ? cfg.ip : null,
    configurada: cfg.configurada,
    sistemaOperacional,
    sshHabilitado,
    online: estadoOperacional.online && !bootandoMidia,
    ligando: estadoOperacional.ligando,
    bootandoMidia,
    sshUsuario: estadoOperacional.sshUsuario,
    patchCordConectado: estadoOperacional.patchCordConectado,
  });
}
