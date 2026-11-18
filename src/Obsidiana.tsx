import { useMemo } from 'react'
import './Abertura.css'

// O mesmo bloco de obsidiana da abertura, para ser reaproveitado no final.
// A textura é gerada com os mesmos números (sementes) da abertura, e os estilos
// (.obsidiana, .cubo, .face...) são os mesmos do Abertura.css: o bloco fica
// idêntico. O código foi copiado para não mexer na abertura, que está fechada.

// Pedra: quase preta, com leve tom roxo (como o bloco do Minecraft).
const PEDRA = ['#050308', '#09060f', '#0e0918', '#150d24']
// Manchas: do roxo escuro ao lilás claro (o roxo vivo vem do ícone do app).
const ROXOS = ['#24103f', '#3d1670', '#5a1fa3', '#7f2fe0', '#a95cff', '#d9a2ff']
const TAMANHO = 16 // 16x16, igual ao bloco original do jogo

const FACES = ['frente', 'tras', 'direita', 'esquerda', 'topo', 'base']

// Gerador de números "aleatórios" que sempre repete a mesma sequência
// para a mesma semente. Assim a pedra fica igual toda vez que o site abre.
function criarSorteio(semente: number) {
  let s = semente >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Desenha a textura de uma face num canvas e devolve como imagem.
function texturaObsidiana(semente: number): string {
  const canvas = document.createElement('canvas')
  canvas.width = TAMANHO
  canvas.height = TAMANHO
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  const sorteio = criarSorteio(semente)
  const pintar = (x: number, y: number, cor: string) => {
    ctx.fillStyle = cor
    ctx.fillRect(x, y, 1, 1)
  }

  // 1. Fundo de pedra
  for (let y = 0; y < TAMANHO; y++) {
    for (let x = 0; x < TAMANHO; x++) {
      pintar(x, y, PEDRA[Math.floor(Math.pow(sorteio(), 1.6) * PEDRA.length)])
    }
  }

  // 2. Manchas agrupadas
  const vizinhos = [[1, 0], [-1, 0], [0, 1], [0, -1]]
  const MANCHAS = 7 + Math.floor(sorteio() * 3)
  for (let m = 0; m < MANCHAS; m++) {
    const cx = Math.floor(sorteio() * TAMANHO)
    const cy = Math.floor(sorteio() * TAMANHO)
    const tamanho = 3 + Math.floor(sorteio() * 6)
    const viva = sorteio() < 0.55

    const pixels: [number, number][] = [[cx, cy]]
    let tentativas = 0
    while (pixels.length < tamanho && tentativas++ < 40) {
      const [px, py] = pixels[Math.floor(sorteio() * pixels.length)]
      const [dx, dy] = vizinhos[Math.floor(sorteio() * 4)]
      const nx = px + dx, ny = py + dy
      const dentro = nx >= 0 && ny >= 0 && nx < TAMANHO && ny < TAMANHO
      if (dentro && !pixels.some(([x, y]) => x === nx && y === ny)) pixels.push([nx, ny])
    }

    for (const [x, y] of pixels) {
      const distancia = Math.abs(x - cx) + Math.abs(y - cy)
      const tom = viva
        ? Math.max(2, (sorteio() < 0.35 ? 5 : 4) - distancia)
        : Math.max(0, 2 - distancia)
      pintar(x, y, ROXOS[tom])
    }
  }

  // 3. Pontinhos soltos de roxo escuro
  for (let i = 0; i < 8; i++) {
    pintar(Math.floor(sorteio() * TAMANHO), Math.floor(sorteio() * TAMANHO), ROXOS[sorteio() < 0.5 ? 0 : 1])
  }

  return canvas.toDataURL()
}

function Obsidiana({ calmo }: { calmo: boolean }) {
  // Uma textura diferente para cada face (mesmas sementes da abertura)
  const texturas = useMemo(() => FACES.map((_, i) => texturaObsidiana(17 + i * 101)), [])

  return (
    <div className="obsidiana">
      <div className="obsidiana-halo" />
      <div className={calmo ? 'cubo parado' : 'cubo'}>
        {FACES.map((nome, i) => (
          <div key={nome} className={`face ${nome}`} style={{ backgroundImage: `url(${texturas[i]})` }} />
        ))}
      </div>
      <div className={calmo ? 'obsidiana-sombra parado' : 'obsidiana-sombra'} />
    </div>
  )
}

export default Obsidiana
