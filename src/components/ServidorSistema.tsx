import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Terminal, { LIMPAR_TERMINAL, type LinhaTerminal } from "@/components/Terminal";
import { normalizar } from "@/lib/texto";
import { getSistemaOperacional, type SistemaOperacionalId } from "@/content/sistemasOperacionais";

export type EstadoOperacionalServidorView = {
  ligado: boolean;
  ligando: boolean;
  online: boolean;
  estado: "desligado" | "ligando" | "ligado";
  bootFinalizaEm: string | null;
  bootRestanteMs: number;
  sshUsuario: string;
  patchCordConectado: boolean;
  tempoBootSegundos: number;
};

export default function ServidorSistema({
  sistemaOperacional,
  sshHabilitado,
  estadoOperacional,
  processando,
  velocidade,
  onLigar,
  onDesligar,
  onSalvarUsuarioSsh,
  onHabilitarSsh,
}: {
  sistemaOperacional: SistemaOperacionalId | null;
  sshHabilitado: boolean;
  estadoOperacional: EstadoOperacionalServidorView;
  processando: string | null;
  velocidade: number;
  onLigar: () => Promise<void>;
  onDesligar: () => Promise<void>;
  onSalvarUsuarioSsh: (usuarioSsh: string) => Promise<void>;
  onHabilitarSsh: () => Promise<void>;
}) {
  const atual = sistemaOperacional ? getSistemaOperacional(sistemaOperacional) : null;
  const [usuarioSsh, setUsuarioSsh] = useState(estadoOperacional.sshUsuario);
  const [agora, setAgora] = useState(0);

  useEffect(() => {
    if (!estadoOperacional.ligando) return;
    const id = window.setInterval(() => setAgora(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [estadoOperacional.ligando]);

  const bootRestanteMs = useMemo(() => {
    if (!estadoOperacional.bootFinalizaEm) return estadoOperacional.bootRestanteMs;
    if (agora === 0) return estadoOperacional.bootRestanteMs;
    return Math.max(0, new Date(estadoOperacional.bootFinalizaEm).getTime() - agora);
  }, [agora, estadoOperacional.bootFinalizaEm, estadoOperacional.bootRestanteMs]);
  const segundosRestantes = Math.ceil(bootRestanteMs / 1000);

  async function tratarComandoConsole(comandoBruto: string): Promise<LinhaTerminal[]> {
    const comando = normalizar(comandoBruto);
    if (comando === "limpar" || comando === "clear") return LIMPAR_TERMINAL;
    if (!atual) return [{ texto: "Nenhum sistema operacional instalado.", tipo: "erro" }];
    if (!estadoOperacional.online) {
      return [{ texto: "Console indisponível: servidor desligado ou em boot.", tipo: "erro" }];
    }

    if (comando === "ajuda" || comando === "help") {
      return [
        { texto: "sshd não está ativo. Sem isso, o SSH remoto não conecta neste servidor.", tipo: "info" },
        { texto: `Rode: ${atual.comandoHabilitarSsh}`, tipo: "saida" },
        { texto: "  status - mostra o status atual do serviço", tipo: "saida" },
      ];
    }
    if (comando === "status") {
      return atual.saidaStatusInativo.map((texto) => ({ texto, tipo: "erro" }));
    }
    if (comando === normalizar(atual.comandoHabilitarSsh)) {
      await onHabilitarSsh();
      return [
        { texto: "sshd iniciado e habilitado.", tipo: "sucesso" },
        { texto: `Acesso remoto liberado para o usuário ${estadoOperacional.sshUsuario}.`, tipo: "info" },
      ];
    }
    return [{ texto: `comando não encontrado: ${comandoBruto}. Digite 'ajuda'.`, tipo: "erro" }];
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-3">
        <Card dourado={!!atual} arredondamento="xl" className="p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">{atual?.icone ?? "💿"}</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ouro">{atual ? atual.nome : "Sem sistema operacional"}</p>
              <p className="mt-1 text-xs text-texto-suave">
                {atual
                  ? `Gerenciador de pacotes: ${atual.gerenciadorPacotes}`
                  : "Compre e instale um SO em Mercado -> Datacenter antes de ligar o servidor."}
              </p>
            </div>
          </div>
        </Card>

        <Card arredondamento="xl" className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-texto">Energia</p>
              <p className="mt-1 text-xs text-texto-suave">
                Boot desta geração: {estadoOperacional.tempoBootSegundos}s.
              </p>
            </div>
            <span
              className={`rounded-lg px-2 py-1 text-xs font-semibold ${
                estadoOperacional.online
                  ? "bg-sucesso/15 text-sucesso"
                  : estadoOperacional.ligando
                    ? "bg-destaque/15 text-destaque"
                    : "bg-fundo text-texto-suave"
              }`}
            >
              {estadoOperacional.online
                ? "Ligado"
                : estadoOperacional.ligando
                  ? `Boot ${segundosRestantes}s`
                  : "Desligado"}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {estadoOperacional.ligado ? (
              <Button
                variante="perigo"
                onClick={onDesligar}
                carregando={processando === "energia-desligar"}
              >
                Desligar
              </Button>
            ) : (
              <Button
                onClick={onLigar}
                disabled={!atual}
                carregando={processando === "energia-ligar"}
                title={atual ? "" : "Instale um sistema operacional antes de ligar"}
              >
                Ligar servidor
              </Button>
            )}
          </div>
          <p className="mt-3 text-xs text-texto-suave">
            Desligado permite upgrade físico, troca de switch, instalação de SO e patch cord. Ligado permite console, rede e apps.
          </p>
        </Card>

        <Card arredondamento="xl" className="p-4">
          <p className="text-sm font-semibold text-texto">Usuário SSH</p>
          <p className="mt-1 text-xs text-texto-suave">
            Esse usuário será usado no terminal do computador: ssh usuario@ip.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              value={usuarioSsh}
              onChange={(e) => setUsuarioSsh(e.target.value)}
              disabled={!atual || !estadoOperacional.online}
              className="codigo min-w-0 flex-1 rounded-lg border border-borda bg-fundo px-3 py-2 text-sm outline-none focus:border-primaria disabled:opacity-50"
            />
            <Button
              tamanho="sm"
              onClick={() => onSalvarUsuarioSsh(usuarioSsh)}
              disabled={!atual || !estadoOperacional.online || usuarioSsh === estadoOperacional.sshUsuario}
              carregando={processando === "salvar-usuario-ssh"}
            >
              Salvar
            </Button>
          </div>
          <p className={`mt-2 text-xs font-semibold ${sshHabilitado ? "text-sucesso" : "text-destaque"}`}>
            {sshHabilitado ? "sshd ativo" : "sshd inativo"}
          </p>
        </Card>
      </div>

      <Card arredondamento="xl" className="flex min-h-80 flex-col p-4">
        <p className="mb-2 text-xs text-texto-suave">
          Console local: acesso direto ao servidor. Use-o para subir serviços antes de acessar por SSH.
        </p>
        {atual && estadoOperacional.online && !sshHabilitado ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <Terminal
              linhasIniciais={[
                { texto: `Console local - ${atual.nome}.`, tipo: "info" },
                { texto: "sshd não está ativo. Digite 'ajuda' para ligar o serviço.", tipo: "saida" },
              ]}
              prompt="root@localhost:~$"
              placeholder="digite um comando..."
              onComando={tratarComandoConsole}
              velocidade={velocidade}
              preencherAltura
            />
          </div>
        ) : (
          <div className="grid min-h-64 flex-1 place-items-center rounded-xl border border-borda bg-fundo p-4 text-center text-sm text-texto-suave">
            {sshHabilitado
              ? "Serviço SSH ativo. Acesse pelo Terminal do computador usando o usuário configurado."
              : atual
                ? "Ligue o servidor e aguarde o boot para usar o console local."
                : "Instale um sistema operacional pelo Mercado para liberar o console."}
          </div>
        )}
      </Card>
    </div>
  );
}
