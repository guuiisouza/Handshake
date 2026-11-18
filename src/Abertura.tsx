import { useMemo, useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import Nevoa from './Nevoa'
import './Abertura.css'

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

  // 1. Fundo de pedra: cada pixel sorteia um tom escuro.
  //    Elevar a 1.6 puxa para o mais escuro: a obsidiana é quase preta.
  for (let y = 0; y < TAMANHO; y++) {
    for (let x = 0; x < TAMANHO; x++) {
      pintar(x, y, PEDRA[Math.floor(Math.pow(sorteio(), 1.6) * PEDRA.length)])
    }
  }

  // 2. Manchas agrupadas: cada mancha nasce num ponto e vai "crescendo"
  //    para pixels vizinhos. O centro é o mais claro e as bordas escurecem.
  const vizinhos = [[1, 0], [-1, 0], [0, 1], [0, -1]]
  const MANCHAS = 7 + Math.floor(sorteio() * 3)
  for (let m = 0; m < MANCHAS; m++) {
    const cx = Math.floor(sorteio() * TAMANHO)
    const cy = Math.floor(sorteio() * TAMANHO)
    const tamanho = 3 + Math.floor(sorteio() * 6)
    // pouco mais da metade das manchas é de roxo vivo (ícone);
    // as outras são de roxo escuro (bloco do jogo)
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
        ? Math.max(2, (sorteio() < 0.35 ? 5 : 4) - distancia) // centro lilás claro, bordas roxo vivo
        : Math.max(0, 2 - distancia)                         // mancha escura e discreta
      pintar(x, y, ROXOS[tom])
    }
  }

  // 3. Alguns pontinhos soltos de roxo escuro, como no bloco original.
  for (let i = 0; i < 8; i++) {
    pintar(Math.floor(sorteio() * TAMANHO), Math.floor(sorteio() * TAMANHO), ROXOS[sorteio() < 0.5 ? 0 : 1])
  }

  return canvas.toDataURL()
}

function Abertura() {
  const ref = useRef<HTMLElement>(null)
  const calmo = useReducedMotion()

  // Uma textura diferente para cada face, para não parecer repetida.
  const texturas = useMemo(() => FACES.map((_, i) => texturaObsidiana(17 + i * 101)), [])

  // scrollYProgress vai de 0 (início da abertura) a 1 (fim da abertura)
  // enquanto a pessoa rola. Cada efeito abaixo usa um trecho desse caminho.
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })

  // A câmera se aproxima da obsidiana e ela se dissolve na névoa...
  const escala = useTransform(scrollYProgress, [0, 0.55], [1, 1.5])
  const subir = useTransform(scrollYProgress, [0, 0.55], [0, -30])
  const obsidianaOpacidade = useTransform(scrollYProgress, [0.2, 0.55], [1, 0])
  // ...a dica some logo no começo da rolagem...
  const dicaOpacidade = useTransform(scrollYProgress, [0, 0.1], [1, 0])
  // ...a névoa fica mais densa no meio da passagem...
  const nevoaOpacidade = useTransform(scrollYProgress, [0, 0.45, 1], [0.85, 1, 0.75])
  // ...e a frase surge de dentro da luz. Depois de 0.65 ela fica inteira
  // na tela (cerca de 35% da passagem), com tempo para ser lida.
  const fraseOpacidade = useTransform(scrollYProgress, [0.4, 0.65], [0, 1])
  const fraseY = useTransform(scrollYProgress, [0.4, 0.7], [24, 0])

  return (
    <section ref={ref} className="abertura-nova">
      <div className="abertura-palco">
        <div className="abertura-fundo">
          <Nevoa style={{ opacity: nevoaOpacidade }} />
        </div>

        <motion.div
          className="abertura-objeto"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="obsidiana"
            style={{
              scale: calmo ? 1 : escala,
              y: calmo ? 0 : subir,
              opacity: obsidianaOpacidade,
            }}
          >
            <div className="obsidiana-halo" />
            <div className={calmo ? 'cubo parado' : 'cubo'}>
              {FACES.map((nome, i) => (
                <div
                  key={nome}
                  className={`face ${nome}`}
                  style={{ backgroundImage: `url(${texturas[i]})` }}
                />
              ))}
            </div>
            <div className={calmo ? 'obsidiana-sombra parado' : 'obsidiana-sombra'} />
          </motion.div>
        </motion.div>

        <div className="abertura-frase-caixa">
          <motion.p className="abertura-frase" style={{ opacity: fraseOpacidade, y: calmo ? 0 : fraseY }}>
            Algumas distâncias existem apenas para serem vencidas.
          </motion.p>
        </div>

        <motion.div className="abertura-dica" style={{ opacity: dicaOpacidade }}>
          <span>Role para baixo</span>
          <span className="dica-trilho" aria-hidden="true">
            <span className="dica-linha" />
          </span>
        </motion.div>
      </div>
    </section>
  )
}

export default Abertura
