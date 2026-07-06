"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import CyberAvatar from "@/components/CyberAvatar";
import ServidorRack from "@/components/ServidorRack";
import Spinner from "@/components/Spinner";
import { useSessao } from "@/components/Sessao";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { dificuldadeInvasao } from "@/lib/desafiosCombate";
import { getServidorTier, type ServidorTierId } from "@/content/servidores";
import type { Ficha } from "@/content/classes";
import type { PayloadInvasor } from "@/components/desktop/programas/Invasor";

type Oponente = {
  id: number;
  nome: string;
  ficha: Ficha;
  stats: { nivel: number; poder: number; vida: number; ataque: number; defesa: number };
  servidorTier: ServidorTierId;
  zonaId: number;
  alcancavel: boolean;
  motivoBloqueio: string | null;
};

// Programa "Alvos": lista de oponentes pra invadir, hospedado como janela do
// desktop — mesma busca/chamadas que a antiga página /arena tinha, só que
// agora vive dentro do notebook. Ao invadir, abre/retarget a janela
// "Invasor" via callback (dispatch do Desktop.tsx).
export default function Alvos({
  onAbrirInvasor,
}: {
  onAbrirInvasor: (payload: PayloadInvasor) => void;
}) {
  const { stats } = useSessao();
  const reduzido = usePrefersReducedMotion();
  const [oponentes, setOponentes] = useState<Oponente[] | null>(null);
  const [lutando, setLutando] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/arena", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setOponentes(d.oponentes ?? []));
  }, []);

  async function invadir(op: Oponente) {
    setLutando(op.id);
    try {
      const r = await fetch("/api/arena/duelar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oponenteId: op.id }),
      });
      const d = await r.json();
      if (r.ok) {
        onAbrirInvasor({ duelId: d.duelId, proposta: d });
      }
    } finally {
      setLutando(null);
    }
  }

  return (
    <div className="space-y-2 text-sm">
      <p className="mb-1 text-xs text-texto-suave">Seu poder: {stats.poder}</p>

      {oponentes === null ? (
        <p className="text-center text-texto-suave">Rastreando alvos na Rede...</p>
      ) : oponentes.length === 0 ? (
        <p className="text-center text-texto-suave">
          Nenhum runner online pra invadir. Chame a turma pra se conectar!
        </p>
      ) : (
        oponentes.map((op, i) => {
          const maisForte = op.stats.poder > stats.poder;
          const capacidadeTier = getServidorTier(op.servidorTier)?.capacidade ?? 2;
          const dificuldade = dificuldadeInvasao(op.stats.nivel);
          return (
            <motion.div
              key={op.id}
              initial={reduzido ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduzido ? 0 : 0.2, delay: reduzido ? 0 : i * 0.04, ease: "easeOut" }}
              className="flex items-center gap-2 rounded-xl border border-borda bg-fundo-card p-2"
            >
              <CyberAvatar
                classe={op.ficha.classe}
                corPele={op.ficha.corPele}
                corPrincipal={op.ficha.corPrincipal}
                tamanho={36}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{op.nome}</p>
                <p className="text-[11px] text-texto-suave">
                  Nível {op.stats.nivel} ·{" "}
                  <span className={maisForte ? "text-sangue" : "text-esmeralda"}>
                    poder {op.stats.poder}
                  </span>{" "}
                  · <span className={dificuldade.cor}>invasão {dificuldade.texto.toLowerCase()}</span>
                </p>
              </div>
              <ServidorRack
                tier={op.servidorTier}
                capacidadeUsada={capacidadeTier}
                capacidadeTotal={capacidadeTier}
                tamanho={28}
              />
              <button
                disabled={lutando !== null || !op.alcancavel}
                onClick={() => invadir(op)}
                title={op.alcancavel ? "" : (op.motivoBloqueio ?? "")}
                className="flex shrink-0 items-center gap-1 rounded-lg bg-sangue px-2 py-1 text-[11px] font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {lutando === op.id && <Spinner tamanho={11} />}
                {lutando === op.id ? "" : op.alcancavel ? "Invadir" : "🔒 Sem rota"}
              </button>
            </motion.div>
          );
        })
      )}
    </div>
  );
}
