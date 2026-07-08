"use client";

import { useSessao } from "@/components/Sessao";
import { ITENS } from "@/content/itens";
import { getGeracaoPc, type GeracaoPcId } from "@/content/geracoesPc";
import {
  capacidadeDisco,
  capacidadeRam,
  getComponente,
  nivelDe,
  type ComponenteId,
} from "@/content/componentes";
import { atrasoConexaoMs, duracaoBootMelhorMs, duracaoBootMs, duracaoBootPiorMs } from "@/lib/velocidade";
import type { EstadoSistemaOperacional } from "@/components/desktop/persistenciaDesktop";

const ESTILO: Record<
  GeracaoPcId,
  {
    titulo: string;
    label: string;
    valor: string;
    nota: string;
    divisor: string;
    painel: string;
    trilho: string;
    barra: string;
  }
> = {
  win98: {
    titulo: "font-bold text-[#000080]",
    label: "text-black/70",
    valor: "font-semibold text-black",
    nota: "text-black/70",
    divisor: "border-black/15",
    painel: "border-black/20 bg-white/50",
    trilho: "bg-black/15",
    barra: "bg-[#000080]",
  },
  xp: {
    titulo: "font-bold text-[#0b3d91]",
    label: "text-black/60",
    valor: "font-semibold text-black",
    nota: "text-black/60",
    divisor: "border-black/15",
    painel: "border-black/15 bg-white/55",
    trilho: "bg-black/15",
    barra: "bg-[#1f62d0]",
  },
  neon: {
    titulo: "titulo font-semibold text-ouro",
    label: "text-texto-suave",
    valor: "font-medium",
    nota: "text-texto-suave",
    divisor: "border-borda/50",
    painel: "border-borda/60 bg-fundo/60",
    trilho: "bg-fundo-card",
    barra: "bg-destaque",
  },
};

function porcentagem(valor: number, maximo: number) {
  return Math.max(8, Math.min(100, Math.round((valor / maximo) * 100)));
}

function desempenhoPorTempo(ms: number, pior: number, melhor: number) {
  const faixa = pior - melhor;
  return Math.max(8, Math.min(100, Math.round(((pior - ms) / faixa) * 100)));
}

export default function EsteComputador({
  geracao,
  sistemaOperacional,
  possuiMidiaInstalacao = false,
}: {
  geracao: GeracaoPcId;
  sistemaOperacional?: EstadoSistemaOperacional;
  possuiMidiaInstalacao?: boolean;
}) {
  const { equipados, stats, componentes } = useSessao();
  const notebook = ITENS.find((i) => i.tipo === "notebook" && equipados.includes(i.id));
  const info = getGeracaoPc(geracao);
  const estilo = ESTILO[geracao];
  const atraso = atrasoConexaoMs(stats.velocidade);
  const boot = duracaoBootMs(stats.velocidade, geracao);
  const discoCapacidade = capacidadeDisco(componentes);
  const ramCapacidade = capacidadeRam(componentes);

  function componenteAtual(id: ComponenteId) {
    const componente = getComponente(id);
    if (!componente) return "-";
    return nivelDe(componente, componentes[id]).nome;
  }

  return (
    <div className="space-y-3 text-sm">
      <div className={`rounded border p-3 ${estilo.painel}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={estilo.titulo}>{info.nome}</p>
            <p className={`text-xs ${estilo.nota}`}>
              {sistemaOperacional?.instalado ? sistemaOperacional.versao : "Sem sistema operacional"} · disco de projetos
            </p>
          </div>
          <span className={`rounded px-2 py-1 text-xs ${estilo.valor}`}>
            {sistemaOperacional?.instalado ? "online" : "sem boot"}
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <section className={`rounded border p-3 ${estilo.painel}`}>
          <p className={`mb-2 text-xs font-semibold uppercase ${estilo.label}`}>Hardware</p>
          <dl className="space-y-1">
            <Linha rotulo="Notebook" valor={notebook?.nome ?? "Deck padrao"} estilo={estilo} />
            <Linha rotulo="CPU" valor={componenteAtual("cpu")} estilo={estilo} />
            <Linha rotulo="RAM" valor={componenteAtual("ram")} estilo={estilo} />
            <Linha rotulo="Video" valor={componenteAtual("gpu")} estilo={estilo} />
          </dl>
        </section>

        <section className={`rounded border p-3 ${estilo.painel}`}>
          <p className={`mb-2 text-xs font-semibold uppercase ${estilo.label}`}>Sistema</p>
          <dl className="space-y-1">
            <Linha
              rotulo="SO"
              valor={sistemaOperacional?.instalado ? sistemaOperacional.versao : "Nao instalado"}
              estilo={estilo}
            />
            <Linha
              rotulo="Usuario"
              valor={sistemaOperacional?.usuarioLocal ?? "runner"}
              estilo={estilo}
            />
            <Linha
              rotulo="Boot"
              valor={(sistemaOperacional?.bootPreferido ?? "disco").toUpperCase()}
              estilo={estilo}
            />
            <Linha
              rotulo="Midia"
              valor={
                sistemaOperacional?.midiaConectada
                  ? "USB conectada"
                  : possuiMidiaInstalacao
                    ? "Na mochila"
                    : "Nao comprada"
              }
              estilo={estilo}
            />
          </dl>
        </section>

        <section className={`rounded border p-3 ${estilo.painel}`}>
          <p className={`mb-2 text-xs font-semibold uppercase ${estilo.label}`}>Dispositivos</p>
          <dl className="space-y-1">
            <Linha rotulo="Disco" valor={componenteAtual("disco")} estilo={estilo} />
            <Linha rotulo="Rede" valor={componenteAtual("rede")} estilo={estilo} />
            <Linha rotulo="Cooler" valor={componenteAtual("cooler")} estilo={estilo} />
            <Linha rotulo="IDE" valor="instalada" estilo={estilo} />
          </dl>
        </section>
      </div>

      <section className={`rounded border p-3 ${estilo.painel}`}>
        <p className={`mb-2 text-xs font-semibold uppercase ${estilo.label}`}>Desempenho</p>
        <div className="space-y-2">
          <Barra
            rotulo="Velocidade"
            valor={`${stats.velocidade}`}
            porcentagem={porcentagem(stats.velocidade, 45)}
            estilo={estilo}
          />
          <Barra
            rotulo="RAM"
            valor={`${ramCapacidade} apps`}
            porcentagem={porcentagem(ramCapacidade, 16)}
            estilo={estilo}
          />
          <Barra
            rotulo="Disco"
            valor={`${discoCapacidade} itens`}
            porcentagem={porcentagem(discoCapacidade, 130)}
            estilo={estilo}
          />
          <Barra
            rotulo="Resposta"
            valor={`${atraso}ms`}
            porcentagem={desempenhoPorTempo(atraso, 700, 80)}
            estilo={estilo}
          />
          <Barra
            rotulo="Boot"
            valor={`${(boot / 1000).toFixed(1)}s`}
            porcentagem={desempenhoPorTempo(
              boot,
              duracaoBootPiorMs(geracao),
              duracaoBootMelhorMs(geracao),
            )}
            estilo={estilo}
          />
        </div>
      </section>
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

function Barra({
  rotulo,
  valor,
  porcentagem,
  estilo,
}: {
  rotulo: string;
  valor: string;
  porcentagem: number;
  estilo: (typeof ESTILO)[GeracaoPcId];
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between gap-2 text-xs">
        <span className={estilo.label}>{rotulo}</span>
        <span className={estilo.valor}>{valor}</span>
      </div>
      <div className={`h-2 overflow-hidden rounded-sm ${estilo.trilho}`}>
        <div className={`h-full ${estilo.barra}`} style={{ width: `${porcentagem}%` }} />
      </div>
    </div>
  );
}
