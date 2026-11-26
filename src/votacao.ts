// Conversa do site com o servidor da votação (worker/index.ts, rota /api/voto).
// O site manda só a letra neutra (a, b ou c); quem sabe o nome real é o servidor.
//
// Depois do prazo, a seção das cafeterias some do site (o paginador termina
// na obsidiana, com o rodapé). O servidor continua recusando votos.
//
// Teste pelo endereço, só no servidor de dev (npm run dev), como o ?voo do mapa.
// Em dev nada é enviado de verdade: as respostas são simuladas.
//   ?votacao=aberta    → aberta, sem escolha (é o padrão em dev)
//   ?votacao=votado    → aberta, com a escolha "b" feita
//   ?votacao=encerrada → depois do prazo: a seção some
//   ?votacao=erro      → aberta, mas o envio falha (para ver a mensagem de erro)

import { useCallback, useEffect, useState } from 'react'
import { FIM_DA_VOTACAO, ehOpcao, type Opcao } from './prazoVotacao'

export type EstadoVotacao = { aberta: boolean; escolha: Opcao | null }
export type ResultadoVoto =
  | { ok: true; escolha: Opcao }
  | { ok: false; motivo: 'encerrada' | 'limite' | 'falha'; escolha?: Opcao | null }

const LEMBRETE = 'handshake-escolha-cafeteria'

// Lembra no aparelho a última escolha (só para mostrar, sem internet)
export function escolhaLembrada(): Opcao | null {
  try {
    const v = localStorage.getItem(LEMBRETE)
    return ehOpcao(v) ? v : null
  } catch {
    return null
  }
}

function lembrar(opcao: Opcao | null) {
  try {
    if (opcao) localStorage.setItem(LEMBRETE, opcao)
    else localStorage.removeItem(LEMBRETE)
  } catch {
    // navegação privada: sem lembrete, sem problema
  }
}

export function abertaPeloRelogio(agora = Date.now()): boolean {
  return agora < FIM_DA_VOTACAO
}

// ---------- Simulação em dev ----------

function simulacao(): string | null {
  if (!import.meta.env.DEV) return null
  return new URLSearchParams(window.location.search).get('votacao') ?? 'aberta'
}

// A votação está aberta agora? (relógio, ou a simulação em dev)
function abertaAgora(): boolean {
  const sim = simulacao()
  if (sim) return sim !== 'encerrada'
  return abertaPeloRelogio()
}

// Diz se a seção das cafeterias existe. Fecha sozinha no horário do fim, ou
// quando o servidor avisa que encerrou (encerrar()).
export function useVotacaoAberta(): [boolean, () => void] {
  const [aberta, setAberta] = useState(abertaAgora)
  useEffect(() => {
    if (!aberta || simulacao()) return
    const falta = FIM_DA_VOTACAO - Date.now()
    if (falta > 2 ** 31 - 1) return // longe demais para um timer; a próxima abertura resolve
    const relogio = setTimeout(() => setAberta(false), Math.max(falta, 0))
    return () => clearTimeout(relogio)
  }, [aberta])
  const encerrar = useCallback(() => setAberta(false), [])
  return [aberta, encerrar]
}

let escolhaSimulada: Opcao | null = null
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ---------- Servidor ----------

export async function lerEstado(): Promise<EstadoVotacao> {
  const sim = simulacao()
  if (sim) {
    escolhaSimulada = escolhaSimulada ?? (sim === 'votado' ? 'b' : null)
    return { aberta: sim !== 'encerrada', escolha: escolhaSimulada }
  }
  try {
    const r = await fetch('/api/voto', { cache: 'no-store' })
    if (!r.ok) throw new Error(String(r.status))
    const dados = (await r.json()) as { aberta?: boolean; escolha?: unknown }
    const escolha = ehOpcao(dados.escolha) ? dados.escolha : null
    lembrar(escolha)
    // o relógio do aparelho também conta: passou do prazo, está encerrada
    return { aberta: Boolean(dados.aberta) && abertaPeloRelogio(), escolha }
  } catch {
    // sem internet: mostra o que o aparelho lembra e o prazo pelo relógio
    return { aberta: abertaPeloRelogio(), escolha: escolhaLembrada() }
  }
}

export async function votar(opcao: Opcao): Promise<ResultadoVoto> {
  const sim = simulacao()
  if (sim) {
    await espera(700)
    if (sim === 'erro') return { ok: false, motivo: 'falha' }
    if (sim === 'encerrada') return { ok: false, motivo: 'encerrada' }
    escolhaSimulada = opcao
    return { ok: true, escolha: opcao }
  }
  if (!abertaPeloRelogio()) return { ok: false, motivo: 'encerrada' }
  try {
    const r = await fetch('/api/voto', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ opcao }),
    })
    const dados = (await r.json().catch(() => ({}))) as { ok?: boolean; escolha?: unknown; erro?: string }
    if (r.ok && dados.ok && ehOpcao(dados.escolha)) {
      lembrar(dados.escolha)
      return { ok: true, escolha: dados.escolha }
    }
    if (dados.erro === 'encerrada') return { ok: false, motivo: 'encerrada' }
    if (dados.erro === 'limite-de-trocas' || dados.erro === 'muitas-tentativas') {
      return { ok: false, motivo: 'limite', escolha: ehOpcao(dados.escolha) ? dados.escolha : undefined }
    }
    return { ok: false, motivo: 'falha' }
  } catch {
    return { ok: false, motivo: 'falha' }
  }
}
