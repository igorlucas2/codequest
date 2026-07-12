"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import CyberAvatar from "@/components/CyberAvatar";
import Spinner from "@/components/Spinner";
import { useSessao } from "@/components/Sessao";
import { montarInsigniasCursos } from "@/content/insigniasCursos";
import type { EstagioRunner } from "@/content/estagiosRunner";
import { getRaca, type Ficha } from "@/content/classes";
import type { Stats } from "@/lib/stats";

type PerfilPublico = {
  id: number;
  nome: string;
  ficha: Ficha;
  stats: Stats;
  estagioRunner: EstagioRunner;
  servidorTier: string;
  xp: number;
  vitorias: number;
  fasesConcluidas: number[];
  totalFases: number;
};

export default function PerfilPublicoRunner() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const perfilId = Number(params.id);
  const perfilIdValido = Number.isInteger(perfilId) && perfilId > 0;
  const { carregado, usuario } = useSessao();
  const [resultado, setResultado] = useState<{
    id: number;
    perfil: PerfilPublico | null;
    erro: string | null;
  } | null>(null);
  const resultadoAtual = resultado?.id === perfilId ? resultado : null;
  const perfil = resultadoAtual?.perfil ?? null;
  const erro = resultadoAtual?.erro ?? null;
  const carregando = perfilIdValido && resultadoAtual === null;

  useEffect(() => {
    if (carregado && !usuario) router.replace("/entrar");
  }, [carregado, usuario, router]);

  useEffect(() => {
    if (!usuario) return;
    if (!perfilIdValido) return;

    let cancelado = false;

    fetch(`/api/perfil/${perfilId}`, { cache: "no-store" })
      .then(async (res) => {
        const dados = await res.json().catch(() => ({}));
        if (cancelado) return;
        if (!res.ok) {
          setResultado({
            id: perfilId,
            perfil: null,
            erro: dados.erro ?? "Nao foi possivel carregar o perfil.",
          });
          return;
        }
        setResultado({ id: perfilId, perfil: dados.perfil ?? null, erro: null });
      })
      .catch(() => {
        if (!cancelado) {
          setResultado({ id: perfilId, perfil: null, erro: "Falha ao carregar perfil." });
        }
      });

    return () => {
      cancelado = true;
    };
  }, [perfilId, perfilIdValido, usuario]);

  const insignias = useMemo(() => {
    const fases = new Set(perfil?.fasesConcluidas ?? []);
    return montarInsigniasCursos(fases);
  }, [perfil?.fasesConcluidas]);

  if (!carregado || !usuario) {
    return (
      <AppShell largura="max-w-6xl">
        <p className="py-12 text-center text-texto-suave">Carregando sessao...</p>
      </AppShell>
    );
  }

  return (
    <AppShell largura="max-w-6xl">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="titulo text-3xl font-black text-ouro">Perfil publico do runner</h1>
          <p className="text-texto-suave">Insignias e progresso real da trilha publicada.</p>
        </div>
        <Link
          href="/ranking"
          className="deck-cut border border-borda bg-fundo-card px-4 py-2 text-sm font-semibold uppercase tracking-wide text-texto-suave transition hover:border-primaria hover:text-texto"
        >
          Voltar ao ranking
        </Link>
      </header>

      {!perfilIdValido ? (
        <div className="cartao mt-8 border-erro/40 p-4 text-sm text-erro">Perfil invalido.</div>
      ) : carregando ? (
        <div className="mt-8 flex items-center justify-center gap-2 text-texto-suave">
          <Spinner tamanho={16} /> Carregando perfil...
        </div>
      ) : erro ? (
        <div className="mt-8 rounded-xl border border-erro/40 bg-erro/10 p-4 text-sm text-erro">{erro}</div>
      ) : !perfil ? (
        <div className="mt-8 rounded-xl border border-borda bg-fundo p-4 text-sm text-texto-suave">
          Perfil indisponivel.
        </div>
      ) : (
        <section className="mt-8 grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="cartao cartao-ouro rounded-2xl p-5">
            <div className="flex items-start gap-4">
              <div className="rounded-xl border border-borda bg-fundo p-2">
                <CyberAvatar
                  classe={perfil.ficha.classe}
                  corPele={perfil.ficha.corPele}
                  corPrincipal={perfil.ficha.corPrincipal}
                  avatarModo={perfil.ficha.avatarModo}
                  fotoUrl={perfil.ficha.fotoUrl}
                  tamanho={112}
                  className="rounded-lg"
                />
              </div>
              <div className="min-w-0">
                <p className="titulo truncate text-xl font-bold">{perfil.nome}</p>
                <p className="mt-1 text-xs text-texto-suave">
                  Origem: {getRaca(perfil.ficha.raca)?.nome ?? perfil.ficha.raca}
                </p>
                <p className="text-xs text-texto-suave">Nivel {perfil.stats.nivel} na Rede</p>
                <p className="text-xs text-texto-suave">Tier do servidor: {perfil.servidorTier}</p>
                <p className="mt-1 text-xs font-semibold text-primaria">Estagio: {perfil.estagioRunner.nome}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Metrica rotulo="XP" valor={perfil.xp} />
              <Metrica rotulo="Poder" valor={perfil.stats.poder} />
              <Metrica rotulo="Vitorias" valor={perfil.vitorias} />
              <Metrica rotulo="Contratos" valor={`${perfil.fasesConcluidas.length}/${perfil.totalFases}`} />
            </div>
          </aside>

          <div className="cartao rounded-2xl p-5">
            <h2 className="titulo text-lg font-bold text-ouro">Insignias de cursos</h2>
            <p className="text-sm text-texto-suave">
              Aqui aparecem apenas cursos/trilhas que ja existem no jogo e o progresso real deste runner.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {insignias.map((insignia) => (
                <div key={insignia.id} className="rounded-xl border border-borda bg-fundo p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <IconeInsignia icone={insignia.icone} nome={insignia.nome} />
                      <div>
                        <p className="font-semibold">{insignia.nome}</p>
                        <p className="text-xs text-texto-suave">Curso</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-ouro">{insignia.status}</span>
                  </div>
                  <p className="mt-2 text-xs text-texto-suave">{insignia.resumo}</p>
                  <Barra percentual={insignia.percentual} />
                  <p className="mt-1 text-[11px] text-texto-suave">
                    {insignia.concluidas}/{insignia.total} contratos relacionados
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </AppShell>
  );
}

function Metrica({ rotulo, valor }: { rotulo: string; valor: string | number }) {
  return (
    <div className="rounded-lg border border-borda bg-fundo p-3">
      <p className="text-xs text-texto-suave">{rotulo}</p>
      <p className="mt-1 truncate font-semibold text-texto">{valor}</p>
    </div>
  );
}

function Barra({ percentual }: { percentual: number }) {
  return (
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-fundo-fosco">
      <div
        className="h-full rounded-full bg-primaria transition-all"
        style={{ width: `${Math.max(0, Math.min(100, percentual))}%` }}
      />
    </div>
  );
}

function IconeInsignia({ icone, nome }: { icone: string; nome: string }) {
  if (icone.startsWith("/")) {
    return (
      <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-lg bg-fundo-card">
        <Image src={icone} alt={`Insignia ${nome}`} width={28} height={28} className="h-7 w-7 object-contain" />
      </span>
    );
  }
  return <span className="grid h-8 w-8 place-items-center rounded-lg bg-fundo-card text-lg">{icone}</span>;
}
