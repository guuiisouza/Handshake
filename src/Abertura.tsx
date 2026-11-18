import { useMemo, useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import Nevoa from './Nevoa'
import './Abertura.css'

// Tons da obsidiana, do mais escuro ao mais claro.
// Os 6 primeiros formam a pedra; os últimos são os veios roxos que brilham.
const TONS = [
  '#050308', '#08050d', '#0d0915', '#130d1f', '#1a122b', '#241939',
  '#33224f', '#4a3173', '#6a48a3', '#9474d1',
]
const TONS_PEDRA = 6
const TAMANHO = 32 // a textura é 32x32: lembra Minecraft sem ficar "pixel duro"

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

  // 1. Manchas grandes e suaves: uma grade pequena de valores sorteados,
  //    misturados entre si para formar regiões mais claras e mais escuras.
  const GRADE = 6
  const grade = Array.from({ length: GRADE * GRADE }, () => sorteio())
  const mancha = (x: number, y: number) => {
    const gx = (x / (TAMANHO - 1)) * (GRADE - 1)
    const gy = (y / (TAMANHO - 1)) * (GRADE - 1)
    const x0 = Math.floor(gx), y0 = Math.floor(gy)
    const x1 = Math.min(x0 + 1, GRADE - 1), y1 = Math.min(y0 + 1, GRADE - 1)
    const fx = gx - x0, fy = gy - y0
    const v = (cx: number, cy: number) => grade[cy * GRADE + cx]
    const cima = v(x0, y0) * (1 - fx) + v(x1, y0) * fx
    const baixo = v(x0, y1) * (1 - fx) + v(x1, y1) * fx
    return cima * (1 - fy) + baixo * fy
  }

  for (let y = 0; y < TAMANHO; y++) {
    for (let x = 0; x < TAMANHO; x++) {
      const valor = mancha(x, y) * 0.65 + sorteio() * 0.35
      // elevar ao quadrado puxa para o escuro: a obsidiana é quase preta
      const tom = Math.min(TONS_PEDRA - 1, Math.floor(valor * valor * TONS_PEDRA))
      ctx.fillStyle = TONS[tom]
      ctx.fillRect(x, y, 1, 1)
    }
  }

  // 2. Veios roxos: pequenos caminhos que andam em diagonal, como na obsidiana do jogo.
  const VEIOS = 16
  for (let i = 0; i < VEIOS; i++) {
    let x = Math.floor(sorteio() * TAMANHO)
    let y = Math.floor(sorteio() * TAMANHO)
    const passos = 2 + Math.floor(sorteio() * 5)
    const dx = sorteio() < 0.5 ? 1 : -1
    for (let p = 0; p < passos; p++) {
      const brilho = TONS_PEDRA + Math.floor(sorteio() * (TONS.length - TONS_PEDRA))
      ctx.fillStyle = TONS[brilho]
      ctx.fillRect(x, y, 1, 1)
      x = (x + (sorteio() < 0.6 ? dx : 0) + TAMANHO) % TAMANHO
      y = (y + 1) % TAMANHO
    }
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
  const escala = useTransform(scrollYProgress, [0, 0.6], [1, 1.5])
  const subir = useTransform(scrollYProgress, [0, 0.6], [0, -30])
  const obsidianaOpacidade = useTransform(scrollYProgress, [0.25, 0.6], [1, 0])
  // ...a dica some logo no começo da rolagem...
  const dicaOpacidade = useTransform(scrollYProgress, [0, 0.12], [1, 0])
  // ...a névoa fica mais densa no meio da passagem...
  const nevoaOpacidade = useTransform(scrollYProgress, [0, 0.5, 1], [0.85, 1, 0.75])
  // ...e a frase surge de dentro da luz.
  const fraseOpacidade = useTransform(scrollYProgress, [0.45, 0.72], [0, 1])
  const fraseY = useTransform(scrollYProgress, [0.45, 0.8], [24, 0])

  return (
    <section ref={ref} className="abertura-nova">
      <div className="abertura-palco">
        <Nevoa style={{ opacity: nevoaOpacidade }} />

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
