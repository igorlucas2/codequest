// Persistência do estado do desktop emulado (boot já feito + janelas
// abertas) em sessionStorage — sem isso, sair de /computador pra qualquer
// outra tela e voltar refazia o boot inteiro e fechava tudo, porque
// /computador é uma rota própria (o estado vivia só em useState/useReducer
// locais do componente, que desmonta ao navegar).
const CHAVE_LIGADO = "codequest_desktop_ligado";
const CHAVE_ESTADO = "codequest_desktop_estado";
const CHAVE_ENERGIA = "codequest_desktop_energia";
const PREFIXO_SO = "codequest:desktop:so:v1:";
export const EVENTO_ESTADO_ENERGIA = "codequest:desktop:energia";

export type EstadoEnergiaComputador =
  | "desligado"
  | "inicializando"
  | "setup"
  | "instalador"
  | "sem_boot"
  | "login"
  | "ligado";

const ESTADOS_ENERGIA: EstadoEnergiaComputador[] = [
  "desligado",
  "inicializando",
  "setup",
  "instalador",
  "sem_boot",
  "login",
  "ligado",
];

export type DispositivoBoot = "disco" | "usb" | "rede";

export type EstadoSistemaOperacional = {
  instalado: boolean;
  versao: string;
  usuarioLocal: string;
  nomeMaquina: string;
  instaladoEm: string | null;
  midiaConectada: boolean;
  bootPreferido: DispositivoBoot;
};

export function lerLigadoSalvo(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(CHAVE_LIGADO) === "1";
}

export function salvarLigado(ligado: boolean): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CHAVE_LIGADO, ligado ? "1" : "0");
}

export function lerEstadoEnergiaSalvo(): EstadoEnergiaComputador {
  if (typeof window === "undefined") return "desligado";
  const bruto = sessionStorage.getItem(CHAVE_ENERGIA);
  if (ESTADOS_ENERGIA.includes(bruto as EstadoEnergiaComputador)) {
    return bruto as EstadoEnergiaComputador;
  }
  return lerLigadoSalvo() ? "ligado" : "desligado";
}

export function salvarEstadoEnergia(estado: EstadoEnergiaComputador): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CHAVE_ENERGIA, estado);
  window.dispatchEvent(new CustomEvent(EVENTO_ESTADO_ENERGIA, { detail: estado }));
}

function chaveSistemaOperacional(chaveUsuario: string) {
  return `${PREFIXO_SO}${chaveUsuario}`;
}

function slugCurto(valor: string) {
  return (
    valor
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 18) || "runner"
  );
}

export function estadoSistemaPadrao(
  usuarioNome: string,
  usuarioEmail: string,
): EstadoSistemaOperacional {
  const usuarioLocal = slugCurto(usuarioEmail.split("@")[0] || usuarioNome);
  return {
    instalado: true,
    versao: "CodeQuest OS",
    usuarioLocal,
    nomeMaquina: `deck-${slugCurto(usuarioNome)}`,
    instaladoEm: null,
    midiaConectada: false,
    bootPreferido: "disco",
  };
}

function ehDispositivoBoot(v: unknown): v is DispositivoBoot {
  return v === "disco" || v === "usb" || v === "rede";
}

export function lerEstadoSistemaOperacional(
  chaveUsuario: string,
  usuarioNome: string,
  usuarioEmail: string,
): EstadoSistemaOperacional {
  const padrao = estadoSistemaPadrao(usuarioNome, usuarioEmail);
  if (typeof window === "undefined") return padrao;

  try {
    const bruto = localStorage.getItem(chaveSistemaOperacional(chaveUsuario));
    if (!bruto) return padrao;
    const parsed = JSON.parse(bruto) as Partial<EstadoSistemaOperacional>;
    return {
      instalado: typeof parsed.instalado === "boolean" ? parsed.instalado : padrao.instalado,
      versao: typeof parsed.versao === "string" ? parsed.versao : padrao.versao,
      usuarioLocal:
        typeof parsed.usuarioLocal === "string" ? parsed.usuarioLocal : padrao.usuarioLocal,
      nomeMaquina:
        typeof parsed.nomeMaquina === "string" ? parsed.nomeMaquina : padrao.nomeMaquina,
      instaladoEm:
        typeof parsed.instaladoEm === "string" || parsed.instaladoEm === null
          ? parsed.instaladoEm
          : padrao.instaladoEm,
      midiaConectada:
        typeof parsed.midiaConectada === "boolean"
          ? parsed.midiaConectada
          : padrao.midiaConectada,
      bootPreferido: ehDispositivoBoot(parsed.bootPreferido)
        ? parsed.bootPreferido
        : padrao.bootPreferido,
    };
  } catch {
    return padrao;
  }
}

export function salvarEstadoSistemaOperacional(
  chaveUsuario: string,
  estado: EstadoSistemaOperacional,
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(chaveSistemaOperacional(chaveUsuario), JSON.stringify(estado));
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
  sessionStorage.removeItem(CHAVE_ENERGIA);
  window.dispatchEvent(new CustomEvent(EVENTO_ESTADO_ENERGIA, { detail: "desligado" }));
}
