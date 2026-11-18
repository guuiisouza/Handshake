import { useRef, useMemo, createElement as h } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react'
import './Abertura.css'

const CORES = ['#07040c', '#0e0818', '#170d26', '#24143a', '#341d55', '#4a2a78', '#6b3fa8']

const DESENHO = [
  '1100011122100011',
  '1000113443100001',
  '0001134654310000',
  '0011345543211000',
  '0112343321001100',
  '1121110000001221',
  '1100000110012343',
  '0000001221124565',
  '0110012343234543',
  '1221123432112221',
  '2343211210000110',
  '3456321000000000',
  '2454321100110001',
  '1232110001221011',
  '0110000012343110',
  '0000110123321000',
]

function texturaObsidiana(): string {
  const canvas = document.createElement('canvas')
  canvas.width = 16
  canvas.height = 16
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const valor = Number(DESENHO[y]?.[x] ?? '0') || 0
      ctx.fillStyle = CORES[valor]
      ctx.fillRect(x, y, 1, 1)
    }
  }
  return canvas.toDataURL()
}

function Abertura() {
  const ref = useRef<HTMLElement>(null)
  const calmo = useReducedMotion()
  const textura = useMemo(texturaObsidiana, [])
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const escala = useTransform(scrollYProgress, [0, 1], [1, 1.6])
  const sumir = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  const faces = ['frente', 'tras', 'direita', 'esquerda', 'topo', 'base'].map((nome) =>
    h('div', { key: nome, className: 'face ' + nome, style: { backgroundImage: 'url(' + textura + ')' } })
  )

  const cubo = h('div', { className: calmo ? 'cubo parado' : 'cubo' }, faces)

  const cena3d = h(motion.div, { className: 'cena3d', style: { scale: calmo ? 1 : escala, opacity: sumir } }, cubo)

  const conteudo = h(
    motion.div,
    {
      className: 'abertura-conteudo',
      initial: { opacity: 0, y: 30 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 1.4, ease: [0.22, 1, 0.36, 1] },
    },
    cena3d
  )

  const dica = h(motion.p, { className: 'abertura-dica', style: { opacity: sumir } }, 'Role para baixo')

  return h(
    'section',
    { ref, className: 'abertura-nova' },
    h('div', { className: 'luz' }),
    h('div', { className: 'nevoa nevoa-1' }),
    h('div', { className: 'nevoa nevoa-2' }),
    conteudo,
    dica
  )
}

export default Abertura