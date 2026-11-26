// ---------- Servidor do Handshake (Cloudflare Worker) ----------
//
// SEGURANÇA DO SITE: este código só roda para endereços que começam com
// /api/ (veja "run_worker_first" no wrangler.jsonc). Todo o resto (páginas,
// fotos, scripts) continua sendo entregue direto pela Cloudflare, sem passar
// por aqui. Mesmo que algo aqui dê errado, o site continua no ar.
//
// Rota /api/voto (votação das cafeterias):
//   GET  → se a votação está aberta e qual letra está valendo (a, b ou c)
//   POST → { "opcao": "a" | "b" | "c" } registra a escolha e manda o e-mail
//
// Regras (todas aqui no servidor; o site só repete para mostrar a mensagem):
//   - só até 28/11/2026, 12:00 de Brasília;
//   - vale a última escolha (ela pode trocar), até 10 trocas;
//   - no máximo 10 tentativas por hora vindas da mesma rede;
//   - o site manda só a letra; o nome real sai do secret CAFETERIAS.
//
// Secrets (nunca no código): RESEND_API_KEY, EMAIL_DESTINO, CAFETERIAS.
// ENVIO_SIMULADO = "1" só nos testes no computador (.dev.vars): não manda e-mail.

import { FIM_DA_VOTACAO, MAXIMO_DE_TROCAS, ehOpcao, type Opcao } from '../src/prazoVotacao'

// Tipos mínimos do que a Cloudflare entrega ao Worker (sem biblioteca extra)
interface Caderno {
  get(chave: string): Promise<string | null>
  put(chave: string, valor: string, opcoes?: { expirationTtl?: number }): Promise<void>
}

interface Env {
  ASSETS: { fetch(pedido: Request): Promise<Response> }
  VOTOS: Caderno
  RESEND_API_KEY?: string
  EMAIL_DESTINO?: string
  CAFETERIAS?: string
  ENVIO_SIMULADO?: string
}

type Voto = { opcao: Opcao; trocas: number; em: string }

const TENTATIVAS_POR_HORA = 10
const CHAVE_DO_VOTO = 'voto'

function resposta(dados: unknown, status = 200): Response {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

function aberta(): boolean {
  return Date.now() < FIM_DA_VOTACAO
}

async function lerVoto(env: Env): Promise<Voto | null> {
  const texto = await env.VOTOS.get(CHAVE_DO_VOTO)
  if (!texto) return null
  try {
    const voto = JSON.parse(texto) as Voto
    return ehOpcao(voto.opcao) ? voto : null
  } catch {
    return null
  }
}

// Conta as tentativas de uma rede (IP) na última hora. Devolve false se passou do limite.
async function dentroDoLimite(env: Env, pedido: Request): Promise<boolean> {
  const ip = pedido.headers.get('cf-connecting-ip') ?? 'desconhecido'
  const chave = `tentativas:${ip}`
  const usadas = Number(await env.VOTOS.get(chave)) || 0
  if (usadas >= TENTATIVAS_POR_HORA) return false
  await env.VOTOS.put(chave, String(usadas + 1), { expirationTtl: 3600 })
  return true
}

function nomeDaCafeteria(env: Env, opcao: Opcao): string {
  try {
    const nomes = JSON.parse(env.CAFETERIAS ?? '{}') as Record<string, unknown>
    const nome = nomes[opcao]
    if (typeof nome === 'string' && nome.trim()) return nome.trim()
  } catch {
    // secret mal escrito: o e-mail sai com a letra, e o voto não se perde
  }
  return `opção ${opcao.toUpperCase()} (confira o secret CAFETERIAS)`
}

function horaDeBrasilia(): string {
  return new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

async function mandarEmail(env: Env, assunto: string, texto: string): Promise<boolean> {
  if (env.ENVIO_SIMULADO === '1') {
    console.log(`[e-mail simulado] ${assunto}\n${texto}`)
    return true
  }
  if (!env.RESEND_API_KEY || !env.EMAIL_DESTINO) {
    console.log('Faltam os secrets RESEND_API_KEY e/ou EMAIL_DESTINO')
    return false
  }
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Handshake <onboarding@resend.dev>',
      to: [env.EMAIL_DESTINO],
      subject: assunto,
      text: texto,
    }),
  })
  if (!r.ok) console.log(`Resend recusou o envio: ${r.status} ${await r.text()}`)
  return r.ok
}

async function votar(pedido: Request, env: Env): Promise<Response> {
  // só aceita pedidos vindos do próprio site
  const origem = pedido.headers.get('origin')
  if (origem && new URL(origem).host !== new URL(pedido.url).host) return resposta({ erro: 'origem' }, 403)

  if (!aberta()) return resposta({ erro: 'encerrada' }, 403)
  if (!(await dentroDoLimite(env, pedido))) return resposta({ erro: 'muitas-tentativas' }, 429)

  let opcao: unknown
  try {
    opcao = ((await pedido.json()) as { opcao?: unknown }).opcao
  } catch {
    return resposta({ erro: 'pedido-invalido' }, 400)
  }
  if (!ehOpcao(opcao)) return resposta({ erro: 'opcao-invalida' }, 400)

  const atual = await lerVoto(env)
  // a mesma escolha de novo: nada muda e nenhum e-mail sai
  if (atual?.opcao === opcao) {
    return resposta({ ok: true, escolha: opcao, trocasRestantes: MAXIMO_DE_TROCAS - atual.trocas })
  }
  if (atual && atual.trocas >= MAXIMO_DE_TROCAS) return resposta({ erro: 'limite-de-trocas', escolha: atual.opcao }, 429)

  const nome = nomeDaCafeteria(env, opcao)
  const trocas = atual ? atual.trocas + 1 : 0
  const assunto = atual
    ? `Ela mudou de ideia: agora ${nome} (antes ${nomeDaCafeteria(env, atual.opcao)})`
    : `Ela escolheu: ${nome}`
  const texto = [
    `Escolha: ${nome}`,
    `Letra no site: ${opcao.toUpperCase()}`,
    atual ? `Escolha anterior: ${nomeDaCafeteria(env, atual.opcao)}` : 'É a primeira escolha.',
    `Quando: ${horaDeBrasilia()} (horário de Brasília)`,
    `Trocas usadas: ${trocas} de ${MAXIMO_DE_TROCAS}`,
  ].join('\n')

  // o voto só é guardado se o e-mail saiu: se falhar, ela pode tentar de novo
  if (!(await mandarEmail(env, assunto, texto))) return resposta({ erro: 'envio' }, 502)
  const voto: Voto = { opcao, trocas, em: new Date().toISOString() }
  await env.VOTOS.put(CHAVE_DO_VOTO, JSON.stringify(voto))
  return resposta({ ok: true, escolha: opcao, trocasRestantes: MAXIMO_DE_TROCAS - trocas })
}

export default {
  async fetch(pedido: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(pedido.url)

    // Qualquer coisa fora de /api/ (não deveria chegar aqui, mas por
    // segurança) vai para a entrega normal dos arquivos do site.
    if (!pathname.startsWith('/api/')) return env.ASSETS.fetch(pedido)

    try {
      if (pathname === '/api/voto') {
        if (pedido.method === 'GET') {
          const voto = await lerVoto(env)
          return resposta({
            aberta: aberta(),
            fim: FIM_DA_VOTACAO,
            escolha: voto?.opcao ?? null,
            trocasRestantes: MAXIMO_DE_TROCAS - (voto?.trocas ?? 0),
          })
        }
        if (pedido.method === 'POST') return await votar(pedido, env)
        return resposta({ erro: 'metodo' }, 405)
      }
      return resposta({ erro: 'nao-encontrado' }, 404)
    } catch (erro) {
      console.log('Erro na rota /api:', erro)
      return resposta({ erro: 'servidor' }, 500)
    }
  },
}
