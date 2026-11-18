import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'
import { AnimatePresence, LayoutGroup, motion, MotionConfig, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'motion/react'
import type { ReactNode } from 'react'
import Montanha from './Montanha'
import './Galeria.css'

// As quatro frases marcadas com "provisória" serão trocadas pelas suas.
const FOTOS = [
  { arquivo: 'distancia', frase: 'Não importam os quilômetros entre nós; você sempre foi a pessoa mais próxima de mim.' },
  { arquivo: 'shrek', frase: 'O ogro encontrou a princesa dele.' },
  { arquivo: 'resident-evil', frase: 'Até os jogos de terror ficaram mais bonitos com você.' },
  { arquivo: 'broad-peak', frase: 'A montanha mais alta que eu já conquistei.' },
  { arquivo: 'mario-peach', frase: 'Atravessei mundos inteiros para chegar até você.' }, // provisória
  { arquivo: 'fisioterapia', frase: 'Você cuida de mim até nas partes que eu não sabia que doíam.' }, // provisória
  { arquivo: 'aeroporto', frase: 'O abraço que eu ensaiei durante meses.' }, // provisória
  { arquivo: 'casamento', frase: 'E a estrada continua, agora com você do meu lado.' }, // provisória
]

// Proporção (altura / largura) de cada imagem: quase todas são quadradas
const PROPORCAO: Record<string, number> = { 'mario-peach': 822 / 900 }
const proporcao = (arquivo: string) => PROPORCAO[arquivo] ?? 1
const caminho = (arquivo: string) => `/fotos/${arquivo}.webp`

// Mesa do computador: posição (em % da mesa) e inclinação de cada foto,
// arrumadas à mão para parecerem fotos de papel espalhadas, não uma grade.
const MESA = [
  { x: 7, y: 17, giro: -6 },
  { x: 29, y: 11, giro: 4 },
  { x: 52, y: 16, giro: -3 },
  { x: 74, y: 10, giro: 7 },
  { x: 10, y: 53, giro: 5 },
  { x: 32, y: 57, giro: -4 },
  { x: 55, y: 51, giro: 6 },
  { x: 76, y: 56, giro: -5 },
]

// No iPhone, as fotos de cada par se inclinam para lados opostos
const giroCelular = (i: number) => (i % 2 === 0 ? -4 : 4)

// true no computador (tela larga e mouse); false no iPhone e em telas de toque
const CONSULTA_MESA = '(min-width: 900px) and (pointer: fine)'
function useMesa() {
  return useSyncExternalStore(
    (avisar) => {
      const m = window.matchMedia(CONSULTA_MESA)
      m.addEventListener('change', avisar)
      return () => m.removeEventListener('change', avisar)
    },
    () => window.matchMedia(CONSULTA_MESA).matches,
  )
}

// Movimento da foto entre o lugar dela e o centro da tela
const VOO_FOTO = { type: 'spring', stiffness: 220, damping: 30, mass: 0.9 } as const

// ---------- Reflexo ----------
// Brilho suave passando pela foto, como luz em papel fotográfico.
// A própria foto serve de máscara: o brilho só aparece sobre a Polaroid,
// nunca no fundo transparente em volta.
function Brilho({ arquivo, atraso }: { arquivo: string; atraso: number }) {
  const mascara = `url(${caminho(arquivo)})`
  const estilo: CSSProperties = { WebkitMaskImage: mascara, maskImage: mascara }
  return (
    <span className="polaroid-brilho" style={estilo} aria-hidden="true">
      <span className="polaroid-brilho-faixa" style={{ animationDelay: `${atraso}s` }} />
    </span>
  )
}

function Imagem({ arquivo }: { arquivo: string }) {
  return (
    <img
      src={caminho(arquivo)}
      alt=""
      width={900}
      height={Math.round(900 * proporcao(arquivo))}
      loading="lazy"
      decoding="async"
      draggable={false}
    />
  )
}

// ---------- Foto no lugar (mesa ou par do iPhone) ----------

type PropsFoto = {
  indice: number
  giro: number
  mesa: boolean
  aberta: boolean
  pousou: boolean
  voltando: boolean
  aoAbrir: (indice: number) => void
  refBotao: (el: HTMLButtonElement | null) => void
}

function FotoNoLugar({ indice, giro, mesa, aberta, pousou, voltando, aoAbrir, refBotao }: PropsFoto) {
  const foto = FOTOS[indice]
  const vaga = { aspectRatio: `1 / ${proporcao(foto.arquivo)}` }

  // Enquanto está ampliada, fica só a "vaga" guardando o lugar dela
  if (aberta) return <div className="polaroid-vaga" style={vaga} />

  // Primeira vez: a foto "pousa" na mesa. Voltando da ampliação: só gira de volta.
  const inicial = !pousou
    ? mesa
      ? { opacity: 0, y: -50, scale: 1.08, rotate: giro * 1.8 }
      : { opacity: 0, y: 40, rotate: 0 }
    : voltando
      ? { rotate: 0 }
      : false

  return (
    <motion.button
      ref={refBotao}
      type="button"
      className="polaroid"
      layoutId={`foto-${indice}`}
      initial={inicial}
      animate={pousou ? { opacity: 1, y: 0, scale: 1, rotate: giro } : undefined}
      whileHover={mesa ? { y: -12, scale: 1.05, rotate: giro * 0.4 } : undefined}
      whileTap={{ scale: 0.98 }}
      transition={{
        layout: VOO_FOTO,
        default: { duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: !pousou || voltando ? 0 : mesa ? indice * 0.09 : 0 },
      }}
      style={vaga}
      onClick={() => aoAbrir(indice)}
      aria-label={`Ver de perto: ${foto.frase}`}
    >
      <Imagem arquivo={foto.arquivo} />
      <Brilho arquivo={foto.arquivo} atraso={indice * 1.3} />
    </motion.button>
  )
}

// ---------- Foto ampliada ----------

type PropsAmpliada = {
  indice: number
  giroOrigem: number
  // computador: setas para passar de foto; iPhone: só a foto e a legenda
  comNavegacao: boolean
  aoFechar: () => void
  aoNavegar: (passo: number) => void
}

function Ampliada({ indice, giroOrigem, comNavegacao, aoFechar, aoNavegar }: PropsAmpliada) {
  const foto = FOTOS[indice]
  const fechar = useRef<HTMLButtonElement>(null)
  const fundo = useRef<HTMLDivElement>(null)

  // Teclado: Esc fecha, setas passam de foto
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar()
      else if (comNavegacao && e.key === 'ArrowRight') aoNavegar(1)
      else if (comNavegacao && e.key === 'ArrowLeft') aoNavegar(-1)
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [aoFechar, aoNavegar, comNavegacao])

  // Foco vai para o botão de fechar (para quem usa teclado ou leitor de tela)
  useEffect(() => {
    fechar.current?.focus({ preventScroll: true })
  }, [])

  // No iPhone, impede que arrastar o dedo sobre o fundo role a página por trás
  useEffect(() => {
    const el = fundo.current
    if (!el) return
    const travar = (e: TouchEvent) => e.preventDefault()
    el.addEventListener('touchmove', travar, { passive: false })
    return () => el.removeEventListener('touchmove', travar)
  }, [])

  return (
    <div className="ampliada" role="dialog" aria-modal="true" aria-label="Foto ampliada">
      <motion.div
        ref={fundo}
        className="ampliada-fundo"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.45 }}
        onClick={aoFechar}
      />

      <div className="ampliada-conteudo">
        <motion.div
          key={foto.arquivo}
          className="polaroid polaroid-ampliada"
          layoutId={`foto-${indice}`}
          initial={{ rotate: giroOrigem }}
          animate={{ rotate: 0 }}
          exit={{ rotate: giroOrigem }}
          transition={{ layout: VOO_FOTO, default: VOO_FOTO }}
          style={{ aspectRatio: `1 / ${proporcao(foto.arquivo)}` }}
        >
          <Imagem arquivo={foto.arquivo} />
          <Brilho arquivo={foto.arquivo} atraso={0.6} />
        </motion.div>

        <motion.p
          key={`frase-${foto.arquivo}`}
          className="ampliada-frase"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.25, duration: 0.5 } }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          aria-live="polite"
        >
          {foto.frase}
        </motion.p>
      </div>

      <motion.div
        className="ampliada-controles"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { delay: 0.2 } }}
        exit={{ opacity: 0, transition: { duration: 0.15 } }}
      >
        <button type="button" className="ampliada-botao ampliada-fechar" ref={fechar} onClick={aoFechar} aria-label="Fechar">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        {comNavegacao && (
          <div className="ampliada-navegacao">
            <button type="button" className="ampliada-botao" onClick={() => aoNavegar(-1)} aria-label="Foto anterior">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
            </button>
            <span className="ampliada-contador">{indice + 1} de {FOTOS.length}</span>
            <button type="button" className="ampliada-botao" onClick={() => aoNavegar(1)} aria-label="Próxima foto">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

// ---------- Par de fotos do iPhone: uma "cena" ----------
// A rolagem guia a troca de cena: o par que sai se afasta (fica menor) e some,
// e o próximo vem de longe, crescendo e aparecendo. No meio da troca, a neve
// do cume fica mais forte (Galeria.tsx > --vao) e faz a passagem.
// Com "Reduzir movimento": só aparece e some, sem mudar de tamanho.
function ParCena({ aoEntrar, children }: { aoEntrar: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const calmo = useReducedMotion()
  // 0 = o par começa a entrar por baixo; 0.5 = no centro da tela; 1 = saiu por cima
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const escala = useTransform(scrollYProgress, [0, 0.35, 0.5, 0.65, 1], [0.8, 0.97, 1, 0.97, 0.8])
  const opacidade = useTransform(scrollYProgress, [0.1, 0.38, 0.62, 0.9], [0, 1, 1, 0])

  return (
    <motion.div ref={ref} className="galeria-par" onViewportEnter={aoEntrar} viewport={{ once: true, amount: 0.3 }}>
      <motion.div className="par-cena" style={calmo ? { opacity: opacidade } : { opacity: opacidade, scale: escala }}>
        {children}
      </motion.div>
    </motion.div>
  )
}

// ---------- Galeria ----------

function Galeria() {
  const mesa = useMesa()
  const [aberta, setAberta] = useState<number | null>(null)
  const [voltando, setVoltando] = useState<number | null>(null)
  // quais fotos já "pousaram" (a entrada só acontece uma vez)
  const [pousadas, setPousadas] = useState<Set<number>>(() => new Set())
  const botoes = useRef<(HTMLButtonElement | null)[]>([])
  const ultimaAberta = useRef<number | null>(null)
  const secao = useRef<HTMLElement>(null)
  const fundo = useRef<HTMLDivElement>(null)

  // Rolagem pela galeria: 0 quando ela começa a entrar na tela, 1 no fim.
  // Move a montanha (parallax) e decide o quanto a neve do cume aparece.
  const { scrollYProgress } = useScroll({ target: secao, offset: ['start end', 'end end'] })
  // 0 com uma cena no centro da tela, 1 com um vão no centro (vai para a montanha)
  const vao = useMotionValue(0)

  // Neve soprada do cume: mais visível nos vãos entre as cenas (onde não há
  // foto) e mais discreta quando um par (ou a mesa) está no centro da tela.
  // Só muda uma variável CSS (--vao): nada é redesenhado pelo React.
  const atualizarNeve = useCallback(() => {
    const el = secao.current
    const f = fundo.current
    if (!el || !f) return
    const altura = window.innerHeight
    let distancia = Infinity
    el.querySelectorAll<HTMLElement>('.galeria-par, .galeria-mesa').forEach((cena) => {
      const r = cena.getBoundingClientRect()
      distancia = Math.min(distancia, Math.abs(r.top + r.height / 2 - altura / 2) / altura)
    })
    // a passagem usa todo o caminho entre o par (5% de uma tela do centro) e o
    // meio do vão (50%): assim a nuvem anda devagar em relação à rolagem
    const t = Math.min(Math.max((distancia - 0.05) / 0.45, 0), 1)
    const forca = t * t * (3 - 2 * t)
    f.style.setProperty('--vao', forca.toFixed(3))
    vao.set(forca)
  }, [vao])

  useMotionValueEvent(scrollYProgress, 'change', atualizarNeve)
  useEffect(() => {
    atualizarNeve()
    window.addEventListener('resize', atualizarNeve)
    return () => window.removeEventListener('resize', atualizarNeve)
  }, [atualizarNeve, mesa])

  const giro = (i: number) => (mesa ? MESA[i].giro : giroCelular(i))

  const pousar = useCallback((indices: number[]) => {
    setPousadas((atual) => {
      if (indices.every((i) => atual.has(i))) return atual
      const novo = new Set(atual)
      indices.forEach((i) => novo.add(i))
      return novo
    })
  }, [])

  const abrir = useCallback((i: number) => {
    ultimaAberta.current = i
    setVoltando(null)
    setAberta(i)
  }, [])

  const fechar = useCallback(() => {
    setVoltando(ultimaAberta.current)
    setAberta(null)
  }, [])

  const navegar = useCallback((passo: number) => {
    const atual = ultimaAberta.current
    if (atual === null) return
    const proxima = (atual + passo + FOTOS.length) % FOTOS.length
    ultimaAberta.current = proxima
    setVoltando(atual) // a foto atual volta para o lugar dela...
    setAberta(proxima) // ...e a próxima vem para o centro
  }, [])

  // Com uma foto ampliada, a página não rola por trás
  useEffect(() => {
    if (aberta === null) return
    const html = document.documentElement
    const anterior = html.style.overflow
    html.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    return () => {
      html.style.overflow = anterior
      document.body.style.overflow = ''
    }
  }, [aberta])

  // Ao fechar, o foco volta para a foto de onde saiu
  useEffect(() => {
    if (aberta !== null || voltando === null) return
    const id = requestAnimationFrame(() => botoes.current[voltando]?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(id)
  }, [aberta, voltando])

  const foto = (i: number) => (
    <FotoNoLugar
      indice={i}
      giro={giro(i)}
      mesa={mesa}
      aberta={aberta === i}
      pousou={pousadas.has(i)}
      voltando={voltando === i}
      aoAbrir={abrir}
      refBotao={(el) => {
        botoes.current[i] = el
      }}
    />
  )

  return (
    <MotionConfig reducedMotion="user">
      <LayoutGroup>
        <section ref={secao} className={aberta !== null ? 'galeria com-ampliada' : 'galeria'} aria-label="Nossas Memórias">
          {/* fundo fixo: a montanha (com parallax) fica atrás das fotos */}
          <div ref={fundo} className="galeria-fundo">
            <Montanha subida={scrollYProgress} vao={vao} nuvemNosVaos={!mesa} />
          </div>

          <header className="galeria-cabecalho">
            <h2 className="galeria-titulo">Nossas Memórias</h2>
            <p className="galeria-dica">{mesa ? 'Clique numa foto para ver de perto' : 'Toque numa foto para ver de perto'}</p>
          </header>

          {mesa ? (
            // Computador: as oito fotos numa mesa só
            <motion.div className="galeria-mesa" onViewportEnter={() => pousar(FOTOS.map((_, i) => i))} viewport={{ once: true, amount: 0.35 }}>
              {FOTOS.map((f, i) => (
                <div
                  key={f.arquivo}
                  className="mesa-lugar"
                  style={{ left: `${MESA[i].x}%`, top: `${MESA[i].y}%`, zIndex: i === voltando ? 3 : 1 }}
                >
                  {foto(i)}
                </div>
              ))}
            </motion.div>
          ) : (
            // iPhone: quatro telas, duas fotos em cada
            [0, 2, 4, 6].map((inicio) => (
              <ParCena key={inicio} aoEntrar={() => pousar([inicio, inicio + 1])}>
                {/* a frase aparece só ao tocar na foto, como no computador */}
                {[inicio, inicio + 1].map((i) => (
                  <div key={FOTOS[i].arquivo} className={i % 2 === 0 ? 'par-lugar par-esquerda' : 'par-lugar par-direita'}>
                    {foto(i)}
                  </div>
                ))}
              </ParCena>
            ))
          )}
        </section>

        <AnimatePresence>
          {aberta !== null && (
            <Ampliada indice={aberta} giroOrigem={giro(aberta)} comNavegacao={mesa} aoFechar={fechar} aoNavegar={navegar} />
          )}
        </AnimatePresence>
      </LayoutGroup>
    </MotionConfig>
  )
}

export default Galeria
