"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import NavRpg from "@/components/NavRpg";
import Button from "@/components/ui/Button";
import { useSessao } from "@/components/Sessao";
import { useToast } from "@/components/Toast";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import {
  ITENS,
  SLOTS,
  CORES_RARIDADE,
  SIMBOLO_RARIDADE,
  MARCOS_VITORIA_PVP,
  getItem,
  type Atributos,
  type Item,
  type TipoItem,
} from "@/content/itens";
import type { App } from "@/content/apps";
import type { ServidorTier, ServidorTierId } from "@/content/servidores";
import type { SistemaOperacional, SistemaOperacionalId } from "@/content/sistemasOperacionais";
import type { SwitchTier, SwitchTierId } from "@/content/switches";

const ICONES_ATRIBUTO: Record<keyof Atributos, string> = {
  ataque: "💉",
  defesa: "🧱",
  vida: "🧬",
  velocidade: "⚡",
};

type EstadoOperacional = {
  ligado: boolean;
  online: boolean;
  ligando: boolean;
};

type StatusInfra = {
  tier: ServidorTierId;
  tierInfo: ServidorTier;
  proximoTier: ServidorTier | null;
  custoUpgrade: number | null;
  capacidadeUsada: number;
  capacidadeTotal: number;
  catalogoApps: (App & { instalado: boolean })[];
  sistemaOperacional: SistemaOperacionalId | null;
  catalogoSO: SistemaOperacional[];
  numeroTotalServidores: number;
  custoNovaUnidade: number;
  switchTier: SwitchTierId | null;
  catalogoSwitch: SwitchTier[];
  estadoOperacional: EstadoOperacional;
};

type Aba = "software" | "hardware" | "datacenter" | "apps";

const ABAS: { id: Aba; rotulo: string; descricao: string }[] = [
  { id: "software", rotulo: "Software", descricao: "Exploit, firewall e protocolos de invasão." },
  { id: "hardware", rotulo: "Hardware", descricao: "Deck, RAM e peças do computador." },
  { id: "datacenter", rotulo: "Datacenter", descricao: "Servidor, switch e sistema operacional." },
  { id: "apps", rotulo: "Apps", descricao: "Serviços que rodam no seu servidor." },
];

export default function Loja() {
  const router = useRouter();
  const { carregado, usuario, moedas, temItem, itemEquipado, comprar, equipar, recarregar } = useSessao();
  const { mostrar } = useToast();
  const reduzido = usePrefersReducedMotion();
  const [processando, setProcessando] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>("software");
  const [infra, setInfra] = useState<StatusInfra | null>(null);

  useEffect(() => {
    if (carregado && !usuario) router.replace("/entrar");
  }, [carregado, usuario, router]);

  const carregarInfra = useCallback(async () => {
    if (!usuario) return;
    const r = await fetch("/api/servidores", { cache: "no-store" });
    if (r.ok) setInfra(await r.json());
  }, [usuario]);

  useEffect(() => {
    if (!usuario) return;
    fetch("/api/servidores", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setInfra(d);
      });
  }, [usuario]);

  if (!carregado || !usuario) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16 text-center text-texto-suave">
        Carregando...
      </main>
    );
  }

  async function aoComprar(item: Item) {
    setProcessando(item.id);
    const r = await comprar(item.id);
    if (r.ok) mostrar(`${item.nome} comprado.`, "sucesso");
    else mostrar(r.erro ?? "Erro na compra.", "erro");
    setProcessando(null);
  }

  async function aoEquipar(item: Item) {
    setProcessando(item.id);
    await equipar(item.id, true);
    mostrar(`${item.nome} equipado.`, "sucesso");
    setProcessando(null);
  }

  async function acaoInfra(chave: string, url: string, body?: object, sucesso?: string) {
    setProcessando(chave);
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const d = await r.json();
      if (!r.ok) mostrar(d.erro ?? "Erro.", "erro");
      else {
        mostrar(sucesso ?? "Compra realizada.", "sucesso");
        await recarregar();
        await carregarInfra();
      }
    } finally {
      setProcessando(null);
    }
  }

  const servidorLigado = infra?.estadoOperacional.ligado ?? false;
  const servidorOnline = infra?.estadoOperacional.online ?? false;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <NavRpg />

      <header className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="titulo text-3xl font-black text-ouro">Mercado Negro</h1>
          <p className="text-texto-suave">
            Compras ficam aqui. O Datacenter fica para operar, ligar, configurar e manter.
          </p>
        </div>
        <span className="cartao cartao-ouro rounded-xl px-4 py-2 text-ouro">◈ {moedas} cr</span>
      </header>

      <nav className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {ABAS.map((item) => (
          <button
            key={item.id}
            onClick={() => setAba(item.id)}
            className={`rounded-2xl border p-4 text-left transition ${
              aba === item.id
                ? "border-primaria bg-primaria/15"
                : "border-borda bg-fundo-card hover:border-primaria/50"
            }`}
          >
            <p className="font-semibold text-texto">{item.rotulo}</p>
            <p className="mt-1 text-xs text-texto-suave">{item.descricao}</p>
          </button>
        ))}
      </nav>

      {aba === "software" && (
        <GrupoItens
          tipos={["exploit", "seguranca", "protocolo"]}
          reduzido={reduzido}
          processando={processando}
          moedas={moedas}
          temItem={temItem}
          itemEquipado={itemEquipado}
          onComprar={aoComprar}
          onEquipar={aoEquipar}
        />
      )}

      {aba === "hardware" && (
        <GrupoItens
          tipos={["notebook", "ram", "peca"]}
          reduzido={reduzido}
          processando={processando}
          moedas={moedas}
          temItem={temItem}
          itemEquipado={itemEquipado}
          onComprar={aoComprar}
          onEquipar={aoEquipar}
        />
      )}

      {aba === "datacenter" && (
        <section className="mt-8 space-y-6">
          {!infra ? (
            <p className="cartao rounded-2xl p-6 text-texto-suave">Carregando catálogo do Datacenter...</p>
          ) : (
            <>
              <div className="cartao rounded-2xl p-4 text-sm text-texto-suave">
                Para upgrades físicos, troca de switch, compra de servidor extra ou instalação de SO, desligue o servidor no Datacenter.
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <CardMercado
                  icone={infra.tierInfo.icone}
                  titulo={`Frota atual: ${infra.tierInfo.nome}`}
                  descricao={`${infra.numeroTotalServidores} servidor(es), capacidade ${infra.capacidadeUsada}/${infra.capacidadeTotal}.`}
                  acao={
                    infra.proximoTier && infra.custoUpgrade !== null ? (
                      <Button
                        tamanho="sm"
                        disabled={servidorLigado || moedas < infra.custoUpgrade}
                        carregando={processando === "upgrade"}
                        onClick={() => acaoInfra("upgrade", "/api/servidores/upgrade", undefined, "Upgrade comprado.")}
                        title={servidorLigado ? "Desligue o servidor antes do upgrade" : ""}
                      >
                        Upgrade {infra.proximoTier.nome} · {infra.custoUpgrade} cr
                      </Button>
                    ) : (
                      <span className="text-xs font-semibold text-ouro">Tier máximo</span>
                    )
                  }
                />

                <CardMercado
                  icone="➕"
                  titulo="Servidor extra"
                  descricao="Adiciona uma unidade idêntica à frota. Exige switch com portas suficientes."
                  acao={
                    <Button
                      tamanho="sm"
                      disabled={servidorLigado || moedas < infra.custoNovaUnidade}
                      carregando={processando === "comprar-unidade"}
                      onClick={() => acaoInfra("comprar-unidade", "/api/servidores/unidade/comprar", undefined, "Servidor adicionado.")}
                      title={servidorLigado ? "Desligue o servidor antes de adicionar hardware" : ""}
                    >
                      {infra.custoNovaUnidade} cr
                    </Button>
                  }
                />
              </div>

              <SecaoCatalogo titulo="Switches">
                {infra.catalogoSwitch
                  .filter((sw) => sw.id !== infra.switchTier)
                  .map((sw) => (
                    <CardMercado
                      key={sw.id}
                      icone={sw.icone}
                      titulo={sw.nome}
                      descricao={`${sw.portas} portas. ${sw.descricao}`}
                      acao={
                        <Button
                          tamanho="sm"
                          disabled={servidorLigado || moedas < sw.preco}
                          carregando={processando === `comprar-switch-${sw.id}`}
                          onClick={() =>
                            acaoInfra(
                              `comprar-switch-${sw.id}`,
                              "/api/servidores/switch/comprar",
                              { switchId: sw.id },
                              "Switch instalado.",
                            )
                          }
                          title={servidorLigado ? "Desligue o servidor antes de trocar switch" : ""}
                        >
                          {sw.preco} cr
                        </Button>
                      }
                    />
                  ))}
              </SecaoCatalogo>

              <SecaoCatalogo titulo="Sistemas operacionais">
                {infra.catalogoSO.map((so) => (
                  <CardMercado
                    key={so.id}
                    icone={so.icone}
                    titulo={so.nome}
                    descricao={`${so.descricao} Gerenciador: ${so.gerenciadorPacotes}.`}
                    acao={
                      infra.sistemaOperacional === so.id ? (
                        <span className="text-xs font-semibold text-sucesso">Instalado</span>
                      ) : (
                        <Button
                          tamanho="sm"
                          disabled={servidorLigado || moedas < so.preco}
                          carregando={processando === `instalar-so-${so.id}`}
                          onClick={() =>
                            acaoInfra(
                              `instalar-so-${so.id}`,
                              "/api/servidores/sistema/instalar",
                              { osId: so.id },
                              "Sistema operacional instalado.",
                            )
                          }
                          title={servidorLigado ? "Desligue o servidor antes de instalar SO" : ""}
                        >
                          {so.preco} cr
                        </Button>
                      )
                    }
                  />
                ))}
              </SecaoCatalogo>
            </>
          )}
        </section>
      )}

      {aba === "apps" && (
        <section className="mt-8">
          {!infra ? (
            <p className="cartao rounded-2xl p-6 text-texto-suave">Carregando apps...</p>
          ) : (
            <>
              <div className="cartao rounded-2xl p-4 text-sm text-texto-suave">
                Apps são comprados aqui e instalados no servidor. O servidor precisa estar ligado e com SO instalado.
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {infra.catalogoApps.map((app) => {
                  const capacidadeInsuficiente = infra.capacidadeUsada + app.capacidade > infra.capacidadeTotal;
                  const bloqueado = app.instalado || !servidorOnline || !infra.sistemaOperacional || capacidadeInsuficiente || moedas < app.preco;
                  return (
                    <CardMercado
                      key={app.id}
                      icone={app.icone}
                      titulo={app.nome}
                      descricao={`${app.descricao} Capacidade ${app.capacidade}, renda ${app.crPorHora} cr/h.`}
                      acao={
                        app.instalado ? (
                          <span className="text-xs font-semibold text-sucesso">Instalado</span>
                        ) : (
                          <Button
                            tamanho="sm"
                            disabled={bloqueado}
                            carregando={processando === `instalar-${app.id}`}
                            onClick={() =>
                              acaoInfra(
                                `instalar-${app.id}`,
                                "/api/servidores/apps/instalar",
                                { appId: app.id },
                                `${app.nome} instalado.`,
                              )
                            }
                            title={
                              !servidorOnline
                                ? "Ligue o servidor antes de instalar apps"
                                : !infra.sistemaOperacional
                                  ? "Instale um SO antes"
                                  : capacidadeInsuficiente
                                    ? "Capacidade insuficiente"
                                    : ""
                            }
                          >
                            {app.preco} cr
                          </Button>
                        )
                      }
                    />
                  );
                })}
              </div>
            </>
          )}
        </section>
      )}

      <div className="mt-8">
        <h2 className="titulo text-xl font-bold text-destaque">Itens exclusivos</h2>
        <p className="mt-1 text-sm text-texto-suave">
          Não estão à venda. São concedidos ao vencer invasões na Rede.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {MARCOS_VITORIA_PVP.map((marco) => {
            const item = getItem(marco.itemId);
            if (!item) return null;
            const possui = temItem(item.id);
            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 rounded-xl border border-borda bg-fundo-card p-3 ${
                  possui ? "" : "opacity-50"
                }`}
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-fundo text-2xl">
                  {possui ? item.icone : "🔒"}
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
                <span className="shrink-0 text-xs font-semibold text-texto-suave">
                  {possui ? "Desbloqueado" : `${marco.vitorias} vitória${marco.vitorias > 1 ? "s" : ""}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}

function GrupoItens({
  tipos,
  reduzido,
  processando,
  moedas,
  temItem,
  itemEquipado,
  onComprar,
  onEquipar,
}: {
  tipos: TipoItem[];
  reduzido: boolean;
  processando: string | null;
  moedas: number;
  temItem: (itemId: string) => boolean;
  itemEquipado: (itemId: string) => boolean;
  onComprar: (item: Item) => void;
  onEquipar: (item: Item) => void;
}) {
  return (
    <div className="mt-8 space-y-8">
      {SLOTS.filter((slot) => tipos.includes(slot.tipo)).map((slot) => (
        <section key={slot.tipo}>
          <h2 className="titulo text-xl font-bold text-destaque">
            {slot.icone} {slot.nome}
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {ITENS.filter((item) => item.tipo === slot.tipo && !item.exclusivo).map((item, i) => {
              const possui = temItem(item.id);
              const equipadoAgora = possui && itemEquipado(item.id);
              const equipadoNoSlot = ITENS.find((candidato) => candidato.tipo === item.tipo && itemEquipado(candidato.id));
              const podeComprar = moedas >= item.preco;
              const ocupado = processando === item.id;
              const deltas = compararComEquipado(item, equipadoNoSlot);
              return (
                <motion.div
                  key={item.id}
                  initial={reduzido ? false : { opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: reduzido ? 0 : 0.22, delay: reduzido ? 0 : i * 0.04, ease: "easeOut" }}
                  className="flex items-center gap-3 rounded-xl border border-borda bg-fundo-card p-3"
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-fundo text-2xl">
                    {item.icone}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold" style={{ color: CORES_RARIDADE[item.raridade] }}>
                      <span aria-hidden="true">{SIMBOLO_RARIDADE[item.raridade]}</span> {item.nome}
                    </p>
                    <p className="text-xs text-texto-suave">{descreverAtributos(item)}</p>
                    {deltas && (
                      <p className="text-[11px]">
                        <span className="text-texto-suave">vs. equipado: </span>
                        {deltas.map(({ chave, delta }) => (
                          <span key={chave} className={`mr-1.5 font-semibold ${delta > 0 ? "text-sucesso" : "text-erro"}`}>
                            {delta > 0 ? "+" : ""}
                            {delta} {ICONES_ATRIBUTO[chave]}
                          </span>
                        ))}
                      </p>
                    )}
                  </div>
                  {equipadoAgora ? (
                    <span className="shrink-0 text-xs font-semibold text-sucesso">Equipado</span>
                  ) : possui ? (
                    <Button tamanho="sm" carregando={ocupado} onClick={() => onEquipar(item)}>
                      Equipar
                    </Button>
                  ) : (
                    <Button
                      tamanho="sm"
                      disabled={!podeComprar}
                      carregando={ocupado}
                      onClick={() => onComprar(item)}
                      title={podeComprar ? "" : "Créditos insuficientes"}
                    >
                      {item.preco} cr
                    </Button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function SecaoCatalogo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="titulo text-xl font-bold text-destaque">{titulo}</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function CardMercado({
  icone,
  titulo,
  descricao,
  acao,
}: {
  icone: string;
  titulo: string;
  descricao: string;
  acao: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-borda bg-fundo-card p-3">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-fundo text-2xl">{icone}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{titulo}</p>
        <p className="text-xs text-texto-suave">{descricao}</p>
      </div>
      {acao}
    </div>
  );
}

function descreverAtributos(item: Item) {
  const p: string[] = [];
  if (item.atributos.ataque) p.push(`+${item.atributos.ataque} 💉`);
  if (item.atributos.defesa) p.push(`+${item.atributos.defesa} 🧱`);
  if (item.atributos.vida) p.push(`+${item.atributos.vida} 🧬`);
  if (item.atributos.velocidade) p.push(`+${item.atributos.velocidade} ⚡`);
  return p.join("  ") || "Cosmético";
}

function compararComEquipado(item: Item, equipadoNoSlot: Item | undefined) {
  if (!equipadoNoSlot || equipadoNoSlot.id === item.id) return null;
  const chaves: (keyof Atributos)[] = ["ataque", "defesa", "vida", "velocidade"];
  const deltas = chaves
    .map((chave) => ({
      chave,
      delta: (item.atributos[chave] ?? 0) - (equipadoNoSlot.atributos[chave] ?? 0),
    }))
    .filter((d) => d.delta !== 0);
  return deltas.length > 0 ? deltas : null;
}
