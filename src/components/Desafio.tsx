"use client";

import { useState } from "react";
import { moedasDaFase, type Fase } from "@/content/trilha1";
import { type LinhaTerminal } from "@/components/Terminal";
import Desktop from "@/components/desktop/Desktop";
import MonitorFrame from "@/components/MonitorFrame";
import { useSessao } from "@/components/Sessao";
import Button from "@/components/ui/Button";
import type { EnvioDesafio, ResultadoValidacao } from "@/lib/tiposTrilha";

type Estado = "respondendo" | "verificando" | "certo" | "errado";

// Nenhuma comparação de resposta acontece aqui — só no servidor
// (api/trilha/validar e api/progresso), que tem o gabarito de verdade (ver
// trilha1Gabarito.ts). Este componente só monta o envio (escolha/texto/
// buffer do editor) e mostra o que o servidor respondeu.
export default function Desafio({
  fase,
  jaConcluida,
  onAcerto,
  workspaceId,
}: {
  fase: Fase;
  jaConcluida: boolean;
  onAcerto: (envio: EnvioDesafio) => Promise<{ ok: boolean; erro?: string }>;
  workspaceId?: string;
}) {
  const { desafio } = fase;
  const { equipados, stats } = useSessao();
  const pastaContrato = `aulas/contrato-${String(fase.ordem).padStart(2, "0")}-${fase.slug}`;
  const [estado, setEstado] = useState<Estado>("respondendo");
  const [escolha, setEscolha] = useState<number | null>(null);
  const [texto, setTexto] = useState("");
  const [mostrarDica, setMostrarDica] = useState(false);
  const [passoAtual, setPassoAtual] = useState(0);

  // Saida da IDE usada pelos tipos "terminal" e "teste_final".
  const [saidaEditor, setSaidaEditor] = useState<LinhaTerminal[]>([]);

  async function validarNoServidor(envio: EnvioDesafio): Promise<ResultadoValidacao | null> {
    try {
      const r = await fetch("/api/trilha/validar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fase_ordem: fase.ordem, envio }),
      });
      if (!r.ok) return null;
      return await r.json();
    } catch {
      return null;
    }
  }

  async function validar() {
    if (desafio.tipo !== "multipla" && desafio.tipo !== "lacuna") return;
    setEstado("verificando");
    const envio: EnvioDesafio =
      desafio.tipo === "multipla"
        ? { tipo: "multipla", escolha: escolha ?? -1 }
        : { tipo: "lacuna", texto };
    const resultado = await validarNoServidor(envio);
    const acertou = resultado?.tipo === "binario" && resultado.correto;
    if (acertou) {
      setEstado("certo");
      if (!jaConcluida) await onAcerto(envio);
    } else {
      setEstado("errado");
    }
  }

  async function rodarTerminal(codigo: string) {
    if (desafio.tipo !== "terminal") return;
    setEstado("verificando");
    const envio: EnvioDesafio = { tipo: "terminal", codigo };
    const resultado = await validarNoServidor(envio);
    const acertou = resultado?.tipo === "binario" && resultado.correto;
    if (acertou) {
      setEstado("certo");
      setSaidaEditor(desafio.saida.map((texto) => ({ texto, tipo: "sucesso" })));
      if (!jaConcluida) await onAcerto(envio);
    } else {
      setEstado("respondendo");
      setSaidaEditor([
        { texto: "Comando não reconhecido ou incorreto. Confira as linhas do seu código.", tipo: "erro" },
      ]);
    }
  }

  async function rodarTesteFinal(codigo: string) {
    if (desafio.tipo !== "teste_final") return;
    setEstado("verificando");
    const envio: EnvioDesafio = { tipo: "teste_final", codigo };
    const resultado = await validarNoServidor(envio);

    if (!resultado || resultado.tipo !== "progressivo") {
      setEstado("respondendo");
      setSaidaEditor([{ texto: "Falha ao validar com o servidor. Tente de novo.", tipo: "erro" }]);
      return;
    }

    const { passosCorretos, totalPassos } = resultado;
    if (passosCorretos <= passoAtual) {
      setEstado("respondendo");
      setSaidaEditor([
        { texto: "Comando rejeitado pelo ICE. Verifique se a linha vem depois do que já foi aceito.", tipo: "erro" },
      ]);
      return;
    }

    const passoAlcancado = desafio.passos[Math.min(passosCorretos, desafio.passos.length) - 1];
    setSaidaEditor(passoAlcancado.saida.map((texto) => ({ texto, tipo: "sucesso" })));

    if (passosCorretos >= totalPassos) {
      setEstado("certo");
      if (!jaConcluida) await onAcerto(envio);
    } else {
      setEstado("respondendo");
      setPassoAtual(passosCorretos);
    }
  }

  const bloqueado = estado === "certo" || estado === "verificando";
  const podeValidar =
    !bloqueado && (desafio.tipo === "multipla" ? escolha !== null : texto.trim().length > 0);
  const usaNotebook = desafio.tipo === "terminal" || desafio.tipo === "teste_final";

  return (
    <div className={usaNotebook ? "space-y-4" : "rounded-2xl border border-borda bg-fundo-card p-5"}>
      <p className="text-sm font-semibold text-destaque">🎯 Desafio</p>
      <p className="mt-2">{desafio.enunciado}</p>

      {/* Múltipla escolha */}
      {desafio.tipo === "multipla" && (
        <div className="mt-4 space-y-2">
          {desafio.opcoes.map((op, i) => {
            const selecionada = escolha === i;
            return (
              <button
                key={i}
                disabled={bloqueado}
                onClick={() => {
                  setEscolha(i);
                  setEstado("respondendo");
                }}
                className={`codigo block w-full rounded-lg border px-4 py-3 text-left transition ${
                  selecionada
                    ? "border-primaria bg-primaria/10"
                    : "border-borda hover:border-primaria/60"
                }`}
              >
                {op}
              </button>
            );
          })}
        </div>
      )}

      {/* Preencher lacuna */}
      {desafio.tipo === "lacuna" && (
        <div className="mt-4">
          <pre className="codigo overflow-x-auto rounded-lg border border-borda bg-fundo p-4">
            {renderComLacuna(desafio.codigo, (
              <input
                key="lacuna"
                value={texto}
                disabled={bloqueado}
                onChange={(e) => {
                  setTexto(e.target.value);
                  setEstado("respondendo");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && podeValidar) void validar();
                }}
                placeholder="?"
                className="codigo mx-1 w-24 rounded border border-primaria bg-fundo px-2 py-0.5 text-destaque outline-none focus:border-destaque"
              />
            ))}
          </pre>
        </div>
      )}

      {/* Terminal: abre o mesmo notebook do jogador com a IDE focada no contrato. */}
      {desafio.tipo === "terminal" && (
        <div className="mt-4">
          <MonitorFrame>
            <Desktop
              equipados={equipados}
              velocidade={stats.velocidade}
              programaInicial="ide"
              programaInicialMaximizado
              sempreLigado
              usarEstadoSalvo={false}
              persistirEstado={false}
              ide={{
                workspaceId: workspaceId ?? "anon",
                arquivoInicial: `${pastaContrato}/src/solucao.py`,
                readmeInicial: `# ${fase.titulo}\n\nContrato ${fase.ordem} da trilha. Guarde aqui sua solucao e anotacoes.`,
                desabilitado: bloqueado,
                saida: saidaEditor,
                aoExecutar: (codigo) => void rodarTerminal(codigo),
                titulo: "CodeQuest IDE",
                subtitulo: pastaContrato,
                preferirArquivoInicial: true,
              }}
            />
          </MonitorFrame>
        </div>
      )}

      {/* Teste final: usa o mesmo notebook do jogador para evoluir o script. */}
      {desafio.tipo === "teste_final" && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold text-destaque">
            Camada {Math.min(passoAtual + 1, desafio.passos.length)} de {desafio.passos.length}
          </p>
          <p className="mb-2 text-sm text-ouro">
            📜 {desafio.passos[Math.min(passoAtual, desafio.passos.length - 1)].narrativa}
          </p>
          <MonitorFrame>
            <Desktop
              equipados={equipados}
              velocidade={stats.velocidade}
              programaInicial="ide"
              programaInicialMaximizado
              sempreLigado
              usarEstadoSalvo={false}
              persistirEstado={false}
              ide={{
                workspaceId: workspaceId ?? "anon",
                arquivoInicial: `${pastaContrato}/src/exploit.py`,
                readmeInicial: `# ${fase.titulo}\n\nMantenha os passos do ICE neste projeto final.`,
                desabilitado: bloqueado,
                saida: saidaEditor,
                aoExecutar: (codigo) => void rodarTesteFinal(codigo),
                titulo: "CodeQuest IDE",
                subtitulo: pastaContrato,
                preferirArquivoInicial: true,
              }}
            />
          </MonitorFrame>
        </div>
      )}

      {/* Feedback */}
      {estado === "certo" && (
        <p className="mt-4 rounded-lg bg-sucesso/10 px-4 py-3 text-sucesso">
          ✅ Acesso concedido! +{fase.xp} XP e +{moedasDaFase(fase)} ◈.
        </p>
      )}
      {estado === "errado" && (
        <p className="mt-4 rounded-lg bg-erro/10 px-4 py-3 text-erro">
          ❌ Acesso negado. Tente de novo!
        </p>
      )}

      {/* Ações */}
      <div className="mt-4 flex items-center gap-3">
        {desafio.tipo !== "terminal" && desafio.tipo !== "teste_final" && estado !== "certo" && (
          <Button
            onClick={() => void validar()}
            disabled={!podeValidar}
            carregando={estado === "verificando"}
          >
            Executar
          </Button>
        )}
        {desafio.dica && estado !== "certo" && (
          <button
            onClick={() => setMostrarDica((v) => !v)}
            className="text-sm text-texto-suave hover:text-texto"
          >
            {mostrarDica ? "Esconder dica" : "💡 Dica"}
          </button>
        )}
      </div>

      {mostrarDica && desafio.dica && estado !== "certo" && (
        <p className="mt-3 text-sm text-texto-suave">💡 {desafio.dica}</p>
      )}
    </div>
  );
}

// Substitui o marcador ___ por um elemento (o input da lacuna), preservando o resto do código.
function renderComLacuna(codigo: string, elemento: React.ReactNode) {
  const partes = codigo.split("___");
  return partes.flatMap((parte, i) =>
    i < partes.length - 1
      ? [<span key={`t${i}`}>{parte}</span>, elemento]
      : [<span key={`t${i}`}>{parte}</span>],
  );
}
