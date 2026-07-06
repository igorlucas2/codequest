import "server-only";

// Limitador de taxa em memória de processo único — não sobrevive a reinício
// do servidor nem escala entre múltiplas instâncias, mas isso é aceitável
// pro porte de uma turma (ver princípio de validação proporcional do
// projeto). Suficiente pra impedir força-bruta trivial via loop de fetch.
const tentativasPorChave = new Map<string, number[]>();

export function limiteExcedido(
  chave: string,
  maxTentativas: number,
  janelaMs: number,
): boolean {
  const agora = Date.now();
  const anteriores = tentativasPorChave.get(chave) ?? [];
  const dentroDaJanela = anteriores.filter((t) => agora - t < janelaMs);
  dentroDaJanela.push(agora);
  tentativasPorChave.set(chave, dentroDaJanela);
  return dentroDaJanela.length > maxTentativas;
}

export function limparTentativas(chave: string): void {
  tentativasPorChave.delete(chave);
}

export function identificarCliente(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local"
  );
}
