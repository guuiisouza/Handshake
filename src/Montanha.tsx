import { useCallback, useEffect, useRef } from 'react'
import { motion, useMotionValueEvent, useReducedMotion, useTransform, type MotionValue } from 'motion/react'
import Nevoa from './Nevoa'
import './Montanha.css'

// Montanha discreta ao fundo da galeria: silhueta de um pico alto e pontudo
// (no estilo do K2), em tons de obsidiana e violeta, com a neve soprada pelo
// vento saindo do cume.
//
// A neve soprada é a MESMA névoa da abertura e do mapa (Nevoa.tsx + shader),
// com as mesmas cores e o mesmo movimento, só que pequena e recortada em forma
// de "bandeira" levada pelo vento. Assim ela parece a continuação daquela névoa.
//
// Parallax: "subida" vai de 0 a 1 conforme a pessoa rola pela galeria. O pico
// desce e cresce devagar, e a cordilheira de trás se move menos: é essa
// diferença que dá a sensação de a câmera estar subindo pela montanha.
// Com "Reduzir movimento", a montanha fica parada.
//
// Nuvem dos vãos (iPhone): "vao" vai de 0 (um par no centro da tela) a 1 (vão
// entre dois pares no centro). Nos vãos, uma nuvem feita com o mesmo sistema da
// neve nasce pequena no cume e cresce até o meio da tela, como se a neve
// soprada virasse a nuvem que a câmera atravessa; depois volta para o cume.

// Parallax do pico (os mesmos números usados nos useTransform abaixo)
const PICO_DESCE = 0.18 // desce 18% da altura da caixa ao longo da galeria
const PICO_CRESCE = 0.08 // e cresce 8%
// Na galeria a rolagem é longa: a fumaça se agita só um terço do normal ao rolar
const SENSIBILIDADE_GALERIA = 0.35
// Tamanho da nuvem quando ainda está no cume (em relação ao tamanho no vão)
const NUVEM_NO_CUME = 0.22

type Props = {
  subida: MotionValue<number>
  vao: MotionValue<number>
  nuvemNosVaos: boolean // só no iPhone (no computador a mesa é uma cena só)
}

function Montanha({ subida, vao, nuvemNosVaos }: Props) {
  const calmo = useReducedMotion()
  const raiz = useRef<HTMLDivElement>(null)
  const nuvem = useRef<HTMLDivElement>(null)
  const picoY = useTransform(subida, [0, 1], ['0%', `${PICO_DESCE * 100}%`])
  const picoEscala = useTransform(subida, [0, 1], [1, 1 + PICO_CRESCE])
  const atrasY = useTransform(subida, [0, 1], ['0%', '7%'])
  const atrasEscala = useTransform(subida, [0, 1], [1, 1.03])
  // no finalzinho da galeria a montanha se dissolve no escuro, antes de o fundo
  // fixo voltar a rolar: assim ela nunca aparece cortada na troca de cena
  const presenca = useTransform(subida, [0.86, 0.98], [1, 0])

  // Posiciona a nuvem entre o cume (vão = 0) e o meio da tela (vão = 1).
  // Tudo calculado, sem medir a página: só um transform por quadro.
  const posicionarNuvem = useCallback(() => {
    const caixa = raiz.current
    const el = nuvem.current
    if (!caixa || !el) return
    const v = vao.get()
    const e = v * v * (3 - 2 * v)
    // fora dos vãos a nuvem fica desligada (e a névoa dela para de desenhar)
    el.style.display = e < 0.01 ? 'none' : ''
    el.style.setProperty('--nuvem', e.toFixed(3))
    if (e < 0.01) return

    const L = caixa.clientWidth
    const A = caixa.clientHeight
    const telaA = caixa.parentElement?.clientHeight ?? A
    // escala do desenho (preserveAspectRatio "slice", viewBox 1000 x 460)
    const s = Math.max(L / 1000, A / 460)
    // cume (ponto 560, 58 do desenho), já com o parallax do pico
    const sub = calmo ? 0 : subida.get()
    const k = 1 + PICO_CRESCE * sub
    const cumeX = L / 2 + 60 * s * k
    const cumeY = A - 342 * s * k + PICO_DESCE * sub * A
    // meio da tela (a caixa da montanha fica no pé da tela)
    const meioX = L / 2
    const meioY = A - telaA / 2

    // "Reduzir movimento": a nuvem não voa; só aparece no meio do vão
    const t = calmo ? 1 : e
    const x = cumeX + (meioX - cumeX) * t
    const y = cumeY + (meioY - cumeY) * t
    const escala = NUVEM_NO_CUME + (1 - NUVEM_NO_CUME) * t
    el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${escala})`
  }, [calmo, subida, vao])

  useMotionValueEvent(subida, 'change', posicionarNuvem)
  useMotionValueEvent(vao, 'change', posicionarNuvem)
  useEffect(() => {
    posicionarNuvem()
    window.addEventListener('resize', posicionarNuvem)
    return () => window.removeEventListener('resize', posicionarNuvem)
  }, [posicionarNuvem, nuvemNosVaos])

  return (
    <motion.div ref={raiz} className="montanha" style={{ opacity: presenca }} aria-hidden="true">
      {/* cordilheira de trás, mais apagada (profundidade) */}
      <motion.div className="montanha-camada" style={calmo ? undefined : { y: atrasY, scale: atrasEscala }}>
        <svg className="montanha-desenho" viewBox="0 -60 1000 460" preserveAspectRatio="xMidYMax slice">
          <defs>
            <linearGradient id="montanhaAtras" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1c1530" />
              <stop offset="1" stopColor="#0b0710" />
            </linearGradient>
          </defs>
          <path
            className="montanha-atras"
            d="M0 400V250l70-28 60 14 70-46 55 22 60-40 48 18 52-30 40 26 70-50 62 40 58-22 66 34 60-18 70 40 60-20 99 32V400Z"
          />
        </svg>
      </motion.div>

      {/* pico principal, com a neve soprada saindo do cume */}
      <motion.div className="montanha-camada" style={calmo ? undefined : { y: picoY, scale: picoEscala }}>
        <svg className="montanha-desenho" viewBox="0 -60 1000 460" preserveAspectRatio="xMidYMax slice">
          <defs>
            <linearGradient id="montanhaCorpo" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#241a38" />
              <stop offset="0.55" stopColor="#150e22" />
              <stop offset="1" stopColor="#0b0710" />
            </linearGradient>
            {/* neve iluminada no alto, que se apaga descendo */}
            <linearGradient id="montanhaNeve" x1="0" y1="58" x2="0" y2="122" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="rgb(226, 204, 255)" stopOpacity="0.38" />
              <stop offset="1" stopColor="rgb(226, 204, 255)" stopOpacity="0" />
            </linearGradient>
          </defs>

          <path
            className="montanha-corpo"
            d="M0 400V300l80-30 70 15 80-55 70 20 60-45 60-35 50-35 40-30 35-30 15-17 15 14 25 26 40 32 50 45 40-10 60 50 70 25 60-12 80 34V400Z"
          />
          {/* neve no alto do pico, seguindo as cristas */}
          <path className="montanha-neve" d="M560 58l-15 17-35 30-40 30h170l-40-32-25-26Z" />
          {/* face da direita, na sombra (a luz vem de cima, à esquerda) */}
          <path className="montanha-sombra" d="M560 58l15 14 25 26 40 32 50 45 40-10 60 50-120 125-70-90-30-70-12-60Z" />
          {/* luz violeta bem leve contornando a crista */}
          <path className="montanha-crista" d="M230 230l70 20 60-45 60-35 50-35 40-30 35-30 15-17 15 14 25 26 40 32 50 45" />
        </svg>

        {/* neve soprada pelo vento: a névoa do site, saindo do cume para a direita.
            centroX bem fora da caixa = sem "área livre" no meio, névoa por toda a bandeira */}
        <div className="montanha-vento">
          <Nevoa centroX={-4} centroY={0.5} sensibilidade={SENSIBILIDADE_GALERIA} />
        </div>
      </motion.div>

      {/* nuvem dos vãos (iPhone): o mesmo sistema da neve, nascendo do cume */}
      {nuvemNosVaos && (
        <div ref={nuvem} className="montanha-nuvem" style={{ display: 'none' }}>
          <Nevoa centroX={-4} centroY={0.5} sensibilidade={SENSIBILIDADE_GALERIA} />
        </div>
      )}
    </motion.div>
  )
}

export default Montanha
