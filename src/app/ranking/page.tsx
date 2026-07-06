"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import CyberAvatar from "@/components/CyberAvatar";
import NavRpg from "@/components/NavRpg";
import { useSessao } from "@/components/Sessao";
import { SkeletonCartoes } from "@/components/Skeleton";
import type { Ficha } from "@/content/classes";

type LinhaRanking = {
  id: number;
  nome: string;
  ficha: Ficha;
  nivel: number;
  poder: number;
  vitorias: number;
  receita: number;
};

const MEDALHAS = ["🥇", "🥈", "🥉"];

export default function Ranking() {
  const router = useRouter();
  const { carregado, usuario } = useSessao();
  const [ranking, setRanking] = useState<LinhaRanking[] | null>(null);
  const [meuId, setMeuId] = useState<number | null>(null);
  const [aba, setAba] = useState<"poder" | "receita">("poder");

  useEffect(() => {
    if (carregado && !usuario) router.replace("/entrar");
  }, [carregado, usuario, router]);

  useEffect(() => {
    if (!usuario) return;
    fetch("/api/ranking", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setRanking(d.ranking ?? []);
        setMeuId(d.meuId ?? null);
      });
  }, [usuario]);

  if (!carregado || !usuario) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-10">
        <NavRpg />
        <div className="mt-8">
          <SkeletonCartoes quantidade={6} />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <NavRpg />

      <header className="mt-6">
        <h1 className="titulo text-3xl font-black text-ouro">Ranking da Rede</h1>
        <p className="text-texto-suave">
          Quem estudou e construiu o melhor servidor lidera. Suba de posição!
        </p>
      </header>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => setAba("poder")}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
            aba === "poder" ? "bg-primaria/20 text-primaria" : "text-texto-suave hover:text-texto"
          }`}
        >
          ⚡ Poder de invasão
        </button>
        <button
          onClick={() => setAba("receita")}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
            aba === "receita" ? "bg-primaria/20 text-primaria" : "text-texto-suave hover:text-texto"
          }`}
        >
          💰 Receita
        </button>
      </div>

      {ranking === null ? (
        <p className="mt-8 text-center text-texto-suave">Carregando ranking...</p>
      ) : (
        <ol className="mt-4 space-y-2">
          {[...ranking]
            .sort((a, b) => (aba === "poder" ? b.poder - a.poder : b.receita - a.receita))
            .map((l, i) => {
              const sou = l.id === meuId;
              return (
                <li
                  key={l.id}
                  className={`cartao flex items-center gap-3 rounded-2xl p-3 ${
                    sou ? "cartao-ouro" : ""
                  }`}
                >
                  <span className="w-8 text-center text-lg font-bold">
                    {MEDALHAS[i] ?? <span className="text-texto-suave">{i + 1}</span>}
                  </span>
                  <div className="shrink-0 rounded-lg bg-fundo/60 p-0.5">
                    <CyberAvatar
                      classe={l.ficha.classe}
                      corPele={l.ficha.corPele}
                      corPrincipal={l.ficha.corPrincipal}
                      tamanho={40}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {l.nome} {sou && <span className="text-xs text-ouro">(você)</span>}
                    </p>
                    <p className="text-xs text-texto-suave">
                      Nível {l.nivel} · {l.vitorias}{" "}
                      {l.vitorias === 1 ? "invasão bem-sucedida" : "invasões bem-sucedidas"}
                    </p>
                  </div>
                  <span className="shrink-0 font-bold text-arcano">
                    {aba === "poder" ? (
                      <>
                        {l.poder} <span className="text-xs font-normal text-texto-suave">poder</span>
                      </>
                    ) : (
                      <>
                        {l.receita} <span className="text-xs font-normal text-texto-suave">cr/h</span>
                      </>
                    )}
                  </span>
                </li>
              );
            })}
        </ol>
      )}
    </main>
  );
}
