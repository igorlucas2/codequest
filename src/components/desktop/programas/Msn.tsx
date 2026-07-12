"use client";

import { type FormEvent, useMemo, useState } from "react";
import CyberAvatar from "@/components/CyberAvatar";
import Spinner from "@/components/Spinner";
import { useSessao } from "@/components/Sessao";
import { useToast } from "@/components/Toast";
import { useMsnStore } from "@/components/desktop/MsnStore";
import type { Ficha } from "@/content/classes";

type Contato = {
  id: number;
  nome: string;
  ficha: Ficha;
  xp: number;
  online: boolean;
  naoLidas: number;
  ultimaMensagem: {
    id: number;
    texto: string;
    minha: boolean;
    criadaEm: string | null;
  } | null;
};

type ResultadoBusca = {
  id: number;
  nome: string;
  ficha: Ficha;
  contatoStatus: "pendente" | "aceito" | null;
  solicitadoPorVoce: boolean;
};

export default function Msn({ onAbrirConversa }: { onAbrirConversa: (contatoId: number) => void }) {
  const toast = useToast();
  const { usuario } = useSessao();
  const { resumo, carregando, recarregar } = useMsnStore();
  const [conectado, setConectado] = useState(false);
  const [selecionadoManual, setSelecionadoManual] = useState<number | null>(null);
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<ResultadoBusca[]>([]);
  const [buscando, setBuscando] = useState(false);

  // Seleção derivada no render (sem efeito): respeita a escolha manual se o
  // contato ainda existe; senão cai no primeiro com não-lida, ou no primeiro
  // da lista.
  const selecionado = useMemo(() => {
    if (selecionadoManual && resumo.contatos.some((c) => c.id === selecionadoManual)) {
      return selecionadoManual;
    }
    return resumo.contatos.find((c) => c.naoLidas > 0)?.id ?? resumo.contatos[0]?.id ?? null;
  }, [selecionadoManual, resumo.contatos]);

  const online = useMemo(() => resumo.contatos.filter((c) => c.online), [resumo.contatos]);
  const offline = useMemo(() => resumo.contatos.filter((c) => !c.online), [resumo.contatos]);

  async function buscarAmigo(event: FormEvent) {
    event.preventDefault();
    const termo = busca.trim();
    if (termo.length < 2) {
      setResultados([]);
      return;
    }

    setBuscando(true);
    try {
      const res = await fetch(`/api/msn/buscar?q=${encodeURIComponent(termo)}`, { cache: "no-store" });
      const dados = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(dados.erro ?? "Falha ao buscar contato.");
      setResultados(Array.isArray(dados.resultados) ? dados.resultados : []);
    } catch (e) {
      toast.mostrar(e instanceof Error ? e.message : "Falha ao buscar contato.", "erro");
    } finally {
      setBuscando(false);
    }
  }

  async function adicionarContato(usuarioId: number) {
    try {
      const res = await fetch("/api/msn/contatos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuarioId }),
      });
      const dados = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(dados.erro ?? "Nao foi possivel adicionar.");
      toast.mostrar(dados.status === "aceito" ? "Contato aceito." : "Convite enviado.", "sucesso");
      await recarregar();
      setResultados((atuais) =>
        atuais.map((r) =>
          r.id === usuarioId
            ? { ...r, contatoStatus: dados.status === "aceito" ? "aceito" : "pendente", solicitadoPorVoce: true }
            : r,
        ),
      );
    } catch (e) {
      toast.mostrar(e instanceof Error ? e.message : "Nao foi possivel adicionar.", "erro");
    }
  }

  async function responderConvite(usuarioId: number, acao: "aceitar" | "recusar") {
    try {
      const res = await fetch("/api/msn/contatos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuarioId, acao }),
      });
      const dados = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(dados.erro ?? "Nao foi possivel responder.");
      toast.mostrar(acao === "aceitar" ? "Contato adicionado." : "Convite recusado.", "sucesso");
      await recarregar();
    } catch (e) {
      toast.mostrar(e instanceof Error ? e.message : "Nao foi possivel responder.", "erro");
    }
  }

  if (!conectado) {
    return (
      <div className="msn-classic msn-login">
        <MsnMenu />
        <div className="msn-login-panel">
          <div className="msn-brand-row">
            <span className="msn-orb-button">⌄</span>
            <span className="msn-wordmark">msn</span>
            <span className="msn-butterfly" />
            <span className="msn-messenger-word">Messenger</span>
          </div>
          <div className="msn-login-center">
            <div className="msn-login-avatar">
              <span className="msn-program-icon msn-program-icon--login" />
            </div>
            <label>
              E-mail address:
              <div className="msn-combo">
                <input value={usuario?.email ?? "runner@codequest.local"} readOnly />
                <button type="button">▾</button>
              </div>
            </label>
            <label>
              Password:
              <input type="password" value="codequest" readOnly />
            </label>
            <div className="msn-login-status">
              <span>Status:</span>
              <button type="button">Online ▾</button>
            </div>
            <button className="msn-signin-button" onClick={() => setConectado(true)}>
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="msn-classic msn-app msn-app--main">
      <MsnMenu />
      <div className="msn-list-header">
        <div className="msn-profile-tile">
          <span className="msn-program-icon msn-program-icon--profile" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate">{usuario?.nome ?? "Runner"} <span>(Conectado)</span></p>
          <small>Escreva uma mensagem pessoal...</small>
        </div>
        {carregando && <Spinner tamanho={13} />}
      </div>
      <form className="msn-add" onSubmit={buscarAmigo}>
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar contato por nome ou email"
        />
        <button disabled={buscando}>{buscando ? "..." : "+"}</button>
      </form>

      <div className="msn-contact-layout">
        <aside className="msn-left-rail">
          <span className="msn-rail-icon msn-rail-icon--people" />
          <span className="msn-rail-icon msn-rail-icon--mail" />
          <span className="msn-rail-icon msn-rail-icon--mobile" />
          <span className="msn-rail-icon msn-rail-icon--star" />
          <span className="msn-rail-icon msn-rail-icon--paint" />
        </aside>

        <div className="msn-main-scroll">
        {resultados.length > 0 && (
          <div className="msn-panel">
            <p className="msn-panel-title">Adicionar contato</p>
            {resultados.map((r) => (
              <div key={r.id} className="msn-search-row">
                <Avatar ficha={r.ficha} tamanho={28} />
                <span className="min-w-0 flex-1 truncate">{r.nome}</span>
                {r.contatoStatus === "aceito" ? (
                  <span className="msn-status-label">amigo</span>
                ) : r.contatoStatus === "pendente" ? (
                  <span className="msn-status-label">{r.solicitadoPorVoce ? "pendente" : "convite"}</span>
                ) : (
                  <button onClick={() => void adicionarContato(r.id)}>Adicionar</button>
                )}
              </div>
            ))}
          </div>
        )}

        {resumo.pendentesRecebidos.length > 0 && (
          <div className="msn-panel">
            <p className="msn-panel-title">Convites pendentes</p>
            {resumo.pendentesRecebidos.map((p) => (
              <div key={p.id} className="msn-invite">
                <Avatar ficha={p.ficha} tamanho={28} />
                <span className="min-w-0 flex-1 truncate">{p.nome}</span>
                <button onClick={() => void responderConvite(p.id, "aceitar")}>Aceitar</button>
                <button onClick={() => void responderConvite(p.id, "recusar")}>X</button>
              </div>
            ))}
          </div>
        )}

        <ListaContatos
          titulo={`Online (${online.length})`}
          vazia="Nenhum amigo online."
          contatos={online}
          selecionado={selecionado}
          onSelecionar={setSelecionadoManual}
          onAbrir={onAbrirConversa}
        />
        <ListaContatos
          titulo={`Offline (${offline.length})`}
          vazia="Sem contatos offline."
          contatos={offline}
          selecionado={selecionado}
          onSelecionar={setSelecionadoManual}
          onAbrir={onAbrirConversa}
        />
        </div>
      </div>

      <div className="msn-footer">
        {resumo.pendentesEnviados.length > 0
          ? `${resumo.pendentesEnviados.length} convite(s) aguardando aceite`
          : "Clique duas vezes em um contato para conversar"}
      </div>
    </div>
  );
}

function MsnMenu() {
  return (
    <div className="msn-menu-bar">
      <button>File</button>
      <button>Contacts</button>
      <button>Actions</button>
      <button>Tools</button>
      <button>Help</button>
    </div>
  );
}

function ListaContatos({
  titulo,
  vazia,
  contatos,
  selecionado,
  onSelecionar,
  onAbrir,
}: {
  titulo: string;
  vazia: string;
  contatos: Contato[];
  selecionado: number | null;
  onSelecionar: (id: number) => void;
  onAbrir: (id: number) => void;
}) {
  return (
    <div className="msn-list-group">
      <p className="msn-group-title">{titulo}</p>
      {contatos.length === 0 ? (
        <p className="msn-empty">{vazia}</p>
      ) : (
        contatos.map((contato) => (
          <button
            key={contato.id}
            className={`msn-contact ${contato.id === selecionado ? "msn-contact--active" : ""}`}
            onClick={() => onSelecionar(contato.id)}
            onDoubleClick={() => onAbrir(contato.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onAbrir(contato.id);
            }}
          >
            <Avatar ficha={contato.ficha} tamanho={30} />
            <span className={`msn-presence ${contato.online ? "msn-presence--online" : ""}`} />
            <span className="min-w-0 flex-1">
              <span className="block truncate">{contato.nome}</span>
              {contato.ultimaMensagem && (
                <small className="block truncate">
                  {contato.ultimaMensagem.minha ? "Voce: " : ""}
                  {contato.ultimaMensagem.texto}
                </small>
              )}
            </span>
            {contato.naoLidas > 0 && <span className="msn-unread">{contato.naoLidas}</span>}
          </button>
        ))
      )}
    </div>
  );
}

function Avatar({ ficha, tamanho }: { ficha: Ficha; tamanho: number }) {
  return (
    <CyberAvatar
      classe={ficha.classe}
      corPele={ficha.corPele}
      corPrincipal={ficha.corPrincipal}
      avatarModo={ficha.avatarModo}
      fotoUrl={ficha.fotoUrl}
      tamanho={tamanho}
      className="rounded"
    />
  );
}
