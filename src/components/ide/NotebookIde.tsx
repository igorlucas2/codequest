"use client";

import { useEffect, useMemo, useState } from "react";
import { CORES, type LinhaTerminal } from "@/components/Terminal";
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

type Props = {
  workspaceId: string;
  arquivoInicial?: string;
  readmeInicial?: string;
  saida: LinhaTerminal[];
  aoExecutar: (codigo: string) => void;
  desabilitado?: boolean;
  titulo?: string;
  subtitulo?: string;
  preferirArquivoInicial?: boolean;
  persistirRemoto?: boolean;
  emJanela?: boolean;
  // Teto de itens (arquivos + pastas) no disco, vindo do nível de
  // Armazenamento. Padrão sem limite pra contextos de aula (Desafio), onde o
  // disco do deck não se aplica.
  capacidadeDisco?: number;
};

function workspaceDeEstado(
  entradas: EntradaNotebook[],
  arquivoAtivo: string,
  pastaAtual: string,
): NotebookWorkspace {
  return {
    versao: VERSAO_NOTEBOOK_WORKSPACE,
    entradas,
    arquivoAtivo,
    pastaAtual,
  };
}

function aplicarWorkspace(
  workspace: NotebookWorkspace,
  setEntradas: (entradas: EntradaNotebook[]) => void,
  setArquivoAtivo: (arquivo: string) => void,
  setPastaAtual: (pasta: string) => void,
) {
  setEntradas(workspace.entradas);
  setArquivoAtivo(workspace.arquivoAtivo);
  setPastaAtual(workspace.pastaAtual);
}

// Ícone da árvore de projeto por tipo/extensão. Pasta aberta (a atual) mostra
// 📂; as demais, 📁. Arquivos escolhem o ícone pela extensão.
function iconeEntrada(entrada: EntradaNotebook, pastaAtual: string): string {
  if (entrada.tipo === "pasta") return entrada.caminho === pastaAtual ? "📂" : "📁";
  const nome = entrada.caminho.toLowerCase();
  if (nome.endsWith(".py")) return "🐍";
  if (nome.endsWith(".md")) return "📝";
  if (nome.endsWith(".json")) return "🔩";
  if (nome.endsWith(".js") || nome.endsWith(".ts")) return "📜";
  return "📄";
}

export default function NotebookIde({
  workspaceId,
  arquivoInicial = "aulas/contrato-01/src/solucao.py",
  readmeInicial = "# Notebook CodeQuest\n\nSeu workspace acompanha as aulas e interacoes do jogo.",
  saida,
  aoExecutar,
  desabilitado = false,
  titulo = "Notebook do Runner",
  subtitulo = "workspace pessoal",
  preferirArquivoInicial = true,
  persistirRemoto = true,
  emJanela = false,
  capacidadeDisco = Infinity,
}: Props) {
  const workspacePadrao = useMemo(
    () => criarWorkspacePadrao(arquivoInicial, readmeInicial),
    [arquivoInicial, readmeInicial],
  );
  const [entradas, setEntradas] = useState<EntradaNotebook[]>(workspacePadrao.entradas);
  const [arquivoAtivo, setArquivoAtivo] = useState(workspacePadrao.arquivoAtivo);
  const [pastaAtual, setPastaAtual] = useState(workspacePadrao.pastaAtual);
  const [nomeNovo, setNomeNovo] = useState("");
  const [alterado, setAlterado] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [salvando, setSalvando] = useState(false);

  const chaveStorage = chaveNotebookStorage(workspaceId);

  useEffect(() => {
    const id = window.setTimeout(() => {
      let cache: NotebookWorkspace | null = null;

      try {
        const bruto = window.localStorage.getItem(chaveStorage);
        const salvo = bruto ? (JSON.parse(bruto) as unknown) : null;
        if (ehNotebookWorkspace(salvo)) cache = salvo;
      } catch {
        setMensagem("Nao foi possivel abrir o cache local.");
      }

      const workspaceInicial = mesclarWorkspace(cache, workspacePadrao, preferirArquivoInicial);
      aplicarWorkspace(workspaceInicial, setEntradas, setArquivoAtivo, setPastaAtual);
      setAlterado(false);

      if (!persistirRemoto) return;

      fetch("/api/notebook/workspace", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((dados: unknown) => {
          if (!dados || typeof dados !== "object") return;
          const remoto = (dados as { workspace?: unknown }).workspace;
          if (!ehNotebookWorkspace(remoto)) return;
          const mesclado = mesclarWorkspace(remoto, workspacePadrao, preferirArquivoInicial);
          aplicarWorkspace(mesclado, setEntradas, setArquivoAtivo, setPastaAtual);
          window.localStorage.setItem(chaveStorage, JSON.stringify(mesclado));
          setAlterado(false);
          setMensagem("");
        })
        .catch(() => {
          setMensagem("Notebook offline: alteracoes ficam no cache local.");
        });
    }, 0);

    return () => window.clearTimeout(id);
  }, [chaveStorage, persistirRemoto, preferirArquivoInicial, workspacePadrao]);

  useEffect(() => {
    function aoAtualizarWorkspace(evento: Event) {
      const detalhe = (evento as CustomEvent<NotebookWorkspaceEventDetail>).detail;
      if (!detalhe || detalhe.workspaceId !== workspaceId) return;
      if (!ehNotebookWorkspace(detalhe.workspace)) return;

      aplicarWorkspace(detalhe.workspace, setEntradas, setArquivoAtivo, setPastaAtual);
      setAlterado(false);
      setMensagem("");
    }

    window.addEventListener(NOTEBOOK_WORKSPACE_EVENT, aoAtualizarWorkspace);
    return () => window.removeEventListener(NOTEBOOK_WORKSPACE_EVENT, aoAtualizarWorkspace);
  }, [workspaceId]);

  const arquivoAtual = entradas.find(
    (entrada) => entrada.tipo === "arquivo" && entrada.caminho === arquivoAtivo,
  );
  const conteudoAtual = arquivoAtual?.conteudo ?? "";
  const entradasOrdenadas = [...entradas].sort(ordenarEntradasNotebook);
  const pastas = entradasOrdenadas.filter((entrada) => entrada.tipo === "pasta");
  const totalArquivos = entradas.filter((entrada) => entrada.tipo === "arquivo").length;
  const totalPastas = pastas.length;
  const linhas = Math.max(1, conteudoAtual.split("\n").length);
  const numerosLinhas = Array.from({ length: linhas }, (_, i) => i + 1).join("\n");

  function marcarAlterado() {
    setAlterado(true);
    setMensagem("");
  }

  async function salvarWorkspace() {
    const payload = workspaceDeEstado(entradas, arquivoAtivo, pastaAtual);
    window.localStorage.setItem(chaveStorage, JSON.stringify(payload));
    window.dispatchEvent(
      new CustomEvent<NotebookWorkspaceEventDetail>(NOTEBOOK_WORKSPACE_EVENT, {
        detail: { workspaceId, workspace: payload },
      }),
    );

    if (!persistirRemoto) {
      setAlterado(false);
      setMensagem("Workspace salvo.");
      return;
    }

    setSalvando(true);
    try {
      const res = await fetch("/api/notebook/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace: payload }),
      });
      if (!res.ok) throw new Error("falha-ao-salvar");
      setAlterado(false);
      setMensagem("Notebook sincronizado.");
    } catch {
      setMensagem("Salvo localmente. Sincronizacao remota falhou.");
    } finally {
      setSalvando(false);
    }
  }

  function atualizarConteudo(valor: string) {
    setEntradas((atuais) =>
      atuais.map((entrada) =>
        entrada.caminho === arquivoAtivo && entrada.tipo === "arquivo"
          ? { ...entrada, conteudo: valor }
          : entrada,
      ),
    );
    marcarAlterado();
  }

  function garantirPastas(atuais: EntradaNotebook[], caminho: string) {
    const proximas = [...atuais];
    for (const pasta of pastasAncestrais(caminho)) {
      if (!proximas.some((entrada) => entrada.caminho === pasta)) {
        proximas.push({ caminho: pasta, tipo: "pasta" });
      }
    }
    return proximas;
  }

  function criarEntrada(tipo: TipoEntradaNotebook) {
    const bruto = normalizarCaminho(tipo === "arquivo" ? extensaoPadrao(nomeNovo) : nomeNovo);
    if (!bruto) return;
    if (entradas.length >= capacidadeDisco) {
      setMensagem(
        `Disco cheio (${entradas.length}/${capacidadeDisco}). Apague algo ou amplie o armazenamento no painel de Hardware.`,
      );
      return;
    }
    const base = bruto.includes("/") || !pastaAtual ? bruto : `${pastaAtual}/${bruto}`;
    const caminho = normalizarCaminho(base);
    if (!caminho || entradas.some((entrada) => entrada.caminho === caminho)) {
      setMensagem("Esse caminho ja existe.");
      return;
    }

    if (tipo === "arquivo") {
      setEntradas((atuais) => {
        const proximas = garantirPastas(atuais, caminho);
        proximas.push({ caminho, tipo: "arquivo", conteudo: "" });
        return proximas;
      });
      setArquivoAtivo(caminho);
      setPastaAtual(diretorioDe(caminho) || pastaAtual);
    } else {
      setEntradas((atuais) => garantirPastas(atuais, caminho));
      setPastaAtual(caminho);
    }
    setNomeNovo("");
    marcarAlterado();
  }

  async function executarAtual() {
    if (desabilitado || salvando || !conteudoAtual.trim()) return;
    if (alterado) await salvarWorkspace();
    setMensagem("Executando arquivo atual.");
    aoExecutar(conteudoAtual);
  }

  return (
    <div className={`w-full ${emJanela ? "h-full min-h-0" : ""}`}>
      <div
        className={
          emJanela
            ? "h-full min-h-0 overflow-hidden rounded-md border border-esmeralda/20 bg-[#060812]"
            : "rounded-t-2xl border border-borda bg-[#171923] p-2 shadow-[0_18px_50px_rgba(0,0,0,0.55)]"
        }
      >
        <div
          className={
            emJanela
              ? "flex h-full min-h-0 flex-col overflow-hidden bg-[#060812]"
              : "overflow-hidden rounded-xl border border-esmeralda/20 bg-[#060812]"
          }
        >
          {/* Fora do gerenciador de janelas (modo standalone com moldura de
              "monitor") esta barra é a única identidade da janela, então vale a
              pena. Dentro de uma janela do desktop (emJanela) ela só duplica o
              título e os controles que a Janela já desenha — some com ela para
              não empilhar dois títulos e desperdiçar altura. O status de
              salvamento migra para a barra do arquivo, logo abaixo. */}
          {!emJanela && (
            <div className="flex min-h-10 items-center gap-3 border-b border-esmeralda/20 bg-black/45 px-3 py-2">
              <div className="flex gap-1.5" aria-hidden>
                <span className="h-2.5 w-2.5 rounded-full bg-erro" />
                <span className="h-2.5 w-2.5 rounded-full bg-destaque" />
                <span className="h-2.5 w-2.5 rounded-full bg-sucesso" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-ouro">{titulo}</p>
                <p className="truncate text-[10px] text-texto-suave">{subtitulo}</p>
              </div>
              <span className="ml-auto text-[10px] text-texto-suave">
                {salvando ? "sincronizando" : alterado ? "alterado" : "salvo"}
              </span>
            </div>
          )}

          <div
            className={`grid grid-cols-1 bg-[#060812] lg:grid-cols-[190px_minmax(0,1fr)] ${
              emJanela ? "min-h-0 flex-1" : "min-h-[560px]"
            }`}
          >
            <aside className="border-b border-esmeralda/20 bg-black/25 p-3 lg:border-b-0 lg:border-r">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-texto-suave">
                  Projeto
                </p>
                <button
                  type="button"
                  onClick={() => void salvarWorkspace()}
                  disabled={!alterado || salvando}
                  className="rounded-md border border-esmeralda/30 px-2 py-1 text-[10px] text-esmeralda transition hover:bg-esmeralda/10 disabled:opacity-40"
                >
                  Salvar
                </button>
              </div>

              <div className="mt-3 flex gap-1">
                <input
                  value={nomeNovo}
                  onChange={(e) => setNomeNovo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") criarEntrada("arquivo");
                  }}
                  placeholder="nome"
                  className="min-w-0 flex-1 rounded-md border border-borda bg-fundo px-2 py-1 text-xs outline-none focus:border-primaria"
                />
                <button
                  type="button"
                  title="Criar arquivo"
                  onClick={() => criarEntrada("arquivo")}
                  className="rounded-md border border-borda px-2 py-1 text-xs text-texto-suave transition hover:border-primaria hover:text-texto"
                >
                  +A
                </button>
                <button
                  type="button"
                  title="Criar pasta"
                  onClick={() => criarEntrada("pasta")}
                  className="rounded-md border border-borda px-2 py-1 text-xs text-texto-suave transition hover:border-primaria hover:text-texto"
                >
                  +P
                </button>
              </div>

              <div className="mt-2">
                <select
                  value={pastaAtual}
                  onChange={(e) => setPastaAtual(e.target.value)}
                  className="w-full rounded-md border border-borda bg-fundo px-2 py-1 text-xs text-texto-suave outline-none focus:border-primaria"
                  aria-label="Pasta atual"
                >
                  {pastas.map((pasta) => (
                    <option key={pasta.caminho} value={pasta.caminho}>
                      {pasta.caminho}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-3 rounded-md border border-esmeralda/15 bg-black/25 p-2 text-[10px] text-texto-suave">
                <div className="flex items-center justify-between gap-2">
                  <span className="uppercase tracking-wide">Disco local</span>
                  <span className={alterado ? "text-ouro" : "text-esmeralda"}>
                    {alterado ? "pendente" : "ok"}
                  </span>
                </div>
                <p className="mt-1">
                  {totalPastas} pastas · {totalArquivos} arquivos
                </p>
                {Number.isFinite(capacidadeDisco) && (
                  <div className="mt-1.5">
                    <div className="flex items-center justify-between">
                      <span className="uppercase tracking-wide">Uso</span>
                      <span className={entradas.length >= capacidadeDisco ? "text-erro" : "text-esmeralda"}>
                        {entradas.length}/{capacidadeDisco} itens
                      </span>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-black/50">
                      <div
                        className={`h-full rounded-full ${
                          entradas.length >= capacidadeDisco ? "bg-erro" : "bg-esmeralda"
                        }`}
                        style={{
                          width: `${Math.min(100, (entradas.length / capacidadeDisco) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
                <p className="mt-1 truncate" title={pastaAtual}>
                  {pastaAtual || "/"}
                </p>
              </div>

              <div className="mt-4 max-h-72 space-y-1 overflow-y-auto pr-1 lg:max-h-[430px]">
                {entradasOrdenadas.map((entrada) => {
                  const ativo = entrada.caminho === arquivoAtivo;
                  const ehPasta = entrada.tipo === "pasta";
                  return (
                    <button
                      key={`${entrada.tipo}:${entrada.caminho}`}
                      type="button"
                      onClick={() => {
                        if (ehPasta) {
                          setPastaAtual(entrada.caminho);
                        } else {
                          setArquivoAtivo(entrada.caminho);
                          setPastaAtual(diretorioDe(entrada.caminho) || pastaAtual);
                        }
                      }}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs transition ${
                        ativo
                          ? "bg-primaria/20 text-texto"
                          : "text-texto-suave hover:bg-fundo-card hover:text-texto"
                      }`}
                      style={{ paddingLeft: 8 + profundidade(entrada.caminho) * 10 }}
                    >
                      <span className="shrink-0 text-sm leading-none" aria-hidden>
                        {iconeEntrada(entrada, pastaAtual)}
                      </span>
                      <span className="min-w-0 truncate" title={entrada.caminho}>
                        {nomeDe(entrada.caminho)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="flex min-h-0 flex-col">
              <div className="flex min-h-10 items-center gap-2 border-b border-esmeralda/20 bg-black/20 px-3 py-2">
                <span className="min-w-0 truncate rounded-md border border-esmeralda/25 bg-esmeralda/10 px-2 py-1 text-xs text-esmeralda">
                  {arquivoAtivo}
                </span>
                {/* Sem a barra Mac, este é o único lugar que mostra o estado do
                    workspace quando dentro de uma janela do desktop. */}
                {emJanela && (
                  <span
                    className={`shrink-0 text-[10px] ${
                      alterado || salvando ? "text-ouro" : "text-esmeralda/70"
                    }`}
                  >
                    {salvando ? "sincronizando" : alterado ? "alterado" : "salvo"}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => void executarAtual()}
                  disabled={desabilitado || salvando || !conteudoAtual.trim()}
                  className="ml-auto shrink-0 rounded-md bg-esmeralda px-3 py-1 text-xs font-semibold text-black transition hover:opacity-90 disabled:opacity-40"
                >
                  Executar
                </button>
              </div>

              <div className={`flex flex-1 bg-black/45 ${emJanela ? "min-h-0" : "min-h-[300px]"}`}>
                <pre className="select-none border-r border-esmeralda/10 px-3 py-3 text-right text-xs leading-6 text-texto-suave/55">
                  {numerosLinhas}
                </pre>
                <textarea
                  value={conteudoAtual}
                  disabled={desabilitado || !arquivoAtual}
                  onChange={(e) => atualizarConteudo(e.target.value)}
                  onKeyDown={(e) => {
                    const tecla = e.key.toLowerCase();
                    if ((e.ctrlKey || e.metaKey) && tecla === "s") {
                      e.preventDefault();
                      void salvarWorkspace();
                    }
                    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                      e.preventDefault();
                      void executarAtual();
                    }
                  }}
                  spellCheck={false}
                  autoComplete="off"
                  className={`codigo flex-1 resize-none bg-transparent px-3 py-3 text-esmeralda outline-none placeholder:text-esmeralda/30 disabled:opacity-60 ${
                    emJanela ? "min-h-0" : "min-h-[300px]"
                  }`}
                  placeholder="# main.py"
                />
              </div>

              <div className="min-h-36 border-t border-esmeralda/20 bg-black/30 p-3 text-xs">
                <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-wide text-texto-suave">
                  <span>Saida</span>
                  {mensagem && <span className="normal-case tracking-normal text-ouro">{mensagem}</span>}
                </div>
                <div className="max-h-32 overflow-y-auto">
                  {saida.length === 0 ? (
                    <p className="text-esmeralda/40">processo aguardando execucao</p>
                  ) : (
                    saida.map((linha, i) => (
                      <p key={i} className={`whitespace-pre-wrap ${CORES[linha.tipo ?? "saida"]}`}>
                        {linha.texto}
                      </p>
                    ))
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
      {!emJanela && (
        <div className="mx-auto h-4 w-[92%] rounded-b-2xl border-x border-b border-borda bg-gradient-to-b from-[#2a2d38] to-[#11131a] shadow-[0_14px_28px_rgba(0,0,0,0.45)]">
          <div className="mx-auto h-1.5 w-24 rounded-b-lg bg-black/35" />
        </div>
      )}
    </div>
  );
}
