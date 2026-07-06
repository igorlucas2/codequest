"use client";

import { useState } from "react";
import {
  diretorioDe,
  nomeDe,
  normalizarCaminho,
  ordenarEntradasNotebook,
  type EntradaNotebook,
} from "@/lib/notebookWorkspace";
import type { PastaDesktop } from "@/components/desktop/pastasDesktop";

// Ancestrais de um diretório (todos os prefixos), sem a heurística de "." de
// pastasAncestrais — aqui um nome de arquivo pode não ter extensão.
function ancestraisDe(dir: string): string[] {
  const partes = dir.split("/").filter(Boolean);
  const out: string[] = [];
  for (let i = 1; i <= partes.length; i++) out.push(partes.slice(0, i).join("/"));
  return out;
}

// Explorador simples do conteúdo de UMA pasta do desktop. Cria subpastas e
// arquivos (com uma nota de texto editável), navega por breadcrumb e exclui
// itens. Persistência fica com o Desktop, via aoAtualizar.
export default function PastaJanela({
  pasta,
  aoAtualizar,
}: {
  pasta: PastaDesktop;
  aoAtualizar: (entradas: EntradaNotebook[]) => void;
}) {
  const [pastaAtual, setPastaAtual] = useState("");
  const [nomeNovo, setNomeNovo] = useState("");
  const [arquivoAberto, setArquivoAberto] = useState<string | null>(null);

  const entradas = pasta.entradas;
  const noNivel = entradas
    .filter((e) => diretorioDe(e.caminho) === pastaAtual)
    .sort(ordenarEntradasNotebook);
  const arquivo = arquivoAberto
    ? entradas.find((e) => e.caminho === arquivoAberto && e.tipo === "arquivo")
    : undefined;

  function criar(tipo: "arquivo" | "pasta") {
    const bruto = normalizarCaminho(nomeNovo);
    if (!bruto) return;
    const base = bruto.includes("/") || !pastaAtual ? bruto : `${pastaAtual}/${bruto}`;
    const caminho = normalizarCaminho(base);
    if (!caminho || entradas.some((e) => e.caminho === caminho)) {
      setNomeNovo("");
      return;
    }
    const proximas = [...entradas];
    for (const anc of ancestraisDe(diretorioDe(caminho))) {
      if (!proximas.some((e) => e.caminho === anc)) proximas.push({ caminho: anc, tipo: "pasta" });
    }
    proximas.push(
      tipo === "arquivo" ? { caminho, tipo: "arquivo", conteudo: "" } : { caminho, tipo: "pasta" },
    );
    aoAtualizar(proximas);
    setNomeNovo("");
    if (tipo === "pasta") setPastaAtual(caminho);
  }

  function excluir(caminho: string) {
    const prefixo = `${caminho}/`;
    aoAtualizar(entradas.filter((e) => e.caminho !== caminho && !e.caminho.startsWith(prefixo)));
    if (arquivoAberto === caminho || arquivoAberto?.startsWith(prefixo)) setArquivoAberto(null);
    if (pastaAtual === caminho || pastaAtual.startsWith(prefixo)) setPastaAtual(diretorioDe(caminho));
  }

  function editarConteudo(valor: string) {
    if (!arquivo) return;
    aoAtualizar(
      entradas.map((e) =>
        e.caminho === arquivo.caminho && e.tipo === "arquivo" ? { ...e, conteudo: valor } : e,
      ),
    );
  }

  const trilha = pastaAtual ? pastaAtual.split("/") : [];

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#060812] text-texto">
      {/* Breadcrumb + criação */}
      <div className="flex flex-wrap items-center gap-2 border-b border-esmeralda/20 bg-black/30 px-3 py-2 text-xs">
        <button
          type="button"
          onClick={() => setPastaAtual("")}
          className="text-esmeralda hover:underline"
        >
          📁 {pasta.nome}
        </button>
        {trilha.map((seg, i) => {
          const caminho = trilha.slice(0, i + 1).join("/");
          return (
            <span key={caminho} className="flex items-center gap-2 text-texto-suave">
              <span>/</span>
              <button type="button" onClick={() => setPastaAtual(caminho)} className="hover:underline">
                {seg}
              </button>
            </span>
          );
        })}
      </div>

      <div className="flex items-center gap-1 border-b border-esmeralda/20 px-3 py-2">
        <input
          value={nomeNovo}
          onChange={(e) => setNomeNovo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") criar("arquivo");
          }}
          placeholder="nome do item"
          className="min-w-0 flex-1 rounded-md border border-borda bg-fundo px-2 py-1 text-xs outline-none focus:border-primaria"
        />
        <button
          type="button"
          onClick={() => criar("arquivo")}
          className="rounded-md border border-borda px-2 py-1 text-xs text-texto-suave transition hover:border-primaria hover:text-texto"
        >
          + Arquivo
        </button>
        <button
          type="button"
          onClick={() => criar("pasta")}
          className="rounded-md border border-borda px-2 py-1 text-xs text-texto-suave transition hover:border-primaria hover:text-texto"
        >
          + Pasta
        </button>
      </div>

      {/* Lista do nível atual */}
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {noNivel.length === 0 ? (
          <p className="p-4 text-center text-xs text-texto-suave">
            Pasta vazia. Crie um arquivo ou uma subpasta acima.
          </p>
        ) : (
          <ul className="space-y-1">
            {noNivel.map((e) => {
              const ehPasta = e.tipo === "pasta";
              return (
                <li key={e.caminho} className="group flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => (ehPasta ? setPastaAtual(e.caminho) : setArquivoAberto(e.caminho))}
                    className={`flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1 text-left text-xs transition hover:bg-fundo-card ${
                      arquivoAberto === e.caminho ? "bg-primaria/20" : ""
                    }`}
                  >
                    <span aria-hidden>{ehPasta ? "📁" : "📄"}</span>
                    <span className="truncate">{nomeDe(e.caminho)}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => excluir(e.caminho)}
                    aria-label={`Excluir ${nomeDe(e.caminho)}`}
                    className="shrink-0 rounded px-1.5 py-1 text-xs text-texto-suave opacity-0 transition hover:text-erro group-hover:opacity-100"
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Editor de nota do arquivo selecionado */}
      {arquivo && (
        <div className="min-h-0 border-t border-esmeralda/20 bg-black/30 p-2">
          <div className="mb-1 flex items-center justify-between text-[11px] text-texto-suave">
            <span className="truncate">📄 {nomeDe(arquivo.caminho)}</span>
            <button type="button" onClick={() => setArquivoAberto(null)} className="hover:text-texto">
              fechar nota
            </button>
          </div>
          <textarea
            value={arquivo.conteudo ?? ""}
            onChange={(e) => editarConteudo(e.target.value)}
            spellCheck={false}
            placeholder="Escreva uma nota…"
            className="codigo h-24 w-full resize-none rounded-md border border-borda bg-fundo px-2 py-1 text-xs text-esmeralda outline-none focus:border-primaria"
          />
        </div>
      )}
    </div>
  );
}
