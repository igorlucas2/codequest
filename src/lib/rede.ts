import "server-only";
import { consultar } from "@/lib/db";
import { getZona, setorDoUsuario } from "@/content/rede";

export type ConfigRede = {
  ip: string | null;
  mascara: string | null;
  gateway: string | null;
  configurada: boolean;
};

export async function carregarConfigRede(usuarioId: number): Promise<ConfigRede> {
  const [linha] = await consultar<{
    rede_ip: string | null;
    rede_mascara: string | null;
    rede_gateway: string | null;
    rede_configurada: number;
  }>(
    "SELECT rede_ip, rede_mascara, rede_gateway, rede_configurada FROM servidores WHERE usuario_id = ? LIMIT 1",
    [usuarioId],
  );
  return {
    ip: linha?.rede_ip ?? null,
    mascara: linha?.rede_mascara ?? null,
    gateway: linha?.rede_gateway ?? null,
    configurada: Boolean(linha?.rede_configurada),
  };
}

// Mesma zona: sempre alcança (é a mesma sub-rede). Zona diferente: só se o
// ATACANTE tiver configurado um gateway válido E tiver internet contratada —
// precisa de rota de saída E de uplink de verdade pra alcançar qualquer
// coisa fora da própria sub-rede, igual rede de verdade.
export function alcancaZona(
  zonaAtacante: number,
  zonaAlvo: number,
  cfgAtacante: ConfigRede,
  internetAtiva: boolean,
): { ok: true } | { ok: false; motivo: string } {
  if (zonaAtacante === zonaAlvo) return { ok: true };
  if (cfgAtacante.configurada && internetAtiva) return { ok: true };

  const zonaAlvoInfo = getZona(zonaAlvo);
  if (!internetAtiva) {
    return {
      ok: false,
      motivo: `Sem rota até ${zonaAlvoInfo?.nome ?? "esse setor"} — contrate a internet em Servidor → Rede.`,
    };
  }
  return {
    ok: false,
    motivo: `Sem rota até ${zonaAlvoInfo?.nome ?? "esse setor"} — configure seu gateway em Servidor → Rede.`,
  };
}

// Reexport de conveniência pra quem só precisa saber a zona (sem carregar a config).
export { setorDoUsuario };
