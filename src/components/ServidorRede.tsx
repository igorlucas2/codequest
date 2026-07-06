"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import TopologiaRede, { type TesteConexao, type ZonaTopologia } from "@/components/TopologiaRede";
import Button from "@/components/ui/Button";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { MASCARAS_OPCOES } from "@/content/rede";
import { getServidorTier, type ServidorTierId } from "@/content/servidores";

type Zona = { id: number; nome: string; cidr: string; prefixo: string; gateway: string; corLed: string };
type Config = { ip: string; mascara: string; gateway: string } | null;
type StatusRede = {
  zonaId: number;
  zona: Zona;
  config: Config;
  configurada: boolean;
  zonas: ZonaTopologia[];
};

// Programa "Rede": aula de infraestrutura estilo Packet Tracer — topologia
// fixa de 3 zonas, wizard guiado de 3 passos (IP, máscara, gateway) e um
// teste de conexão cosmético (sem custo/consequência, só didático).
export default function ServidorRede({
  tier,
  internetAtiva,
  contratandoInternet,
  onContratarInternet,
}: {
  tier: ServidorTierId;
  internetAtiva: boolean;
  contratandoInternet: boolean;
  onContratarInternet: () => void;
}) {
  const reduzido = usePrefersReducedMotion();
  const tierInfo = getServidorTier(tier);
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

  if (!status) return <p className="text-sm text-texto-suave">Carregando topologia da Rede...</p>;

  const { zona } = status;

  function validarPasso1() {
    const m = ip.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!m) return setErroPasso("Formato inválido — use algo como 10.10.x.y.");
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
    if (!status) return;
    if (gateway.trim() !== zona.gateway) {
      setErroPasso(`Gateway incorreto — o gateway do ${zona.nome} é ${zona.gateway}.`);
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
      setStatus({ ...status, configurada: true, config: { ip: ip.trim(), mascara, gateway: gateway.trim() } });
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
    const sucesso = destinoZonaId === status.zonaId || status.configurada;
    setTeste({
      destinoZonaId,
      resultado: sucesso ? "sucesso" : "bloqueado",
    });
  }

  const outrasZonas = status.zonas.filter((z) => z.id !== status.zonaId);
  const membrosParaTeste = status.zonas.flatMap((z) => z.membros.filter((m) => !m.voce));

  return (
    <div className="space-y-4">
      <div className="cartao rounded-2xl p-4">
        {tierInfo && (
          <p className="mb-3 text-xs text-texto-suave">
            {tierInfo.icone} <span className="font-semibold text-texto">{tierInfo.redeTitulo}</span> —{" "}
            {tierInfo.redeDescricao}
          </p>
        )}
        <TopologiaRede zonas={status.zonas} minhaZonaId={status.zonaId} teste={teste} />
        <p className="mt-2 text-center text-xs text-texto-suave">
          Seu servidor está no <span className="font-semibold" style={{ color: zona.corLed }}>{zona.nome}</span> ({zona.cidr}).
        </p>
      </div>

      {!internetAtiva ? (
        <div className="cartao rounded-2xl p-4 text-center">
          <p className="text-sm font-semibold text-destaque">🌐 Sem internet contratada</p>
          <p className="mt-1 text-xs text-texto-suave">
            Contrate a internet antes de configurar a rede do seu servidor — sem uplink, não tem como
            sair da sua sub-rede.
          </p>
          <Button className="mt-3" carregando={contratandoInternet} onClick={onContratarInternet}>
            Contratar internet
          </Button>
        </div>
      ) : status.configurada && status.config ? (
        <div className="cartao rounded-2xl p-4">
          <p className="text-sm font-semibold text-sucesso">✅ Rede configurada</p>
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
          <button
            onClick={reconfigurar}
            className="mt-3 text-xs text-texto-suave hover:text-texto"
          >
            Reconfigurar
          </button>

          {membrosParaTeste.length > 0 && (
            <div className="mt-4 border-t border-borda pt-3">
              <p className="text-xs font-semibold text-texto-suave">Testar conexão</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select
                  value={destinoTeste}
                  onChange={(e) => setDestinoTeste(e.target.value === "" ? "" : Number(e.target.value))}
                  className="rounded-lg border border-borda bg-fundo px-2 py-1.5 text-xs"
                >
                  <option value="">Escolha um alvo...</option>
                  {membrosParaTeste.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}
                    </option>
                  ))}
                </select>
                <Button tamanho="sm" onClick={testarConexao} disabled={destinoTeste === ""}>
                  📡 Testar
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
                  Seu servidor caiu no <span className="font-semibold" style={{ color: zona.corLed }}>{zona.nome}</span>,
                  sub-rede <span className="font-mono">{zona.cidr}</span>. Escolha um endereço IP dentro dela
                  (evite <span className="font-mono">.0</span>, <span className="font-mono">.1</span> e{" "}
                  <span className="font-mono">.255</span> — são reservados).
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
                  A máscara de sub-rede define quantos endereços cabem na sua rede local. Sua zona é uma
                  sub-rede <span className="font-mono">/24</span> — qual máscara é essa?
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
                  Sem um gateway configurado, seu servidor só alcança outros da mesma sub-rede — nada fora dela.
                  Qual é o endereço do roteador que dá saída pro resto da Rede?
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
                {erroSalvar && <p className="mt-2 text-xs text-erro">❌ {erroSalvar}</p>}
              </motion.div>
            )}
          </AnimatePresence>

          {erroPasso && <p className="mt-2 text-xs text-erro">❌ {erroPasso}</p>}
        </div>
      )}

      {outrasZonas.length > 0 && (
        <p className="text-center text-xs text-texto-suave">
          Sem gateway configurado, você só alcança quem está no seu próprio setor nas invasões.
        </p>
      )}
    </div>
  );
}
