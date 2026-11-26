// Prazo e regras da votação das cafeterias.
// Este arquivo é usado pelo site E pelo servidor (worker/index.ts): a regra
// é uma só, nos dois lugares.

// Sábado, 28/11/2026, às 12:00 de Brasília (UTC-3) = 15:00 UTC
export const FIM_DA_VOTACAO = Date.parse('2026-11-28T15:00:00Z')

// As opções que o site conhece: só letras neutras. Quem traduz para a
// cafeteria real é o servidor, com o secret CAFETERIAS.
export const OPCOES = ['a', 'b', 'c'] as const
export type Opcao = (typeof OPCOES)[number]

export function ehOpcao(valor: unknown): valor is Opcao {
  return typeof valor === 'string' && (OPCOES as readonly string[]).includes(valor)
}

// Ela pode trocar a escolha; cada troca manda um e-mail. Limite de trocas:
export const MAXIMO_DE_TROCAS = 10
