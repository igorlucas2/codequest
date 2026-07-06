"use client";

import { useEffect, useState } from "react";
import Terminal, { LIMPAR_TERMINAL, type LinhaTerminal } from "@/components/Terminal";
import { useSessao } from "@/components/Sessao";
import { getSistemaOperacional, type SistemaOperacional } from "@/content/sistemasOperacionais";
import { normalizar } from "@/lib/texto";

type StatusServidor = {
  ip: string | null;
  configurada: boolean;
  sistemaOperacional: string | null;
  sshHabilitado: boolean;
};
type Fase = "local" | "node-alpha" | "servidor";

const ARQUIVOS_NODE_ALPHA: Record<string, string[]> = {
  "boas_vindas.txt": [
    "Bem-vindo ao NODE-ALPHA. Sistema experimental de treinamento de invasão.",
    "Digite 'ajuda' para ver os comandos disponíveis.",
  ],
  "memo_seguranca.txt": [
    "MEMO INTERNO — Segurança de Sistemas",
    "Trocamos a senha do núcleo pra dificultar bots de força bruta.",
    "Nova regra: nome do sistema + ano de fundação, tudo junto e minúsculo.",
    "Fundação registrada: 2077.",
  ],
  "log_acesso.dat": [
    "[02:14:07] tentativa de acesso ao núcleo... NEGADO",
    "[02:15:41] admin trocou a senha do núcleo (ver memo_seguranca.txt)",
    "[02:16:03] conexão suspeita detectada nesta sessão",
  ],
};

const BANNER_NODE_ALPHA: LinhaTerminal[] = [
  { texto: "CONEXÃO ESTABELECIDA COM NODE-ALPHA...", tipo: "info" },
  { texto: "Vulnerabilidade encontrada no firewall de perímetro.", tipo: "info" },
  { texto: "Digite 'ajuda' para ver os comandos disponíveis.", tipo: "saida" },
];

const AJUDA_NODE_ALPHA: LinhaTerminal[] = [
  { texto: "Comandos disponíveis:", tipo: "saida" },
  { texto: "  ls                 — lista os arquivos do sistema", tipo: "saida" },
  { texto: "  cat <arquivo>      — lê o conteúdo de um arquivo", tipo: "saida" },
  { texto: "  acessar <alvo>     — tenta acessar um alvo (ex: nucleo)", tipo: "saida" },
  { texto: "  decifrar <senha>   — tenta decifrar a senha do núcleo", tipo: "saida" },
  { texto: "  exit               — desconecta", tipo: "saida" },
  { texto: "  limpar             — limpa a tela", tipo: "saida" },
];

// Terminal unificado do desktop: um único programa que conecta em qualquer
// alvo via "ssh usuario@host" — igual SSH de verdade, sem um programa
// separado por destino. Dois alvos conhecidos: "node-alpha" (puzzle fixo de
// treino, sempre alcançável, sem pré-requisito) e o IP do próprio servidor
// do jogador (exige rede configurada + SO instalado — ver Servidor → Rede /
// Sistema Operacional).
export default function Ssh({ velocidade }: { velocidade: number }) {
  const { recarregar } = useSessao();
  const [status, setStatus] = useState<StatusServidor | null>(null);
  const [fase, setFase] = useState<Fase>("local");
  const [osConectado, setOsConectado] = useState<SistemaOperacional | null>(null);
  const [resolvidoNodeAlpha, setResolvidoNodeAlpha] = useState(false);
  const [mensagemFinalNodeAlpha, setMensagemFinalNodeAlpha] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/servidores/ssh", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: StatusServidor) => setStatus(d));
  }, []);

  async function tratarComando(comandoBruto: string): Promise<LinhaTerminal[]> {
    const comando = normalizar(comandoBruto);
    if (comando === "limpar" || comando === "clear") return LIMPAR_TERMINAL;

    if (fase === "local") {
      if (comando === "ajuda") {
        const linhas: LinhaTerminal[] = [
          { texto: "Comandos disponíveis:", tipo: "saida" },
          { texto: "  ssh usuario@host   — conecta num alvo", tipo: "saida" },
          { texto: "  limpar             — limpa a tela", tipo: "saida" },
          { texto: "Alvos conhecidos:", tipo: "info" },
          { texto: "  node-alpha         — sistema de treino de invasão", tipo: "saida" },
        ];
        if (status?.ip) linhas.push({ texto: `  ${status.ip}     — seu próprio servidor`, tipo: "saida" });
        return linhas;
      }

      const m = comandoBruto.trim().match(/^ssh\s+(?:[\w.-]+@)?([\w.-]+)\s*$/i);
      if (!m) return [{ texto: "Comando não reconhecido. Use: ssh usuario@host", tipo: "erro" }];
      const hostDigitado = m[1];

      if (hostDigitado.toLowerCase() === "node-alpha") {
        setFase("node-alpha");
        return BANNER_NODE_ALPHA;
      }

      if (!status) return [{ texto: "Carregando status do servidor...", tipo: "erro" }];

      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostDigitado)) {
        if (!status.configurada) {
          return [
            { texto: `ssh: não foi possível resolver ${hostDigitado} — sem rede configurada.`, tipo: "erro" },
            { texto: "Configure IP/máscara/gateway em Servidor → Rede antes de tentar SSH.", tipo: "info" },
          ];
        }
        if (hostDigitado !== status.ip) {
          return [
            { texto: `ssh: tempo esgotado ao conectar a ${hostDigitado}.`, tipo: "erro" },
            { texto: `O IP do seu servidor é ${status.ip}.`, tipo: "info" },
          ];
        }
        if (!status.sistemaOperacional) {
          return [
            { texto: `ssh: conexão recusada por ${hostDigitado} (porta 22) — nenhum SO instalado.`, tipo: "erro" },
            { texto: "Compre e instale um SO em Servidor → Sistema Operacional.", tipo: "info" },
          ];
        }
        if (!status.sshHabilitado) {
          return [
            { texto: `ssh: conexão recusada por ${hostDigitado} (porta 22) — sshd não está ativo.`, tipo: "erro" },
            { texto: "Acesse o console local em Servidor → Sistema Operacional pra ligar o serviço.", tipo: "info" },
          ];
        }
        const so = getSistemaOperacional(status.sistemaOperacional);
        if (!so) return [{ texto: "Erro desconhecido de sistema.", tipo: "erro" }];

        setFase("servidor");
        setOsConectado(so);
        return [
          { texto: `Conectando a ${hostDigitado}...`, tipo: "info" },
          { texto: `Bem-vindo ao ${so.nome} (gerenciador: ${so.gerenciadorPacotes}).`, tipo: "sucesso" },
          { texto: "Digite 'ajuda' pra ver os comandos, 'exit' pra desconectar.", tipo: "saida" },
        ];
      }

      return [{ texto: `ssh: não foi possível resolver ${hostDigitado} — host desconhecido.`, tipo: "erro" }];
    }

    if (fase === "node-alpha") {
      const partes = comandoBruto.trim().split(/\s+/);
      const cmd = partes[0]?.toLowerCase();
      const arg = partes.slice(1).join(" ").toLowerCase();

      if (cmd === "ajuda" || cmd === "help") return AJUDA_NODE_ALPHA;
      if (cmd === "exit" || cmd === "logout") {
        setFase("local");
        return [{ texto: "Conexão com node-alpha encerrada.", tipo: "info" }];
      }
      if (cmd === "ls" || cmd === "dir") {
        return [{ texto: Object.keys(ARQUIVOS_NODE_ALPHA).join("   "), tipo: "saida" }];
      }
      if (cmd === "cat") {
        const conteudo = ARQUIVOS_NODE_ALPHA[arg];
        if (!conteudo) return [{ texto: `Arquivo não encontrado: ${arg || "(nenhum)"}`, tipo: "erro" }];
        return conteudo.map((texto) => ({ texto, tipo: "saida" }));
      }
      if (cmd === "acessar") {
        if (arg.includes("nucleo") || arg.includes("núcleo")) {
          return [{ texto: "Núcleo requer autenticação. Use: decifrar <senha>", tipo: "info" }];
        }
        return [{ texto: "Alvo desconhecido. Tente: acessar nucleo", tipo: "erro" }];
      }
      if (cmd === "decifrar") {
        if (!arg) return [{ texto: "Uso: decifrar <senha>", tipo: "erro" }];
        const r = await fetch("/api/invasao", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ senha: arg }),
        });
        const d = await r.json();
        if (!r.ok) return [{ texto: d.erro ?? "Falha na conexão com o núcleo.", tipo: "erro" }];
        if (!d.correta) return [{ texto: "ACESSO NEGADO. Tentativa registrada.", tipo: "erro" }];

        setResolvidoNodeAlpha(true);
        if (d.moedasGanhas > 0) {
          setMensagemFinalNodeAlpha(`+${d.moedasGanhas} ◈ creditados na sua conta.`);
          await recarregar();
        } else {
          setMensagemFinalNodeAlpha("Recompensa diária já resgatada — volte amanhã para mais créditos.");
        }
        return [
          { texto: "ACESSO CONCEDIDO. Núcleo comprometido.", tipo: "sucesso" },
          { texto: "Invasão registrada com sucesso.", tipo: "sucesso" },
        ];
      }
      return [{ texto: `Comando não reconhecido: ${cmd}. Digite 'ajuda'.`, tipo: "erro" }];
    }

    // fase === "servidor"
    if (comando === "exit" || comando === "logout") {
      const ip = status?.ip;
      setFase("local");
      setOsConectado(null);
      return [{ texto: `Conexão com ${ip} encerrada.`, tipo: "info" }];
    }
    if (comando === "ajuda") {
      const linhas: LinhaTerminal[] = [{ texto: "Comandos disponíveis:", tipo: "saida" }];
      for (const c of osConectado?.comandos ?? []) {
        linhas.push({ texto: `  ${c.comando} — ${c.descricao}`, tipo: "saida" });
      }
      linhas.push({ texto: "  exit — desconecta", tipo: "saida" });
      return linhas;
    }
    const cmdOS = osConectado?.comandos.find((c) => normalizar(c.comando) === comando);
    if (cmdOS) return cmdOS.saida.map((texto) => ({ texto, tipo: "saida" }));

    return [{ texto: `comando não encontrado: ${comandoBruto}. Digite 'ajuda'.`, tipo: "erro" }];
  }

  const desabilitado = fase === "node-alpha" && resolvidoNodeAlpha;

  const linhasIniciais: LinhaTerminal[] = (() => {
    if (fase === "node-alpha") return BANNER_NODE_ALPHA;
    if (fase === "servidor" && osConectado) {
      return [
        { texto: `Bem-vindo ao ${osConectado.nome} (gerenciador: ${osConectado.gerenciadorPacotes}).`, tipo: "sucesso" },
        { texto: "Digite 'ajuda' pra ver os comandos, 'exit' pra desconectar.", tipo: "saida" },
      ];
    }
    return [
      { texto: "Terminal local — digite 'ssh usuario@host' pra conectar em algum lugar (ex: node-alpha).", tipo: "info" },
    ];
  })();

  const prompt = (() => {
    if (fase === "node-alpha") return "root@node-alpha:~$";
    if (fase === "servidor" && status?.ip) return `root@${status.ip}:~$`;
    return "visitante@deck:~$";
  })();

  return (
    <div className="flex h-full flex-col gap-2">
      <Terminal
        linhasIniciais={linhasIniciais}
        prompt={prompt}
        desabilitado={desabilitado}
        placeholder={desabilitado ? "conexão encerrada" : fase === "local" ? "ssh usuario@host" : "digite um comando..."}
        onComando={tratarComando}
        velocidade={velocidade}
        preencherAltura
      />
      {desabilitado && (
        <div className="rounded-xl border border-borda bg-fundo-card p-3 text-center text-sm">
          <p className="font-semibold text-sucesso">🏆 Invasão concluída!</p>
          <p className="mt-1 text-xs text-texto-suave">{mensagemFinalNodeAlpha}</p>
        </div>
      )}
    </div>
  );
}
