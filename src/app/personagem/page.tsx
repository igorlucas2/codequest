"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import CyberAvatar from "@/components/CyberAvatar";
import AppShell from "@/components/AppShell";
import Spinner from "@/components/Spinner";
import Button from "@/components/ui/Button";
import { useSessao } from "@/components/Sessao";
import {
  getClasse,
  getRaca,
  custoRespec,
  RESPEC_COOLDOWN_CONTRATOS,
  type Ficha,
} from "@/content/classes";
import {
  SUBSISTEMAS,
  AUGMENTS,
  ranksPorSubsistema,
} from "@/content/augments";
import { ITENS, CORES_RARIDADE, SIMBOLO_RARIDADE, type Item } from "@/content/itens";
import { FASES, TRILHA } from "@/content/trilha1";
import { montarInsigniasCursos } from "@/content/insigniasCursos";
import { faltasParaEstagio, proximoEstagioRunner } from "@/content/estagiosRunner";
import { getSistemaComputadorPorItem } from "@/content/computador";
import { ehNotebookWorkspace, type NotebookWorkspace } from "@/lib/notebookWorkspace";

type WorkspaceResumo = {
  arquivos: number;
  pastas: number;
  projetos: number;
  linhasCodigo: number;
  arquivoAtivo: string | null;
  recentes: string[];
};

const RESUMO_WORKSPACE_VAZIO: WorkspaceResumo = {
  arquivos: 0,
  pastas: 0,
  projetos: 0,
  linhasCodigo: 0,
  arquivoAtivo: null,
  recentes: [],
};

// Ícones dos augments (SVG stroke inline). Chave = campo `icone` em AUGMENTS.
const AUG_ICONS: Record<string, string> = {
  cpu: '<rect x="6" y="6" width="12" height="12"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/>',
  code: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13 6l-2 12"/>',
  shield: '<path d="M12 3l7 3v5c0 4-3 7-7 9-4-2-7-5-7-9V6z"/>',
  heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.5-7 10-7 10z"/>',
  sword: '<path d="M14 4l6 6-8 8-3-3zM6 15l3 3-4 1 1-4z"/>',
  burst: '<path d="M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3"/>',
  eye: '<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/>',
  bug: '<path d="M12 6a4 4 0 0 1 4 4v3a4 4 0 0 1-8 0v-3a4 4 0 0 1 4-4z"/><path d="M9 8L6 6M15 8l3-2M8 13H4M20 13h-4M9 17l-3 2M15 17l3 2"/>',
  wifi: '<path d="M5 12a10 10 0 0 1 14 0M8 15a6 6 0 0 1 8 0"/><circle cx="12" cy="18" r="1.2"/>',
  ant: '<path d="M12 21V9M12 9l-5-5M12 9l5-5M8 21h8"/>',
  bolt: '<path d="M13 3L5 14h6l-2 7 8-11h-6z"/>',
};

export default function PaginaPersonagem() {
  const router = useRouter();
  const {
    carregado,
    usuario,
    moedas,
    ficha,
    stats,
    vitorias,
    estagioRunner,
    augments,
    praxis,
    respecs,
    respecMarcaContratos,
    progresso,
    inventario,
    totalConcluidas,
    totalFases,
    itemEquipado,
    equipar,
    salvarFicha,
    instalarAugment,
    resetarBuild,
    recarregar,
  } = useSessao();
  const [equipando, setEquipando] = useState<string | null>(null);
  const [avatarSalvando, setAvatarSalvando] = useState(false);
  const [avatarErro, setAvatarErro] = useState<string | null>(null);
  const [instalando, setInstalando] = useState<string | null>(null);
  const [resetando, setResetando] = useState(false);
  const [augErro, setAugErro] = useState<string | null>(null);
  const [workspaceResumo, setWorkspaceResumo] = useState<WorkspaceResumo | null>(null);

  useEffect(() => {
    if (carregado && !usuario) router.replace("/entrar");
  }, [carregado, usuario, router]);

  useEffect(() => {
    if (!usuario) return;
    let cancelado = false;

    fetch("/api/notebook/workspace", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((dados: unknown) => {
        if (cancelado) return;
        const workspace = dados && typeof dados === "object" ? (dados as { workspace?: unknown }).workspace : null;
        setWorkspaceResumo(ehNotebookWorkspace(workspace) ? resumirWorkspace(workspace) : RESUMO_WORKSPACE_VAZIO);
      })
      .catch(() => {
        if (!cancelado) setWorkspaceResumo(RESUMO_WORKSPACE_VAZIO);
      });

    return () => {
      cancelado = true;
    };
  }, [usuario]);

  const fasesConcluidas = useMemo(
    () => new Set(progresso.fasesConcluidas),
    [progresso.fasesConcluidas],
  );
  const itensPossuidos: Item[] = useMemo(
    () => ITENS.filter((i) => inventario.some((inv) => inv.itemId === i.id)),
    [inventario],
  );
  const insignias = useMemo(
    () => montarInsigniasCursos(fasesConcluidas),
    [fasesConcluidas],
  );
  const proximoEstagio = useMemo(
    () => proximoEstagioRunner(estagioRunner.id),
    [estagioRunner.id],
  );
  const faltasProximoEstagio = useMemo(
    () =>
      proximoEstagio
        ? faltasParaEstagio({ xp: progresso.xp, contratos: totalConcluidas, vitorias }, proximoEstagio)
        : null,
    [proximoEstagio, progresso.xp, totalConcluidas, vitorias],
  );
  const insigniasEmPreparacao = useMemo(
    () => montarInsigniasCursos(fasesConcluidas, { incluirNaoPublicados: true }).filter((i) => !i.publicado),
    [fasesConcluidas],
  );
  const insigniasDesbloqueadas = useMemo(
    () => insignias.filter((i) => i.percentual > 0),
    [insignias],
  );
  const historico = useMemo(
    () =>
      (progresso.historico ?? [])
        .map((evento) => {
          const fase = FASES.find((f) => f.ordem === evento.faseOrdem);
          return fase ? { ...evento, fase } : null;
        })
        .filter((evento): evento is NonNullable<typeof evento> => evento !== null),
    [progresso.historico],
  );

  const porSub = useMemo(() => ranksPorSubsistema(augments), [augments]);
  const totalRanks = useMemo(
    () => Object.values(augments).reduce((s, n) => s + (n ?? 0), 0),
    [augments],
  );

  if (!carregado || !usuario) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-16 text-center text-texto-suave">
        Carregando...
      </main>
    );
  }

  const escolherAvatarModo = async (modo: Ficha["avatarModo"]) => {
    setAvatarErro(null);
    if (modo === "foto" && !ficha.fotoUrl) {
      setAvatarErro("Envie uma foto antes de ativar este modo.");
      return;
    }
    await salvarFicha({ ...ficha, avatarModo: modo });
  };
  const enviarFoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const arquivo = input.files?.[0];
    if (!arquivo) return;

    setAvatarErro(null);
    if (!["image/png", "image/jpeg", "image/webp"].includes(arquivo.type)) {
      setAvatarErro("Use PNG, JPG ou WEBP.");
      input.value = "";
      return;
    }
    if (arquivo.size > 3 * 1024 * 1024) {
      setAvatarErro("A foto deve ter ate 3 MB.");
      input.value = "";
      return;
    }

    setAvatarSalvando(true);
    try {
      const formData = new FormData();
      formData.append("foto", arquivo);
      const res = await fetch("/api/personagem/avatar/foto", { method: "POST", body: formData });
      const dados = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(dados.erro ?? "Nao foi possivel enviar a foto.");
      await recarregar();
    } catch (erro) {
      setAvatarErro(erro instanceof Error ? erro.message : "Nao foi possivel enviar a foto.");
    } finally {
      setAvatarSalvando(false);
      input.value = "";
    }
  };
  const removerFoto = async () => {
    setAvatarErro(null);
    setAvatarSalvando(true);
    try {
      const res = await fetch("/api/personagem/avatar/foto", { method: "DELETE" });
      const dados = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(dados.erro ?? "Nao foi possivel remover a foto.");
      await recarregar();
    } catch (erro) {
      setAvatarErro(erro instanceof Error ? erro.message : "Nao foi possivel remover a foto.");
    } finally {
      setAvatarSalvando(false);
    }
  };

  const instalar = async (augId: string) => {
    setAugErro(null);
    setInstalando(augId);
    try {
      const r = await instalarAugment(augId);
      if (!r.ok) setAugErro(r.erro ?? "Nao foi possivel instalar o augment.");
    } finally {
      setInstalando(null);
    }
  };
  const reinstalarBuild = async () => {
    setAugErro(null);
    setResetando(true);
    try {
      const r = await resetarBuild();
      if (!r.ok) setAugErro(r.erro ?? "Nao foi possivel reinstalar a build.");
    } finally {
      setResetando(false);
    }
  };

  const foco = getClasse(ficha.classe)!;
  const origem = getRaca(ficha.raca)!;
  const custoReset = custoRespec(respecs);
  const contratosDesbloqueio = respecs >= 1 ? respecMarcaContratos + RESPEC_COOLDOWN_CONTRATOS : 0;
  const emCooldownReset = respecs >= 1 && totalConcluidas < contratosDesbloqueio;
  const percentualTrilha = totalFases > 0 ? Math.round((totalConcluidas / totalFases) * 100) : 0;
  const proximaFase = FASES.find((fase) => !fasesConcluidas.has(fase.ordem)) ?? null;
  const resumoNotebook = workspaceResumo ?? RESUMO_WORKSPACE_VAZIO;
  const tituloHint =
    totalRanks < 2 ? "instale augments num subsistema pra se especializar" : foco.lema;

  return (
    <AppShell largura="max-w-6xl" mesh>
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="titulo text-3xl font-black text-ouro">Deck do Runner</h1>
          <p className="max-w-3xl text-texto-suave">
            Você evolui gastando Praxis em cyberware. A build define seus stats de combate e o título que você carrega — sem classe pra escolher num menu.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/trilha"
            className="deck-cut border border-borda bg-fundo-card px-4 py-2 text-sm font-semibold uppercase tracking-wide text-texto-suave transition hover:border-primaria hover:text-texto"
          >
            Continuar trilha
          </Link>
          <Link
            href="/computador"
            className="deck-cut border border-primaria/40 bg-primaria px-4 py-2 text-sm font-semibold uppercase tracking-wide text-fundo transition hover:bg-primaria-forte"
          >
            Abrir computador
          </Link>
        </div>
      </header>

      <section className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-5">
          <div className="cartao cartao-ouro rounded-2xl p-5">
            <div className="flex items-start gap-4">
              <div className="rounded-xl border border-borda bg-fundo p-2">
                <CyberAvatar
                  classe={ficha.classe}
                  corPele={ficha.corPele}
                  corPrincipal={ficha.corPrincipal}
                  avatarModo={ficha.avatarModo}
                  fotoUrl={ficha.fotoUrl}
                  tamanho={116}
                  className="rounded-lg"
                />
              </div>
              <div className="min-w-0">
                <p className="titulo truncate text-xl font-bold">{usuario.nome}</p>
                <p className="mt-1 text-sm text-ouro">{foco.nome}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span
                    title={origem.descricao}
                    className="rounded-md border border-borda bg-fundo px-2 py-0.5 text-[11px] font-semibold text-texto-suave"
                  >
                    Origem: {origem.nome}
                  </span>
                  <span className="rounded-md border border-primaria/40 bg-primaria/10 px-2 py-0.5 text-[11px] font-semibold text-primaria">
                    {estagioRunner.nome}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <Metrica rotulo="XP total" valor={progresso.xp} />
              <Metrica rotulo="Vitórias" valor={vitorias} />
              <Metrica rotulo="Contratos" valor={`${totalConcluidas}/${totalFases}`} />
              <Metrica rotulo="Insígnias" valor={insigniasDesbloqueadas.length} />
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between text-xs text-texto-suave">
                <span>{TRILHA.titulo}</span>
                <span>{percentualTrilha}%</span>
              </div>
              <Barra percentual={percentualTrilha} />
              <p className="mt-2 text-xs text-texto-suave">
                {proximaFase ? `Próximo contrato: ${proximaFase.titulo}` : "Trilha atual concluída."}
              </p>
            </div>

            <div className="mt-4 rounded-lg border border-borda bg-fundo p-2 text-[11px] text-texto-suave">
              {proximoEstagio && faltasProximoEstagio
                ? `Próximo estágio (${proximoEstagio.nome}): faltam ${faltasProximoEstagio.xp} XP, ${faltasProximoEstagio.contratos} contratos e ${faltasProximoEstagio.vitorias} vitórias.`
                : "Estágio máximo atingido."}
            </div>
          </div>

          <section className="cartao rounded-2xl p-5">
            <h2 className="titulo text-sm font-bold text-ouro">Avatar</h2>
            <p className="mt-1 text-[11px] text-texto-suave">
              O robô reflete a sua build automaticamente. Se preferir, use uma foto.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => escolherAvatarModo("robo")}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                  ficha.avatarModo === "robo"
                    ? "border-primaria bg-primaria/15 text-primaria"
                    : "border-borda bg-fundo-card text-texto-suave hover:text-texto"
                }`}
              >
                Robô
              </button>
              <button
                onClick={() => escolherAvatarModo("foto")}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                  ficha.avatarModo === "foto"
                    ? "border-primaria bg-primaria/15 text-primaria"
                    : "border-borda bg-fundo-card text-texto-suave hover:text-texto"
                }`}
              >
                Foto
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <label
                className={`flex cursor-pointer items-center justify-center rounded-lg border border-borda bg-fundo-card px-3 py-2 text-xs font-semibold text-texto-suave transition hover:border-primaria/60 hover:text-texto ${
                  avatarSalvando ? "pointer-events-none opacity-40" : ""
                }`}
              >
                {avatarSalvando ? "Enviando..." : ficha.fotoUrl ? "Trocar foto" : "Enviar foto"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  disabled={avatarSalvando}
                  onChange={enviarFoto}
                />
              </label>
              {ficha.fotoUrl && (
                <Button tamanho="sm" variante="fantasma" disabled={avatarSalvando} onClick={removerFoto}>
                  Remover
                </Button>
              )}
            </div>
            {avatarErro && <p className="mt-2 text-xs text-erro">{avatarErro}</p>}
          </section>
        </aside>

        <div className="min-w-0 space-y-5">
          <section className="cartao rounded-2xl p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="titulo text-lg font-bold text-ouro">Cyberware</h2>
                <p className="text-sm text-texto-suave">
                  Cada contrato rende Praxis. Instale ranks nos subsistemas do deck — a build define seus stats e o seu título.
                </p>
              </div>
            </div>

            {/* Painel Praxis + título emergente + stats de combate */}
            <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-primaria/40 bg-primaria/10 p-4">
              <div className="text-center">
                <p className="font-mono text-[10px] tracking-widest text-texto-suave">PRAXIS</p>
                <p className="text-3xl font-black leading-none text-primaria">{praxis}</p>
              </div>
              <div className="h-10 w-px bg-borda" />
              <div className="min-w-0">
                <p className="font-mono text-[10px] tracking-widest text-texto-suave">TÍTULO EMERGENTE</p>
                <p className="text-lg font-bold text-ouro">{foco.nome}</p>
                <p className="text-[11px] text-texto-suave">{tituloHint}</p>
              </div>
              <div className="ml-auto grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Metrica rotulo="Poder" valor={stats.poder} />
                <Metrica rotulo="Ataque" valor={stats.ataque} />
                <Metrica rotulo="Defesa" valor={stats.defesa} />
                <Metrica rotulo="Integr." valor={stats.vida} />
              </div>
            </div>

            {/* Árvore de subsistemas */}
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {SUBSISTEMAS.map((sub) => {
                const augs = AUGMENTS.filter((a) => a.sub === sub.id);
                const investido = porSub[sub.id];
                return (
                  <div key={sub.id} className="rounded-xl border border-borda bg-fundo-card p-3">
                    <div className="flex items-baseline justify-between border-b border-borda pb-2">
                      <p className={`text-sm font-bold ${investido > 0 ? "text-ouro" : "text-texto"}`}>{sub.nome}</p>
                      <span className="font-mono text-[10px] tracking-wide text-texto-suave">
                        {sub.regiao} · {investido}
                      </span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {augs.map((a) => {
                        const rank = augments[a.id] ?? 0;
                        const maxed = rank >= a.max;
                        const cor = maxed ? "sucesso" : rank > 0 ? "primaria" : "borda";
                        return (
                          <div
                            key={a.id}
                            className={`flex items-center gap-2.5 rounded-lg border bg-fundo p-2.5 ${
                              maxed ? "border-sucesso/40" : rank > 0 ? "border-primaria/40" : "border-borda"
                            }`}
                          >
                            <span
                              className={`grid h-9 w-9 shrink-0 place-items-center rounded-md border ${
                                maxed
                                  ? "border-sucesso/50 text-sucesso"
                                  : rank > 0
                                    ? "border-primaria/50 text-primaria"
                                    : "border-borda text-texto-suave"
                              }`}
                            >
                              <IconeAug nome={a.icone} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-sm font-semibold" title={a.descricao}>
                                  {a.nome}
                                </p>
                                <span
                                  className={`shrink-0 font-mono text-xs ${cor === "sucesso" ? "text-sucesso" : "text-texto-suave"}`}
                                >
                                  {rank}/{a.max}
                                </span>
                              </div>
                              <p className="truncate text-[11px] text-texto-suave">{a.efeito}</p>
                            </div>
                            <Button
                              tamanho="sm"
                              variante={maxed ? "fantasma" : "primario"}
                              carregando={instalando === a.id}
                              disabled={maxed || praxis <= 0 || instalando !== null}
                              onClick={() => instalar(a.id)}
                              title={praxis <= 0 ? "Sem Praxis — conclua mais contratos" : a.efeito}
                            >
                              {maxed ? "Máx" : "＋"}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-borda bg-fundo p-3">
              <Button
                tamanho="sm"
                variante="fantasma"
                carregando={resetando}
                disabled={resetando || totalRanks === 0 || emCooldownReset || moedas < custoReset}
                onClick={reinstalarBuild}
              >
                Reinstalar build
              </Button>
              <p className="flex-1 text-[11px] text-texto-suave">
                {totalRanks === 0
                  ? "Nada instalado ainda — gaste Praxis pra começar sua build."
                  : emCooldownReset
                    ? `Reinstalar liberado após concluir mais ${contratosDesbloqueio - totalConcluidas} contrato(s).`
                    : `Zera todos os ranks e devolve ${totalRanks} Praxis pra redistribuir · custa ◈ ${custoReset} cr.`}
              </p>
            </div>
            {augErro && <p className="mt-1 text-xs text-erro">{augErro}</p>}
          </section>

          <section className="cartao rounded-2xl p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="titulo text-lg font-bold text-ouro">Insígnias de aprendizado</h2>
                <p className="text-sm text-texto-suave">
                  Insígnias representam cursos/trilhas realmente publicados no jogo.
                </p>
              </div>
              <span className="rounded-lg border border-borda bg-fundo px-3 py-1 text-xs text-texto-suave">
                {insigniasDesbloqueadas.length} desbloqueadas
              </span>
            </div>

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
                    {insignia.total > 0
                      ? `${insignia.concluidas}/${insignia.total} contratos relacionados`
                      : "Insígnia futura"}
                  </p>
                </div>
              ))}
            </div>

            {insigniasEmPreparacao.length > 0 && (
              <div className="mt-4 rounded-xl border border-borda bg-fundo p-3">
                <p className="text-xs font-semibold text-texto-suave">Cursos em preparacao</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {insigniasEmPreparacao.map((insignia) => (
                    <span
                      key={insignia.id}
                      className="rounded-lg border border-borda bg-fundo-card px-2 py-1 text-xs text-texto-suave"
                    >
                      {insignia.nome}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
            <div className="cartao min-w-0 rounded-2xl p-5">
              <h2 className="titulo text-lg font-bold text-ouro">Histórico de aprendizagem</h2>
              {historico.length === 0 ? (
                <p className="mt-4 rounded-xl border border-borda bg-fundo p-4 text-sm text-texto-suave">
                  Nenhum contrato concluído ainda.
                </p>
              ) : (
                <ol className="mt-4 space-y-3">
                  {historico.map(({ fase, xp, concluidaEm }) => (
                    <li key={fase.ordem} className="flex gap-3 rounded-xl border border-borda bg-fundo p-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-fundo-card text-xl">
                        {fase.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{fase.titulo}</p>
                        <p className="text-xs text-texto-suave">
                          {TRILHA.titulo} · Python · +{xp} XP
                        </p>
                        <p className="mt-1 text-[11px] text-texto-suave">{formatarData(concluidaEm)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="cartao min-w-0 rounded-2xl p-5">
              <h2 className="titulo text-lg font-bold text-ouro">Evidências no notebook</h2>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Metrica rotulo="Projetos" valor={resumoNotebook.projetos} />
                <Metrica rotulo="Pastas" valor={resumoNotebook.pastas} />
                <Metrica rotulo="Arquivos" valor={resumoNotebook.arquivos} />
                <Metrica rotulo="Linhas" valor={resumoNotebook.linhasCodigo} />
              </div>
              <div className="mt-4 rounded-xl border border-borda bg-fundo p-3">
                <p className="text-xs font-semibold text-texto-suave">Arquivo ativo</p>
                <p className="mt-1 truncate font-mono text-sm text-texto">
                  {resumoNotebook.arquivoAtivo ?? "Nenhum arquivo salvo"}
                </p>
              </div>
              {resumoNotebook.recentes.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-texto-suave">Arquivos</p>
                  <div className="mt-2 space-y-1">
                    {resumoNotebook.recentes.map((arquivo) => (
                      <p key={arquivo} className="truncate rounded-lg bg-fundo px-2 py-1 font-mono text-xs text-texto-suave">
                        {arquivo}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="cartao rounded-2xl p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="titulo text-lg font-bold text-ouro">Ferramentas desbloqueadas</h2>
                <p className="text-sm text-texto-suave">Itens comprados e conquistados que influenciam outros sistemas.</p>
              </div>
              <Link href="/loja" className="text-sm font-semibold text-ouro hover:underline">
                Abrir Mercado
              </Link>
            </div>
            {itensPossuidos.length === 0 ? (
              <p className="mt-4 rounded-xl border border-borda bg-fundo p-4 text-sm text-texto-suave">
                Nenhuma ferramenta desbloqueada ainda.
              </p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {itensPossuidos.map((item) => {
                  const ativo = itemEquipado(item.id);
                  const midia = item.tipo === "midia";
                  return (
                    <div key={item.id} className="flex items-center gap-3 rounded-xl border border-borda bg-fundo p-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-fundo-card text-2xl">
                        {item.icone}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate font-semibold"
                          style={{ color: CORES_RARIDADE[item.raridade] }}
                          title={`Raridade: ${item.raridade}`}
                        >
                          <span aria-hidden="true">{SIMBOLO_RARIDADE[item.raridade]}</span> {item.nome}
                        </p>
                        <p className="text-xs text-texto-suave">{descreverAtributos(item)}</p>
                      </div>
                      {midia ? (
                        <span className="shrink-0 text-xs font-semibold text-sucesso">Na mochila</span>
                      ) : (
                        <Button
                          tamanho="sm"
                          variante={ativo ? "sucesso" : "fantasma"}
                          disabled={equipando !== null}
                          onClick={async () => {
                            setEquipando(item.id);
                            try {
                              await equipar(item.id, !ativo);
                            } finally {
                              setEquipando(null);
                            }
                          }}
                        >
                          {equipando === item.id && <Spinner tamanho={12} />}
                          {ativo ? "Ativa" : "Ativar"}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </section>
    </AppShell>
  );
}

function resumirWorkspace(workspace: NotebookWorkspace): WorkspaceResumo {
  const arquivos = workspace.entradas.filter((e) => e.tipo === "arquivo");
  const pastas = workspace.entradas.filter((e) => e.tipo === "pasta");
  const projetos = new Set(
    workspace.entradas
      .map((e) => e.caminho.split("/").filter(Boolean)[0])
      .filter((parte): parte is string => Boolean(parte)),
  ).size;
  const linhasCodigo = arquivos.reduce((total, arquivo) => total + (arquivo.conteudo?.split("\n").length ?? 0), 0);

  return {
    arquivos: arquivos.length,
    pastas: pastas.length,
    projetos,
    linhasCodigo,
    arquivoAtivo: workspace.arquivoAtivo || null,
    recentes: arquivos
      .map((arquivo) => arquivo.caminho)
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 6),
  };
}

function formatarData(valor: string | null) {
  if (!valor) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(valor));
}

function IconeAug({ nome }: { nome: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: AUG_ICONS[nome] ?? "" }}
    />
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

function descreverAtributos(item: Item) {
  if (item.tipo === "midia") {
    const sistema = getSistemaComputadorPorItem(item.id);
    return sistema ? `Midia de boot do ${sistema.nome}.` : "Midia de boot.";
  }
  const partes: string[] = [];
  if (item.atributos.ataque) partes.push(`+${item.atributos.ataque} exploit`);
  if (item.atributos.defesa) partes.push(`+${item.atributos.defesa} firewall`);
  if (item.atributos.vida) partes.push(`+${item.atributos.vida} integridade`);
  if (item.atributos.velocidade) partes.push(`+${item.atributos.velocidade} velocidade`);
  return partes.join(" · ") || "Ferramenta de perfil";
}
