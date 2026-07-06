"use client";

import { useState } from "react";
import { useSessao } from "@/components/Sessao";
import Button from "@/components/ui/Button";
import { FIXER, CABECALHO_TRANSMISSAO, TRANSMISSAO_ABERTURA } from "@/content/fixer";

// Primeiro contato com a Fixer (VESPER), mostrado uma vez pro aluno assim que
// ele loga pela primeira vez (persistido em usuarios.tour_visto — ver
// Sessao.tsx). Reenquadra o onboarding como a transmissão de abertura dela; o
// conteúdo (voz + slides) vive em src/content/fixer.ts. Global e independente
// de página: nenhuma das telas que ele descreve precisa saber que existe.
export default function TourOnboarding() {
  const { carregado, usuario, tourVisto, marcarTourVisto } = useSessao();
  const [passo, setPasso] = useState(0);

  if (!carregado || !usuario || usuario.papel !== "aluno" || tourVisto) return null;

  const ultimo = passo === TRANSMISSAO_ABERTURA.length - 1;
  const slide = TRANSMISSAO_ABERTURA[passo];

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4">
      <div className="cartao w-full max-w-sm rounded-2xl p-6 text-center">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-texto-suave">
          <span className="text-ouro">● {CABECALHO_TRANSMISSAO}</span>
          <span>{FIXER.papel}</span>
        </div>

        <span className="mt-4 block text-4xl">{slide.icone}</span>
        <h2 className="titulo mt-2 text-xl font-bold text-ouro">{slide.titulo}</h2>
        <p className="mt-2 text-sm text-texto-suave">{slide.texto}</p>

        <div className="mt-5 flex justify-center gap-1.5">
          {TRANSMISSAO_ABERTURA.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full ${i === passo ? "bg-primaria" : "bg-borda"}`}
            />
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <Button variante="fantasma" tamanho="sm" onClick={marcarTourVisto}>
            Fechar canal
          </Button>
          <Button tamanho="sm" onClick={ultimo ? marcarTourVisto : () => setPasso((p) => p + 1)}>
            {ultimo ? "Aceitar contrato" : "Próximo →"}
          </Button>
        </div>
      </div>
    </div>
  );
}
