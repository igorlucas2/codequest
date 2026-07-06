"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import NavRpg from "@/components/NavRpg";
import Button from "@/components/ui/Button";
import { SkeletonCartoes } from "@/components/Skeleton";
import SalaDeEquipamentos from "@/components/SalaDeEquipamentos";
import ServidorRede from "@/components/ServidorRede";
import ServidorSistema from "@/components/ServidorSistema";
import { useSessao } from "@/components/Sessao";
import { useToast } from "@/components/Toast";
import type { ServidorTierId, ServidorTier } from "@/content/servidores";
import type { App } from "@/content/apps";
import type { SistemaOperacional, SistemaOperacionalId } from "@/content/sistemasOperacionais";
import type { SwitchTier, SwitchTierId } from "@/content/switches";

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
  custoUpgrade: number | null;
  capacidadeUsada: number;
  capacidadeTotal: number;
  apps: AppInstaladoView[];
  catalogoApps: (App & { instalado: boolean })[];
  pendenteTotal: number;
  sistemaOperacional: SistemaOperacionalId | null;
  sshHabilitado: boolean;
  catalogoSO: SistemaOperacional[];
  servidoresExtras: number;
  numeroTotalServidores: number;
  custoNovaUnidade: number;
  switchTier: SwitchTierId | null;
  switchInfo: SwitchTier | null;
  catalogoSwitch: SwitchTier[];
  internetAtiva: boolean;
  layoutSalvo: unknown;
};

export default function Servidores() {
  const router = useRouter();
  const { carregado, usuario, moedas, stats, recarregar } = useSessao();
  const { mostrar } = useToast();
  const [status, setStatus] = useState<Status | null>(null);
  const [processando, setProcessando] = useState<string | null>(null);

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

  async function coletar() {
    const d = await acao("coletar", "/api/servidores/coletar");
    if (d?.ok) {
      if (d.coletado <= 0) {
        mostrar("Nada pra coletar ainda.", "sucesso");
      } else if (d.custoInternet > 0) {
        mostrar(`+${d.coletado} ◈ líquidos (◈${d.bruto} bruto − ◈${d.custoInternet} de internet).`, "sucesso");
      } else {
        mostrar(`+${d.coletado} ◈ coletados!`, "sucesso");
      }
    }
  }

  async function upgrade() {
    const d = await acao("upgrade", "/api/servidores/upgrade");
    if (d?.ok) mostrar("Servidor atualizado!", "sucesso");
  }

  async function contratarInternet() {
    const d = await acao("contratar-internet", "/api/servidores/internet/contratar");
    if (d?.ok) mostrar("Internet contratada!", "sucesso");
  }

  async function comprarUnidade() {
    const d = await acao("comprar-unidade", "/api/servidores/unidade/comprar");
    if (d?.ok) mostrar("Novo servidor adicionado à frota!", "sucesso");
  }

  async function comprarSwitch(switchId: SwitchTierId) {
    const d = await acao(`comprar-switch-${switchId}`, "/api/servidores/switch/comprar", { switchId });
    if (d?.ok) mostrar("Switch instalado!", "sucesso");
  }

  // Silencioso (sem toast) — só um detalhe de UI, não uma ação de jogo.
  async function salvarLayout(layout: unknown) {
    await fetch("/api/servidores/layout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(layout),
    });
  }

  async function instalarApp(app: App) {
    const d = await acao(`instalar-${app.id}`, "/api/servidores/apps/instalar", { appId: app.id });
    if (d?.ok) mostrar(`${app.nome} instalado!`, "sucesso");
  }

  async function removerApp(app: AppInstaladoView) {
    const d = await acao(`remover-${app.appId}`, "/api/servidores/apps/remover", { appId: app.appId });
    if (d?.ok) mostrar(`${app.nome} removido${d.coletado > 0 ? ` (+${d.coletado} ◈ coletados)` : ""}.`, "sucesso");
  }

  async function instalarSO(osId: SistemaOperacionalId) {
    const d = await acao(`instalar-so-${osId}`, "/api/servidores/sistema/instalar", { osId });
    if (d?.ok) mostrar("Sistema operacional instalado!", "sucesso");
  }

  async function habilitarSsh() {
    const d = await acao("habilitar-ssh", "/api/servidores/sistema/habilitar-ssh");
    if (d?.ok) mostrar("SSH ativado!", "sucesso");
  }

  if (!carregado || !usuario || !status) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <NavRpg />
        <div className="mt-8">
          <SkeletonCartoes quantidade={4} />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <NavRpg />

      <header className="mt-6">
        <h1 className="titulo text-3xl font-black text-ouro">Seu Servidor</h1>
        <p className="text-texto-suave">
          Construa sua infraestrutura, instale apps e colha créditos. É esse
          servidor que os outros runners tentam invadir na Arena.
        </p>
      </header>

      {/* Navegação rápida — a página cresceu bastante (rack, rede, SO, apps,
          catálogo); em vez de virar abas (perderia a leitura contínua de
          cima a baixo), estes são atalhos de rolagem pras seções mais longas. */}
      <nav className="mt-4 flex flex-wrap gap-2 text-xs">
        <a href="#secao-rede" className="rounded-lg bg-fundo-card px-3 py-1.5 font-semibold text-texto-suave transition hover:text-texto">
          🌐 Rede
        </a>
        <a href="#secao-sistema" className="rounded-lg bg-fundo-card px-3 py-1.5 font-semibold text-texto-suave transition hover:text-texto">
          💿 Sistema
        </a>
        <a href="#secao-economia" className="rounded-lg bg-fundo-card px-3 py-1.5 font-semibold text-texto-suave transition hover:text-texto">
          💰 Economia
        </a>
      </nav>

      {/* Sala de Equipamentos */}
      <section className="cartao mt-6 rounded-2xl p-6">
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
        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="flex-1 text-center sm:text-left">
            <p className="titulo text-xl font-bold">
              {status.tierInfo.icone} {status.tierInfo.nome}
              {status.numeroTotalServidores > 1 && (
                <span className="ml-2 text-sm font-normal text-texto-suave">
                  × {status.numeroTotalServidores} servidores
                </span>
              )}
            </p>
            <p className="mt-1 text-sm text-texto-suave">
              Capacidade: {status.capacidadeUsada}/{status.capacidadeTotal} ·{" "}
              🧱 +{status.tierInfo.bonusDefesa * status.numeroTotalServidores} firewall · 🧬 +
              {status.tierInfo.bonusVida * status.numeroTotalServidores} integridade
            </p>

            {status.proximoTier && status.custoUpgrade !== null ? (
              <div className="mt-4 rounded-xl border border-borda bg-fundo p-3">
                <p className="text-sm">
                  Próximo: <span className="font-semibold">{status.proximoTier.icone} {status.proximoTier.nome}</span>{" "}
                  — capacidade {status.proximoTier.capacidade}, 🧱 +{status.proximoTier.bonusDefesa}, 🧬 +
                  {status.proximoTier.bonusVida} (por servidor)
                </p>
                <Button
                  tamanho="sm"
                  onClick={upgrade}
                  disabled={processando !== null || moedas < status.custoUpgrade}
                  carregando={processando === "upgrade"}
                  className="mt-2"
                >
                  Upgrade da frota por ◈ {status.custoUpgrade}
                </Button>
              </div>
            ) : (
              <p className="mt-4 text-sm text-ouro">🏆 Servidor no tier máximo!</p>
            )}

            <div className="mt-4 rounded-xl border border-borda bg-fundo p-3">
              <p className="text-sm">Adicionar servidor idêntico à frota</p>
              <Button
                tamanho="sm"
                onClick={comprarUnidade}
                disabled={processando !== null || moedas < status.custoNovaUnidade}
                carregando={processando === "comprar-unidade"}
                className="mt-2"
              >
                ➕ Novo servidor por ◈ {status.custoNovaUnidade}
              </Button>
              {status.numeroTotalServidores > 1 && !status.switchInfo && (
                <p className="mt-1 text-[11px] text-erro">
                  ⚠️ Sem switch — sua frota atual não deveria existir sem um. Compre um abaixo.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Switch */}
        <div className="mt-6 border-t border-borda pt-4">
          <p className="text-sm font-semibold text-ouro">🔀 Switch</p>
          <p className="mt-1 text-xs text-texto-suave">
            {status.switchInfo
              ? `Instalado: ${status.switchInfo.nome} (${status.switchInfo.portas} portas).`
              : "Necessário a partir do 2º servidor — conecta sua frota inteira."}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {status.catalogoSwitch
              .filter((sw) => sw.id !== status.switchTier)
              .map((sw) => (
                <div key={sw.id} className="cartao flex items-center gap-2 rounded-xl p-3">
                  <span className="text-xl">{sw.icone}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{sw.nome}</p>
                    <p className="text-[11px] text-texto-suave">{sw.portas} portas</p>
                  </div>
                  <Button
                    tamanho="sm"
                    disabled={processando !== null || moedas < sw.preco}
                    carregando={processando === `comprar-switch-${sw.id}`}
                    onClick={() => comprarSwitch(sw.id)}
                  >
                    ◈ {sw.preco}
                  </Button>
                </div>
              ))}
          </div>
        </div>
      </section>

      {/* Rede */}
      <section id="secao-rede" className="mt-8 scroll-mt-6">
        <h2 className="titulo text-lg font-bold text-ouro">🌐 Rede</h2>
        <p className="mt-1 text-sm text-texto-suave">
          Configure a identidade de rede do seu servidor — sem isso, você só alcança quem está no seu setor.
        </p>
        <div className="mt-3">
          <ServidorRede
            tier={status.tier}
            internetAtiva={status.internetAtiva}
            contratandoInternet={processando === "contratar-internet"}
            onContratarInternet={contratarInternet}
          />
        </div>
      </section>

      {/* Sistema Operacional */}
      <section id="secao-sistema" className="mt-8 scroll-mt-6">
        <h2 className="titulo text-lg font-bold text-ouro">💿 Sistema Operacional</h2>
        <p className="mt-1 text-sm text-texto-suave">
          Instale um SO no servidor pra poder acessá-lo via SSH pelo seu computador.
        </p>
        <div className="mt-3">
          <ServidorSistema
            sistemaOperacional={status.sistemaOperacional}
            sshHabilitado={status.sshHabilitado}
            catalogo={status.catalogoSO}
            moedas={moedas}
            processando={processando}
            velocidade={stats.velocidade}
            onInstalar={instalarSO}
            onHabilitarSsh={habilitarSsh}
          />
        </div>
      </section>

      {/* Coletar */}
      <section id="secao-economia" className="cartao cartao-ouro mt-8 flex scroll-mt-6 items-center justify-between rounded-2xl p-5">
        <div>
          <p className="text-sm font-semibold text-ouro">💰 Renda acumulada</p>
          <p className="text-xs text-texto-suave">Apps rendem enquanto instalados (teto de 12h sem coletar).</p>
        </div>
        <Button
          variante="sucesso"
          onClick={coletar}
          disabled={processando !== null || status.pendenteTotal <= 0}
          carregando={processando === "coletar"}
        >
          Coletar ◈ {status.pendenteTotal}
        </Button>
      </section>

      {/* Apps instalados */}
      <section className="mt-8">
        <h2 className="titulo text-lg font-bold text-ouro">Apps instalados</h2>
        {status.apps.length === 0 ? (
          <p className="cartao mt-3 rounded-2xl p-6 text-center text-texto-suave">
            Nenhum app rodando ainda. Instale um abaixo pra começar a render créditos.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {status.apps.map((a) => (
              <div key={a.appId} className="cartao flex items-center gap-3 rounded-xl p-3">
                <span className="text-2xl">{a.icone}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{a.nome}</p>
                  <p className="text-xs text-texto-suave">
                    +{a.crPorHora} cr/h · pendente: {a.pendente} ◈
                  </p>
                </div>
                <Button
                  variante="perigo"
                  tamanho="sm"
                  disabled={processando !== null}
                  carregando={processando === `remover-${a.appId}`}
                  onClick={() => removerApp(a)}
                >
                  Remover
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Catálogo de apps */}
      <section className="mt-8">
        <h2 className="titulo text-lg font-bold text-ouro">Catálogo de apps</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {status.catalogoApps
            .filter((a) => !a.instalado)
            .map((a) => {
              const capacidadeInsuficiente =
                status.capacidadeUsada + a.capacidade > status.capacidadeTotal;
              const semSaldo = moedas < a.preco;
              return (
                <div key={a.id} className="cartao flex items-center gap-3 rounded-xl p-3">
                  <span className="text-2xl">{a.icone}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{a.nome}</p>
                    <p className="text-xs text-texto-suave">{a.descricao}</p>
                    <p className="text-xs text-texto-suave">
                      +{a.crPorHora} cr/h · custa {a.capacidade} de capacidade
                    </p>
                  </div>
                  <Button
                    tamanho="sm"
                    disabled={processando !== null || capacidadeInsuficiente || semSaldo}
                    carregando={processando === `instalar-${a.id}`}
                    onClick={() => instalarApp(a)}
                    title={capacidadeInsuficiente ? "Capacidade do servidor insuficiente" : semSaldo ? "Créditos insuficientes" : ""}
                  >
                    ◈ {a.preco}
                  </Button>
                </div>
              );
            })}
        </div>
      </section>
    </main>
  );
}
