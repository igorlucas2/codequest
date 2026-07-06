"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { FASES } from "@/content/trilha1";
import { FICHA_PADRAO, type Ficha } from "@/content/classes";
import { NIVEIS_INICIAIS, type NiveisComponentes } from "@/content/componentes";
import { calcularStats, type Stats } from "@/lib/stats";
import { limparEstadoDesktopPersistido } from "@/components/desktop/persistenciaDesktop";
import type { EnvioDesafio } from "@/lib/tiposTrilha";

export type Usuario = {
  id: number;
  nome: string;
  email: string;
  papel: "aluno" | "professor";
};

type ItemInv = { itemId: string; equipado: boolean };
type Progresso = { fasesConcluidas: number[]; xp: number };

type Contexto = {
  carregado: boolean;
  usuario: Usuario | null;
  moedas: number;
  ficha: Ficha;
  progresso: Progresso;
  inventario: ItemInv[];
  equipados: string[];
  componentes: NiveisComponentes;
  stats: Stats;
  nivel: number;
  totalConcluidas: number;
  totalFases: number;
  tourVisto: boolean;
  recarregar: () => Promise<void>;
  concluirFase: (ordem: number, envio: EnvioDesafio) => Promise<{ ok: boolean; erro?: string }>;
  faseConcluida: (ordem: number) => boolean;
  faseDesbloqueada: (ordem: number) => boolean;
  temItem: (itemId: string) => boolean;
  itemEquipado: (itemId: string) => boolean;
  comprar: (itemId: string) => Promise<{ ok: boolean; erro?: string }>;
  melhorarComponente: (componenteId: string) => Promise<{ ok: boolean; erro?: string }>;
  equipar: (itemId: string, equipar: boolean) => Promise<void>;
  salvarFicha: (ficha: Ficha) => Promise<void>;
  marcarTourVisto: () => Promise<void>;
  sair: () => Promise<void>;
};

const VAZIO: Progresso = { fasesConcluidas: [], xp: 0 };
const Ctx = createContext<Contexto | null>(null);

export function SessaoProvider({ children }: { children: React.ReactNode }) {
  const [carregado, setCarregado] = useState(false);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [moedas, setMoedas] = useState(0);
  const [ficha, setFicha] = useState<Ficha>(FICHA_PADRAO);
  const [progresso, setProgresso] = useState<Progresso>(VAZIO);
  const [inventario, setInventario] = useState<ItemInv[]>([]);
  const [equipados, setEquipados] = useState<string[]>([]);
  const [componentes, setComponentes] = useState<NiveisComponentes>(NIVEIS_INICIAIS);
  const [stats, setStats] = useState<Stats>(calcularStats(0, []));
  const [tourVisto, setTourVisto] = useState(true);

  const recarregar = useCallback(async () => {
    try {
      const res = await fetch("/api/eu", { cache: "no-store" });
      const d = await res.json();
      setUsuario(d.usuario ?? null);
      setMoedas(d.moedas ?? 0);
      setFicha(d.ficha ?? FICHA_PADRAO);
      setProgresso(d.progresso ?? VAZIO);
      setInventario(d.inventario ?? []);
      setEquipados(d.equipados ?? []);
      setComponentes(d.componentes ?? NIVEIS_INICIAIS);
      setStats(d.stats ?? calcularStats(0, []));
      setTourVisto(d.tourVisto ?? true);
    } catch {
      setUsuario(null);
    } finally {
      setCarregado(true);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => recarregar(), 0);
    return () => clearTimeout(id);
  }, [recarregar]);

  const concluirFase = useCallback(
    async (ordem: number, envio: EnvioDesafio) => {
      const res = await fetch("/api/progresso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fase_ordem: ordem, envio }),
      });
      const d = await res.json().catch(() => ({}));
      await recarregar();
      return { ok: res.ok, erro: d.erro as string | undefined };
    },
    [recarregar],
  );

  const comprar = useCallback(
    async (itemId: string) => {
      const res = await fetch("/api/loja/comprar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      const d = await res.json();
      await recarregar();
      return { ok: res.ok, erro: d.erro as string | undefined };
    },
    [recarregar],
  );

  const melhorarComponente = useCallback(
    async (componenteId: string) => {
      const res = await fetch("/api/computador/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ componenteId }),
      });
      const d = await res.json().catch(() => ({}));
      await recarregar();
      return { ok: res.ok, erro: d.erro as string | undefined };
    },
    [recarregar],
  );

  const equipar = useCallback(
    async (itemId: string, equipar: boolean) => {
      await fetch("/api/personagem/equipar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, equipar }),
      });
      await recarregar();
    },
    [recarregar],
  );

  const salvarFicha = useCallback(
    async (nova: Ficha) => {
      setFicha(nova); // preview imediato
      await fetch("/api/personagem/ficha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ficha: nova }),
      });
      await recarregar(); // atualiza stats (classe/raça mudam modificadores)
    },
    [recarregar],
  );

  const marcarTourVisto = useCallback(async () => {
    setTourVisto(true); // fecha o modal na hora, sem esperar o round-trip
    await fetch("/api/tour/visto", { method: "POST" });
  }, []);

  const sair = useCallback(async () => {
    await fetch("/api/sair", { method: "POST" });
    setUsuario(null);
    limparEstadoDesktopPersistido();
  }, []);

  const faseConcluida = useCallback(
    (ordem: number) => progresso.fasesConcluidas.includes(ordem),
    [progresso],
  );
  const faseDesbloqueada = useCallback(
    (ordem: number) =>
      ordem === 1 || progresso.fasesConcluidas.includes(ordem - 1),
    [progresso],
  );
  const temItem = useCallback(
    (itemId: string) => inventario.some((i) => i.itemId === itemId),
    [inventario],
  );
  const itemEquipado = useCallback(
    (itemId: string) => equipados.includes(itemId),
    [equipados],
  );

  const valor: Contexto = {
    carregado,
    usuario,
    moedas,
    ficha,
    progresso,
    inventario,
    equipados,
    componentes,
    stats,
    nivel: stats.nivel,
    totalConcluidas: progresso.fasesConcluidas.length,
    totalFases: FASES.length,
    tourVisto,
    recarregar,
    concluirFase,
    faseConcluida,
    faseDesbloqueada,
    temItem,
    itemEquipado,
    comprar,
    melhorarComponente,
    equipar,
    salvarFicha,
    marcarTourVisto,
    sair,
  };

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useSessao() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSessao precisa estar dentro de <SessaoProvider>");
  return ctx;
}
