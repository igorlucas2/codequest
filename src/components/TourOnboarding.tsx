"use client";

import { useState } from "react";
import { useSessao } from "@/components/Sessao";
import Button from "@/components/ui/Button";

const SLIDES = [
  {
    icone: "🌐",
    titulo: "Trilha",
    texto:
      "Cada contrato te ensina um conceito novo de programação e recompensa com XP e créditos. Complete em ordem pra desbloquear o próximo.",
  },
  {
    icone: "🗄️",
    titulo: "Servidor",
    texto:
      "Construa sua infraestrutura: configure rede, instale um sistema operacional e apps que rendem créditos com o tempo.",
  },
  {
    icone: "🖥️",
    titulo: "Computador",
    texto:
      "Abra o Terminal pra treinar invasão em node-alpha ou acessar seu servidor via SSH. Em Alvos, invada outros runners.",
  },
  {
    icone: "🛒",
    titulo: "Mercado",
    texto:
      "Gaste os créditos que ganhar em exploits, firewalls e hardware — deixe seu runner mais forte pra Rede.",
  },
];

// Tour de boas-vindas, mostrado uma vez pro aluno assim que ele loga pela
// primeira vez (persistido em usuarios.tour_visto — ver Sessao.tsx). Global
// e independente de página: nenhuma das telas que ele descreve precisa saber
// que o tour existe.
export default function TourOnboarding() {
  const { carregado, usuario, tourVisto, marcarTourVisto } = useSessao();
  const [passo, setPasso] = useState(0);

  if (!carregado || !usuario || usuario.papel !== "aluno" || tourVisto) return null;

  const ultimo = passo === SLIDES.length - 1;
  const slide = SLIDES[passo];

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4">
      <div className="cartao w-full max-w-sm rounded-2xl p-6 text-center">
        <span className="text-4xl">{slide.icone}</span>
        <h2 className="titulo mt-2 text-xl font-bold text-ouro">{slide.titulo}</h2>
        <p className="mt-2 text-sm text-texto-suave">{slide.texto}</p>

        <div className="mt-5 flex justify-center gap-1.5">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full ${i === passo ? "bg-primaria" : "bg-borda"}`}
            />
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <Button variante="fantasma" tamanho="sm" onClick={marcarTourVisto}>
            Pular
          </Button>
          <Button tamanho="sm" onClick={ultimo ? marcarTourVisto : () => setPasso((p) => p + 1)}>
            {ultimo ? "Começar" : "Próximo →"}
          </Button>
        </div>
      </div>
    </div>
  );
}
