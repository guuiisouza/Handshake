// Cálculo do estado do voo a partir do relógio.
// IMPORTANTE: é uma ESTIMATIVA pelos horários programados, não rastreamento real.
// A posição do avião não prova que ele decolou ou pousou.

// Horários em UTC (iguais em qualquer fuso):
// partida 27/11/2026 09:00 em Lisboa (UTC+0); chegada 16:20 em São Paulo (UTC-3) = 19:20 UTC.
export const PARTIDA = Date.parse('2026-11-27T09:00:00Z')
export const CHEGADA = Date.parse('2026-11-27T19:20:00Z')
const DURACAO = CHEGADA - PARTIDA // 620 minutos

export type Fase = 'antes' | 'durante' | 'depois'

export type EstadoVoo = {
  fase: Fase
  progresso: number // 0 = em Lisboa, 1 = em Viracopos
  falta: number     // milissegundos até a próxima marca (decolagem ou pouso)
}

export function estadoDoVoo(agora: number): EstadoVoo {
  // progress = clamp((agora - partida) / (chegada - partida), 0, 1)
  const progresso = Math.min(Math.max((agora - PARTIDA) / DURACAO, 0), 1)
  if (agora < PARTIDA) return { fase: 'antes', progresso: 0, falta: PARTIDA - agora }
  if (agora < CHEGADA) return { fase: 'durante', progresso, falta: CHEGADA - agora }
  return { fase: 'depois', progresso: 1, falta: 0 }
}

// "8d 4h 12min", "3h 20min" ou "12min". Arredonda os minutos para cima,
// para nunca mostrar "0min" enquanto ainda falta algum tempo.
export function formatarDuracao(ms: number): string {
  const totalMinutos = Math.max(Math.ceil(ms / 60000), 0)
  const dias = Math.floor(totalMinutos / 1440)
  const horas = Math.floor((totalMinutos % 1440) / 60)
  const minutos = totalMinutos % 60
  if (dias > 0) return `${dias}d ${horas}h ${minutos}min`
  if (horas > 0) return `${horas}h ${minutos}min`
  return `${minutos}min`
}

// ---------- Teste pelo endereço (substitui o antigo MODO_TESTE) ----------
// Só funciona no servidor de teste (npm run dev). No site publicado,
// import.meta.env.DEV é false e o endereço é ignorado: não tem como esquecer ligado.
//   ?voo=antes   → 8 dias, 4h e 12min antes da decolagem
//   ?voo=durante → 45% do trajeto
//   ?voo=0.8     → 80% do trajeto (qualquer número de 0 a 1)
//   ?voo=depois  → 1 hora depois do pouso
export function horaDeTeste(): number | null {
  if (!import.meta.env.DEV) return null
  const valor = new URLSearchParams(window.location.search).get('voo')
  if (!valor) return null
  if (valor === 'antes') return PARTIDA - ((8 * 24 + 4) * 60 + 12) * 60000
  if (valor === 'durante') return PARTIDA + DURACAO * 0.45
  if (valor === 'depois') return CHEGADA + 60 * 60000
  const numero = Number(valor)
  if (Number.isFinite(numero)) return PARTIDA + DURACAO * Math.min(Math.max(numero, 0), 1)
  return null
}

// Horário "agora": o relógio real, ou o horário de teste quando houver.
// O de teste continua andando a partir do ponto escolhido, como o real.
const inicioTeste = horaDeTeste()
const aberturaPagina = Date.now()
export function agora(): number {
  return inicioTeste === null ? Date.now() : inicioTeste + (Date.now() - aberturaPagina)
}
