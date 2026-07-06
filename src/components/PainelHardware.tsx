"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { useSessao } from "@/components/Sessao";
import { useToast } from "@/components/Toast";
import {
  COMPONENTES,
  nivelDe,
  proximoNivelDe,
  capacidadeDisco,
  capacidadeRam,
  velocidadeHardware,
  type Componente,
  type NivelComponente,
} from "@/content/componentes";

// Descreve, em uma frase curta, o que o próximo nível entrega — por eixo do
// componente (armazenamento, apps simultâneos ou velocidade).
function ganhoDoProximo(comp: Componente, atual: NivelComponente, prox: NivelComponente): string {
  if (comp.eixo === "disco") {
    return `${atual.discoCapacidade} → ${prox.discoCapacidade} itens no disco`;
  }
  if (comp.eixo === "ram") {
    return `${atual.ramCapacidade} → ${prox.ramCapacidade} apps simultâneos`;
  }
  return `velocidade +${prox.velocidade - atual.velocidade} ⚡`;
}

function Resumo({ icone, rotulo, valor }: { icone: string; rotulo: string; valor: string }) {
  return (
    <div className="rounded-xl border border-borda bg-fundo p-3 text-center">
      <p className="text-2xl">{icone}</p>
      <p className="mt-1 text-lg font-bold text-ouro">{valor}</p>
      <p className="text-[11px] uppercase tracking-wide text-texto-suave">{rotulo}</p>
    </div>
  );
}

export default function PainelHardware() {
  const { componentes, moedas, melhorarComponente } = useSessao();
  const { mostrar } = useToast();
  const [ocupado, setOcupado] = useState<string | null>(null);

  const disco = capacidadeDisco(componentes);
  const ram = capacidadeRam(componentes);
  const vel = velocidadeHardware(componentes);

  async function aoMelhorar(id: string, nome: string) {
    setOcupado(id);
    const r = await melhorarComponente(id);
    if (r.ok) mostrar(`${nome} instalado!`, "sucesso");
    else mostrar(r.erro ?? "Falha no upgrade.", "erro");
    setOcupado(null);
  }

  return (
    <section className="cartao cartao-ouro rounded-2xl p-5">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h2 className="titulo text-xl font-bold text-ouro">🖥️ Hardware do Deck</h2>
          <p className="text-sm text-texto-suave">
            Suba os componentes por níveis. Disco guarda seus arquivos, RAM roda mais apps ao mesmo
            tempo, o resto acelera o deck.
          </p>
        </div>
        <span className="cartao rounded-xl px-3 py-2 text-sm text-ouro whitespace-nowrap">
          ◈ {moedas} cr
        </span>
      </header>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Resumo icone="🗄️" rotulo="Armazenamento" valor={`${disco} itens`} />
        <Resumo icone="💾" rotulo="RAM" valor={`${ram} apps`} />
        <Resumo icone="⚡" rotulo="Velocidade" valor={`+${vel}`} />
      </div>

      <div className="mt-5 space-y-3">
        {COMPONENTES.map((comp) => {
          const nivelNum = componentes[comp.id];
          const atual = nivelDe(comp, nivelNum);
          const prox = proximoNivelDe(comp, nivelNum);
          const max = comp.niveis.length;
          const podeComprar = prox ? moedas >= prox.preco : false;
          const carregando = ocupado === comp.id;

          return (
            <div key={comp.id} className="rounded-xl border border-borda bg-fundo-card p-3">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-fundo text-2xl">
                  {comp.icone}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-baseline gap-2 font-semibold">
                    {comp.nome}
                    <span className="text-xs font-normal text-texto-suave">
                      Nv {nivelNum}/{max}
                    </span>
                  </p>
                  <p className="truncate text-xs text-texto-suave" title={atual.nome}>
                    {atual.nome}
                  </p>
                </div>
                {prox ? (
                  <Button
                    tamanho="sm"
                    disabled={!podeComprar}
                    carregando={carregando}
                    onClick={() => aoMelhorar(comp.id, prox.nome)}
                    title={podeComprar ? `Instalar ${prox.nome}` : "Créditos insuficientes"}
                  >
                    ◈ {prox.preco}
                  </Button>
                ) : (
                  <span className="shrink-0 text-xs font-semibold text-sucesso">MÁX</span>
                )}
              </div>

              {/* Trilha de níveis — pips preenchidos até o nível atual. */}
              <div className="mt-3 flex gap-1" aria-hidden>
                {Array.from({ length: max }, (_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 flex-1 rounded-full ${
                      i < nivelNum ? "bg-primaria" : "bg-borda"
                    }`}
                  />
                ))}
              </div>

              {prox && (
                <p className="mt-2 text-[11px] text-texto-suave">
                  Próximo — <span className="text-esmeralda">{prox.nome}</span>:{" "}
                  {ganhoDoProximo(comp, atual, prox)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
