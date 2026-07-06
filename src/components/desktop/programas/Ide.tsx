"use client";

import { useState } from "react";
import NotebookIde from "@/components/ide/NotebookIde";
import { useSessao } from "@/components/Sessao";
import { capacidadeDisco } from "@/content/componentes";
import type { LinhaTerminal } from "@/components/Terminal";

export type IdeProgramaProps = {
  workspaceId?: string;
  arquivoInicial?: string;
  readmeInicial?: string;
  saida?: LinhaTerminal[];
  aoExecutar?: (codigo: string) => void;
  desabilitado?: boolean;
  titulo?: string;
  subtitulo?: string;
  preferirArquivoInicial?: boolean;
};

export default function Ide({
  workspaceId,
  arquivoInicial = "projetos/codequest/README.md",
  readmeInicial,
  saida,
  aoExecutar,
  desabilitado = false,
  titulo = "CodeQuest IDE",
  subtitulo,
  preferirArquivoInicial = false,
}: IdeProgramaProps = {}) {
  const { usuario, stats, componentes } = useSessao();
  const [saidaLocal, setSaidaLocal] = useState<LinhaTerminal[]>([]);

  if (!usuario) {
    return <p className="text-sm text-texto-suave">Sessao expirada.</p>;
  }

  function executar(codigo: string) {
    if (aoExecutar) {
      aoExecutar(codigo);
      return;
    }
    const linhas = codigo.split("\n").filter((linha) => linha.trim().length > 0).length;
    setSaidaLocal([
      { texto: `Arquivo analisado: ${linhas} linha(s) com conteudo.`, tipo: "info" },
      { texto: "Nas aulas, executar valida o contrato ativo.", tipo: "saida" },
    ]);
  }

  return (
    <div className="h-full min-h-0">
      <NotebookIde
        workspaceId={workspaceId ?? `usuario-${usuario.id}`}
        arquivoInicial={arquivoInicial}
        readmeInicial={
          readmeInicial ??
          `# Notebook de ${usuario.nome}\n\nProjetos, aulas e interacoes do jogo ficam neste workspace.`
        }
        saida={saida ?? saidaLocal}
        aoExecutar={executar}
        desabilitado={desabilitado}
        titulo={titulo}
        subtitulo={subtitulo ?? `workspace pessoal | velocidade ${stats.velocidade}`}
        preferirArquivoInicial={preferirArquivoInicial}
        capacidadeDisco={capacidadeDisco(componentes)}
        emJanela
      />
    </div>
  );
}
