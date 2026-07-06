// Pastas criadas pelo usuário na área de trabalho. Diferente do estado de
// janelas do desktop (que vive em sessionStorage e é limpo no logout), as
// pastas são duráveis: persistem em localStorage por usuário, como os arquivos
// do notebook. Cada pasta guarda seu próprio conteúdo num modelo de caminhos
// planos — o MESMO de EntradaNotebook —, então reaproveitamos os helpers de
// filesystem de lib/notebookWorkspace (normalizarCaminho, diretorioDe, etc.).

import { ehEntradaNotebook, type EntradaNotebook } from "@/lib/notebookWorkspace";

export type PastaDesktop = {
  id: string;
  nome: string;
  entradas: EntradaNotebook[];
};

const PREFIXO = "codequest:desktop:pastas:v1:";

export function chavePastasDesktop(chave: string) {
  return `${PREFIXO}${chave}`;
}

function ehPastaDesktop(v: unknown): v is PastaDesktop {
  if (typeof v !== "object" || v === null) return false;
  const p = v as Record<string, unknown>;
  return (
    typeof p.id === "string" &&
    typeof p.nome === "string" &&
    Array.isArray(p.entradas) &&
    p.entradas.every(ehEntradaNotebook)
  );
}

export function lerPastasDesktop(chaveStorage: string): PastaDesktop[] {
  if (typeof window === "undefined") return [];
  try {
    const bruto = window.localStorage.getItem(chaveStorage);
    const parsed: unknown = bruto ? JSON.parse(bruto) : null;
    if (Array.isArray(parsed) && parsed.every(ehPastaDesktop)) return parsed;
  } catch {
    // localStorage indisponível ou JSON corrompido: começa vazio.
  }
  return [];
}

export function salvarPastasDesktop(chaveStorage: string, pastas: PastaDesktop[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(chaveStorage, JSON.stringify(pastas));
  } catch {
    // Sem espaço/permissão: silencioso, o desktop continua funcionando.
  }
}

export function novoIdPasta(): string {
  return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// Gera "Nova pasta", "Nova pasta (2)", "Nova pasta (3)"... sem colidir com os
// nomes já existentes.
export function nomeUnicoPasta(pastas: PastaDesktop[], base = "Nova pasta"): string {
  const nomes = new Set(pastas.map((p) => p.nome));
  if (!nomes.has(base)) return base;
  let n = 2;
  while (nomes.has(`${base} (${n})`)) n++;
  return `${base} (${n})`;
}
