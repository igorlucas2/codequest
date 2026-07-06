import "server-only";
import { consultar, executar } from "@/lib/db";
import { getServidorTier, type ServidorTierId } from "@/content/servidores";
import { getApp } from "@/content/apps";
import type { SistemaOperacionalId } from "@/content/sistemasOperacionais";
import type { SwitchTierId } from "@/content/switches";

// Teto de acúmulo: evita "hoardar" dias de renda parada sem logar — mesmo
// espírito dos cooldowns de 1x/hora (arena) e 1x/dia (invasão) já existentes.
const CAP_HORAS_ACUMULO = 12;

export type AppInstalado = {
  appId: string;
  instaladoEm: Date;
  ultimaColeta: Date;
};

// Garante que o usuário tem um servidor, provisionando um 'node' grátis na
// primeira visita (mesmo espírito de inventário: só existe quando precisa).
export async function garantirServidor(usuarioId: number): Promise<ServidorTierId> {
  const linhas = await consultar<{ tier: ServidorTierId }>(
    "SELECT tier FROM servidores WHERE usuario_id = ? LIMIT 1",
    [usuarioId],
  );
  if (linhas[0]) return linhas[0].tier;
  await executar("INSERT IGNORE INTO servidores (usuario_id, tier) VALUES (?, 'node')", [usuarioId]);
  return "node";
}

export async function carregarStatusSistema(
  usuarioId: number,
): Promise<{ sistemaOperacional: SistemaOperacionalId | null; sshHabilitado: boolean }> {
  const linhas = await consultar<{
    sistema_operacional: SistemaOperacionalId | null;
    ssh_habilitado: number;
  }>(
    "SELECT sistema_operacional, ssh_habilitado FROM servidores WHERE usuario_id = ? LIMIT 1",
    [usuarioId],
  );
  return {
    sistemaOperacional: linhas[0]?.sistema_operacional ?? null,
    sshHabilitado: linhas[0]?.ssh_habilitado === 1,
  };
}

export async function carregarAppsInstalados(usuarioId: number): Promise<AppInstalado[]> {
  const linhas = await consultar<{ app_id: string; instalado_em: Date; ultima_coleta: Date }>(
    "SELECT app_id, instalado_em, ultima_coleta FROM apps_instalados WHERE usuario_id = ?",
    [usuarioId],
  );
  return linhas.map((l) => ({
    appId: l.app_id,
    instaladoEm: l.instalado_em,
    ultimaColeta: l.ultima_coleta,
  }));
}

export function capacidadeUsada(appsInstalados: { appId: string }[]): number {
  return appsInstalados.reduce((soma, a) => soma + (getApp(a.appId)?.capacidade ?? 0), 0);
}

// Créditos acumulados por um app desde a última coleta, com teto de
// CAP_HORAS_ACUMULO horas.
export function acumuloDoApp(app: { appId: string; ultimaColeta: Date | string }): number {
  const cat = getApp(app.appId);
  if (!cat) return 0;
  const horasDecorridas = (Date.now() - new Date(app.ultimaColeta).getTime()) / 3_600_000;
  const horasValidas = Math.max(0, Math.min(horasDecorridas, CAP_HORAS_ACUMULO));
  return Math.floor(horasValidas * cat.crPorHora);
}

export function acumuloTotal(appsInstalados: { appId: string; ultimaColeta: Date | string }[]): number {
  return appsInstalados.reduce((soma, a) => soma + acumuloDoApp(a), 0);
}

// Bônus de firewall (defesa) e integridade (vida) do tier atual do servidor —
// entra no mesmo bucket de mods que classe/raça já usam em calcularStats.
export function bonusDoTier(tierId: ServidorTierId): { defesa: number; vida: number } {
  const tier = getServidorTier(tierId);
  return { defesa: tier?.bonusDefesa ?? 0, vida: tier?.bonusVida ?? 0 };
}

// Servidores extras são cópias idênticas do rack principal (mesmo tier/SO/IP)
// — capacidade e bônus de combate simplesmente multiplicam pela frota inteira.
export function multiplicarPorFrota(valor: number, servidoresExtras: number): number {
  return valor * (1 + servidoresExtras);
}

export async function carregarInfraServidor(usuarioId: number): Promise<{
  tier: ServidorTierId;
  servidoresExtras: number;
  switchTier: SwitchTierId | null;
  internetAtiva: boolean;
}> {
  const linhas = await consultar<{
    tier: ServidorTierId;
    servidores_extras: number;
    switch_tier: SwitchTierId | null;
    internet_ativa: number;
  }>(
    "SELECT tier, servidores_extras, switch_tier, internet_ativa FROM servidores WHERE usuario_id = ? LIMIT 1",
    [usuarioId],
  );
  const l = linhas[0];
  return {
    tier: l?.tier ?? "node",
    servidoresExtras: l?.servidores_extras ?? 0,
    switchTier: l?.switch_tier ?? null,
    internetAtiva: l?.internet_ativa === 1,
  };
}

// Layout salvo da Sala de Equipamentos (posição de cada item, arrastado pelo
// jogador) — formato opaco aqui, quem valida a forma é a rota que grava
// (api/servidores/layout) e quem interpreta é o componente (defensivo, já
// que é JSON vindo do banco, pode estar desatualizado em relação à frota
// atual se o jogador comprou servidores depois do último save).
export async function carregarLayoutEquipamentos(usuarioId: number): Promise<unknown> {
  const linhas = await consultar<{ layout_equipamentos: unknown }>(
    "SELECT layout_equipamentos FROM servidores WHERE usuario_id = ? LIMIT 1",
    [usuarioId],
  );
  return linhas[0]?.layout_equipamentos ?? null;
}
