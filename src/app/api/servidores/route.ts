import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/auth";
import { SERVIDOR_TIERS, getServidorTier, proximoTier, custoUnidadeNoTier } from "@/content/servidores";
import { APPS, getApp } from "@/content/apps";
import { SISTEMAS_OPERACIONAIS } from "@/content/sistemasOperacionais";
import { SWITCH_TIERS, getSwitchTier } from "@/content/switches";
import {
  garantirServidor,
  carregarInfraServidor,
  carregarAppsInstalados,
  carregarStatusSistema,
  carregarLayoutEquipamentos,
  carregarEstadoOperacional,
  carregarMidiasSistema,
  capacidadeUsada,
  acumuloDoApp,
  acumuloTotal,
  multiplicarPorFrota,
} from "@/lib/servidores";

// Status completo do servidor do usuário logado: tier atual, próximo upgrade,
// apps instalados (com pendente por app), frota (servidores extras + switch +
// internet) e o catálogo pra instalar/comprar mais.
export async function GET() {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  await garantirServidor(u.id);
  const { tier: tierId, servidoresExtras, switchTier, internetAtiva } = await carregarInfraServidor(u.id);
  const tierInfo = getServidorTier(tierId) ?? SERVIDOR_TIERS[0];
  const instalados = await carregarAppsInstalados(u.id);
  const { sistemaOperacional, sshHabilitado } = await carregarStatusSistema(u.id);
  const layoutSalvo = await carregarLayoutEquipamentos(u.id);
  const estadoOperacional = await carregarEstadoOperacional(u.id);
  const midiasSistema = await carregarMidiasSistema(u.id);

  const apps = instalados.map((a) => {
    const cat = getApp(a.appId);
    return {
      appId: a.appId,
      nome: cat?.nome ?? a.appId,
      icone: cat?.icone ?? "❔",
      crPorHora: cat?.crPorHora ?? 0,
      capacidade: cat?.capacidade ?? 0,
      instaladoEm: a.instaladoEm,
      ultimaColeta: a.ultimaColeta,
      pendente: acumuloDoApp(a),
    };
  });

  const numeroTotalServidores = 1 + servidoresExtras;
  const proximo = proximoTier(tierId) ?? null;
  const switchInfo = switchTier ? (getSwitchTier(switchTier) ?? null) : null;

  return NextResponse.json({
    tier: tierId,
    tierInfo,
    proximoTier: proximo,
    custoUpgrade: proximo ? multiplicarPorFrota(proximo.preco, servidoresExtras) : null,
    capacidadeUsada: capacidadeUsada(instalados),
    capacidadeTotal: multiplicarPorFrota(tierInfo.capacidade, servidoresExtras),
    apps,
    catalogoApps: APPS.map((a) => ({ ...a, instalado: instalados.some((i) => i.appId === a.id) })),
    pendenteTotal: acumuloTotal(instalados),
    sistemaOperacional,
    sshHabilitado,
    catalogoSO: SISTEMAS_OPERACIONAIS,
    servidoresExtras,
    numeroTotalServidores,
    custoNovaUnidade: custoUnidadeNoTier(tierId),
    switchTier,
    switchInfo,
    catalogoSwitch: SWITCH_TIERS,
    internetAtiva,
    estadoOperacional,
    midiasSistema,
    layoutSalvo,
  });
}
