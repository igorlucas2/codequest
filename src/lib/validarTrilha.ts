import "server-only";
import { normalizar } from "@/lib/texto";
import { getGabarito } from "@/content/trilha1Gabarito";
import type { EnvioDesafio, ResultadoValidacao } from "@/lib/tiposTrilha";

export type { EnvioDesafio, ResultadoValidacao };

// Varre as linhas do buffer procurando cada resposta esperada, em ordem,
// cada uma numa linha posterior à anterior — mesmo algoritmo que o editor
// usava no cliente antes da fase.desafio.passos ganhar múltiplas etapas
// reveladas uma a uma. Retorna quantos passos consecutivos, a partir do
// primeiro, já estão satisfeitos no buffer atual.
function contarPassosCorretos(passos: string[], codigo: string): number {
  const linhas = codigo.split("\n").map(normalizar);
  let ultimoIndice = -1;
  let count = 0;
  for (const resposta of passos) {
    const alvo = normalizar(resposta);
    let achou = -1;
    for (let i = ultimoIndice + 1; i < linhas.length; i++) {
      if (linhas[i] === alvo) {
        achou = i;
        break;
      }
    }
    if (achou === -1) break;
    ultimoIndice = achou;
    count++;
  }
  return count;
}

export function validarDesafio(ordem: number, envio: EnvioDesafio): ResultadoValidacao | null {
  const gabarito = getGabarito(ordem);
  if (!gabarito || gabarito.tipo !== envio.tipo) return null;

  if (gabarito.tipo === "multipla" && envio.tipo === "multipla") {
    return { tipo: "binario", correto: envio.escolha === gabarito.correta };
  }
  if (gabarito.tipo === "lacuna" && envio.tipo === "lacuna") {
    return { tipo: "binario", correto: normalizar(envio.texto) === normalizar(gabarito.resposta) };
  }
  if (gabarito.tipo === "terminal" && envio.tipo === "terminal") {
    const linhas = envio.codigo.split("\n").map(normalizar);
    return { tipo: "binario", correto: linhas.includes(normalizar(gabarito.resposta)) };
  }
  if (gabarito.tipo === "teste_final" && envio.tipo === "teste_final") {
    const passosCorretos = contarPassosCorretos(gabarito.passos, envio.codigo);
    return { tipo: "progressivo", passosCorretos, totalPassos: gabarito.passos.length };
  }
  return null;
}

// true só quando o envio resolve o desafio POR COMPLETO (usado pelo
// endpoint que credita XP/moedas — nunca credita em progresso parcial).
export function desafioResolvido(ordem: number, envio: EnvioDesafio): boolean {
  const r = validarDesafio(ordem, envio);
  if (!r) return false;
  if (r.tipo === "binario") return r.correto;
  return r.passosCorretos === r.totalPassos;
}
