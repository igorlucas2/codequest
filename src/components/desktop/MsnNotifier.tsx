"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ContatoResumo = {
  id: number;
  nome: string;
  online: boolean;
  naoLidas: number;
  ultimaMensagem: {
    id: number;
    texto: string;
    minha: boolean;
    criadaEm: string | null;
  } | null;
};

type Popup = {
  id: number;
  tipo: "mensagem" | "online";
  contatoId: number;
  nome: string;
  texto: string;
};

export default function MsnNotifier({ onAbrirContato }: { onAbrirContato: (contatoId: number) => void }) {
  const [popups, setPopups] = useState<Popup[]>([]);
  const inicializado = useRef(false);
  const ultimoOnline = useRef<Map<number, boolean>>(new Map());
  const ultimaMensagem = useRef<Map<number, number>>(new Map());
  const proximoId = useRef(1);

  const remover = useCallback((id: number) => {
    setPopups((atuais) => atuais.filter((p) => p.id !== id));
  }, []);

  const adicionarPopup = useCallback(
    (popup: Omit<Popup, "id">) => {
      const id = proximoId.current++;
      setPopups((atuais) => [...atuais.slice(-2), { ...popup, id }]);
      tocarSom(popup.tipo);
      window.setTimeout(() => remover(id), 6500);
    },
    [remover],
  );

  useEffect(() => {
    let ativo = true;

    async function tick() {
      const res = await fetch("/api/msn", { cache: "no-store" });
      if (!res.ok) return;
      const dados = await res.json().catch(() => ({}));
      const contatos: ContatoResumo[] = Array.isArray(dados.contatos) ? dados.contatos : [];

      if (!inicializado.current) {
        for (const contato of contatos) {
          ultimoOnline.current.set(contato.id, contato.online);
          if (contato.ultimaMensagem) ultimaMensagem.current.set(contato.id, contato.ultimaMensagem.id);
        }
        inicializado.current = true;
        return;
      }

      if (!ativo) return;
      for (const contato of contatos) {
        const estavaOnline = ultimoOnline.current.get(contato.id) ?? false;
        const idAnterior = ultimaMensagem.current.get(contato.id) ?? 0;
        const ultima = contato.ultimaMensagem;

        if (!estavaOnline && contato.online) {
          adicionarPopup({
            tipo: "online",
            contatoId: contato.id,
            nome: contato.nome,
            texto: "acabou de entrar",
          });
        }

        if (ultima && !ultima.minha && contato.naoLidas > 0 && ultima.id > idAnterior) {
          adicionarPopup({
            tipo: "mensagem",
            contatoId: contato.id,
            nome: contato.nome,
            texto: ultima.texto,
          });
        }

        ultimoOnline.current.set(contato.id, contato.online);
        if (ultima) ultimaMensagem.current.set(contato.id, ultima.id);
      }
    }

    void tick();
    const id = window.setInterval(() => void tick(), 4200);
    return () => {
      ativo = false;
      window.clearInterval(id);
    };
  }, [adicionarPopup]);

  if (popups.length === 0) return null;

  return (
    <div className="msn-popups">
      {popups.map((popup) => (
        <button
          key={popup.id}
          className="msn-popup"
          onClick={() => {
            onAbrirContato(popup.contatoId);
            remover(popup.id);
          }}
        >
          <span className="msn-popup-icon">{popup.tipo === "mensagem" ? "MSN" : "ON"}</span>
          <span className="min-w-0 flex-1">
            <strong>{popup.nome}</strong>
            <small>{popup.texto}</small>
          </span>
          <span
            className="msn-popup-close"
            onClick={(e) => {
              e.stopPropagation();
              remover(popup.id);
            }}
          >
            x
          </span>
        </button>
      ))}
    </div>
  );
}

function tocarSom(tipo: Popup["tipo"]) {
  const AudioCtx =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;

  const ctx = new AudioCtx();
  const notas = tipo === "mensagem" ? [880, 1175, 1480] : [660, 880];
  const inicio = ctx.currentTime + 0.01;

  notas.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.001, inicio + i * 0.09);
    gain.gain.exponentialRampToValueAtTime(0.06, inicio + i * 0.09 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, inicio + i * 0.09 + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(inicio + i * 0.09);
    osc.stop(inicio + i * 0.09 + 0.09);
  });

  window.setTimeout(() => void ctx.close().catch(() => undefined), 600);
}
