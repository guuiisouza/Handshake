// Contas da câmera do mapa.
// A "câmera" é o pedaço do mapa que aparece na tela: um centro (cx, cy) e um
// tamanho (largura, altura), em unidades do mapa. O mapa é bem maior que a
// tela; mudar a câmera é o que faz parecer que estamos voando sobre ele.

import { ALTURA, LARGURA, ROTA } from './mapa'

export type Ponto = { x: number; y: number }
export type Area = { x0: number; y0: number; x1: number; y1: number }
export type Camera = { cx: number; cy: number; largura: number; altura: number }
export type Tela = { largura: number; altura: number }
// Espaço da tela (em pixels) que a rota NÃO pode ocupar: faixas de texto,
// laterais e o espaço do nome "Lisboa" à direita.
export type Livre = { topo: number; base: number; esquerda: number; direita: number }

const limitar = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max)

// Passagem suave: começa e termina devagar
export const suave = (t: number) => t * t * (3 - 2 * t)

// 0 antes de "inicio", 1 depois de "fim", e uma rampa entre os dois
export const faixa = (valor: number, inicio: number, fim: number) => limitar((valor - inicio) / (fim - inicio), 0, 1)

// ---------- Rota ----------
// ROTA tem os pontos do caminho mais curto pelo globo, igualmente espaçados
// em distância real. Por isso o progresso (0 a 1) vira um índice direto.

export const TOTAL_PONTOS = ROTA.length / 2 - 1
export const pontoDaRota = (i: number): Ponto => ({ x: ROTA[i * 2], y: ROTA[i * 2 + 1] })

// Posição e direção (em graus) do avião para um progresso de 0 a 1
export function posicaoNaRota(progresso: number) {
  const posicao = limitar(progresso, 0, 1) * TOTAL_PONTOS
  const i = Math.min(Math.floor(posicao), TOTAL_PONTOS - 1)
  const f = posicao - i
  const a = pontoDaRota(i)
  const b = pontoDaRota(i + 1)
  return {
    x: a.x + (b.x - a.x) * f,
    y: a.y + (b.y - a.y) * f,
    angulo: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
  }
}

// Retângulo que envolve o trecho da rota entre dois progressos (0 a 1)
export function areaDaRota(de: number, ate: number): Area {
  const i0 = Math.floor(limitar(de, 0, 1) * TOTAL_PONTOS)
  const i1 = Math.ceil(limitar(ate, 0, 1) * TOTAL_PONTOS)
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (let i = i0; i <= i1; i++) {
    const p = pontoDaRota(i)
    x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x)
    y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y)
  }
  return { x0, y0, x1, y1 }
}

// Retângulo em volta de um ponto
export const areaEmVolta = (p: Ponto, raio: number): Area => ({ x0: p.x - raio, y0: p.y - raio, x1: p.x + raio, y1: p.y + raio })

// ---------- Enquadramento ----------

// Câmera que encaixa a área pedida dentro do espaço livre da tela (longe dos
// textos), preenchendo a tela inteira com mapa, sem faixas vazias.
// A câmera tem sempre o formato da tela e nunca sai das bordas do mapa.
export function enquadrar(area: Area, tela: Tela, livre: Livre): Camera {
  const larguraLivre = Math.max(tela.largura - livre.esquerda - livre.direita, 60)
  const alturaLivre = Math.max(tela.altura - livre.topo - livre.base, 60)
  // pixels por unidade do mapa: o maior zoom em que a área ainda cabe no espaço livre...
  let escala = Math.min(larguraLivre / Math.max(area.x1 - area.x0, 1), alturaLivre / Math.max(area.y1 - area.y0, 1))
  // ...mas sem mostrar menos mapa do que a tela precisa para ficar preenchida
  escala = Math.max(escala, tela.largura / LARGURA, tela.altura / ALTURA)
  const largura = tela.largura / escala
  const altura = tela.altura / escala
  // o centro da área vai para o centro do espaço livre
  const cx = (area.x0 + area.x1) / 2 - (livre.esquerda + larguraLivre / 2 - tela.largura / 2) / escala
  const cy = (area.y0 + area.y1) / 2 - (livre.topo + alturaLivre / 2 - tela.altura / 2) / escala
  return {
    cx: limitar(cx, largura / 2, LARGURA - largura / 2),
    cy: limitar(cy, altura / 2, ALTURA - altura / 2),
    largura,
    altura,
  }
}

// Ponto do mapa -> pixels da tela (mesma conta do preserveAspectRatio "slice")
export function naTela(p: Ponto, camera: Camera, tela: Tela): Ponto {
  const escala = Math.max(tela.largura / camera.largura, tela.altura / camera.altura)
  return {
    x: (p.x - camera.cx) * escala + tela.largura / 2,
    y: (p.y - camera.cy) * escala + tela.altura / 2,
  }
}

export const viewBox = (c: Camera) => `${c.cx - c.largura / 2} ${c.cy - c.altura / 2} ${c.largura} ${c.altura}`

// ---------- Voo da câmera ----------

// Mistura duas câmeras (t de 0 a 1). O zoom muda de forma "multiplicativa"
// (como uma lente de verdade), e o centro acompanha o zoom, para o movimento
// parecer um voo contínuo e não um deslize.
export function misturar(a: Camera, b: Camera, t: number): Camera {
  const s = suave(limitar(t, 0, 1))
  const largura = a.largura * Math.pow(b.largura / a.largura, s)
  const altura = a.altura * Math.pow(b.altura / a.altura, s)
  // quanto do caminho de zoom já foi feito (0 a 1), usado para o centro
  const razao = b.largura / a.largura
  const k = Math.abs(razao - 1) < 1e-3 ? s : (largura / a.largura - 1) / (razao - 1)
  return {
    cx: a.cx + (b.cx - a.cx) * k,
    cy: a.cy + (b.cy - a.cy) * k,
    largura,
    altura,
  }
}

// Um enquadramento numa posição da rolagem (em: 0 a 1)
export type Quadro = { em: number; camera: Camera }

// Câmera em qualquer ponto da rolagem, passando pelos enquadramentos em ordem
export function cameraNoPercurso(p: number, quadros: Quadro[]): Camera {
  if (p <= quadros[0].em) return quadros[0].camera
  for (let i = 1; i < quadros.length; i++) {
    const a = quadros[i - 1]
    const b = quadros[i]
    if (p <= b.em) return misturar(a.camera, b.camera, (p - a.em) / (b.em - a.em))
  }
  return quadros[quadros.length - 1].camera
}
