"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Button from "@/components/ui/Button";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { MASCARAS_OPCOES } from "@/content/rede";
import { getServidorTier, type ServidorTier, type ServidorTierId } from "@/content/servidores";
import type { SistemaOperacionalId } from "@/content/sistemasOperacionais";

type Zona = { id: number; nome: string; cidr: string; prefixo: string; gateway: string; corLed: string };
type MembroZona = { id: number; nome: string; voce: boolean };
type ZonaMapa = { id: number; nome: string; corLed: string; membros: MembroZona[] };
type Config = { ip: string; mascara: string; gateway: string } | null;
type TesteConexao = { destinoZonaId: number; resultado: "sucesso" | "bloqueado" } | null;
type StatusRede = {
  zonaId: number;
  zona: Zona;
  config: Config;
  configurada: boolean;
  zonas: ZonaMapa[];
};

// Programa "Rede": a rede do servidor vem depois do sistema operacional.
// O jogador passa por IP, mascara e gateway entendendo qual peca cada uma
// ocupa na infraestrutura, sem simular uma topologia fisica inexistente.
export default function ServidorRede({
  tier,
  sistemaOperacional,
  online,
  ligando,
  modoInstalador = false,
  patchCordConectado,
  conectandoPatchCord,
  internetAtiva,
  contratandoInternet,
  onPatchCord,
  onContratarInternet,
}: {
  tier: ServidorTierId;
  sistemaOperacional: SistemaOperacionalId | null;
  online: boolean;
  ligando: boolean;
  modoInstalador?: boolean;
  patchCordConectado: boolean;
  conectandoPatchCord: boolean;
  internetAtiva: boolean;
  contratandoInternet: boolean;
  onPatchCord: (conectado: boolean) => void;
  onContratarInternet: () => void;
}) {
  const reduzido = usePrefersReducedMotion();
  const tierInfo = getServidorTier(tier);
  const sistemaPronto = sistemaOperacional !== null;
  const redePodeConfigurar = sistemaPronto && internetAtiva && online && !modoInstalador && patchCordConectado;
  const [status, setStatus] = useState<StatusRede | null>(null);
  const [passo, setPasso] = useState(0);
  const [ip, setIp] = useState("");
  const [mascara, setMascara] = useState("");
  const [gateway, setGateway] = useState("");
  const [erroPasso, setErroPasso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const [destinoTeste, setDestinoTeste] = useState<number | "">("");
  const [teste, setTeste] = useState<TesteConexao>(null);

  useEffect(() => {
    fetch("/api/servidores/rede", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: StatusRede) => setStatus(d));
  }, []);

  if (!status) return <p className="text-sm text-texto-suave">Carregando painel de rede...</p>;

  const { zona } = status;
  const membrosParaTeste = status.zonas.flatMap((z) =>
    z.membros.filter((m) => !m.voce).map((m) => ({ ...m, zonaId: z.id, zonaNome: z.nome })),
  );

  function validarPasso1() {
    const m = ip.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!m) return setErroPasso("Formato inválido. Use algo como 10.10.x.y.");
    const octetos = m.slice(1).map(Number);
    const prefixoIp = `${octetos[0]}.${octetos[1]}.${octetos[2]}`;
    const ultimo = octetos[3];
    if (prefixoIp !== zona.prefixo || ultimo < 2 || ultimo > 254) {
      return setErroPasso(`Esse IP não pertence ao ${zona.nome} (${zona.cidr}).`);
    }
    setErroPasso(null);
    setPasso(1);
  }

  function validarPasso2() {
    if (mascara !== "255.255.255.0") {
      setErroPasso("Essa máscara não é a certa pra uma sub-rede /24 como a sua.");
      return;
    }
    setErroPasso(null);
    setPasso(2);
  }

  async function validarPasso3() {
    if (gateway.trim() !== zona.gateway) {
      setErroPasso(`Gateway incorreto. O gateway do ${zona.nome} é ${zona.gateway}.`);
      return;
    }
    setErroPasso(null);
    setSalvando(true);
    setErroSalvar(null);
    try {
      const r = await fetch("/api/servidores/rede/configurar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: ip.trim(), mascara, gateway: gateway.trim() }),
      });
      const d = await r.json();
      if (!r.ok) {
        setErroSalvar(d.erro ?? "Falha ao salvar.");
        return;
      }
      setStatus((atual) =>
        atual
          ? { ...atual, configurada: true, config: { ip: ip.trim(), mascara, gateway: gateway.trim() } }
          : atual,
      );
    } finally {
      setSalvando(false);
    }
  }

  function reconfigurar() {
    if (!status) return;
    setIp(status.config?.ip ?? "");
    setMascara(status.config?.mascara ?? "");
    setGateway(status.config?.gateway ?? "");
    setPasso(0);
    setErroPasso(null);
    setStatus({ ...status, configurada: false });
  }

  function testarConexao() {
    if (!status || destinoTeste === "") return;
    const destinoZonaId = Number(destinoTeste);
    const sucesso = online && !modoInstalador && patchCordConectado && (destinoZonaId === status.zonaId || status.configurada);
    setTeste({
      destinoZonaId,
      resultado: sucesso ? "sucesso" : "bloqueado",
    });
  }

  return (
    <div className="space-y-4">
      <div className="cartao rounded-2xl p-4">
        {tierInfo && (
          <p className="mb-3 text-xs text-texto-suave">
            {tierInfo.icone} <span className="font-semibold text-texto">{tierInfo.redeTitulo}</span> -{" "}
            {tierInfo.redeDescricao}
          </p>
        )}
        <DatacenterRedeMapa
          tierInfo={tierInfo}
          zona={zona}
          zonas={status.zonas}
          config={status.config}
          configurada={status.configurada}
          sistemaPronto={sistemaPronto}
          online={online && !modoInstalador}
          patchCordConectado={patchCordConectado}
          internetAtiva={internetAtiva}
          teste={teste}
        />

        <div className="mt-4 grid gap-2 md:grid-cols-3">
          <ConceitoRede
            titulo="IP"
            texto="Endereço do servidor dentro da sub-rede. Precisa pertencer ao bloco do seu setor."
          />
          <ConceitoRede
            titulo="Máscara"
            texto="Define o tamanho da rede local. Aqui usamos /24, equivalente a 255.255.255.0."
          />
          <ConceitoRede
            titulo="Gateway"
            texto="Roteador de saída. Sem ele, o servidor fala só com a própria sub-rede."
          />
        </div>
      </div>

      {!redePodeConfigurar ? (
        <div className="cartao rounded-2xl p-4">
          <p className="text-sm font-semibold text-destaque">Pré-requisitos da rede</p>
          <p className="mt-1 text-xs text-texto-suave">
            A configuração de IP só faz sentido depois que o sistema operacional carrega a interface de rede e
            existe um uplink contratado.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <ChecklistRede
              pronto={sistemaPronto}
              titulo="Sistema operacional"
              texto={
                sistemaPronto
                  ? modoInstalador
                    ? "Instalado no disco, mas o boot atual veio da mídia."
                    : "Instalado. A interface de rede já pode subir."
                  : "Instale um SO na aba Sistema."
              }
            />
            <ChecklistRede
              pronto={patchCordConectado}
              titulo="Patch cord"
              texto={patchCordConectado ? "Cabo conectado na porta do servidor." : "Desligue o servidor e conecte o cabo."}
            />
            <ChecklistRede
              pronto={online && !modoInstalador}
              titulo="Boot pelo disco"
              texto={
                modoInstalador
                  ? "Servidor está no instalador live. Ejete a mídia e ligue pelo disco."
                  : online
                    ? "Boot completo. A placa de rede está ativa."
                    : ligando
                      ? "Aguarde o boot terminar."
                      : "Ligue o servidor para configurar a interface."
              }
            />
            <ChecklistRede
              pronto={internetAtiva}
              titulo="Internet"
              texto={internetAtiva ? "Uplink ativo para sair da rede local." : "Contrate internet para ter rota externa."}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              tamanho="sm"
              variante={patchCordConectado ? "perigo" : "primario"}
              carregando={conectandoPatchCord}
              onClick={() => onPatchCord(!patchCordConectado)}
              disabled={online || ligando}
              title={online || ligando ? "Desligue o servidor antes de mexer no patch cord" : ""}
            >
              {patchCordConectado ? "Remover patch cord" : "Conectar patch cord"}
            </Button>
          </div>
          {!internetAtiva && (
            <Button className="mt-3" carregando={contratandoInternet} onClick={onContratarInternet}>
              Contratar internet
            </Button>
          )}
        </div>
      ) : status.configurada && status.config ? (
        <div className="cartao rounded-2xl p-4">
          <p className="text-sm font-semibold text-sucesso">Rede configurada</p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg border border-borda bg-fundo p-2">
              <p className="font-mono">{status.config.ip}</p>
              <p className="text-texto-suave">IP</p>
            </div>
            <div className="rounded-lg border border-borda bg-fundo p-2">
              <p className="font-mono">{status.config.mascara}</p>
              <p className="text-texto-suave">Máscara</p>
            </div>
            <div className="rounded-lg border border-borda bg-fundo p-2">
              <p className="font-mono">{status.config.gateway}</p>
              <p className="text-texto-suave">Gateway</p>
            </div>
          </div>
          <button onClick={reconfigurar} className="mt-3 text-xs text-texto-suave hover:text-texto">
            Reconfigurar
          </button>

          {membrosParaTeste.length > 0 && (
            <div className="mt-4 border-t border-borda pt-3">
              <p className="text-xs font-semibold text-texto-suave">Testar rota até outro runner</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select
                  value={destinoTeste}
                  onChange={(e) => setDestinoTeste(e.target.value === "" ? "" : Number(e.target.value))}
                  className="rounded-lg border border-borda bg-fundo px-2 py-1.5 text-xs"
                >
                  <option value="">Escolha um alvo...</option>
                  {membrosParaTeste.map((m) => (
                    <option key={m.id} value={m.zonaId}>
                      {m.nome} - {m.zonaNome}
                    </option>
                  ))}
                </select>
                <Button tamanho="sm" onClick={testarConexao} disabled={destinoTeste === ""}>
                  Testar
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="cartao rounded-2xl p-4">
          <p className="text-xs font-semibold text-destaque">Passo {passo + 1} de 3</p>

          <AnimatePresence mode="wait">
            {passo === 0 && (
              <motion.div
                key="passo-0"
                initial={reduzido ? false : { opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduzido ? undefined : { opacity: 0, x: -16 }}
                transition={{ duration: reduzido ? 0 : 0.22, ease: "easeOut" }}
                className="mt-2"
              >
                <p className="text-sm text-texto">
                  O SO já está instalado. Agora escolha um IP para a interface do servidor no{" "}
                  <span className="font-semibold" style={{ color: zona.corLed }}>{zona.nome}</span>, sub-rede{" "}
                  <span className="font-mono">{zona.cidr}</span>. Evite{" "}
                  <span className="font-mono">.0</span>, <span className="font-mono">.1</span> e{" "}
                  <span className="font-mono">.255</span>, que são reservados.
                </p>
                <input
                  value={ip}
                  onChange={(e) => setIp(e.target.value)}
                  placeholder={`${zona.prefixo}.10`}
                  className="codigo mt-3 w-full rounded-lg border border-borda bg-fundo px-3 py-2 text-sm outline-none focus:border-primaria"
                />
                <Button onClick={validarPasso1} disabled={!ip.trim()} className="mt-3">
                  Confirmar IP
                </Button>
              </motion.div>
            )}

            {passo === 1 && (
              <motion.div
                key="passo-1"
                initial={reduzido ? false : { opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduzido ? undefined : { opacity: 0, x: -16 }}
                transition={{ duration: reduzido ? 0 : 0.22, ease: "easeOut" }}
                className="mt-2"
              >
                <p className="text-sm text-texto">
                  A máscara informa qual parte do endereço identifica a rede e qual parte identifica a máquina.
                  Sua zona é uma sub-rede <span className="font-mono">/24</span>. Qual máscara representa isso?
                </p>
                <div className="mt-3 space-y-2">
                  {MASCARAS_OPCOES.map((op) => (
                    <button
                      key={op.valor}
                      onClick={() => setMascara(op.valor)}
                      className={`block w-full rounded-lg border px-3 py-2 text-left text-xs font-mono transition ${
                        mascara === op.valor ? "border-primaria bg-primaria/10" : "border-borda hover:border-primaria/60"
                      }`}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
                <Button onClick={validarPasso2} disabled={!mascara} className="mt-3">
                  Confirmar máscara
                </Button>
              </motion.div>
            )}

            {passo === 2 && (
              <motion.div
                key="passo-2"
                initial={reduzido ? false : { opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduzido ? undefined : { opacity: 0, x: -16 }}
                transition={{ duration: reduzido ? 0 : 0.22, ease: "easeOut" }}
                className="mt-2"
              >
                <p className="text-sm text-texto">
                  O gateway é a rota padrão: quando o destino não está na sua sub-rede, o pacote sai por ele.
                  Qual é o endereço do roteador do {zona.nome}?
                </p>
                <input
                  value={gateway}
                  onChange={(e) => setGateway(e.target.value)}
                  placeholder={zona.gateway}
                  className="codigo mt-3 w-full rounded-lg border border-borda bg-fundo px-3 py-2 text-sm outline-none focus:border-primaria"
                />
                <Button
                  onClick={validarPasso3}
                  disabled={!gateway.trim()}
                  carregando={salvando}
                  className="mt-3"
                >
                  {salvando ? "Salvando..." : "Concluir configuração"}
                </Button>
                {erroSalvar && <p className="mt-2 text-xs text-erro">Erro: {erroSalvar}</p>}
              </motion.div>
            )}
          </AnimatePresence>

          {erroPasso && <p className="mt-2 text-xs text-erro">Erro: {erroPasso}</p>}
        </div>
      )}

      {redePodeConfigurar && !status.configurada && (
        <p className="text-center text-xs text-texto-suave">
          Sem gateway configurado, o servidor só conversa com máquinas da própria sub-rede.
        </p>
      )}
    </div>
  );
}

function DatacenterRedeMapa({
  tierInfo,
  zona,
  zonas,
  config,
  configurada,
  sistemaPronto,
  online,
  patchCordConectado,
  internetAtiva,
  teste,
}: {
  tierInfo: ServidorTier | undefined;
  zona: Zona;
  zonas: ZonaMapa[];
  config: Config;
  configurada: boolean;
  sistemaPronto: boolean;
  online: boolean;
  patchCordConectado: boolean;
  internetAtiva: boolean;
  teste: TesteConexao;
}) {
  const destino = teste ? zonas.find((z) => z.id === teste.destinoZonaId) : null;
  const etapas = [
    {
      titulo: "Servidor físico",
      valor: tierInfo?.nome ?? "Node",
      detalhe: "Hardware provisionado",
      pronto: true,
    },
    {
      titulo: "Sistema operacional",
      valor: sistemaPronto ? (online ? "Online" : "Instalado") : "Pendente",
      detalhe: "Drivers e serviços",
      pronto: sistemaPronto && online,
    },
    {
      titulo: "Patch cord",
      valor: patchCordConectado ? "Conectado" : "Solto",
      detalhe: "Porta física do servidor",
      pronto: patchCordConectado,
    },
    {
      titulo: "Interface de rede",
      valor: configurada && config ? config.ip : `${zona.prefixo}.x`,
      detalhe: zona.cidr,
      pronto: configurada && online && patchCordConectado,
    },
    {
      titulo: "Gateway",
      valor: internetAtiva ? zona.gateway : "Sem uplink",
      detalhe: "Saída para outras redes",
      pronto: internetAtiva && configurada && patchCordConectado && online,
    },
  ];

  return (
    <div className="rounded-2xl border border-borda bg-fundo/80 p-4">
      <div className="grid gap-3 md:grid-cols-5">
        {etapas.map((etapa, indice) => (
          <div key={etapa.titulo} className="relative rounded-xl border border-borda bg-fundo-card p-3">
            {indice < etapas.length - 1 && (
              <span className="absolute -right-2 top-1/2 hidden h-px w-4 bg-primaria/50 md:block" />
            )}
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] uppercase text-texto-suave">{etapa.titulo}</p>
              <span className={etapa.pronto ? "text-sucesso" : "text-destaque"}>{etapa.pronto ? "OK" : "..."}</span>
            </div>
            <p className="mt-2 truncate font-mono text-sm text-texto">{etapa.valor}</p>
            <p className="mt-1 text-[11px] text-texto-suave">{etapa.detalhe}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-xl border border-borda bg-fundo-card p-3">
          <p className="text-xs font-semibold text-texto">Segmento atual</p>
          <p className="mt-1 text-sm">
            Seu servidor está no <span className="font-semibold" style={{ color: zona.corLed }}>{zona.nome}</span>{" "}
            com bloco <span className="font-mono">{zona.cidr}</span>.
          </p>
          {destino && (
            <p className={`mt-2 text-xs font-semibold ${teste?.resultado === "sucesso" ? "text-sucesso" : "text-erro"}`}>
              Teste para {destino.nome}: {teste?.resultado === "sucesso" ? "rota disponível" : "sem rota configurada"}
            </p>
          )}
        </div>
        <div className="rounded-xl border border-borda bg-fundo-card p-3">
          <p className="text-xs font-semibold text-texto">Zonas da turma</p>
          <div className="mt-2 space-y-1">
            {zonas.map((z) => (
              <div key={z.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: z.corLed }} />
                  {z.nome}
                </span>
                <span className="text-texto-suave">{z.membros.length} runners</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConceitoRede({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="rounded-xl border border-borda bg-fundo p-3">
      <p className="text-xs font-semibold text-ouro">{titulo}</p>
      <p className="mt-1 text-xs text-texto-suave">{texto}</p>
    </div>
  );
}

function ChecklistRede({ pronto, titulo, texto }: { pronto: boolean; titulo: string; texto: string }) {
  return (
    <div className="rounded-xl border border-borda bg-fundo p-3">
      <p className={`text-xs font-semibold ${pronto ? "text-sucesso" : "text-destaque"}`}>
        {pronto ? "OK" : "Pendente"} - {titulo}
      </p>
      <p className="mt-1 text-xs text-texto-suave">{texto}</p>
    </div>
  );
}
