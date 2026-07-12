"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import PublicHeader from "@/components/PublicHeader";
import { useSessao } from "@/components/Sessao";
import { limparEstadoDesktopPersistido } from "@/components/desktop/persistenciaDesktop";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function Entrar() {
  const router = useRouter();
  const { carregado, usuario, recarregar } = useSessao();
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [codigoProfessor, setCodigoProfessor] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (carregado && usuario) {
      router.replace(usuario.papel === "professor" ? "/professor" : "/computador");
    }
  }, [carregado, router, usuario]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      const rota = modo === "criar" ? "/api/registrar" : "/api/entrar";
      const corpo =
        modo === "criar"
          ? { nome, email, senha, codigoProfessor: codigoProfessor || undefined }
          : { email, senha };

      const res = await fetch(rota, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const dados = await res.json();

      if (!res.ok) {
        setErro(dados.erro ?? "Algo deu errado. Tente de novo.");
        return;
      }

      await recarregar();
      limparEstadoDesktopPersistido();
      const professor = dados.usuario?.papel === "professor";
      router.replace(professor ? "/professor" : "/computador");
    } catch {
      setErro("Não consegui falar com o servidor. O banco está rodando?");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <AppShell sidebar={false} largura="max-w-5xl">
      <PublicHeader acao="Início" href="/" />
      <div className="filete-ouro mt-6" />

      <section className="mx-auto grid min-h-[calc(100vh-9rem)] w-full min-w-0 max-w-md place-items-center py-10">
        <div className="w-full min-w-0">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ouro">
            Acesso à Rede
          </p>
          <div className="cartao cartao-ouro min-w-0 p-6 sm:p-8">
            <h1 className="titulo text-3xl font-black text-ouro">
              {modo === "entrar" ? "Conectar" : "Novo acesso"}
            </h1>
            <p className="mt-1 text-texto-suave">
              Salve seu progresso e continue de onde parou.
            </p>

            <div className="mt-6 grid grid-cols-[repeat(2,minmax(0,1fr))] gap-2">
              {(["entrar", "criar"] as const).map((opcao) => (
                <button
                  key={opcao}
                  type="button"
                  onClick={() => {
                    setModo(opcao);
                    setErro(null);
                  }}
                  className={`deck-cut min-w-0 border px-2 py-2 text-[11px] font-semibold uppercase tracking-wide transition sm:px-3 sm:text-xs ${
                    modo === opcao
                      ? "border-primaria bg-primaria/15 text-primaria"
                      : "border-borda bg-fundo text-texto-suave hover:text-texto"
                  }`}
                >
                  {opcao === "entrar" ? "Entrar" : "Criar acesso"}
                </button>
              ))}
            </div>

            <form onSubmit={enviar} className="mt-5 space-y-4">
              {modo === "criar" && (
                <Input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Codinome"
                />
              )}
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
              />
              <Input
                type="password"
                required
                minLength={6}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="senha (mín. 6 caracteres)"
              />
              {modo === "criar" && (
                <Input
                  type="text"
                  value={codigoProfessor}
                  onChange={(e) => setCodigoProfessor(e.target.value)}
                  placeholder="Código de instrutor (opcional)"
                  className="text-sm"
                />
              )}

              <Button type="submit" carregando={carregando} className="w-full">
                {carregando ? "Conectando..." : modo === "entrar" ? "Conectar" : "Criar acesso"}
              </Button>

              {erro && (
                <p className="deck-cut border border-erro/30 bg-erro/10 px-4 py-2 text-sm text-erro">
                  {erro}
                </p>
              )}
            </form>
          </div>
          <p className="mt-4 break-words px-2 text-center text-xs text-texto-suave">
            O acesso mantém contratos, projetos e evolução sincronizados.
          </p>
        </div>
      </section>
    </AppShell>
  );
}
