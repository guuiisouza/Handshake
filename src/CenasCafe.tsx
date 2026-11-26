// ---------- As três cenas em pixel art das cafeterias ----------
// Mesmo estilo dos computadores do Handshake: pixels marcados (grade de
// 64 x 48), fundo escuro e luz quente no interior. As três têm a mesma
// proporção, a mesma moldura e o mesmo peso visual (nenhuma em destaque).
// Sem nomes, letreiros, logos, fachadas ou detalhes de lugares reais.
//
// Cada pixel (ou bloco de pixels) é [x, y, largura, altura, cor, opacidade?].

import type { Opcao } from './prazoVotacao'

type Px = readonly [number, number, number, number, string, number?]

const LARGURA = 64
const ALTURA = 48

// Paleta comum às três cenas
const C = {
  contorno: '#06030a',
  parede: '#150d20',
  rodape: '#110a1a',
  chao: '#0c0812',
  chaoLinha: '#1d1430',
  madeiraEscura: '#3a2418',
  madeira: '#5c3a26',
  madeiraClara: '#7f5235',
  madeiraBrilho: '#a06a40',
  ambar: '#f2a94e',
  ambarClaro: '#ffd79a',
  luzQuente: '#fff4dd',
  creme: '#f3e6cf',
  louca: '#e9dfd0',
  loucaSombra: '#b9ab98',
  pires: '#cdbfae',
  cafe: '#3b2216',
  folhaEscura: '#2c5a3c',
  folha: '#3f7d4f',
  folhaClara: '#5aa166',
  vaso: '#7a3f2c',
  vasoBorda: '#8f4a33',
  noite: '#16203f',
  noiteBaixa: '#1f2c56',
  estrela: '#c9d6ff',
  vidro: '#cfe3ff',
  rosa: '#f3a6c0',
  rosaClaro: '#ffd0df',
  rosaEscuro: '#c76a8c',
  massa: '#fbe7c6',
  cereja: '#d6334f',
  cerejaBrilho: '#ff8fa3',
  menta: '#9be3c3',
  chocolate: '#5a2f22',
  biscoito: '#c8954f',
  amarelo: '#ffd34d',
  pink: '#f37aa0',
  branco: '#ffffff',
} as const

// Chão e parede (iguais nas três, para terem o mesmo peso)
function ambiente(parede: string): Px[] {
  return [
    [0, 0, LARGURA, 40, parede],
    [0, 36, LARGURA, 4, C.rodape],
    [0, 40, LARGURA, 8, C.chao],
    [0, 40, LARGURA, 1, C.chaoLinha],
  ]
}

// Uma xícara com pires, de frente; asa para a direita ou para a esquerda
function xicara(x: number, y: number, asaDireita: boolean): Px[] {
  return [
    [x - 1, y + 4, 7, 1, C.pires],
    [x, y, 5, 4, C.louca],
    [x, y + 3, 5, 1, C.loucaSombra],
    [x + 1, y, 3, 1, C.cafe],
    asaDireita ? [x + 5, y + 1, 1, 2, C.louca] : [x - 1, y + 1, 1, 2, C.louca],
  ]
}

// Vapor subindo (animado no CSS, em degraus de pixel)
function vapor(x: number, y: number): Px[] {
  return [
    [x, y, 1, 1, C.luzQuente, 0.55],
    [x + 1, y - 2, 1, 1, C.luzQuente, 0.45],
    [x, y - 4, 1, 1, C.luzQuente, 0.35],
  ]
}

// Mesa de madeira com tampo iluminado
function mesa(x: number, y: number, largura: number): Px[] {
  return [
    [x, y, largura, 2, C.madeiraClara],
    [x, y, largura, 1, C.madeiraBrilho],
    [x, y + 2, largura, 1, C.madeira],
    [x + 2, y + 3, 2, 40 - (y + 3) + 2, C.madeiraEscura],
    [x + largura - 4, y + 3, 2, 40 - (y + 3) + 2, C.madeiraEscura],
  ]
}

// Faixa de luz em degraus (cone da luminária ou feixe da janela)
function feixe(
  topo: number,
  base: number,
  esquerdaTopo: number,
  direitaTopo: number,
  esquerdaBase: number,
  direitaBase: number,
  cor: string,
  opacidade: number,
): Px[] {
  const linhas: Px[] = []
  for (let y = topo; y < base; y += 2) {
    const t = (y - topo) / (base - topo)
    const e = Math.round(esquerdaTopo + (esquerdaBase - esquerdaTopo) * t)
    const d = Math.round(direitaTopo + (direitaBase - direitaTopo) * t)
    linhas.push([e, y, d - e, 2, cor, opacidade])
  }
  return linhas
}

// ---------- Cena A: cantinho aconchegante ----------
// Mesa pequena junto a uma janela, duas xícaras fumegando, luminária
// pendente de luz âmbar, planta no canto.
const CENA_A: Px[] = [
  ...ambiente(C.parede),
  // janela (noite lá fora)
  [4, 6, 22, 23, C.contorno],
  [5, 7, 20, 21, C.madeiraEscura],
  [6, 8, 18, 19, C.noite],
  [6, 18, 18, 9, C.noiteBaixa],
  [14, 8, 2, 19, C.madeiraEscura],
  [6, 17, 18, 1, C.madeiraEscura],
  [8, 10, 1, 1, C.estrela],
  [21, 12, 1, 1, C.estrela],
  [10, 21, 1, 1, C.estrela, 0.6],
  [19, 23, 1, 1, C.estrela, 0.5],
  [3, 29, 24, 2, C.madeira],
  [3, 29, 24, 1, C.madeiraBrilho],
  // luminária pendente
  [43, 0, 1, 9, C.contorno],
  [40, 9, 7, 1, C.madeira],
  [39, 10, 9, 2, C.madeiraClara],
  [38, 12, 11, 1, C.madeira],
  [41, 13, 5, 1, C.ambarClaro],
  [42, 13, 3, 1, C.luzQuente],
  ...feixe(14, 34, 40, 47, 31, 56, C.ambar, 0.1),
  // mesa e xícaras
  ...mesa(30, 34, 24),
  ...xicara(34, 29, true),
  ...xicara(45, 29, false),
  // poça de luz quente sobre a mesa
  [30, 34, 24, 1, C.ambarClaro, 0.35],
  // planta no canto
  [53, 34, 9, 2, C.vasoBorda],
  [54, 36, 7, 6, C.vaso],
  [54, 41, 7, 1, C.madeiraEscura],
  [55, 27, 5, 7, C.folhaEscura],
  [52, 25, 3, 7, C.folha],
  [60, 23, 3, 9, C.folha],
  [57, 20, 2, 8, C.folhaClara],
  [53, 29, 2, 3, C.folhaClara],
  [61, 26, 2, 2, C.folhaClara],
]
const VAPOR_A: Px[] = [...vapor(36, 27), ...vapor(47, 27)]

// ---------- Cena B: livros e cafés ----------
// Estante alta de livros ao fundo, mesa com uma xícara e um livro aberto,
// luz entrando de lado.
const CORES_LIVROS = ['#8a3b2e', '#2f6b6b', '#b08a3a', '#5b3f8f', '#d9c9a6', '#3d5a8a', '#7a2f4a', '#4e6b3a']
function prateleira(y: number, semente: number): Px[] {
  // livros de larguras e alturas variadas, numa ordem fixa (sempre igual)
  const livros: Px[] = []
  let x = 6
  let i = semente
  while (x < 31) {
    const largura = [2, 3, 2, 1, 3, 2][i % 6]
    const altura = [7, 6, 7, 5, 6, 7, 5][i % 7]
    if (x + largura > 32) break
    const cor = CORES_LIVROS[(i * 3) % CORES_LIVROS.length]
    livros.push([x, y - altura, largura, altura, cor])
    livros.push([x, y - altura, largura, 1, C.creme, 0.25]) // topo iluminado
    x += largura
    i += 1
  }
  return livros
}
const CENA_B: Px[] = [
  ...ambiente(C.parede),
  // estante alta
  [4, 3, 30, 37, C.madeiraEscura],
  [6, 5, 26, 33, '#0f0a17'],
  ...prateleira(13, 0),
  ...prateleira(22, 4),
  ...prateleira(31, 9),
  [6, 13, 26, 2, C.madeira],
  [6, 22, 26, 2, C.madeira],
  [6, 31, 26, 2, C.madeira],
  [4, 38, 30, 2, C.madeira],
  // janela estreita na parede da direita, de onde vem a luz
  [57, 5, 5, 23, C.contorno],
  [58, 6, 3, 21, C.ambarClaro],
  [58, 6, 1, 21, C.luzQuente],
  // feixe de luz entrando de lado, descendo até a mesa
  ...feixe(6, 40, 52, 58, 26, 46, C.ambarClaro, 0.1),
  // mesa, livro aberto e xícara
  ...mesa(28, 35, 28),
  [32, 34, 15, 1, '#7a2f4a'],
  [33, 31, 6, 3, C.creme],
  [40, 31, 6, 3, C.creme],
  [39, 31, 1, 3, C.loucaSombra],
  [34, 32, 4, 1, C.loucaSombra],
  [41, 32, 4, 1, C.loucaSombra],
  [34, 33, 3, 1, C.loucaSombra, 0.7],
  [41, 33, 3, 1, C.loucaSombra, 0.7],
  ...xicara(49, 30, true),
  [28, 35, 28, 1, C.ambarClaro, 0.3],
]
const VAPOR_B: Px[] = vapor(51, 28)

// ---------- Cena C: doces e sobremesas ----------
// Balcão com um bolo sob redoma de vidro, duas taças de sorvete, flores
// pequenas numa jarra, luz suave e rosada.
function taca(x: number, bolas: [string, string, string]): Px[] {
  return [
    // taça de vidro
    [x, 22, 10, 5, C.vidro, 0.35],
    [x, 22, 1, 5, C.vidro, 0.6],
    [x + 9, 22, 1, 5, C.vidro, 0.6],
    [x + 1, 26, 8, 1, C.vidro, 0.6],
    [x + 4, 27, 2, 2, C.vidro, 0.7],
    [x + 2, 29, 6, 1, C.vidro, 0.8],
    // bolas de sorvete e cereja
    [x + 1, 19, 4, 4, bolas[0]],
    [x + 5, 19, 4, 4, bolas[1]],
    [x + 3, 16, 4, 4, bolas[2]],
    [x + 1, 19, 1, 1, C.branco, 0.35],
    [x + 4, 14, 2, 2, C.cereja],
    [x + 4, 14, 1, 1, C.cerejaBrilho],
  ]
}
const CENA_C: Px[] = [
  ...ambiente('#1b0e1d'),
  // balcão
  [0, 30, LARGURA, 2, '#8a5a4e'],
  [0, 30, LARGURA, 1, '#b07a68'],
  [0, 32, LARGURA, 16, '#2e1920'],
  [0, 38, LARGURA, 1, '#22121a'],
  [15, 32, 1, 16, '#22121a'],
  [31, 32, 1, 16, '#22121a'],
  [47, 32, 1, 16, '#22121a'],
  // bolo no pratinho com pé
  [10, 29, 8, 1, C.pires],
  [13, 27, 2, 2, C.pires],
  [7, 26, 14, 1, C.louca],
  [9, 22, 10, 4, C.massa],
  [9, 23, 10, 1, C.rosa],
  [9, 20, 10, 2, C.rosaClaro],
  [10, 22, 1, 1, C.rosaClaro],
  [13, 22, 1, 2, C.rosaClaro],
  [16, 22, 1, 1, C.rosaClaro],
  [13, 18, 2, 2, C.cereja],
  [13, 18, 1, 1, C.cerejaBrilho],
  // redoma de vidro
  [8, 13, 13, 13, C.vidro, 0.07],
  [11, 11, 6, 1, C.vidro, 0.6],
  [9, 12, 2, 1, C.vidro, 0.6],
  [17, 12, 2, 1, C.vidro, 0.6],
  [8, 13, 1, 2, C.vidro, 0.6],
  [19, 13, 1, 2, C.vidro, 0.6],
  [7, 15, 1, 11, C.vidro, 0.55],
  [20, 15, 1, 11, C.vidro, 0.55],
  [13, 9, 2, 2, C.vidro, 0.8],
  // duas taças de sorvete
  ...taca(27, [C.rosaClaro, C.menta, C.massa]),
  ...taca(39, [C.chocolate, C.rosaClaro, C.massa]),
  [36, 15, 1, 5, C.biscoito],
  // jarra com flores pequenas
  [53, 24, 6, 6, C.vidro, 0.4],
  [53, 27, 6, 3, '#9fc7e8', 0.35],
  [53, 24, 1, 6, C.vidro, 0.6],
  [55, 18, 1, 6, '#4f8f5a'],
  [57, 17, 1, 7, '#4f8f5a'],
  [54, 20, 1, 4, '#4f8f5a'],
  [59, 19, 1, 5, '#4f8f5a'],
  [54, 16, 2, 2, C.amarelo],
  [56, 15, 2, 2, C.pink],
  [52, 19, 2, 2, C.branco],
  [58, 17, 2, 2, C.pink],
  // luz rosada suave caindo sobre o balcão
  ...feixe(0, 30, 14, 50, 2, 62, C.rosa, 0.05),
  [0, 30, LARGURA, 1, C.rosaClaro, 0.25],
]
// brilho passando pela redoma (animado no CSS)
const BRILHO_C: Px[] = [
  [9, 15, 1, 5, C.branco, 0.6],
  [10, 13, 1, 1, C.branco, 0.5],
]

const CENAS: Record<Opcao, { fixa: Px[]; animada: Px[]; tipo: 'vapor' | 'brilho' }> = {
  a: { fixa: CENA_A, animada: VAPOR_A, tipo: 'vapor' },
  b: { fixa: CENA_B, animada: VAPOR_B, tipo: 'vapor' },
  c: { fixa: CENA_C, animada: BRILHO_C, tipo: 'brilho' },
}

function pixels(lista: Px[]) {
  return lista.map(([x, y, w, h, cor, op], i) => (
    // 0.02 a mais evita frestas entre pixels vizinhos
    <rect key={i} x={x} y={y} width={w + 0.02} height={h + 0.02} fill={cor} opacity={op} />
  ))
}

// Os pixels de cada cena são montados uma vez só (o desenho nunca muda)
const MONTADAS = {
  a: { fixa: pixels(CENAS.a.fixa), animada: pixels(CENAS.a.animada) },
  b: { fixa: pixels(CENAS.b.fixa), animada: pixels(CENAS.b.animada) },
  c: { fixa: pixels(CENAS.c.fixa), animada: pixels(CENAS.c.animada) },
}

export function CenaCafe({ opcao }: { opcao: Opcao }) {
  return (
    <div className={`cafe-cena cafe-cena-${opcao}`}>
      {/* luz quente do interior, por cima do desenho */}
      <div className="cafe-cena-luz" aria-hidden="true" />
      <svg viewBox={`0 0 ${LARGURA} ${ALTURA}`} shapeRendering="crispEdges" aria-hidden="true">
        {MONTADAS[opcao].fixa}
        <g className={`cafe-cena-${CENAS[opcao].tipo}`}>{MONTADAS[opcao].animada}</g>
      </svg>
    </div>
  )
}
