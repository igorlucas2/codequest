"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import CyberAvatar from "@/components/CyberAvatar";
import NavRpg from "@/components/NavRpg";
import Spinner from "@/components/Spinner";
import Button from "@/components/ui/Button";
import { useSessao } from "@/components/Sessao";
import {
  CLASSES,
  RACAS,
  OPCOES_PELE,
  OPCOES_COR,
  getClasse,
  getRaca,
  type Ficha,
} from "@/content/classes";
import { ITENS, CORES_RARIDADE, SIMBOLO_RARIDADE, type Item } from "@/content/itens";
import { FASES, TRILHA, XP_TOTAL } from "@/content/trilha1";
import { ehNotebookWorkspace, type NotebookWorkspace } from "@/lib/notebookWorkspace";

type WorkspaceResumo = {
  arquivos: number;
  pastas: number;
  projetos: number;
  linhasCodigo: number;
  arquivoAtivo: string | null;
  recentes: string[];
};

type Competencia = {
  id: string;
  nome: string;
  grupo: "Linguagem" | "Tema" | "Ferramenta";
  fases: number[];
};

const COMPETENCIAS: Competencia[] = [
  { id: "logica", nome: "Lógica de Programação", grupo: "Tema", fases: [1, 2, 3, 4, 5, 6, 7] },
  { id: "python", nome: "Python", grupo: "Linguagem", fases: [1, 2, 3, 4, 5, 6, 7] },
  { id: "algoritmos", nome: "Algoritmos", grupo: "Tema", fases: [1] },
  { id: "dados", nome: "Variáveis e tipos", grupo: "Tema", fases: [2, 3] },
  { id: "controle", nome: "Controle de fluxo", grupo: "Tema", fases: [4, 5] },
  { id: "funcoes", nome: "Funções", grupo: "Tema", fases: [6, 7] },
  { id: "javascript", nome: "JavaScript", grupo: "Linguagem", fases: [] },
  { id: "sql", nome: "SQL e dados", grupo: "Linguagem", fases: [] },
  { id: "linux", nome: "Linux", grupo: "Ferramenta", fases: [] },
  { id: "redes", nome: "Redes", grupo: "Tema", fases: [] },
  { id: "seguranca", nome: "Segurança", grupo: "Tema", fases: [] },
  { id: "devops", nome: "DevOps", grupo: "Ferramenta", fases: [] },
  { id: "git", nome: "Git/GitHub", grupo: "Ferramenta", fases: [] },
  { id: "apis", nome: "APIs", grupo: "Tema", fases: [] },
];

const RESUMO_WORKSPACE_VAZIO: WorkspaceResumo = {
  arquivos: 0,
  pastas: 0,
  projetos: 0,
  linhasCodigo: 0,
  arquivoAtivo: null,
  recentes: [],
};

export default function PaginaPersonagem() {
  const router = useRouter();
  const {
    carregado,
    usuario,
    ficha,
    progresso,
    inventario,
    totalConcluidas,
    totalFases,
    itemEquipado,
    equipar,
    salvarFicha,
    recarregar,
  } = useSessao();
  const [equipando, setEquipando] = useState<string | null>(null);
  const [avatarSalvando, setAvatarSalvando] = useState(false);
  const [avatarErro, setAvatarErro] = useState<string | null>(null);
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
  const competencias = useMemo(
    () => montarCompetencias(fasesConcluidas),
    [fasesConcluidas],
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

  if (!carregado || !usuario) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-16 text-center text-texto-suave">
        Carregando...
      </main>
    );
  }

  const set = <K extends keyof Ficha>(campo: K, valor: Ficha[K]) => salvarFicha({ ...ficha, [campo]: valor });
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
      const res = await fetch("/api/personagem/avatar/foto", {
        method: "POST",
        body: formData,
      });
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
  const foco = getClasse(ficha.classe)!;
  const stack = getRaca(ficha.raca)!;
  const percentualTrilha = totalFases > 0 ? Math.round((totalConcluidas / totalFases) * 100) : 0;
  const proximaFase = FASES.find((fase) => !fasesConcluidas.has(fase.ordem)) ?? null;
  const resumoNotebook = workspaceResumo ?? RESUMO_WORKSPACE_VAZIO;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <NavRpg />

      <header className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="titulo text-3xl font-black text-ouro">Perfil do Runner</h1>
          <p className="max-w-3xl text-texto-suave">
            Identidade técnica, trilhas concluídas, linguagens em evolução e evidências criadas no notebook.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/trilha"
            className="rounded-xl border border-borda bg-fundo-card px-4 py-2 text-sm font-semibold text-texto-suave transition hover:border-primaria hover:text-texto"
          >
            Continuar trilha
          </Link>
          <Link
            href="/computador"
            className="rounded-xl border border-primaria/40 bg-primaria px-4 py-2 text-sm font-semibold text-fundo transition hover:bg-primaria-forte hover:text-white"
          >
            Abrir computador
          </Link>
        </div>
      </header>

      <section className="mt-8 grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-5">
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
                <p className="text-xs text-texto-suave">{stack.nome} como stack inicial</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <Metrica rotulo="XP total" valor={progresso.xp} />
              <Metrica rotulo="Nível técnico" valor={nivelTecnico(progresso.xp)} />
              <Metrica rotulo="Contratos" valor={`${totalConcluidas}/${totalFases}`} />
              <Metrica rotulo="Notebook" valor={`${resumoNotebook.arquivos} arq.`} />
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
          </div>

          <section className="cartao rounded-2xl p-5">
            <h2 className="titulo text-sm font-bold text-ouro">Avatar e chassi</h2>
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-borda bg-fundo p-3">
                <p className="text-xs font-semibold text-texto-suave">Representacao</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => escolherAvatarModo("robo")}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                      ficha.avatarModo === "robo"
                        ? "border-primaria bg-primaria/15 text-primaria"
                        : "border-borda bg-fundo-card text-texto-suave hover:text-texto"
                    }`}
                  >
                    Robozinho
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
                    <Button
                      tamanho="sm"
                      variante="fantasma"
                      disabled={avatarSalvando}
                      onClick={removerFoto}
                    >
                      Remover
                    </Button>
                  )}
                </div>
                {avatarErro && <p className="mt-2 text-xs text-erro">{avatarErro}</p>}
                <p className="mt-2 text-[11px] text-texto-suave">
                  O robozinho continua disponivel; a foto so aparece quando esse modo estiver ativo.
                </p>
              </div>
              <Cores rotulo="LED" valores={OPCOES_PELE} atual={ficha.corPele} onPick={(v) => set("corPele", v)} />
              <Cores rotulo="Chassi" valores={OPCOES_COR} atual={ficha.corPrincipal} onPick={(v) => set("corPrincipal", v)} />
            </div>
          </section>
        </aside>

        <div className="space-y-5">
          <section className="cartao rounded-2xl p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="titulo text-lg font-bold text-ouro">Foco de aprendizagem</h2>
                <p className="text-sm text-texto-suave">{foco.descricao}</p>
              </div>
              <span className="rounded-lg border border-borda bg-fundo px-3 py-1 text-xs text-texto-suave">
                {foco.lema}
              </span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {CLASSES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => set("classe", c.id)}
                  className={`rounded-xl border p-3 text-left transition ${
                    c.id === ficha.classe
                      ? "border-ouro bg-ouro/10"
                      : "border-borda bg-fundo hover:border-primaria/60"
                  }`}
                >
                  <p className="font-semibold">{c.nome}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-texto-suave">{c.descricao}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="cartao rounded-2xl p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="titulo text-lg font-bold text-ouro">Stack inicial</h2>
                <p className="text-sm text-texto-suave">{stack.descricao}</p>
              </div>
              <span className="rounded-lg border border-borda bg-fundo px-3 py-1 text-xs text-texto-suave">
                Base escolhida
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {RACAS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => set("raca", r.id)}
                  className={`rounded-xl border px-3 py-2 text-left transition ${
                    r.id === ficha.raca
                      ? "border-ouro bg-ouro/10 text-texto"
                      : "border-borda bg-fundo text-texto-suave hover:border-primaria/60 hover:text-texto"
                  }`}
                  title={r.descricao}
                >
                  <span className="text-sm font-semibold">{r.nome}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="cartao rounded-2xl p-5">
            <h2 className="titulo text-lg font-bold text-ouro">Mapa de competências</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {competencias.map((c) => (
                <div key={c.id} className="rounded-xl border border-borda bg-fundo p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{c.nome}</p>
                      <p className="text-xs text-texto-suave">{c.grupo}</p>
                    </div>
                    <span className={`text-xs font-semibold ${c.percentual > 0 ? "text-ouro" : "text-texto-suave"}`}>
                      {c.status}
                    </span>
                  </div>
                  <Barra percentual={c.percentual} />
                  <p className="mt-1 text-[11px] text-texto-suave">
                    {c.total > 0 ? `${c.concluidas}/${c.total} evidências` : "Sem contratos publicados"}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
            <div className="cartao rounded-2xl p-5">
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

            <div className="cartao rounded-2xl p-5">
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
    </main>
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

function montarCompetencias(fasesConcluidas: Set<number>) {
  return COMPETENCIAS.map((competencia) => {
    const total = competencia.fases.length;
    const concluidas = competencia.fases.filter((ordem) => fasesConcluidas.has(ordem)).length;
    const percentual = total > 0 ? Math.round((concluidas / total) * 100) : 0;
    const status = total === 0 ? "Planejado" : percentual === 100 ? "Consolidado" : percentual > 0 ? "Em progresso" : "Pendente";
    return { ...competencia, total, concluidas, percentual, status };
  });
}

function nivelTecnico(xp: number) {
  if (xp >= XP_TOTAL) return "Trilha 1";
  if (xp >= 100) return "Praticante";
  if (xp >= 50) return "Fundamentos";
  return "Inicial";
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

function Cores({
  rotulo,
  valores,
  atual,
  onPick,
}: {
  rotulo: string;
  valores: readonly string[];
  atual: string;
  onPick: (v: string) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs text-texto-suave">{rotulo}</p>
      <div className="flex flex-wrap gap-2">
        {valores.map((v) => (
          <button
            key={v}
            onClick={() => onPick(v)}
            aria-label={`${rotulo} ${v}`}
            className={`h-8 w-8 rounded-full border-2 transition ${
              atual === v ? "border-ouro" : "border-transparent hover:border-primaria/60"
            }`}
            style={{ backgroundColor: `#${v}` }}
          />
        ))}
      </div>
    </div>
  );
}

function descreverAtributos(item: Item) {
  if (item.tipo === "midia") return "Midia de boot para instalar ou reinstalar o computador.";
  const partes: string[] = [];
  if (item.atributos.ataque) partes.push(`+${item.atributos.ataque} exploit`);
  if (item.atributos.defesa) partes.push(`+${item.atributos.defesa} firewall`);
  if (item.atributos.vida) partes.push(`+${item.atributos.vida} integridade`);
  if (item.atributos.velocidade) partes.push(`+${item.atributos.velocidade} velocidade`);
  return partes.join(" · ") || "Ferramenta de perfil";
}
