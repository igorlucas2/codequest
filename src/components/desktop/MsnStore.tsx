"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Ficha } from "@/content/classes";

// Fonte única do resumo do MSN (contatos, presença, convites). Antes cada
// consumidor — MsnNotifier, o programa Msn e o MsnChat — tinha o próprio
// setInterval batendo em /api/msn, então com o Messenger + uma conversa aberta
// eram ~3 requisições a cada 2s ao MESMO endpoint (cada uma roda um UPDATE de
// presença + ~5 SELECTs). Aqui um provider faz UM poll e todos leem dele.

export type ContatoMsn = {
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

export type ConviteMsn = {
  id: number;
  nome: string;
  ficha: Ficha;
  criadoEm?: string | null;
};

export type ResumoMsn = {
  meuId: number | null;
  contatos: ContatoMsn[];
  pendentesRecebidos: ConviteMsn[];
  pendentesEnviados: ConviteMsn[];
};

type MsnStore = {
  resumo: ResumoMsn;
  carregando: boolean;
  recarregar: () => Promise<void>;
};

const RESUMO_VAZIO: ResumoMsn = {
  meuId: null,
  contatos: [],
  pendentesRecebidos: [],
  pendentesEnviados: [],
};

// Cadência do poll compartilhado. Antes: Notifier 4200ms + Msn 4000ms +
// MsnChat 2300ms, todos independentes. Agora um só.
const INTERVALO_MS = 4000;

const Ctx = createContext<MsnStore | null>(null);

export function MsnStoreProvider({ children }: { children: ReactNode }) {
  const [resumo, setResumo] = useState<ResumoMsn>(RESUMO_VAZIO);
  const [carregando, setCarregando] = useState(true);
  const ativoRef = useRef(true);
  const requisicaoAtualRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const recarregar = useCallback(async () => {
    const requisicaoAtual = requisicaoAtualRef.current + 1;
    requisicaoAtualRef.current = requisicaoAtual;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch("/api/msn", { cache: "no-store", signal: controller.signal });
      if (!res.ok) return;
      const dados = await res.json().catch(() => ({}));
      if (!ativoRef.current || requisicaoAtualRef.current !== requisicaoAtual) return;
      setResumo({
        meuId: typeof dados.meuId === "number" ? dados.meuId : null,
        contatos: Array.isArray(dados.contatos) ? dados.contatos : [],
        pendentesRecebidos: Array.isArray(dados.pendentesRecebidos) ? dados.pendentesRecebidos : [],
        pendentesEnviados: Array.isArray(dados.pendentesEnviados) ? dados.pendentesEnviados : [],
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      // Falha transitória de rede: mantém o último resumo, sem toast repetido.
    } finally {
      if (ativoRef.current && requisicaoAtualRef.current === requisicaoAtual) {
        setCarregando(false);
      }
    }
  }, []);

  useEffect(() => {
    ativoRef.current = true;
    requisicaoAtualRef.current = 0;
    abortControllerRef.current?.abort();
    // Adia a 1ª carga pra fora do corpo síncrono do efeito (mesmo padrão de
    // Sessao.tsx) — o interval já é diferido por natureza.
    const inicial = window.setTimeout(() => void recarregar(), 0);
    const id = window.setInterval(() => void recarregar(), INTERVALO_MS);
    return () => {
      ativoRef.current = false;
      abortControllerRef.current?.abort();
      window.clearTimeout(inicial);
      window.clearInterval(id);
    };
  }, [recarregar]);

  return <Ctx.Provider value={{ resumo, carregando, recarregar }}>{children}</Ctx.Provider>;
}

export function useMsnStore(): MsnStore {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMsnStore precisa estar dentro de <MsnStoreProvider>");
  return ctx;
}
