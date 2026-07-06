export type TipoEntradaNotebook = "arquivo" | "pasta";

export type EntradaNotebook = {
  caminho: string;
  tipo: TipoEntradaNotebook;
  conteudo?: string;
};

export type NotebookWorkspace = {
  versao: 1;
  entradas: EntradaNotebook[];
  arquivoAtivo: string;
  pastaAtual: string;
};

export const VERSAO_NOTEBOOK_WORKSPACE = 1;
export const NOTEBOOK_WORKSPACE_EVENT = "codequest:notebook-workspace";

export type NotebookWorkspaceEventDetail = {
  workspaceId: string;
  workspace: NotebookWorkspace;
};

export function chaveNotebookStorage(workspaceId: string) {
  return `codequest:notebook:v1:${workspaceId}`;
}

export function normalizarCaminho(valor: string) {
  return valor
    .trim()
    .replaceAll("\\", "/")
    .replace(/^\/+/, "")
    .replace(/\/+/g, "/")
    .replace(/[<>:"|?*]/g, "")
    .replace(/\/$/, "");
}

export function diretorioDe(caminho: string) {
  const partes = caminho.split("/");
  partes.pop();
  return partes.join("/");
}

export function nomeDe(caminho: string) {
  return caminho.split("/").filter(Boolean).at(-1) ?? caminho;
}

export function profundidade(caminho: string) {
  return Math.max(0, caminho.split("/").length - 1);
}

export function extensaoPadrao(nome: string) {
  if (nome.includes(".") || nome.includes("/")) return nome;
  return `${nome}.py`;
}

export function pastasAncestrais(caminho: string) {
  const partes = normalizarCaminho(caminho).split("/").filter(Boolean);
  const limite = caminho.includes(".") ? partes.length - 1 : partes.length;
  const pastas: string[] = [];
  for (let i = 1; i <= limite; i++) {
    pastas.push(partes.slice(0, i).join("/"));
  }
  return pastas;
}

export function criarWorkspacePadrao(
  arquivoInicial: string,
  readmeInicial: string,
): NotebookWorkspace {
  const arquivo = normalizarCaminho(arquivoInicial) || "aulas/contrato-01/src/solucao.py";
  const pastaArquivo = diretorioDe(arquivo);
  const pastaProjeto = pastaArquivo.endsWith("/src") ? diretorioDe(pastaArquivo) : pastaArquivo;
  const readme = normalizarCaminho(`${pastaProjeto}/README.md`);
  const entradas = new Map<string, EntradaNotebook>();

  for (const pasta of [...pastasAncestrais(arquivo), ...pastasAncestrais(readme)]) {
    entradas.set(pasta, { caminho: pasta, tipo: "pasta" });
  }
  entradas.set(arquivo, { caminho: arquivo, tipo: "arquivo", conteudo: "" });
  entradas.set(readme, { caminho: readme, tipo: "arquivo", conteudo: readmeInicial });

  return {
    versao: VERSAO_NOTEBOOK_WORKSPACE,
    entradas: [...entradas.values()],
    arquivoAtivo: arquivo,
    pastaAtual: diretorioDe(arquivo),
  };
}

export function ehEntradaNotebook(valor: unknown): valor is EntradaNotebook {
  if (typeof valor !== "object" || valor === null) return false;
  const entrada = valor as Record<string, unknown>;
  return (
    typeof entrada.caminho === "string" &&
    (entrada.tipo === "arquivo" || entrada.tipo === "pasta") &&
    (entrada.conteudo === undefined || typeof entrada.conteudo === "string")
  );
}

export function ehNotebookWorkspace(valor: unknown): valor is NotebookWorkspace {
  if (typeof valor !== "object" || valor === null) return false;
  const workspace = valor as Record<string, unknown>;
  return (
    workspace.versao === VERSAO_NOTEBOOK_WORKSPACE &&
    Array.isArray(workspace.entradas) &&
    workspace.entradas.every(ehEntradaNotebook) &&
    typeof workspace.arquivoAtivo === "string" &&
    typeof workspace.pastaAtual === "string"
  );
}

export function ordenarEntradasNotebook(a: EntradaNotebook, b: EntradaNotebook) {
  if (a.tipo !== b.tipo) return a.tipo === "pasta" ? -1 : 1;
  return a.caminho.localeCompare(b.caminho);
}

export function mesclarWorkspace(
  salvo: NotebookWorkspace | null,
  padrao: NotebookWorkspace,
  preferirArquivoInicial: boolean,
): NotebookWorkspace {
  if (!salvo) return padrao;

  const entradas = new Map<string, EntradaNotebook>();
  for (const entrada of salvo.entradas) entradas.set(entrada.caminho, entrada);
  for (const entrada of padrao.entradas) {
    if (!entradas.has(entrada.caminho)) entradas.set(entrada.caminho, entrada);
  }

  const arquivoAtivo = preferirArquivoInicial
    ? padrao.arquivoAtivo
    : salvo.arquivoAtivo || padrao.arquivoAtivo;
  const pastaAtual = preferirArquivoInicial
    ? padrao.pastaAtual
    : salvo.pastaAtual || padrao.pastaAtual;

  return {
    versao: VERSAO_NOTEBOOK_WORKSPACE,
    entradas: [...entradas.values()],
    arquivoAtivo,
    pastaAtual,
  };
}
