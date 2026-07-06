"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import NavRpg from "@/components/NavRpg";
import Button from "@/components/ui/Button";
import { SkeletonCartoes } from "@/components/Skeleton";
import SalaDeEquipamentos from "@/components/SalaDeEquipamentos";
import ServidorRede from "@/components/ServidorRede";
import ServidorSistema, { type EstadoOperacionalServidorView } from "@/components/ServidorSistema";
import { useSessao } from "@/components/Sessao";
import { useToast } from "@/components/Toast";
import type { ServidorTier, ServidorTierId } from "@/content/servidores";
import type { SistemaOperacionalId } from "@/content/sistemasOperacionais";
import type { SwitchTier } from "@/content/switches";

type AppInstaladoView = {
  appId: string;
  nome: string;
  icone: string;
  crPorHora: number;
  capacidade: number;
  pendente: number;
};

type Status = {
  tier: ServidorTierId;
  tierInfo: ServidorTier;
  proximoTier: ServidorTier | null;
  capacidadeUsada: number;
  capacidadeTotal: number;
  apps: AppInstaladoView[];
  pendenteTotal: number;
  sistemaOperacional: SistemaOperacionalId | null;
  sshHabilitado: boolean;
  servidoresExtras: number;
  numeroTotalServidores: number;
  switchInfo: SwitchTier | null;
  internetAtiva: boolean;
  layoutSalvo: unknown;
  estadoOperacional: EstadoOperacionalServidorView;
};

type Aba = "operacao" | "sistema" | "rede" | "servicos";

const ABAS: { id: Aba; rotulo: string; icone: string }[] = [
  { id: "operacao", rotulo: "Operação", icone: "🏢" },
  { id: "sistema", rotulo: "Sistema", icone: "💿" },
  { id: "rede", rotulo: "Rede", icone: "🌐" },
  { id: "servicos", rotulo: "Serviços", icone: "📦" },
];

export default function Servidores() {
  const router = useRouter();
  const { carregado, usuario, stats, recarregar } = useSessao();
  const { mostrar } = useToast();
  const [status, setStatus] = useState<Status | null>(null);
  const [processando, setProcessando] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>("operacao");

  useEffect(() => {
    if (carregado && !usuario) router.replace("/entrar");
  }, [carregado, usuario, router]);

  const carregarStatus = useCallback(async () => {
    const r = await fetch("/api/servidores", { cache: "no-store" });
    const d = await r.json();
    setStatus(d);
  }, []);

  useEffect(() => {
    if (!usuario) return;
    fetch("/api/servidores", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setStatus(d));
  }, [usuario]);

  useEffect(() => {
    if (!status?.estadoOperacional.ligando) return;
    const id = window.setInterval(carregarStatus, 1000);
    return () => window.clearInterval(id);
  }, [carregarStatus, status?.estadoOperacional.ligando]);

  async function acao(chave: string, url: string, body?: object) {
    setProcessando(chave);
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const d = await r.json();
      if (!r.ok) {
        mostrar(d.erro ?? "Erro.", "erro");
      } else {
        return d;
      }
    } finally {
      setProcessando(null);
      await carregarStatus();
      await recarregar();
    }
    return null;
  }

  async function salvarLayout(layout: unknown) {
    await fetch("/api/servidores/layout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(layout),
    });
  }

  async function coletar() {
    const d = await acao("coletar", "/api/servidores/coletar");
    if (d?.ok) {
      if (d.coletado <= 0) mostrar("Nada pra coletar ainda.", "sucesso");
      else mostrar(`+${d.coletado} cr coletados.`, "sucesso");
    }
  }

  async function removerApp(app: AppInstaladoView) {
    const d = await acao(`remover-${app.appId}`, "/api/servidores/apps/remover", { appId: app.appId });
    if (d?.ok) mostrar(`${app.nome} removido${d.coletado > 0 ? ` (+${d.coletado} cr coletados)` : ""}.`, "sucesso");
  }

  async function energia(acaoEnergia: "ligar" | "desligar") {
    const d = await acao(`energia-${acaoEnergia}`, "/api/servidores/energia", { acao: acaoEnergia });
    if (d?.ok) mostrar(acaoEnergia === "ligar" ? "Servidor iniciando." : "Servidor desligado.", "sucesso");
  }

  async function habilitarSsh() {
    const d = await acao("habilitar-ssh", "/api/servidores/sistema/habilitar-ssh");
    if (d?.ok) mostrar("SSH ativado.", "sucesso");
  }

  async function salvarUsuarioSsh(usuarioSsh: string) {
    const d = await acao("salvar-usuario-ssh", "/api/servidores/sistema/acesso", { usuarioSsh });
    if (d?.ok) mostrar("Usuário SSH atualizado.", "sucesso");
  }

  async function patchCord(conectado: boolean) {
    const d = await acao("patch-cord", "/api/servidores/rede/patch-cord", { conectado });
    if (d?.ok) mostrar(conectado ? "Patch cord conectado." : "Patch cord removido.", "sucesso");
  }

  if (!carregado || !usuario || !status) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <NavRpg />
        <div className="mt-8">
          <SkeletonCartoes quantidade={4} />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <NavRpg />

      <header className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="titulo text-3xl font-black text-ouro">Seu Datacenter</h1>
          <p className="max-w-3xl text-texto-suave">
            Operar servidor agora é ciclo de vida: desligar para hardware, ligar para subir o SO,
            configurar rede, liberar SSH e rodar serviços.
          </p>
        </div>
        <Link
          href="/loja"
          className="rounded-xl border border-borda bg-fundo-card px-4 py-2 text-sm font-semibold text-destaque transition hover:border-destaque"
        >
          Abrir Mercado
        </Link>
      </header>

      <nav className="mt-5 flex flex-wrap gap-2">
        {ABAS.map((item) => (
          <button
            key={item.id}
            onClick={() => setAba(item.id)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              aba === item.id
                ? "bg-primaria/20 text-primaria"
                : "bg-fundo-card text-texto-suave hover:text-texto"
            }`}
          >
            <span className="mr-1">{item.icone}</span>
            {item.rotulo}
          </button>
        ))}
      </nav>

      {aba === "operacao" && (
        <section className="mt-6 grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="cartao rounded-2xl p-5">
            <SalaDeEquipamentos
              tier={status.tier}
              numeroTotalServidores={status.numeroTotalServidores}
              capacidadeUsadaTotal={status.capacidadeUsada}
              capacidadePorUnidade={status.tierInfo.capacidade}
              internetAtiva={status.internetAtiva}
              switchPortas={status.switchInfo?.portas ?? null}
              layoutSalvo={status.layoutSalvo}
              onSalvarLayout={salvarLayout}
            />
          </div>

          <aside className="space-y-3">
            <PainelResumo titulo="Estado" valor={rotuloEstado(status.estadoOperacional)} />
            <PainelResumo
              titulo="Hardware"
              valor={`${status.tierInfo.icone} ${status.tierInfo.nome}`}
              detalhe={`${status.numeroTotalServidores} servidor(es), ${status.switchInfo ? status.switchInfo.nome : "sem switch"}`}
            />
            <PainelResumo
              titulo="Capacidade"
              valor={`${status.capacidadeUsada}/${status.capacidadeTotal}`}
              detalhe="Apps instalados consomem essa capacidade."
            />
            <PainelResumo
              titulo="Rede física"
              valor={status.estadoOperacional.patchCordConectado ? "Patch cord conectado" : "Patch cord solto"}
              detalhe={status.internetAtiva ? "Internet contratada" : "Sem internet contratada"}
            />
            <div className="cartao rounded-2xl p-4 text-sm text-texto-suave">
              Upgrades, switches, sistemas operacionais e apps novos ficam no Mercado. O Datacenter fica só com operação.
            </div>
          </aside>
        </section>
      )}

      {aba === "sistema" && (
        <section className="mt-6">
          <ServidorSistema
            sistemaOperacional={status.sistemaOperacional}
            sshHabilitado={status.sshHabilitado}
            estadoOperacional={status.estadoOperacional}
            processando={processando}
            velocidade={stats.velocidade}
            onLigar={() => energia("ligar")}
            onDesligar={() => energia("desligar")}
            onSalvarUsuarioSsh={salvarUsuarioSsh}
            onHabilitarSsh={habilitarSsh}
          />
        </section>
      )}

      {aba === "rede" && (
        <section className="mt-6">
          <ServidorRede
            tier={status.tier}
            sistemaOperacional={status.sistemaOperacional}
            online={status.estadoOperacional.online}
            ligando={status.estadoOperacional.ligando}
            patchCordConectado={status.estadoOperacional.patchCordConectado}
            conectandoPatchCord={processando === "patch-cord"}
            internetAtiva={status.internetAtiva}
            contratandoInternet={processando === "contratar-internet"}
            onPatchCord={patchCord}
            onContratarInternet={() => acao("contratar-internet", "/api/servidores/internet/contratar")}
          />
        </section>
      )}

      {aba === "servicos" && (
        <section className="mt-6 space-y-5">
          <div className="cartao cartao-ouro flex flex-col gap-3 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-ouro">Renda acumulada</p>
              <p className="text-xs text-texto-suave">Apps instalados rendem créditos até o teto de 12h sem coletar.</p>
            </div>
            <Button
              variante="sucesso"
              onClick={coletar}
              disabled={processando !== null || status.pendenteTotal <= 0}
              carregando={processando === "coletar"}
            >
              Coletar {status.pendenteTotal} cr
            </Button>
          </div>

          <div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="titulo text-lg font-bold text-ouro">Apps instalados</h2>
                <p className="text-sm text-texto-suave">Instalação de apps novos fica no Mercado.</p>
              </div>
              <Link href="/loja" className="text-sm font-semibold text-destaque hover:underline">
                Comprar apps
              </Link>
            </div>
            {status.apps.length === 0 ? (
              <p className="cartao mt-3 rounded-2xl p-6 text-center text-texto-suave">
                Nenhum app rodando ainda.
              </p>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {status.apps.map((app) => (
                  <div key={app.appId} className="cartao flex items-center gap-3 rounded-xl p-3">
                    <span className="text-2xl">{app.icone}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{app.nome}</p>
                      <p className="text-xs text-texto-suave">
                        +{app.crPorHora} cr/h · pendente: {app.pendente} cr · capacidade {app.capacidade}
                      </p>
                    </div>
                    <Button
                      variante="perigo"
                      tamanho="sm"
                      disabled={processando !== null}
                      carregando={processando === `remover-${app.appId}`}
                      onClick={() => removerApp(app)}
                    >
                      Remover
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}

function rotuloEstado(estado: EstadoOperacionalServidorView) {
  if (estado.online) return "Ligado";
  if (estado.ligando) return "Inicializando";
  return "Desligado";
}

function PainelResumo({ titulo, valor, detalhe }: { titulo: string; valor: string; detalhe?: string }) {
  return (
    <div className="cartao rounded-2xl p-4">
      <p className="text-xs font-semibold uppercase text-texto-suave">{titulo}</p>
      <p className="mt-1 font-semibold text-texto">{valor}</p>
      {detalhe && <p className="mt-1 text-xs text-texto-suave">{detalhe}</p>}
    </div>
  );
}
