"use client";

import { useEffect, useMemo, useState } from "react";
import Terminal, { LIMPAR_TERMINAL, type LinhaTerminal } from "@/components/Terminal";
import { useSessao } from "@/components/Sessao";
import { getSistemaOperacional, type SistemaOperacional } from "@/content/sistemasOperacionais";
import { normalizar } from "@/lib/texto";
import {
  NOTEBOOK_WORKSPACE_EVENT,
  chaveNotebookStorage,
  criarWorkspacePadrao,
  diretorioDe,
  ehNotebookWorkspace,
  mesclarWorkspace,
  nomeDe,
  normalizarCaminho,
  ordenarEntradasNotebook,
  pastasAncestrais,
  VERSAO_NOTEBOOK_WORKSPACE,
  type EntradaNotebook,
  type NotebookWorkspace,
  type NotebookWorkspaceEventDetail,
} from "@/lib/notebookWorkspace";

type StatusServidor = {
  ip: string | null;
  configurada: boolean;
  sistemaOperacional: string | null;
  sshHabilitado: boolean;
  online: boolean;
  ligando: boolean;
  bootandoMidia: boolean;
  sshUsuario: string;
  patchCordConectado: boolean;
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

function caminhoAbsoluto(atual: string, alvo?: string) {
  const bruto = (alvo ?? "").trim();
  if (!bruto || bruto === ".") return normalizarCaminho(atual);
  if (bruto === "~" || bruto === "/") return "";

  const partes = bruto.startsWith("/")
    ? bruto.split("/")
    : [...normalizarCaminho(atual).split("/"), ...bruto.split("/")];
  const pilha: string[] = [];

  for (const parte of partes) {
    const p = parte.trim();
    if (!p || p === ".") continue;
    if (p === "..") {
      pilha.pop();
      continue;
    }
    pilha.push(p);
  }

  return normalizarCaminho(pilha.join("/"));
}

function garantirPastas(entradas: EntradaNotebook[], caminho: string) {
  const proximas = [...entradas];
  for (const pasta of pastasAncestrais(caminho)) {
    if (!proximas.some((entrada) => entrada.caminho === pasta)) {
      proximas.push({ caminho: pasta, tipo: "pasta" });
    }
  }
  return proximas;
}

function simularPython(conteudo: string): LinhaTerminal[] {
  const linhas = conteudo.split("\n");
  const saida: LinhaTerminal[] = [];

  for (const linha of linhas) {
    const print = linha.match(/^\s*print\((["'`])([\s\S]*)\1\)\s*$/);
    if (print) saida.push({ texto: print[2], tipo: "saida" });
  }

  return saida.length > 0 ? saida : [{ texto: "Processo concluido sem saida.", tipo: "sucesso" }];
}

// Terminal unificado do desktop: um único programa que conecta em qualquer
// alvo via "ssh usuario@host" — igual SSH de verdade, sem um programa
// separado por destino. Dois alvos conhecidos: "node-alpha" (puzzle fixo de
// treino, sempre alcançável, sem pré-requisito) e o IP do próprio servidor
// do jogador (exige rede configurada + SO instalado — ver Servidor → Rede /
// Sistema Operacional).
export default function Ssh({ velocidade }: { velocidade: number }) {
  const { recarregar, usuario } = useSessao();
  const [status, setStatus] = useState<StatusServidor | null>(null);
  const [fase, setFase] = useState<Fase>("local");
  const [osConectado, setOsConectado] = useState<SistemaOperacional | null>(null);
  const [resolvidoNodeAlpha, setResolvidoNodeAlpha] = useState(false);
  const [mensagemFinalNodeAlpha, setMensagemFinalNodeAlpha] = useState<string | null>(null);
  const workspaceId = usuario ? `usuario-${usuario.id}` : "anon";
  const chaveStorage = chaveNotebookStorage(workspaceId);
  const workspacePadrao = useMemo(
    () =>
      criarWorkspacePadrao(
        "projetos/codequest/README.md",
        `# Notebook de ${usuario?.nome ?? "Runner"}\n\nProjetos, aulas e interacoes do jogo ficam neste workspace.`,
      ),
    [usuario?.nome],
  );
  const [workspace, setWorkspace] = useState<NotebookWorkspace>(workspacePadrao);

  useEffect(() => {
    fetch("/api/servidores/ssh", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: StatusServidor) => setStatus(d));
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      let cache: NotebookWorkspace | null = null;

      try {
        const bruto = window.localStorage.getItem(chaveStorage);
        const salvo = bruto ? (JSON.parse(bruto) as unknown) : null;
        if (ehNotebookWorkspace(salvo)) cache = salvo;
      } catch {
        return;
      }

      const workspaceInicial = mesclarWorkspace(cache, workspacePadrao, false);
      setWorkspace(workspaceInicial);

      fetch("/api/notebook/workspace", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((dados: unknown) => {
          if (!dados || typeof dados !== "object") return;
          const remoto = (dados as { workspace?: unknown }).workspace;
          if (!ehNotebookWorkspace(remoto)) return;
          const mesclado = mesclarWorkspace(remoto, workspaceInicial, false);
          setWorkspace(mesclado);
          window.localStorage.setItem(chaveStorage, JSON.stringify(mesclado));
        })
        .catch(() => undefined);
    }, 0);

    return () => window.clearTimeout(id);
  }, [chaveStorage, workspacePadrao]);

  useEffect(() => {
    function aoAtualizarWorkspace(evento: Event) {
      const detalhe = (evento as CustomEvent<NotebookWorkspaceEventDetail>).detail;
      if (!detalhe || detalhe.workspaceId !== workspaceId) return;
      if (!ehNotebookWorkspace(detalhe.workspace)) return;
      setWorkspace(detalhe.workspace);
    }

    window.addEventListener(NOTEBOOK_WORKSPACE_EVENT, aoAtualizarWorkspace);
    return () => window.removeEventListener(NOTEBOOK_WORKSPACE_EVENT, aoAtualizarWorkspace);
  }, [workspaceId]);

  async function persistirWorkspace(proximo: NotebookWorkspace) {
    setWorkspace(proximo);
    window.localStorage.setItem(chaveStorage, JSON.stringify(proximo));
    window.dispatchEvent(
      new CustomEvent<NotebookWorkspaceEventDetail>(NOTEBOOK_WORKSPACE_EVENT, {
        detail: { workspaceId, workspace: proximo },
      }),
    );

    try {
      await fetch("/api/notebook/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace: proximo }),
      });
    } catch {
      // O terminal local continua funcionando offline; a IDE/Projetos recebem o evento local.
    }
  }

  async function tratarComando(comandoBruto: string): Promise<LinhaTerminal[]> {
    const comando = normalizar(comandoBruto);
    if (comando === "limpar" || comando === "clear") return LIMPAR_TERMINAL;

    if (fase === "local") {
      if (comando === "ajuda") {
        const linhas: LinhaTerminal[] = [
          { texto: "Comandos disponíveis:", tipo: "saida" },
          { texto: "  pwd                — mostra a pasta atual do notebook", tipo: "saida" },
          { texto: "  ls [pasta]         — lista arquivos e pastas", tipo: "saida" },
          { texto: "  cd <pasta>         — entra em uma pasta", tipo: "saida" },
          { texto: "  cat <arquivo>      — lê um arquivo salvo", tipo: "saida" },
          { texto: "  mkdir <pasta>      — cria uma pasta", tipo: "saida" },
          { texto: "  touch <arquivo>    — cria um arquivo", tipo: "saida" },
          { texto: "  rm <caminho>       — remove arquivo ou pasta", tipo: "saida" },
          { texto: "  python <arquivo>   — executa prints simples do arquivo", tipo: "saida" },
          { texto: "  ssh usuario@host   — conecta num alvo", tipo: "saida" },
          { texto: "  limpar             — limpa a tela", tipo: "saida" },
          { texto: "Alvos conhecidos:", tipo: "info" },
          { texto: "  node-alpha         — sistema de treino de invasão", tipo: "saida" },
        ];
        if (status?.ip) linhas.push({ texto: `  ${status.ip}     — seu próprio servidor`, tipo: "saida" });
        return linhas;
      }

      const partes = comandoBruto.trim().split(/\s+/);
      const cmd = partes[0]?.toLowerCase();
      const arg = partes.slice(1).join(" ");
      const pastaAtual = workspace.pastaAtual;

      if (cmd === "pwd") {
        return [{ texto: `/${pastaAtual}`, tipo: "saida" }];
      }

      if (cmd === "ls" || cmd === "dir") {
        const alvo = caminhoAbsoluto(pastaAtual, arg);
        const entradaAlvo = workspace.entradas.find((entrada) => entrada.caminho === alvo);
        const pasta = !arg || entradaAlvo?.tipo === "pasta" ? alvo : diretorioDe(alvo);
        const filhos = workspace.entradas
          .filter((entrada) => {
            const dir = entrada.tipo === "pasta" ? diretorioDe(entrada.caminho) : diretorioDe(entrada.caminho);
            return dir === pasta && entrada.caminho !== pasta;
          })
          .sort(ordenarEntradasNotebook);

        if (entradaAlvo?.tipo === "arquivo") {
          return [{ texto: nomeDe(entradaAlvo.caminho), tipo: "saida" }];
        }
        if (arg && !entradaAlvo && !workspace.entradas.some((entrada) => diretorioDe(entrada.caminho) === pasta)) {
          return [{ texto: `ls: caminho nao encontrado: ${arg}`, tipo: "erro" }];
        }
        if (filhos.length === 0) return [{ texto: "(vazio)", tipo: "saida" }];
        return filhos.map((entrada) => ({
          texto: `${entrada.tipo === "pasta" ? "DIR " : "ARQ "} ${nomeDe(entrada.caminho)}`,
          tipo: "saida",
        }));
      }

      if (cmd === "cd") {
        const destino = caminhoAbsoluto(pastaAtual, arg || "~");
        if (destino && !workspace.entradas.some((entrada) => entrada.tipo === "pasta" && entrada.caminho === destino)) {
          return [{ texto: `cd: pasta nao encontrada: ${arg}`, tipo: "erro" }];
        }
        await persistirWorkspace({ ...workspace, pastaAtual: destino });
        return [{ texto: `pasta atual: /${destino}`, tipo: "info" }];
      }

      if (cmd === "cat" || cmd === "type") {
        const caminho = caminhoAbsoluto(pastaAtual, arg);
        const arquivo = workspace.entradas.find(
          (entrada) => entrada.tipo === "arquivo" && entrada.caminho === caminho,
        );
        if (!arquivo) return [{ texto: `cat: arquivo nao encontrado: ${arg || "(nenhum)"}`, tipo: "erro" }];
        const conteudo = arquivo.conteudo || "";
        return conteudo
          ? conteudo.split("\n").map((texto) => ({ texto, tipo: "saida" }))
          : [{ texto: "(arquivo vazio)", tipo: "saida" }];
      }

      if (cmd === "mkdir") {
        const caminho = caminhoAbsoluto(pastaAtual, arg);
        if (!caminho) return [{ texto: "mkdir: informe o nome da pasta", tipo: "erro" }];
        if (workspace.entradas.some((entrada) => entrada.caminho === caminho)) {
          return [{ texto: `mkdir: ja existe: ${caminho}`, tipo: "erro" }];
        }
        const entradas = garantirPastas(workspace.entradas, caminho);
        const proximo: NotebookWorkspace = {
          versao: VERSAO_NOTEBOOK_WORKSPACE,
          entradas,
          arquivoAtivo: workspace.arquivoAtivo,
          pastaAtual: caminho,
        };
        await persistirWorkspace(proximo);
        return [{ texto: `pasta criada: /${caminho}`, tipo: "sucesso" }];
      }

      if (cmd === "touch") {
        const caminho = caminhoAbsoluto(pastaAtual, arg);
        if (!caminho) return [{ texto: "touch: informe o arquivo", tipo: "erro" }];
        if (workspace.entradas.some((entrada) => entrada.caminho === caminho)) {
          return [{ texto: `touch: ja existe: ${caminho}`, tipo: "erro" }];
        }
        const entradas = [...garantirPastas(workspace.entradas, caminho), { caminho, tipo: "arquivo" as const, conteudo: "" }];
        const proximo: NotebookWorkspace = {
          versao: VERSAO_NOTEBOOK_WORKSPACE,
          entradas,
          arquivoAtivo: caminho,
          pastaAtual: diretorioDe(caminho),
        };
        await persistirWorkspace(proximo);
        return [{ texto: `arquivo criado: /${caminho}`, tipo: "sucesso" }];
      }

      if (cmd === "rm" || cmd === "del") {
        const caminho = caminhoAbsoluto(pastaAtual, arg);
        if (!caminho) return [{ texto: "rm: informe o caminho", tipo: "erro" }];
        const existe = workspace.entradas.some((entrada) => entrada.caminho === caminho);
        if (!existe) return [{ texto: `rm: caminho nao encontrado: ${arg}`, tipo: "erro" }];
        let entradas = workspace.entradas.filter(
          (entrada) => entrada.caminho !== caminho && !entrada.caminho.startsWith(`${caminho}/`),
        );
        if (!entradas.some((entrada) => entrada.tipo === "arquivo")) {
          entradas = [
            { caminho: "projetos", tipo: "pasta" },
            { caminho: "projetos/README.md", tipo: "arquivo", conteudo: "# Projetos\n\nWorkspace vazio." },
          ];
        }
        const primeiroArquivo = entradas.find((entrada) => entrada.tipo === "arquivo");
        const proximo: NotebookWorkspace = {
          versao: VERSAO_NOTEBOOK_WORKSPACE,
          entradas,
          arquivoAtivo: primeiroArquivo?.caminho ?? "projetos/README.md",
          pastaAtual: diretorioDe(primeiroArquivo?.caminho ?? "projetos/README.md"),
        };
        await persistirWorkspace(proximo);
        return [{ texto: `removido: /${caminho}`, tipo: "sucesso" }];
      }

      if (cmd === "python" || cmd === "py") {
        const caminho = caminhoAbsoluto(pastaAtual, arg || workspace.arquivoAtivo);
        const arquivo = workspace.entradas.find(
          (entrada) => entrada.tipo === "arquivo" && entrada.caminho === caminho,
        );
        if (!arquivo) return [{ texto: `python: arquivo nao encontrado: ${arg || workspace.arquivoAtivo}`, tipo: "erro" }];
        return [
          { texto: `executando /${arquivo.caminho}`, tipo: "info" },
          ...simularPython(arquivo.conteudo ?? ""),
        ];
      }

      const m = comandoBruto.trim().match(/^ssh\s+(?:([\w.-]+)@)?([\w.-]+)\s*$/i);
      if (!m) return [{ texto: "Comando não reconhecido. Digite 'ajuda'.", tipo: "erro" }];
      const usuarioDigitado = m[1];
      const hostDigitado = m[2] ?? "";

      if (hostDigitado.toLowerCase() === "node-alpha") {
        setFase("node-alpha");
        return BANNER_NODE_ALPHA;
      }

      if (!status) return [{ texto: "Carregando status do servidor...", tipo: "erro" }];

      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostDigitado)) {
        if (status.bootandoMidia) {
          return [
            { texto: `ssh: ${hostDigitado} está no instalador live, não no sistema do disco.`, tipo: "erro" },
            { texto: "Desligue o servidor, ejete a mídia de boot e ligue pelo disco antes de usar SSH.", tipo: "info" },
          ];
        }
        if (!status.online) {
          return [
            {
              texto: status.ligando
                ? `ssh: ${hostDigitado} ainda está inicializando.`
                : `ssh: ${hostDigitado} está desligado.`,
              tipo: "erro",
            },
            { texto: "Ligue o servidor no Datacenter e aguarde o boot do sistema operacional.", tipo: "info" },
          ];
        }
        if (!status.patchCordConectado) {
          return [
            { texto: `ssh: sem enlace físico até ${hostDigitado}.`, tipo: "erro" },
            { texto: "Conecte o patch cord no Datacenter antes de acessar por rede.", tipo: "info" },
          ];
        }
        if (!status.configurada) {
          return [
            { texto: `ssh: não foi possível resolver ${hostDigitado} — sem rede configurada.`, tipo: "erro" },
            { texto: "Configure IP/máscara/gateway em Datacenter → Rede antes de tentar SSH.", tipo: "info" },
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
            { texto: "Compre e instale um SO em Mercado → Datacenter.", tipo: "info" },
          ];
        }
        if (!status.sshHabilitado) {
          return [
            { texto: `ssh: conexão recusada por ${hostDigitado} (porta 22) — sshd não está ativo.`, tipo: "erro" },
            { texto: "Acesse o console local em Datacenter → Sistema pra ligar o serviço.", tipo: "info" },
          ];
        }
        if (usuarioDigitado && usuarioDigitado !== status.sshUsuario) {
          return [
            { texto: `Permission denied, usuário '${usuarioDigitado}' não existe neste servidor.`, tipo: "erro" },
            { texto: `Usuário SSH configurado: ${status.sshUsuario}.`, tipo: "info" },
          ];
        }
        const so = getSistemaOperacional(status.sistemaOperacional);
        if (!so) return [{ texto: "Erro desconhecido de sistema.", tipo: "erro" }];

        setFase("servidor");
        setOsConectado(so);
        return [
          { texto: `Conectando como ${usuarioDigitado ?? status.sshUsuario}@${hostDigitado}...`, tipo: "info" },
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
    if (fase === "servidor" && status?.ip) return `${status.sshUsuario}@${status.ip}:~$`;
    return `visitante@deck:/${workspace.pastaAtual || ""}$`;
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
