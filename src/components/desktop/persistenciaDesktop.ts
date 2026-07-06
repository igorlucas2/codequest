// Persistência do estado do desktop emulado (boot já feito + janelas
// abertas) em sessionStorage — sem isso, sair de /computador pra qualquer
// outra tela e voltar refazia o boot inteiro e fechava tudo, porque
// /computador é uma rota própria (o estado vivia só em useState/useReducer
// locais do componente, que desmonta ao navegar).
const CHAVE_LIGADO = "codequest_desktop_ligado";
const CHAVE_ESTADO = "codequest_desktop_estado";

export function lerLigadoSalvo(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(CHAVE_LIGADO) === "1";
}

export function salvarLigado(ligado: boolean): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CHAVE_LIGADO, ligado ? "1" : "0");
}

export function lerEstadoSalvo<T>(valida: (v: unknown) => v is T): T | null {
  if (typeof window === "undefined") return null;
  try {
    const bruto = sessionStorage.getItem(CHAVE_ESTADO);
    if (!bruto) return null;
    const parsed: unknown = JSON.parse(bruto);
    return valida(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function salvarEstado(estado: unknown): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CHAVE_ESTADO, JSON.stringify(estado));
}

// Chamado no logout — um próximo login (do mesmo usuário ou de outra pessoa
// na mesma máquina/aba) começa com o desktop limpo.
export function limparEstadoDesktopPersistido(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(CHAVE_LIGADO);
  sessionStorage.removeItem(CHAVE_ESTADO);
}
