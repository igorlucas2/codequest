"use client";

import { useEffect, useState } from "react";

type Registro = {
  id: number;
  oponenteNome: string;
  souAtacante: boolean;
  venceu: boolean;
  moedasGanhas: number;
  criadoEm: string;
};

// Programa "Histórico": lista as últimas invasões do jogador, tanto ataques
// que ele fez quanto invasões que sofreu — puro registro, sem interação.
export default function Historico() {
  const [registros, setRegistros] = useState<Registro[] | null>(null);

  useEffect(() => {
    fetch("/api/arena/historico", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setRegistros(d.registros ?? []));
  }, []);

  return (
    <div className="space-y-2 text-sm">
      {registros === null ? (
        <p className="text-center text-texto-suave">Carregando registros da Rede...</p>
      ) : registros.length === 0 ? (
        <p className="text-center text-texto-suave">
          Nenhuma invasão registrada ainda. Vá em Alvos e invada alguém!
        </p>
      ) : (
        registros.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-2 rounded-xl border border-borda bg-fundo-card p-2"
          >
            <span className="shrink-0 text-lg">{r.souAtacante ? "⚔️" : "🛡️"}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">
                {r.souAtacante ? `Você invadiu ${r.oponenteNome}` : `${r.oponenteNome} te invadiu`}
              </p>
              <p className="text-[11px] text-texto-suave">
                {new Date(r.criadoEm).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <div className="shrink-0 text-right text-xs">
              <p className={r.venceu ? "font-semibold text-sucesso" : "font-semibold text-erro"}>
                {r.venceu ? "Vitória" : "Derrota"}
              </p>
              {r.moedasGanhas > 0 && <p className="text-ouro">+{r.moedasGanhas} ◈</p>}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
