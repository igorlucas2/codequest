// Zonas de rede fixas (estilo Packet Tracer, sem construtor livre): cada
// aluno cai deterministicamente numa das 3 zonas pelo próprio id, e a tarefa
// é configurar IP/máscara/gateway certos pra ela — ensina o conceito de
// sub-rede/gateway com uma consequência real (ver alcancaZona em lib/rede.ts).
// Puro/sem "use client": importado tanto no client (validação instantânea,
// sem round-trip) quanto no servidor (única fonte de verdade real).

export type ZonaId = 0 | 1 | 2;

export type Zona = {
  id: ZonaId;
  nome: string;
  cidr: string; // só descritivo
  prefixo: string; // "10.10.1" — os 3 primeiros octetos válidos pra esta zona
  gateway: string;
  corLed: string;
};

export const ZONAS: Zona[] = [
  { id: 0, nome: "Setor Alfa", cidr: "10.10.1.0/24", prefixo: "10.10.1", gateway: "10.10.1.1", corLed: "#2bff88" },
  { id: 1, nome: "Setor Beta", cidr: "10.10.2.0/24", prefixo: "10.10.2", gateway: "10.10.2.1", corLed: "#a855f7" },
  { id: 2, nome: "Setor Gama", cidr: "10.10.3.0/24", prefixo: "10.10.3", gateway: "10.10.3.1", corLed: "#ffcc33" },
];

export function getZona(id: number): Zona | undefined {
  return ZONAS.find((z) => z.id === id);
}

// Atribuição determinística e nunca armazenada — sempre recalculada a partir
// do id do usuário, pra nunca haver drift entre o que tá gravado e a "zona
// de verdade" (mesmo espírito de bonusDoTier, que também é sempre derivado).
export function setorDoUsuario(usuarioId: number): ZonaId {
  return (usuarioId % ZONAS.length) as ZonaId;
}

// IP válido pra uma zona: mesmos 3 primeiros octetos, último octeto de 2 a
// 254 (exclui .0 rede, .1 gateway, .255 broadcast).
export function ipValidoNaZona(ip: string, zonaId: number): boolean {
  const zona = getZona(zonaId);
  if (!zona) return false;
  const m = ip.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const octetos = m.slice(1).map(Number);
  if (octetos.some((o) => o < 0 || o > 255)) return false;
  const prefixoIp = `${octetos[0]}.${octetos[1]}.${octetos[2]}`;
  const ultimo = octetos[3];
  return prefixoIp === zona.prefixo && ultimo >= 2 && ultimo <= 254;
}

export const MASCARAS_OPCOES: { valor: string; label: string }[] = [
  { valor: "255.255.255.0", label: "255.255.255.0 — /24 (254 hosts, uma sub-rede pequena)" },
  { valor: "255.255.0.0", label: "255.255.0.0 — /16 (65 mil hosts, rede grande demais)" },
  { valor: "255.0.0.0", label: "255.0.0.0 — /8 (16 milhões de hosts, praticamente sem sub-rede)" },
  { valor: "255.255.255.128", label: "255.255.255.128 — /25 (só 126 hosts, sub-rede menor que a zona)" },
];

export const MASCARA_CORRETA = "255.255.255.0";
