// Monta a URL do avatar-robô (gerado pela API /api/avatar via DiceBear).
// Módulo puro (sem dependências pesadas) para poder ser usado no cliente.
import type { Ficha } from "@/content/classes";

export function avatarUrl(
  ficha: Pick<Ficha, "classe" | "corPrincipal" | "corPele">,
  tamanho = 128,
): string {
  const p = new URLSearchParams({
    classe: ficha.classe,
    cor: ficha.corPrincipal,
    nucleo: ficha.corPele,
    s: String(tamanho),
  });
  return `/api/avatar?${p.toString()}`;
}
