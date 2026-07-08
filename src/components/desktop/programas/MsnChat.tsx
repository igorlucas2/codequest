"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import CyberAvatar from "@/components/CyberAvatar";
import Spinner from "@/components/Spinner";
import { useToast } from "@/components/Toast";
import type { Ficha } from "@/content/classes";

type Contato = {
  id: number;
  nome: string;
  ficha: Ficha;
  online: boolean;
};

type Mensagem = {
  id: number;
  texto: string;
  minha: boolean;
  criadaEm: string;
};

const LIMITE_TEXTO = 600;

export default function MsnChat({ contatoId }: { contatoId: number | null }) {
  const toast = useToast();
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);

  const contato = useMemo(
    () => contatos.find((item) => item.id === contatoId) ?? null,
    [contatos, contatoId],
  );

  const carregarContatos = useCallback(async () => {
    const res = await fetch("/api/msn", { cache: "no-store" });
    const dados = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(dados.erro ?? "Falha ao carregar contatos.");
    return Array.isArray(dados.contatos) ? (dados.contatos as Contato[]) : [];
  }, []);

  const carregarMensagens = useCallback(async (id: number) => {
    const res = await fetch(`/api/msn/mensagens?com=${id}`, { cache: "no-store" });
    const dados = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(dados.erro ?? "Falha ao abrir conversa.");
    return Array.isArray(dados.mensagens) ? (dados.mensagens as Mensagem[]) : [];
  }, []);

  useEffect(() => {
    if (!contatoId) return;
    const idContato: number = contatoId;
    let ativo = true;
    let primeiraCarga = true;

    async function tick() {
      try {
        if (primeiraCarga) setCarregando(true);
        const [listaContatos, listaMensagens] = await Promise.all([
          carregarContatos(),
          carregarMensagens(idContato),
        ]);
        if (!ativo) return;
        setContatos(listaContatos);
        setMensagens(listaMensagens);
      } catch (e) {
        if (ativo) toast.mostrar(e instanceof Error ? e.message : "Falha ao abrir conversa.", "erro");
      } finally {
        if (ativo) setCarregando(false);
        primeiraCarga = false;
      }
    }

    void tick();
    const id = window.setInterval(() => void tick(), 2300);
    return () => {
      ativo = false;
      window.clearInterval(id);
    };
  }, [contatoId, carregarContatos, carregarMensagens, toast]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: "end" });
  }, [mensagens.length, contatoId]);

  async function enviarMensagem(event: FormEvent) {
    event.preventDefault();
    if (!contatoId || enviando) return;
    const conteudo = texto.trim();
    if (!conteudo) return;

    setEnviando(true);
    try {
      const res = await fetch("/api/msn/mensagens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destinatarioId: contatoId, texto: conteudo }),
      });
      const dados = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(dados.erro ?? "Nao foi possivel enviar.");
      if (dados.mensagem) {
        setMensagens((atuais) =>
          atuais.some((m) => m.id === dados.mensagem.id) ? atuais : [...atuais, dados.mensagem],
        );
      }
      setTexto("");
    } catch (e) {
      toast.mostrar(e instanceof Error ? e.message : "Nao foi possivel enviar.", "erro");
    } finally {
      setEnviando(false);
    }
  }

  if (!contatoId) {
    return <div className="msn-empty-chat">Abra uma conversa pela lista do MSN.</div>;
  }

  return (
    <div className="msn-classic msn-chat msn-chat--window">
      <div className="msn-menu-bar">
        <button>File</button>
        <button>Edit</button>
        <button>Actions</button>
        <button>Tools</button>
        <button>Help</button>
      </div>
      <div className="msn-chat-toolbar">
        <ToolbarButton icon="invite" label="Invite" />
        <ToolbarButton icon="files" label="Send Files" />
        <ToolbarButton icon="video" label="Video" />
        <ToolbarButton icon="voice" label="Voice" />
        <ToolbarButton icon="activities" label="Activities" />
        <ToolbarButton icon="games" label="Games" />
        <span className="msn-chat-toolbar-logo">
          msn<span className="msn-butterfly msn-butterfly--tiny" />
        </span>
      </div>

      <header className="msn-chat-header">
        {contato ? (
          <>
            <CyberAvatar
              classe={contato.ficha.classe}
              corPele={contato.ficha.corPele}
              corPrincipal={contato.ficha.corPrincipal}
              avatarModo={contato.ficha.avatarModo}
              fotoUrl={contato.ficha.fotoUrl}
              tamanho={46}
              className="rounded"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{contato.nome}</p>
              <p className={contato.online ? "text-green-700" : "text-slate-500"}>
                {contato.online ? "online" : "offline"}
              </p>
            </div>
          </>
        ) : (
          <div className="min-w-0 flex-1">
            <p className="font-bold">Conversa MSN</p>
            <p className="text-slate-500">carregando contato</p>
          </div>
        )}
        {carregando && <Spinner tamanho={13} />}
      </header>

      <div className="msn-chat-body">
        <main className="msn-chat-main">
          <div className="msn-to-line">To: {contato?.nome ?? ""}</div>
          <div className="msn-messages">
            {mensagens.length === 0 ? (
              <div className="msn-empty-chat">Nenhuma mensagem ainda.</div>
            ) : (
              mensagens.map((m) => (
                <article key={m.id} className={`msn-message ${m.minha ? "msn-message--mine" : ""}`}>
                  <div>
                    <p>{m.texto}</p>
                    <span>{formatarHora(m.criadaEm)}</span>
                  </div>
                </article>
              ))
            )}
            <div ref={fimRef} />
          </div>

          <div className="msn-actions">
            <button type="button">A</button>
            <button type="button">🙂</button>
            <button type="button">Voice Clip</button>
            <button type="button">🎁</button>
            <button type="button">🖼</button>
            <button type="button" onClick={() => toast.mostrar("Wizz enviado.", "info")}>Wizz</button>
          </div>

          <form className="msn-compose" onSubmit={enviarMensagem}>
            <input
              value={texto}
              maxLength={LIMITE_TEXTO}
              onChange={(e) => setTexto(e.target.value.slice(0, LIMITE_TEXTO))}
              placeholder="Digite sua mensagem..."
            />
            <div className="msn-send-stack">
              <button disabled={!texto.trim() || enviando}>{enviando ? "..." : "Send"}</button>
              <button type="button" disabled>Search</button>
            </div>
          </form>
        </main>

        <aside className="msn-chat-side">
          <div className="msn-side-card">
            {contato ? (
              <CyberAvatar
                classe={contato.ficha.classe}
                corPele={contato.ficha.corPele}
                corPrincipal={contato.ficha.corPrincipal}
                avatarModo={contato.ficha.avatarModo}
                fotoUrl={contato.ficha.fotoUrl}
                tamanho={86}
                className="rounded"
              />
            ) : (
              <span className="msn-program-icon msn-program-icon--profile" />
            )}
            <button type="button">▾</button>
          </div>
          <div className="msn-side-card">
            <span className="msn-duck-icon" />
            <button type="button">▾</button>
          </div>
        </aside>
      </div>
      <div className="msn-chat-footer">Click for new Emoticons and Theme Packs from Blue Mountain</div>
    </div>
  );
}

function ToolbarButton({ icon, label }: { icon: string; label: string }) {
  return (
    <button className="msn-toolbar-button" type="button">
      <span className={`msn-toolbar-icon msn-toolbar-icon--${icon}`} />
      <span>{label}</span>
    </button>
  );
}

function formatarHora(valor: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(valor));
}
