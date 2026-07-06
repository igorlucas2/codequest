"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSessao } from "@/components/Sessao";
import {
  NOTEBOOK_WORKSPACE_EVENT,
  chaveNotebookStorage,
  criarWorkspacePadrao,
  diretorioDe,
  ehNotebookWorkspace,
  extensaoPadrao,
  mesclarWorkspace,
  nomeDe,
  normalizarCaminho,
  ordenarEntradasNotebook,
  pastasAncestrais,
  profundidade,
  VERSAO_NOTEBOOK_WORKSPACE,
  type EntradaNotebook,
  type NotebookWorkspace,
  type NotebookWorkspaceEventDetail,
  type TipoEntradaNotebook,
} from "@/lib/notebookWorkspace";

export type ProjetosProgramaProps = {
  workspaceId?: string;
  arquivoInicial?: string;
  readmeInicial?: string;
  onAbrirIde?: (arquivo: string) => void;
};

export default function Projetos({
  workspaceId,
  arquivoInicial = "projetos/codequest/README.md",
  readmeInicial,
  onAbrirIde,
}: ProjetosProgramaProps = {}) {
  const { usuario } = useSessao();
  const workspaceIdEfetivo = workspaceId ?? (usuario ? `usuario-${usuario.id}` : "anon");
  const chaveStorage = chaveNotebookStorage(workspaceIdEfetivo);
  const workspacePadrao = useMemo(
    () =>
      criarWorkspacePadrao(
        arquivoInicial,
        readmeInicial ??
          `# Notebook de ${usuario?.nome ?? "Runner"}\n\nProjetos, aulas e interacoes do jogo ficam neste workspace.`,
      ),
    [arquivoInicial, readmeInicial, usuario?.nome],
  );

  const [workspace, setWorkspace] = useState<NotebookWorkspace>(workspacePadrao);
  const [caminhoSelecionado, setCaminhoSelecionado] = useState(workspacePadrao.arquivoAtivo);
  const [nomeNovo, setNomeNovo] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  const carregarWorkspace = useCallback(async () => {
    setCarregando(true);
    setMensagem("");

    let cache: NotebookWorkspace | null = null;
    try {
      const bruto = window.localStorage.getItem(chaveStorage);
      const salvo = bruto ? (JSON.parse(bruto) as unknown) : null;
      if (ehNotebookWorkspace(salvo)) cache = salvo;
    } catch {
      setMensagem("Nao foi possivel abrir o cache local.");
    }

    let proximo = mesclarWorkspace(cache, workspacePadrao, false);

    try {
      const res = await fetch("/api/notebook/workspace", { cache: "no-store" });
      if (res.ok) {
        const dados = (await res.json()) as { workspace?: unknown };
        if (ehNotebookWorkspace(dados.workspace)) {
          proximo = mesclarWorkspace(dados.workspace, proximo, false);
          window.localStorage.setItem(chaveStorage, JSON.stringify(proximo));
        }
      }
    } catch {
      setMensagem("Projetos offline: exibindo arquivos locais.");
    }

    setWorkspace(proximo);
    setCaminhoSelecionado(proximo.arquivoAtivo);
    setCarregando(false);
  }, [chaveStorage, workspacePadrao]);

  useEffect(() => {
    const id = window.setTimeout(() => void carregarWorkspace(), 0);
    return () => window.clearTimeout(id);
  }, [carregarWorkspace]);

  useEffect(() => {
    function aoAtualizarWorkspace(evento: Event) {
      const detalhe = (evento as CustomEvent<NotebookWorkspaceEventDetail>).detail;
      if (!detalhe || detalhe.workspaceId !== workspaceIdEfetivo) return;
      if (!ehNotebookWorkspace(detalhe.workspace)) return;
      setWorkspace(detalhe.workspace);
      setCaminhoSelecionado(detalhe.workspace.arquivoAtivo);
      setMensagem("Workspace atualizado pela IDE.");
    }

    window.addEventListener(NOTEBOOK_WORKSPACE_EVENT, aoAtualizarWorkspace);
    return () => window.removeEventListener(NOTEBOOK_WORKSPACE_EVENT, aoAtualizarWorkspace);
  }, [workspaceIdEfetivo]);

  const entradasOrdenadas = [...workspace.entradas].sort(ordenarEntradasNotebook);
  const arquivos = workspace.entradas.filter((entrada) => entrada.tipo === "arquivo");
  const pastas = workspace.entradas.filter((entrada) => entrada.tipo === "pasta");
  const entradaSelecionada = workspace.entradas.find((entrada) => entrada.caminho === caminhoSelecionado);
  const arquivoSelecionado = entradaSelecionada?.tipo === "arquivo" ? entradaSelecionada : null;
  const pastaDeTrabalho =
    entradaSelecionada?.tipo === "pasta"
      ? entradaSelecionada.caminho
      : diretorioDe(arquivoSelecionado?.caminho ?? workspace.arquivoAtivo) || workspace.pastaAtual;
  const conteudoSelecionado = arquivoSelecionado?.conteudo ?? "";

  function garantirPastas(entradas: EntradaNotebook[], caminho: string) {
    const proximas = [...entradas];
    for (const pasta of pastasAncestrais(caminho)) {
      if (!proximas.some((entrada) => entrada.caminho === pasta)) {
        proximas.push({ caminho: pasta, tipo: "pasta" });
      }
    }
    return proximas;
  }

  async function persistirWorkspace(proximo: NotebookWorkspace, mensagemOk: string) {
    setWorkspace(proximo);
    setCaminhoSelecionado(proximo.arquivoAtivo);
    setSalvando(true);
    setMensagem(mensagemOk);
    window.localStorage.setItem(chaveStorage, JSON.stringify(proximo));
    window.dispatchEvent(
      new CustomEvent<NotebookWorkspaceEventDetail>(NOTEBOOK_WORKSPACE_EVENT, {
        detail: { workspaceId: workspaceIdEfetivo, workspace: proximo },
      }),
    );

    try {
      const res = await fetch("/api/notebook/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace: proximo }),
      });
      if (!res.ok) throw new Error("falha-ao-salvar");
    } catch {
      setMensagem(`${mensagemOk} Sync remoto pendente.`);
    } finally {
      setSalvando(false);
    }
  }

  async function criarEntrada(tipo: TipoEntradaNotebook) {
    const nome = normalizarCaminho(tipo === "arquivo" ? extensaoPadrao(nomeNovo) : nomeNovo);
    if (!nome) return;

    const caminho = normalizarCaminho(nome.includes("/") ? nome : `${pastaDeTrabalho}/${nome}`);
    if (!caminho || workspace.entradas.some((entrada) => entrada.caminho === caminho)) {
      setMensagem("Esse caminho ja existe.");
      return;
    }

    let entradas = garantirPastas(workspace.entradas, caminho);
    if (tipo === "arquivo") {
      entradas = [...entradas, { caminho, tipo: "arquivo", conteudo: "" }];
    }

    const proximo: NotebookWorkspace = {
      versao: VERSAO_NOTEBOOK_WORKSPACE,
      entradas,
      arquivoAtivo: tipo === "arquivo" ? caminho : workspace.arquivoAtivo,
      pastaAtual: tipo === "arquivo" ? diretorioDe(caminho) : caminho,
    };

    setNomeNovo("");
    await persistirWorkspace(proximo, tipo === "arquivo" ? "Arquivo criado." : "Pasta criada.");
    setCaminhoSelecionado(caminho);
  }

  async function criarProjeto() {
    const slug = normalizarCaminho(nomeNovo).replace(/\s+/g, "-").toLowerCase();
    if (!slug) return;

    const raiz = slug.includes("/") ? slug : `projetos/${slug}`;
    const readme = `${raiz}/README.md`;
    const main = `${raiz}/src/main.py`;
    if (workspace.entradas.some((entrada) => entrada.caminho === raiz || entrada.caminho === main)) {
      setMensagem("Projeto ja existe.");
      return;
    }

    let entradas = garantirPastas(workspace.entradas, main);
    entradas = [
      ...entradas,
      { caminho: readme, tipo: "arquivo", conteudo: `# ${nomeDe(raiz)}\n\nAnotacoes do projeto.` },
      { caminho: main, tipo: "arquivo", conteudo: "# main.py\n" },
    ];

    const proximo: NotebookWorkspace = {
      versao: VERSAO_NOTEBOOK_WORKSPACE,
      entradas,
      arquivoAtivo: main,
      pastaAtual: `${raiz}/src`,
    };

    setNomeNovo("");
    await persistirWorkspace(proximo, "Projeto criado.");
  }

  async function excluirSelecionado() {
    if (!entradaSelecionada) return;
    const caminho = entradaSelecionada.caminho;
    const vaiExcluir = workspace.entradas.filter(
      (entrada) => entrada.caminho === caminho || entrada.caminho.startsWith(`${caminho}/`),
    );
    const confirmar = window.confirm(`Excluir ${vaiExcluir.length} item(ns) de ${caminho}?`);
    if (!confirmar) return;

    let entradas = workspace.entradas.filter(
      (entrada) => entrada.caminho !== caminho && !entrada.caminho.startsWith(`${caminho}/`),
    );
    if (!entradas.some((entrada) => entrada.tipo === "arquivo")) {
      entradas = [
        { caminho: "projetos", tipo: "pasta" },
        { caminho: "projetos/README.md", tipo: "arquivo", conteudo: "# Projetos\n\nWorkspace vazio." },
      ];
    }

    const primeiroArquivo = entradas.find((entrada) => entrada.tipo === "arquivo");
    const proximo: NotebookWorkspace = {
      versao: VERSAO_NOTEBOOK_WORKSPACE,
      entradas,
      arquivoAtivo: primeiroArquivo?.caminho ?? "projetos/README.md",
      pastaAtual: diretorioDe(primeiroArquivo?.caminho ?? "projetos/README.md"),
    };

    await persistirWorkspace(proximo, "Item excluido.");
  }

  async function abrirNaIde() {
    if (!arquivoSelecionado) return;
    const proximo = {
      ...workspace,
      arquivoAtivo: arquivoSelecionado.caminho,
      pastaAtual: diretorioDe(arquivoSelecionado.caminho),
    };

    setWorkspace(proximo);
    setSalvando(true);
    setMensagem("Abrindo arquivo na IDE.");
    window.localStorage.setItem(chaveStorage, JSON.stringify(proximo));
    window.dispatchEvent(
      new CustomEvent<NotebookWorkspaceEventDetail>(NOTEBOOK_WORKSPACE_EVENT, {
        detail: { workspaceId: workspaceIdEfetivo, workspace: proximo },
      }),
    );

    try {
      await fetch("/api/notebook/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace: proximo }),
      });
    } catch {
      setMensagem("Arquivo aberto localmente; sincronizacao remota falhou.");
    } finally {
      setSalvando(false);
      onAbrirIde?.(arquivoSelecionado.caminho);
    }
  }

  if (!usuario) {
    return <p className="text-sm text-texto-suave">Sessao expirada.</p>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden text-sm">
      <div className="flex min-h-10 items-center gap-2 border-b border-black/20 bg-white/35 px-3 py-2 text-black">
        <div className="min-w-0">
          <p className="truncate font-bold">Projetos do Notebook</p>
          <p className="truncate text-[11px] text-black/65">
            {pastas.length} pastas · {arquivos.length} arquivos
          </p>
        </div>
        <button
          type="button"
          onClick={() => void carregarWorkspace()}
          disabled={carregando}
          className="ml-auto border border-black bg-[#c0c0c0] px-2 py-1 text-xs shadow-[inset_-1px_-1px_0_#000,inset_1px_1px_0_#fff] disabled:opacity-50"
        >
          Atualizar
        </button>
        <button
          type="button"
          onClick={() => void abrirNaIde()}
          disabled={!arquivoSelecionado || salvando}
          className="border border-black bg-[#c0c0c0] px-2 py-1 text-xs font-bold shadow-[inset_-1px_-1px_0_#000,inset_1px_1px_0_#fff] disabled:opacity-50"
        >
          Abrir na IDE
        </button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 bg-[#efefef] text-black md:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b border-black/25 md:border-b-0 md:border-r">
          <div className="border-b border-black/20 p-2">
            <input
              value={nomeNovo}
              onChange={(e) => setNomeNovo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void criarEntrada("arquivo");
              }}
              placeholder="nome"
              className="w-full border border-black bg-white px-2 py-1 text-xs outline-none"
            />
            <div className="mt-2 grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => void criarProjeto()}
                disabled={salvando || !nomeNovo.trim()}
                className="border border-black bg-[#c0c0c0] px-1 py-1 text-[10px] shadow-[inset_-1px_-1px_0_#000,inset_1px_1px_0_#fff] disabled:opacity-50"
              >
                Projeto
              </button>
              <button
                type="button"
                onClick={() => void criarEntrada("pasta")}
                disabled={salvando || !nomeNovo.trim()}
                className="border border-black bg-[#c0c0c0] px-1 py-1 text-[10px] shadow-[inset_-1px_-1px_0_#000,inset_1px_1px_0_#fff] disabled:opacity-50"
              >
                Pasta
              </button>
              <button
                type="button"
                onClick={() => void criarEntrada("arquivo")}
                disabled={salvando || !nomeNovo.trim()}
                className="border border-black bg-[#c0c0c0] px-1 py-1 text-[10px] shadow-[inset_-1px_-1px_0_#000,inset_1px_1px_0_#fff] disabled:opacity-50"
              >
                Arquivo
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-black/60">
              <span className="min-w-0 truncate" title={pastaDeTrabalho}>
                {pastaDeTrabalho || "/"}
              </span>
              <button
                type="button"
                onClick={() => void excluirSelecionado()}
                disabled={salvando || !entradaSelecionada}
                className="shrink-0 border border-black bg-[#c0c0c0] px-2 py-0.5 text-[10px] text-black shadow-[inset_-1px_-1px_0_#000,inset_1px_1px_0_#fff] disabled:opacity-50"
              >
                Excluir
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {carregando ? (
            <p className="p-2 text-xs text-black/60">Carregando projetos...</p>
          ) : (
            <div className="space-y-1">
              {entradasOrdenadas.map((entrada) => (
                <EntradaArquivo
                  key={`${entrada.tipo}:${entrada.caminho}`}
                  entrada={entrada}
                  ativa={entrada.caminho === caminhoSelecionado}
                  onSelecionar={() => {
                    setCaminhoSelecionado(entrada.caminho);
                    setMensagem("");
                  }}
                />
              ))}
            </div>
          )}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col">
          <div className="border-b border-black/20 bg-white/45 px-3 py-2">
            <p className="truncate text-xs font-bold">{entradaSelecionada?.caminho ?? "Nenhum item selecionado"}</p>
            <p className="truncate text-[11px] text-black/60">
              {mensagem || "Selecione um arquivo para inspecionar o conteudo salvo no notebook."}
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-auto bg-[#05070d] p-3 text-xs text-esmeralda">
            {arquivoSelecionado ? (
              <pre className="codigo whitespace-pre-wrap">{conteudoSelecionado || "# arquivo vazio"}</pre>
            ) : entradaSelecionada?.tipo === "pasta" ? (
              <p className="text-esmeralda/50">Pasta selecionada. Crie arquivos aqui ou abra um arquivo existente.</p>
            ) : (
              <p className="text-esmeralda/50">Nenhum arquivo selecionado.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function EntradaArquivo({
  entrada,
  ativa,
  onSelecionar,
}: {
  entrada: EntradaNotebook;
  ativa: boolean;
  onSelecionar: () => void;
}) {
  const ehPasta = entrada.tipo === "pasta";

  return (
    <button
      type="button"
      onClick={onSelecionar}
      className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs ${
        ativa ? "bg-[#000080] text-white" : ehPasta ? "text-black/75 hover:bg-white/60" : "text-black hover:bg-white/60"
      }`}
      style={{ paddingLeft: 8 + profundidade(entrada.caminho) * 12 }}
      title={entrada.caminho}
    >
      <span className="w-5 shrink-0">{ehPasta ? "DIR" : "PY"}</span>
      <span className="min-w-0 truncate">{nomeDe(entrada.caminho)}</span>
    </button>
  );
}
