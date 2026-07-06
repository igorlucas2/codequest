"use client";

import { useRef, useState } from "react";
import { moedasDaFase, type Fase } from "@/content/trilha1";
import { type LinhaTerminal } from "@/components/Terminal";
import EditorCodigo from "@/components/EditorCodigo";
import MonitorFrame from "@/components/MonitorFrame";
import { normalizar } from "@/lib/texto";

type Estado = "respondendo" | "certo" | "errado";

export default function Desafio({
  fase,
  jaConcluida,
  onAcerto,
}: {
  fase: Fase;
  jaConcluida: boolean;
  onAcerto: () => void;
}) {
  const { desafio } = fase;
  const [estado, setEstado] = useState<Estado>("respondendo");
  const [escolha, setEscolha] = useState<number | null>(null);
  const [texto, setTexto] = useState("");
  const [mostrarDica, setMostrarDica] = useState(false);
  const [passoAtual, setPassoAtual] = useState(0);

  // Estado do editor de código (usado pelos tipos "terminal" e "teste_final").
  const [codigoEditor, setCodigoEditor] = useState("");
  const [saidaEditor, setSaidaEditor] = useState<LinhaTerminal[]>([]);
  // Índice (na lista de linhas do editor) da última linha do teste_final já
  // aceita — cada passo só pode ser confirmado por uma linha que vem DEPOIS
  // dela, já que o script cresce no mesmo buffer entre os passos.
  const ultimoIndiceRef = useRef(-1);

  function validar() {
    let acertou = false;
    if (desafio.tipo === "multipla") {
      acertou = escolha === desafio.correta;
    } else if (desafio.tipo === "lacuna") {
      acertou = normalizar(texto) === normalizar(desafio.resposta);
    }
    if (acertou) {
      setEstado("certo");
      if (!jaConcluida) onAcerto();
    } else {
      setEstado("errado");
    }
  }

  function rodarTerminal() {
    if (desafio.tipo !== "terminal") return;
    const linhas = codigoEditor.split("\n").map(normalizar);
    if (linhas.includes(normalizar(desafio.resposta))) {
      setEstado("certo");
      if (!jaConcluida) onAcerto();
      setSaidaEditor(desafio.saida.map((texto) => ({ texto, tipo: "sucesso" })));
    } else {
      setSaidaEditor([
        { texto: "Comando não reconhecido ou incorreto. Confira as linhas do seu código.", tipo: "erro" },
      ]);
    }
  }

  function rodarTesteFinal() {
    if (desafio.tipo !== "teste_final") return;
    const passo = desafio.passos[passoAtual];
    const linhas = codigoEditor.split("\n").map(normalizar);

    let encontrado = -1;
    for (let i = ultimoIndiceRef.current + 1; i < linhas.length; i++) {
      if (linhas[i] === normalizar(passo.resposta)) {
        encontrado = i;
        break;
      }
    }

    if (encontrado === -1) {
      setSaidaEditor([
        { texto: "Comando rejeitado pelo ICE. Verifique se a linha vem depois do que já foi aceito.", tipo: "erro" },
      ]);
      return;
    }

    ultimoIndiceRef.current = encontrado;
    setSaidaEditor(passo.saida.map((texto) => ({ texto, tipo: "sucesso" })));
    if (passoAtual >= desafio.passos.length - 1) {
      setEstado("certo");
      if (!jaConcluida) onAcerto();
    } else {
      setPassoAtual((p) => p + 1);
    }
  }

  const podeValidar =
    desafio.tipo === "multipla" ? escolha !== null : texto.trim().length > 0;

  return (
    <div className="rounded-2xl border border-borda bg-fundo-card p-5">
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
                disabled={estado === "certo"}
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
                disabled={estado === "certo"}
                onChange={(e) => {
                  setTexto(e.target.value);
                  setEstado("respondendo");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && podeValidar) validar();
                }}
                placeholder="?"
                className="codigo mx-1 w-24 rounded border border-primaria bg-fundo px-2 py-0.5 text-destaque outline-none focus:border-destaque"
              />
            ))}
          </pre>
        </div>
      )}

      {/* Terminal: editor de código estilo VS Code — escreve, salva, roda */}
      {desafio.tipo === "terminal" && (
        <div className="mt-4">
          <MonitorFrame compacto>
            <EditorCodigo
              valor={codigoEditor}
              aoMudarValor={setCodigoEditor}
              desabilitado={estado === "certo"}
              saida={saidaEditor}
              aoRodar={rodarTerminal}
            />
          </MonitorFrame>
        </div>
      )}

      {/* Teste final: script único crescendo, uma camada de defesa por vez */}
      {desafio.tipo === "teste_final" && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold text-destaque">
            Camada {Math.min(passoAtual + 1, desafio.passos.length)} de {desafio.passos.length}
          </p>
          <p className="mb-2 text-sm text-ouro">
            📜 {desafio.passos[Math.min(passoAtual, desafio.passos.length - 1)].narrativa}
          </p>
          <MonitorFrame compacto>
            <EditorCodigo
              valor={codigoEditor}
              aoMudarValor={setCodigoEditor}
              desabilitado={estado === "certo"}
              saida={saidaEditor}
              aoRodar={rodarTesteFinal}
              arquivo="exploit.py"
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
          <button
            onClick={validar}
            disabled={!podeValidar}
            className="rounded-xl bg-primaria px-6 py-2.5 font-semibold text-white transition hover:bg-primaria-forte disabled:opacity-40"
          >
            Executar
          </button>
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
