"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import NavRpg from "@/components/NavRpg";
import Button from "@/components/ui/Button";
import { useSessao } from "@/components/Sessao";
import { useToast } from "@/components/Toast";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { ITENS, SLOTS, CORES_RARIDADE, SIMBOLO_RARIDADE, MARCOS_VITORIA_PVP, getItem, type Atributos, type Item } from "@/content/itens";

const ICONES_ATRIBUTO: Record<keyof Atributos, string> = {
  ataque: "💉",
  defesa: "🧱",
  vida: "🧬",
  velocidade: "⚡",
};

export default function Loja() {
  const router = useRouter();
  const { carregado, usuario, moedas, temItem, itemEquipado, comprar, equipar } = useSessao();
  const { mostrar } = useToast();
  const reduzido = usePrefersReducedMotion();
  const [processando, setProcessando] = useState<string | null>(null);

  useEffect(() => {
    if (carregado && !usuario) router.replace("/entrar");
  }, [carregado, usuario, router]);

  if (!carregado || !usuario) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16 text-center text-texto-suave">
        Carregando...
      </main>
    );
  }

  async function aoComprar(item: Item) {
    setProcessando(item.id);
    const r = await comprar(item.id);
    if (r.ok) mostrar(`${item.nome} comprado! Já equipe abaixo.`, "sucesso");
    else mostrar(r.erro ?? "Erro na compra.", "erro");
    setProcessando(null);
  }

  async function aoEquipar(item: Item) {
    setProcessando(item.id);
    await equipar(item.id, true);
    mostrar(`${item.nome} equipado!`, "sucesso");
    setProcessando(null);
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <NavRpg />

      <header className="mt-6 flex items-end justify-between">
        <div>
          <h1 className="titulo text-3xl font-black text-ouro">Mercado Negro</h1>
          <p className="text-texto-suave">
            Instale exploits e firewalls no seu servidor. Hardware turbina seu deck pessoal.
          </p>
        </div>
        <span className="cartao cartao-ouro rounded-xl px-4 py-2 text-ouro">
          ◈ {moedas} cr
        </span>
      </header>

      {GRUPOS.map((grupo) => (
        <div key={grupo.chave} className="mt-8">
          <h2 className="titulo text-xl font-bold text-destaque">{grupo.titulo}</h2>
          <p className="mt-1 text-sm text-texto-suave">{grupo.descricao}</p>

          {SLOTS.filter((s) => s.grupo === grupo.chave).map((slot) => (
            <section key={slot.tipo} className="mt-6">
              <h3 className="text-lg font-bold">
                {slot.icone} {slot.nome}
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {ITENS.filter((i) => i.tipo === slot.tipo && !i.exclusivo).map((item, i) => {
                  const possui = temItem(item.id);
                  const equipadoAgora = possui && itemEquipado(item.id);
                  const equipadoNoSlot = ITENS.find(
                    (i) => i.tipo === item.tipo && itemEquipado(i.id),
                  );
                  const podeComprar = moedas >= item.preco;
                  const ocupado = processando === item.id;
                  const deltas = compararComEquipado(item, equipadoNoSlot);
                  return (
                    <motion.div
                      key={item.id}
                      initial={reduzido ? false : { opacity: 0, y: 8 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ duration: reduzido ? 0 : 0.22, delay: reduzido ? 0 : i * 0.04, ease: "easeOut" }}
                      className="flex items-center gap-3 rounded-xl border border-borda bg-fundo-card p-3"
                    >
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-fundo text-2xl">
                        {item.icone}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate font-semibold"
                          style={{ color: CORES_RARIDADE[item.raridade] }}
                          title={`Raridade: ${item.raridade}`}
                        >
                          <span aria-hidden="true">{SIMBOLO_RARIDADE[item.raridade]}</span> {item.nome}
                        </p>
                        <p className="text-xs text-texto-suave">
                          {descreverAtributos(item)}
                        </p>
                        {deltas && (
                          <p className="text-[11px]">
                            <span className="text-texto-suave">vs. equipado: </span>
                            {deltas.map(({ chave, delta }) => (
                              <span
                                key={chave}
                                className={`mr-1.5 font-semibold ${
                                  delta > 0 ? "text-sucesso" : "text-erro"
                                }`}
                              >
                                {delta > 0 ? "+" : ""}
                                {delta} {ICONES_ATRIBUTO[chave]}
                              </span>
                            ))}
                          </p>
                        )}
                      </div>
                      {equipadoAgora ? (
                        <span className="shrink-0 text-xs font-semibold text-sucesso">
                          ✓ Equipado
                        </span>
                      ) : possui ? (
                        <Button
                          tamanho="sm"
                          carregando={ocupado}
                          onClick={() => aoEquipar(item)}
                        >
                          Equipar
                        </Button>
                      ) : (
                        <Button
                          tamanho="sm"
                          disabled={!podeComprar}
                          carregando={ocupado}
                          onClick={() => aoComprar(item)}
                          title={podeComprar ? "" : "Créditos insuficientes"}
                        >
                          ◈ {item.preco}
                        </Button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ))}

      <div className="mt-8">
        <h2 className="titulo text-xl font-bold text-destaque">🏆 Itens Exclusivos</h2>
        <p className="mt-1 text-sm text-texto-suave">
          Não estão à venda — só são concedidos ao vencer invasões na Rede (veja em{" "}
          <span className="text-destaque">Computador → Alvos</span>).
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {MARCOS_VITORIA_PVP.map((marco) => {
            const item = getItem(marco.itemId);
            if (!item) return null;
            const possui = temItem(item.id);
            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 rounded-xl border border-borda bg-fundo-card p-3 ${
                  possui ? "" : "opacity-50"
                }`}
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-fundo text-2xl">
                  {possui ? item.icone : "🔒"}
                </span>
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
                <span className="shrink-0 text-xs font-semibold text-texto-suave">
                  {possui ? "✓ Desbloqueado" : `${marco.vitorias} vitória${marco.vitorias > 1 ? "s" : ""}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-8 text-center text-sm text-texto-suave">
        Comprou um item? Equipe direto acima, ou gerencie tudo em{" "}
        <span className="text-destaque">Runner</span>. Servidor e apps ficam em{" "}
        <span className="text-destaque">Servidor</span>.
      </p>
    </main>
  );
}

const GRUPOS: { chave: "servidor" | "hardware"; titulo: string; descricao: string }[] = [
  {
    chave: "servidor",
    titulo: "🖥️ Software do Servidor",
    descricao: "Roda no seu servidor: poder de exploit em invasões, firewall de defesa, protocolos auxiliares.",
  },
  {
    chave: "hardware",
    titulo: "💻 Hardware do Deck",
    descricao: "Seu deck pessoal — acelera o acesso a terminais e servidores.",
  },
];

function descreverAtributos(item: Item) {
  const p: string[] = [];
  if (item.atributos.ataque) p.push(`+${item.atributos.ataque} 💉`);
  if (item.atributos.defesa) p.push(`+${item.atributos.defesa} 🧱`);
  if (item.atributos.vida) p.push(`+${item.atributos.vida} 🧬`);
  if (item.atributos.velocidade) p.push(`+${item.atributos.velocidade} ⚡`);
  return p.join("  ") || "Cosmético";
}

// Diferença de atributos entre um item da loja e o que já está equipado no
// mesmo slot — ajuda a decidir se vale a pena trocar sem sair da página.
function compararComEquipado(item: Item, equipadoNoSlot: Item | undefined) {
  if (!equipadoNoSlot || equipadoNoSlot.id === item.id) return null;
  const chaves: (keyof Atributos)[] = ["ataque", "defesa", "vida", "velocidade"];
  const deltas = chaves
    .map((chave) => ({
      chave,
      delta: (item.atributos[chave] ?? 0) - (equipadoNoSlot.atributos[chave] ?? 0),
    }))
    .filter((d) => d.delta !== 0);
  return deltas.length > 0 ? deltas : null;
}
