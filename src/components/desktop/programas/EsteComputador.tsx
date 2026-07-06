"use client";

import { useSessao } from "@/components/Sessao";
import { ITENS } from "@/content/itens";
import { getGeracaoPc, type GeracaoPcId } from "@/content/geracoesPc";

// Cores/tipografia do texto mudam por geração — o fundo da janela (definido
// em desktop.css) já não é mais escuro no Win98/XP, então as cores neon
// (text-ouro, text-texto-suave) ficariam ilegíveis se usadas direto.
const ESTILO: Record<
  GeracaoPcId,
  { titulo: string; label: string; valor: string; nota: string; divisor: string }
> = {
  win98: {
    titulo: "font-bold text-[#000080]",
    label: "text-black/70",
    valor: "font-semibold text-black",
    nota: "text-black/70",
    divisor: "border-black/15",
  },
  xp: {
    titulo: "font-bold text-[#0b3d91]",
    label: "text-black/60",
    valor: "font-semibold text-black",
    nota: "text-black/60",
    divisor: "border-black/15",
  },
  neon: {
    titulo: "titulo font-semibold text-ouro",
    label: "text-texto-suave",
    valor: "font-medium",
    nota: "text-texto-suave",
    divisor: "border-borda/50",
  },
};

// Janela "Este Computador": mostra o hardware equipado e a geração do
// desktop resultante — dados que useSessao() já expõe, sem chamada nova.
export default function EsteComputador({ geracao }: { geracao: GeracaoPcId }) {
  const { equipados, stats } = useSessao();
  const notebook = ITENS.find((i) => i.tipo === "notebook" && equipados.includes(i.id));
  const ram = ITENS.find((i) => i.tipo === "ram" && equipados.includes(i.id));
  const peca = ITENS.find((i) => i.tipo === "peca" && equipados.includes(i.id));
  const info = getGeracaoPc(geracao);
  const estilo = ESTILO[geracao];

  return (
    <div className="space-y-3 text-sm">
      <p className={estilo.titulo}>{info.nome}</p>
      <dl className="space-y-1">
        <Linha rotulo="Notebook" valor={notebook?.nome ?? "Nenhum (padrão de fábrica)"} estilo={estilo} />
        <Linha rotulo="Memória RAM" valor={ram?.nome ?? "—"} estilo={estilo} />
        <Linha rotulo="Peça" valor={peca?.nome ?? "—"} estilo={estilo} />
        <Linha rotulo="Velocidade" valor={`${stats.velocidade}`} estilo={estilo} />
      </dl>
      <p className={`text-xs ${estilo.nota}`}>
        Compre e equipe notebooks melhores no Mercado pra mudar a geração do
        seu desktop e acelerar o boot.
      </p>
    </div>
  );
}

function Linha({
  rotulo,
  valor,
  estilo,
}: {
  rotulo: string;
  valor: string;
  estilo: (typeof ESTILO)[GeracaoPcId];
}) {
  return (
    <div className={`flex justify-between border-b py-1 ${estilo.divisor}`}>
      <dt className={estilo.label}>{rotulo}</dt>
      <dd className={estilo.valor}>{valor}</dd>
    </div>
  );
}
