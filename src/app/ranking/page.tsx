"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import CyberAvatar from "@/components/CyberAvatar";
import AppShell from "@/components/AppShell";
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
      <AppShell largura="max-w-4xl">
        <div className="mt-8">
          <SkeletonCartoes quantidade={6} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell largura="max-w-4xl">
      <header>
        <h1 className="titulo text-3xl font-black text-ouro">Ranking da Rede</h1>
        <p className="text-texto-suave">
          Quem estudou e construiu o melhor servidor lidera. Suba de posição!
        </p>
      </header>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          onClick={() => setAba("poder")}
          className={`deck-cut border px-3 py-2 text-sm font-semibold transition ${
            aba === "poder" ? "bg-primaria/20 text-primaria" : "text-texto-suave hover:text-texto"
          }`}
        >
          ⚡ Poder de invasão
        </button>
        <button
          onClick={() => setAba("receita")}
          className={`deck-cut border px-3 py-2 text-sm font-semibold transition ${
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
                <li key={l.id}>
                  <Link
                    href={`/perfil/${l.id}`}
                    className={`cartao flex items-center gap-3 rounded-2xl p-3 transition hover:border-primaria/60 ${
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
                        avatarModo={l.ficha.avatarModo}
                        fotoUrl={l.ficha.fotoUrl}
                        tamanho={40}
                        className="rounded-md"
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
                          {l.receita} <span className="text-xs font-normal text-texto-suave">cr coletados</span>
                        </>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
        </ol>
      )}
    </AppShell>
  );
}
