"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { XP_TOTAL } from "@/content/trilha1";
import { useSessao } from "@/components/Sessao";
import Button from "@/components/ui/Button";

type Aluno = {
  id: number;
  nome: string;
  email: string;
  fasesConcluidas: number;
  xpTotal: number;
  ultimaAtividade: string | null;
  proximaFasePendente: number | null;
  vitorias: number;
  derrotas: number;
  servidorTier: string | null;
};

export default function PainelProfessor() {
  const router = useRouter();
  const { carregado, usuario, sair } = useSessao();
  const [alunos, setAlunos] = useState<Aluno[] | null>(null);
  const [totalFases, setTotalFases] = useState(0);
  const [erro, setErro] = useState<string | null>(null);

  // Só professor entra aqui.
  useEffect(() => {
    if (!carregado) return;
    if (!usuario) {
      router.replace("/entrar");
      return;
    }
    if (usuario.papel !== "professor") {
      router.replace("/trilha");
    }
  }, [carregado, usuario, router]);

  useEffect(() => {
    if (usuario?.papel !== "professor") return;
    fetch("/api/professor", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.erro) setErro(d.erro);
        else {
          setAlunos(d.alunos);
          setTotalFases(d.totalFases ?? 0);
        }
      })
      .catch(() => setErro("Não consegui carregar os dados."));
  }, [usuario]);

  if (!carregado || usuario?.papel !== "professor") {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16 text-center text-texto-suave">
        Carregando...
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between">
        <Link href="/trilha" className="text-sm text-texto-suave hover:text-texto">
          ← Trilha
        </Link>
        <Button variante="fantasma" tamanho="sm" onClick={sair}>
          Sair
        </Button>
      </div>

      <header className="mt-6">
        <h1 className="titulo text-3xl font-black text-ouro">Console do Fixer</h1>
        <p className="text-texto-suave">
          Rede de runners sob seu contrato — trilha de Lógica de Programação.
        </p>
      </header>

      {erro && (
        <p className="mt-6 rounded-lg bg-erro/10 px-4 py-3 text-erro">{erro}</p>
      )}

      {alunos && alunos.length === 0 && (
        <p className="mt-8 rounded-2xl border border-borda bg-fundo-card p-6 text-center text-texto-suave">
          Nenhum runner na sua rede ainda. Mande a turma se conectar em{" "}
          <span className="text-destaque">/entrar</span>.
        </p>
      )}

      {alunos && alunos.length > 0 && (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-borda">
          <table className="w-full text-left text-sm">
            <thead className="bg-fundo-card text-texto-suave">
              <tr>
                <th className="px-4 py-3 font-medium">Runner</th>
                <th className="px-4 py-3 font-medium">Contratos</th>
                <th className="px-4 py-3 font-medium">Onde travou</th>
                <th className="px-4 py-3 font-medium">XP</th>
                <th className="px-4 py-3 font-medium">Infra</th>
                <th className="px-4 py-3 font-medium">Invasões</th>
                <th className="px-4 py-3 font-medium">Último sinal</th>
              </tr>
            </thead>
            <tbody>
              {alunos.map((a) => {
                const pct = totalFases > 0 ? Math.round((a.fasesConcluidas / totalFases) * 100) : 0;
                return (
                  <tr key={a.id} className="border-t border-borda">
                    <td className="px-4 py-3">
                      <p className="font-semibold">{a.nome}</p>
                      <p className="text-xs text-texto-suave">{a.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-fundo">
                          <div
                            className="h-full rounded-full bg-primaria"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-texto-suave">
                          {a.fasesConcluidas}/{totalFases}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-texto-suave">
                      {a.proximaFasePendente ? `Contrato ${a.proximaFasePendente}` : "Concluiu tudo 🏆"}
                    </td>
                    <td className="px-4 py-3 text-ouro">
                      {a.xpTotal}
                      <span className="text-texto-suave">/{XP_TOTAL}</span>
                    </td>
                    <td className="px-4 py-3 text-texto-suave capitalize">
                      {a.servidorTier ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-texto-suave">
                      <span className="text-sucesso">{a.vitorias}V</span>
                      {" / "}
                      <span className="text-erro">{a.derrotas}D</span>
                    </td>
                    <td className="px-4 py-3 text-texto-suave">
                      {a.ultimaAtividade
                        ? new Date(a.ultimaAtividade).toLocaleString("pt-BR")
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
