import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { motion, useReducedMotion, type MotionStyle } from 'motion/react'
import { iniciarNevoaWebGL } from './NevoaShader'
import './Nevoa.css'

// Névoa de "tinta na água" com luz violeta atrás da obsidiana.
// Fica atrás do conteúdo de uma cena e pode ser reaproveitada nas transições
// (mapa, galeria e final), para todas terem a mesma iluminação.
// "style" aceita valores animados do Motion, por exemplo a opacidade ligada à rolagem.
//
// A névoa principal é desenhada pela placa de vídeo (NevoaShader.ts).
// Se o aparelho não tiver WebGL, entra o plano B: a névoa de imagens
// deslizando, gerada abaixo.

const TAMANHO = 256 // tamanho da textura em pixels (é ampliada na tela; fumaça não precisa de detalhe)

// Gerador de números "aleatórios" que repete a mesma sequência para a mesma semente.
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

// Calcula a "densidade" da fumaça em cada pixel, de 0 (vazio) a 1 (denso).
// Soma várias camadas de ruído: borrões grandes + detalhes cada vez menores.
// A grade "dá a volta" nas bordas, então a imagem se repete sem emenda.
function densidadeFumaca(semente: number): Float32Array {
  const sorteio = criarSorteio(semente)
  const resultado = new Float32Array(TAMANHO * TAMANHO)
  const suave = (t: number) => t * t * (3 - 2 * t)

  let peso = 1
  let somaPesos = 0
  for (const celulas of [3, 6, 12, 24, 48]) {
    const grade = Array.from({ length: celulas * celulas }, () => sorteio())
    const valor = (gx: number, gy: number) => grade[(gy % celulas) * celulas + (gx % celulas)]
    for (let y = 0; y < TAMANHO; y++) {
      const fy = (y / TAMANHO) * celulas
      const y0 = Math.floor(fy)
      const ty = suave(fy - y0)
      for (let x = 0; x < TAMANHO; x++) {
        const fx = (x / TAMANHO) * celulas
        const x0 = Math.floor(fx)
        const tx = suave(fx - x0)
        const cima = valor(x0, y0) * (1 - tx) + valor(x0 + 1, y0) * tx
        const baixo = valor(x0, y0 + 1) * (1 - tx) + valor(x0 + 1, y0 + 1) * tx
        resultado[y * TAMANHO + x] += (cima * (1 - ty) + baixo * ty) * peso
      }
    }
    somaPesos += peso
    peso *= 0.5
  }

  // Abre "buracos" na fumaça para ela ficar em fiapos, não um véu uniforme.
  for (let i = 0; i < resultado.length; i++) {
    const n = resultado[i] / somaPesos
    const t = Math.min(Math.max((n - 0.38) / 0.4, 0), 1)
    resultado[i] = suave(t)
  }
  return resultado
}

// Pinta a densidade numa cor e devolve como imagem (transparente onde não há fumaça).
function pintarFumaca(densidade: Float32Array, [r, g, b]: number[]): string {
  const canvas = document.createElement('canvas')
  canvas.width = TAMANHO
  canvas.height = TAMANHO
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  const imagem = ctx.createImageData(TAMANHO, TAMANHO)
  for (let i = 0; i < densidade.length; i++) {
    imagem.data[i * 4] = r
    imagem.data[i * 4 + 1] = g
    imagem.data[i * 4 + 2] = b
    imagem.data[i * 4 + 3] = Math.round(densidade[i] * 255)
  }
  ctx.putImageData(imagem, 0, 0)
  return canvas.toDataURL()
}

// Plano B: as texturas são geradas uma única vez e reaproveitadas por todas as cenas.
let texturasProntas: Record<'violeta' | 'lilas' | 'azul', string> | null = null
function texturas() {
  if (!texturasProntas) {
    texturasProntas = {
      violeta: pintarFumaca(densidadeFumaca(11), [150, 80, 235]),
      lilas: pintarFumaca(densidadeFumaca(29), [215, 190, 255]),
      azul: pintarFumaca(densidadeFumaca(47), [105, 125, 225]),
    }
  }
  return texturasProntas
}

type Props = {
  className?: string
  style?: MotionStyle
  // onde fica o objeto em destaque (a névoa fica rala em volta dele).
  // 0 a 1; x da esquerda para a direita, y de BAIXO para cima.
  centroX?: number
  centroY?: number
  // quanto rolagem, toque e mouse agitam a fumaça (1 = normal, como na abertura e no mapa)
  sensibilidade?: number
  // 1 = normal; 0.7 = névoa e partículas brilhantes 30% mais fracas
  intensidade?: number
}

function Nevoa({ className = '', style, centroX = 0.5, centroY = 0.56, sensibilidade = 1, intensidade = 1 }: Props) {
  const sistemaRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const calmo = useReducedMotion()
  const [usarWebGL, setUsarWebGL] = useState(true)
  // a cena está perto da tela? (até uma tela de distância, para cima ou para baixo)
  const [perto, setPerto] = useState(false)

  // A névoa da placa de vídeo só existe quando a cena está perto da tela:
  // é criada pouco antes de aparecer e apagada (liberando a memória) quando a
  // cena fica longe. No celular, isso evita várias névoas carregadas ao mesmo tempo.
  useEffect(() => {
    const sistema = sistemaRef.current
    if (!sistema) return
    const observador = new IntersectionObserver(([entrada]) => setPerto(entrada.isIntersecting), {
      rootMargin: '100% 0px',
    })
    observador.observe(sistema)
    return () => observador.disconnect()
  }, [])

  // Liga a névoa na placa de vídeo. Se "Reduzir movimento" mudar, recomeça.
  // Quando a cena se afasta, o canvas sai da página e a névoa é desligada.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!usarWebGL || !perto || !canvas) return
    const controle = iniciarNevoaWebGL(
      canvas,
      { estatico: Boolean(calmo), centro: [centroX, centroY], sensibilidade, intensidade },
      () => setUsarWebGL(false),
    )
    return () => controle?.parar()
  }, [usarWebGL, perto, calmo, centroX, centroY, sensibilidade, intensidade])

  // As imagens do plano B só são geradas se ele for usado.
  const fumaca = useMemo(() => (usarWebGL ? null : texturas()), [usarWebGL])
  const imagem = (url: string): CSSProperties => ({ backgroundImage: `url(${url})` })

  return (
    <motion.div ref={sistemaRef} className={`nevoa-sistema ${className}`} style={style} aria-hidden="true">
      {/* luz ambiente e a fonte forte bem atrás da obsidiana */}
      <div className="nevoa-luz" />
      <div className="nevoa-fonte" />

      {usarWebGL && perto && <canvas ref={canvasRef} className="nevoa-canvas" />}

      {/* plano B: camadas de fumaça deslizando */}
      {fumaca && (
        <div className="nevoa-fumacas" style={{ opacity: intensidade }}>
          <div className="fumaca fumaca-1" style={imagem(fumaca.violeta)} />
          <div className="fumaca fumaca-2" style={imagem(fumaca.lilas)} />
          <div className="fumaca fumaca-3" style={imagem(fumaca.azul)} />
          <div className="fumaca-chao">
            <div className="fumaca fumaca-4" style={imagem(fumaca.violeta)} />
          </div>
        </div>
      )}
    </motion.div>
  )
}

export default Nevoa
