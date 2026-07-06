"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import CyberAvatar from "@/components/CyberAvatar";
import NavRpg from "@/components/NavRpg";
import Spinner from "@/components/Spinner";
import { useSessao } from "@/components/Sessao";
import {
  CLASSES,
  RACAS,
  OPCOES_PELE,
  OPCOES_COR,
  getClasse,
  getRaca,
  type Ficha,
} from "@/content/classes";
import type { Atributos } from "@/content/itens";
import { ITENS, SLOTS, CORES_RARIDADE, SIMBOLO_RARIDADE, type Item } from "@/content/itens";

export default function PaginaPersonagem() {
  const router = useRouter();
  const {
    carregado,
    usuario,
    ficha,
    stats,
    inventario,
    itemEquipado,
    equipar,
    salvarFicha,
  } = useSessao();
  const [equipando, setEquipando] = useState<string | null>(null);

  useEffect(() => {
    if (carregado && !usuario) router.replace("/entrar");
  }, [carregado, usuario, router]);

  if (!carregado || !usuario) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-16 text-center text-texto-suave">
        Carregando...
      </main>
    );
  }

  const set = (campo: keyof Ficha, valor: string) =>
    salvarFicha({ ...ficha, [campo]: valor });

  const classe = getClasse(ficha.classe)!;
  const raca = getRaca(ficha.raca)!;

  const itensPossuidos: Item[] = ITENS.filter((i) =>
    inventario.some((inv) => inv.itemId === i.id),
  );

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <NavRpg />

      <header className="mt-6">
        <h1 className="titulo text-3xl font-black text-ouro">Seu Runner</h1>
        <p className="text-texto-suave">
          Escolha sua especialização, sua linguagem de origem e monte seu
          runner pra codar e pra Rede.
        </p>
      </header>

      <div className="mt-8 grid gap-6 md:grid-cols-[300px_1fr]">
        {/* Ficha do personagem */}
        <div className="cartao cartao-ouro flex flex-col items-center gap-3 rounded-2xl p-6">
          <div className="rounded-xl bg-fundo/60 p-2">
            <CyberAvatar
              classe={ficha.classe}
              corPele={ficha.corPele}
              corPrincipal={ficha.corPrincipal}
              tamanho={168}
            />
          </div>
          <p className="titulo text-xl font-bold">{usuario.nome}</p>
          <p className="text-center text-sm text-ouro">
            {classe.nome} {raca.nome}
          </p>
          <p className="-mt-2 text-center text-xs italic text-texto-suave">
            &quot;{classe.lema}&quot;
          </p>

          <div className="grid w-full grid-cols-3 gap-2 text-center text-sm">
            <Stat rotulo="Poder" valor={stats.poder} cor="text-arcano" />
            <Stat rotulo="Nível" valor={stats.nivel} cor="text-ouro" />
            <Stat rotulo="🧬 Integridade" valor={stats.vida} cor="text-sucesso" />
            <Stat rotulo="💉 Exploit" valor={stats.ataque} cor="text-sangue" />
            <Stat rotulo="🧱 Firewall" valor={stats.defesa} cor="text-esmeralda" />
            <Stat rotulo="⚡ Velocidade" valor={stats.velocidade} cor="text-destaque" />
          </div>

          {/* Equipamento */}
          <div className="grid w-full grid-cols-3 gap-2">
            {SLOTS.map((slot) => {
              const eq = itensPossuidos.find(
                (i) => i.tipo === slot.tipo && itemEquipado(i.id),
              );
              return (
                <div
                  key={slot.tipo}
                  className="flex flex-col items-center rounded-xl border border-borda bg-fundo p-2 text-center"
                  title={slot.nome}
                >
                  <span className="text-2xl">{eq ? eq.icone : slot.icone}</span>
                  <span className="mt-1 text-[10px] text-texto-suave">
                    {eq ? eq.nome : slot.nome}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Escolhas */}
        <div className="space-y-6">
          {/* Especialização */}
          <section className="cartao rounded-2xl p-5">
            <h2 className="titulo font-bold text-ouro">Especialização</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {CLASSES.map((c) => {
                const ativo = c.id === ficha.classe;
                return (
                  <button
                    key={c.id}
                    onClick={() => set("classe", c.id)}
                    className={`flex items-center gap-3 rounded-xl border p-2 text-left transition ${
                      ativo
                        ? "border-ouro bg-ouro/10"
                        : "border-borda hover:border-arcano/60"
                    }`}
                  >
                    <div className="shrink-0 rounded-lg bg-fundo/60 p-1">
                      <CyberAvatar
                        classe={c.id}
                        corPele={ficha.corPele}
                        corPrincipal={ficha.corPrincipal}
                        tamanho={44}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold">{c.nome}</p>
                      <p className="truncate text-[11px] text-texto-suave">
                        {descreverMod(c.mod)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-texto-suave">{classe.descricao}</p>
          </section>

          {/* Origem */}
          <section className="cartao rounded-2xl p-5">
            <h2 className="titulo font-bold text-ouro">Linguagem</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {RACAS.map((r) => {
                const ativo = r.id === ficha.raca;
                return (
                  <button
                    key={r.id}
                    onClick={() => set("raca", r.id)}
                    className={`rounded-xl border px-3 py-2 text-left transition ${
                      ativo
                        ? "border-ouro bg-ouro/10"
                        : "border-borda hover:border-arcano/60"
                    }`}
                    title={r.descricao}
                  >
                    <p className="text-sm font-semibold">{r.nome}</p>
                    <p className="text-[11px] text-texto-suave">{descreverMod(r.mod)}</p>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-texto-suave">{raca.descricao}</p>
          </section>

          {/* Cores */}
          <section className="cartao rounded-2xl p-5">
            <h2 className="titulo font-bold text-ouro">Aparência</h2>
            <div className="mt-3 space-y-4">
              <Cores rotulo="Núcleo (LED)" valores={OPCOES_PELE} atual={ficha.corPele} onPick={(v) => set("corPele", v)} />
              <Cores rotulo="Chassi" valores={OPCOES_COR} atual={ficha.corPrincipal} onPick={(v) => set("corPrincipal", v)} />
            </div>
          </section>
        </div>
      </div>

      {/* Inventário */}
      <section className="mt-8">
        <h2 className="titulo text-xl font-bold text-ouro">Inventário</h2>
        {itensPossuidos.length === 0 ? (
          <p className="cartao mt-3 rounded-2xl p-6 text-center text-texto-suave">
            Você ainda não tem software instalado. Ganhe créditos nos contratos e visite o{" "}
            <span className="text-ouro">Mercado Negro</span>.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {itensPossuidos.map((item) => {
              const eq = itemEquipado(item.id);
              return (
                <div key={item.id} className="cartao flex items-center gap-3 rounded-xl p-3">
                  <span className="text-2xl">{item.icone}</span>
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate font-semibold"
                      style={{ color: CORES_RARIDADE[item.raridade] }}
                      title={`Raridade: ${item.raridade}`}
                    >
                      <span aria-hidden="true">{SIMBOLO_RARIDADE[item.raridade]}</span> {item.nome}
                    </p>
                    <p className="text-xs text-texto-suave">{descreverAtributos(item)}</p>
                  </div>
                  <button
                    disabled={equipando !== null}
                    onClick={async () => {
                      setEquipando(item.id);
                      try {
                        await equipar(item.id, !eq);
                      } finally {
                        setEquipando(null);
                      }
                    }}
                    className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
                      eq
                        ? "bg-esmeralda/20 text-esmeralda hover:bg-sangue/20 hover:text-sangue"
                        : "bg-arcano text-white hover:bg-arcano-forte"
                    }`}
                  >
                    {equipando === item.id && <Spinner tamanho={12} />}
                    {eq ? "Instalado" : "Instalar"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function Stat({ rotulo, valor, cor }: { rotulo: string; valor: number; cor: string }) {
  return (
    <div className="rounded-lg border border-borda bg-fundo p-2">
      <p className={`text-lg font-bold ${cor}`}>{valor}</p>
      <p className="text-[11px] text-texto-suave">{rotulo}</p>
    </div>
  );
}

function Cores({
  rotulo,
  valores,
  atual,
  onPick,
}: {
  rotulo: string;
  valores: readonly string[];
  atual: string;
  onPick: (v: string) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs text-texto-suave">{rotulo}</p>
      <div className="flex flex-wrap gap-2">
        {valores.map((v) => (
          <button
            key={v}
            onClick={() => onPick(v)}
            aria-label={rotulo}
            className={`h-8 w-8 rounded-full border-2 transition ${
              atual === v ? "border-ouro" : "border-transparent hover:border-arcano/60"
            }`}
            style={{ backgroundColor: `#${v}` }}
          />
        ))}
      </div>
    </div>
  );
}

function descreverMod(mod: Atributos) {
  const p: string[] = [];
  if (mod.ataque) p.push(`${sinal(mod.ataque)} 💉`);
  if (mod.defesa) p.push(`${sinal(mod.defesa)} 🧱`);
  if (mod.vida) p.push(`${sinal(mod.vida)} 🧬`);
  if (mod.velocidade) p.push(`${sinal(mod.velocidade)} ⚡`);
  return p.join("  ") || "equilibrado";
}
function sinal(n: number) {
  return n > 0 ? `+${n}` : `${n}`;
}

function descreverAtributos(item: Item) {
  const p: string[] = [];
  if (item.atributos.ataque) p.push(`+${item.atributos.ataque} 💉`);
  if (item.atributos.defesa) p.push(`+${item.atributos.defesa} 🧱`);
  if (item.atributos.vida) p.push(`+${item.atributos.vida} 🧬`);
  if (item.atributos.velocidade) p.push(`+${item.atributos.velocidade} ⚡`);
  return p.join("  ");
}
