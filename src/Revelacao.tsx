import { useEffect, useRef, type RefObject } from 'react'
import { animate, motion, useMotionValue, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react'
import Nevoa from './Nevoa'
import Obsidiana from './Obsidiana'
import { faixa } from './vooCamera'
import './Revelacao.css'

// Revelação final, em duas cenas guiadas pela rolagem (a tela fica grudada
// enquanto a pessoa rola, como na abertura e no mapa):
// 1. HANDSHAKE: dois computadorzinhos trocam os pacotes SYN, SYN-ACK e ACK
//    de uma conexão TCP; quando o ACK chega, a conexão se acende. Essa troca
//    não depende da rolagem: toca sozinha, uma vez, quando a cena aparece.
// 2. Obsidiana: a água encontra a lava, sobe vapor e nasce o mesmo bloco da abertura.
// Com "Reduzir movimento", nada viaja nem cresce: tudo aparece no lugar.

// Textos do documento mestre (sem mudanças)
const TEXTO_HANDSHAKE =
  'Na tecnologia, um handshake é o primeiro passo para estabelecer uma conexão. E foi assim com a gente: antes do primeiro abraço, mesmo longe, já tínhamos encontrado uma maneira de nos conectar.'
const TEXTO_OBSIDIANA =
  'No Minecraft, quando a água encontra uma fonte de lava, nasce a obsidiana. Eu escolhi esse bloco porque me lembra a gente: duas histórias diferentes que se encontraram e criaram algo forte, capaz de abrir caminhos para um mundo novo.'

// ---------- Cena 1: handshake TCP ----------

// A troca de pacotes toca sozinha, uma vez, em DURACAO segundos.
// Os números abaixo dizem em que trecho dessa animação (0 = começo, 1 = fim)
// cada coisa acontece.
const DURACAO = 4.6
type Pacote = { rotulo: string; doPrimeiro: boolean; de: number; ate: number }
const PACOTES: Pacote[] = [
  { rotulo: 'SYN', doPrimeiro: true, de: 0.04, ate: 0.26 },
  { rotulo: 'SYN-ACK', doPrimeiro: false, de: 0.33, ate: 0.55 },
  { rotulo: 'ACK', doPrimeiro: true, de: 0.62, ate: 0.84 },
]
const CONEXAO = { de: 0.84, ate: 0.96 } // a linha se acende quando o ACK chega

// Legenda de cada passo (e o trecho da animação em que aparece)
const PASSOS = [
  { texto: 'SYN — o primeiro computador pede para começar uma conexão', de: 0, ate: 0.29 },
  { texto: 'SYN-ACK — o segundo recebe o pedido e responde que aceita', de: 0.29, ate: 0.58 },
  { texto: 'ACK — o primeiro confirma, e os dois estão prontos', de: 0.58, ate: 0.87 },
  { texto: 'Conexão estabelecida', de: 0.87, ate: 2 },
]

// Estes continuam presos à rolagem (trecho da rolagem da cena, 0 a 1)
const TEXTO = { de: 0.72, ate: 0.8 }
const SAIDA = { de: 0.93, ate: 1 } // tudo escurece, levando à cena da obsidiana

// Computador retrô em pixel art (30 x 22), desenhado por código, visto de três
// quartos: monitor de tubo (CRT) com a tela acesa, teclado na frente e
// gabinete ao lado. Carcaça nas cores da obsidiana, detalhes em violeta e a
// tela violeta clara. Cada letra é um pixel:
//   k = contorno, o = obsidiana escura, O = obsidiana, p = obsidiana iluminada,
//   v = detalhe violeta, s = tela, S = reflexo na tela, g = linha da tela,
//   . = vazio
const LARGURA_PC = 30
const ALTURA_PC = 22
const MONITOR_E_TECLADO = [
  '..........kkkkkkkkkkkkkkkkk',            // topo do monitor (fundo)
  '.........k' + 'p'.repeat(17) + 'k',      // topo iluminado
  '........k' + 'O'.repeat(17) + 'Opk',     // frente + lateral
  '........kO' + 'k'.repeat(16) + 'Opk',    // moldura de cima da tela
  '........kOk' + 'ssssssssssssss' + 'kOpk',
  '........kOk' + 'sSSsssssssssss' + 'kOpk',
  '........kOk' + 'sSssssssssssss' + 'kOpk',
  '........kOk' + 'ssssssssssssss' + 'kOpk',
  '........kOk' + 'gggggggggggggg' + 'kOpk',
  '........kOk' + 'ssssssssssssss' + 'kOpk',
  '........kOk' + 'sssssssssssSss' + 'kOpk',
  '........kOk' + 'ssssssssssssss' + 'kOpk',
  '........kO' + 'k'.repeat(16) + 'Opk',    // moldura de baixo da tela
  '........k' + 'O'.repeat(14) + 'vOO' + 'Opk',  // frente, com o LED violeta
  '........' + 'k'.repeat(20),              // base do monitor
  '...............koook',                   // pescoço
  '.............kOOOOOOk',                  // pé
  '.........' + 'k'.repeat(19),             // teclado (fundo)
  '.........k' + 'p'.repeat(17) + 'k',      // teclado (topo iluminado)
  '........k' + 'Ov'.repeat(9) + 'k',       // teclas
  '.......k' + 'Ov'.repeat(9) + 'Ok',       // teclas
  '.......' + 'k'.repeat(21),               // teclado (frente)
]
// Gabinete (torre), à esquerda do monitor, das linhas 5 a 21
const GABINETE = [
  'kkkkkkk',
  'kpppppk',
  'kOOOOpk',
  'kOvvOpk', // baia de disco
  'kOOOOpk',
  'kOkkOpk', // entrada do disquete
  'kOOOOpk',
  'kOOOOpk',
  'kOOOOpk',
  'kOOOOpk',
  'kOvOOpk', // LED violeta
  'kOOOOpk',
  'kOOOOpk',
  'kOOOOpk',
  'kOOOOpk',
  'kOOOOpk',
  'kkkkkkk',
]
const DESENHO_PC = MONITOR_E_TECLADO.map((linha, y) => {
  const pixels = linha.padEnd(LARGURA_PC, '.').slice(0, LARGURA_PC).split('')
  const g = GABINETE[y - 5]
  if (g) for (let x = 0; x < g.length; x++) pixels[x] = g[x]
  return pixels.join('')
})
const CORES_PC: Record<string, string> = {
  k: '#06030a',
  o: '#120b1e',
  O: '#1d1430',
  p: '#2e2048',
  v: '#7a4fd6',
  s: '#b9a0f0',
  S: '#ece2ff',
  g: '#9a7fdc',
}
// A tela fica nas colunas 11 a 24 e linhas 4 a 11
const TELA = { x: 11, y: 4, largura: 14, altura: 8 }

// Os pixels são montados uma vez só (o desenho nunca muda)
const PIXELS_PC = DESENHO_PC.flatMap((linha, y) =>
  linha.split('').map((c, x) =>
    c === '.' ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={CORES_PC[c]} />,
  ),
)

type PropsComputador = { brilho: MotionValue<number>; acesa: MotionValue<number>; espelhado?: boolean }

function Computador({ brilho, acesa, espelhado = false }: PropsComputador) {
  return (
    <div className={espelhado ? 'tcp-computador espelhado' : 'tcp-computador'}>
      {/* glow violeta em volta da tela, mais forte quando a conexão se acende */}
      <motion.div className="tcp-tela-luz" style={{ opacity: brilho }} />
      <svg viewBox={`0 0 ${LARGURA_PC} ${ALTURA_PC}`} shapeRendering="crispEdges" aria-hidden="true">
        {PIXELS_PC}
        {/* a tela acende mais forte quando a conexão fecha */}
        <motion.rect
          x={TELA.x}
          y={TELA.y}
          width={TELA.largura}
          height={TELA.altura}
          fill="#ffffff"
          style={{ opacity: acesa }}
        />
      </svg>
    </div>
  )
}

// Um pacote viajando pela linha: o "trilho" tem a largura da linha e anda de
// 0% a 100% (ou ao contrário); o rótulo vai preso no começo dele.
function PacoteNaLinha({ p, pacote }: { p: MotionValue<number>; pacote: Pacote }) {
  const x = useTransform(p, (v) => {
    const t = faixa(v, pacote.de, pacote.ate)
    return `${(pacote.doPrimeiro ? t : 1 - t) * 100}%`
  })
  // aparece ao sair, some ao chegar; fora do trecho, fica escondido
  const opacity = useTransform(p, (v) =>
    v < pacote.de - 0.01 || v > pacote.ate + 0.01
      ? 0
      : faixa(v, pacote.de - 0.01, pacote.de + 0.02) * (1 - faixa(v, pacote.ate - 0.02, pacote.ate + 0.01)),
  )
  return (
    <motion.div className="tcp-trilho" style={{ x }}>
      <motion.span className="tcp-pacote" style={{ opacity }}>
        {pacote.rotulo}
      </motion.span>
    </motion.div>
  )
}

function Legenda({ p, passo }: { p: MotionValue<number>; passo: (typeof PASSOS)[number] }) {
  const opacity = useTransform(p, (v) => faixa(v, passo.de, passo.de + 0.03) * (1 - faixa(v, passo.ate - 0.03, passo.ate)))
  return (
    <motion.p className="tcp-passo" style={{ opacity }}>
      {passo.texto}
    </motion.p>
  )
}

// Toca a troca de pacotes uma vez quando a cena aparece (quase toda na tela)
// e volta ao começo quando ela sai totalmente da tela. Assim, ao voltar, a
// animação recomeça do zero. Com "Reduzir movimento", fica direto no fim.
function useHandshakeSozinho(palco: RefObject<HTMLDivElement | null>, calmo: boolean) {
  const andamento = useMotionValue(calmo ? 1 : 0)

  useEffect(() => {
    if (calmo) {
      andamento.set(1)
      return
    }
    const elemento = palco.current
    if (!elemento) return
    let tocando: ReturnType<typeof animate> | null = null
    let jaTocou = false
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada.isIntersecting) {
          // saiu totalmente da tela: volta ao começo
          tocando?.stop()
          tocando = null
          jaTocou = false
          andamento.set(0)
        } else if (entrada.intersectionRatio >= 0.6 && !jaTocou) {
          jaTocou = true
          tocando = animate(andamento, 1, { duration: DURACAO, ease: 'linear' })
        }
      },
      { threshold: [0, 0.6] },
    )
    observador.observe(elemento)
    return () => {
      observador.disconnect()
      tocando?.stop()
    }
  }, [andamento, calmo, palco])

  return andamento
}

function CenaHandshake() {
  const ref = useRef<HTMLElement>(null)
  const palco = useRef<HTMLDivElement>(null)
  const calmo = Boolean(useReducedMotion())
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  // a troca de pacotes anda no próprio ritmo (0 a 1), sem depender da rolagem
  const a = useHandshakeSozinho(palco, calmo)

  // "Reduzir movimento": a conexão já aparece pronta, sem pacotes viajando
  const conexao = useTransform(a, (v) => (calmo ? 1 : faixa(v, CONEXAO.de, CONEXAO.ate)))
  const telas = useTransform(conexao, [0, 1], [0.35, 1])
  const telasAcesas = useTransform(conexao, [0, 1], [0, 0.22])
  const saida = useTransform(p, (v) => 1 - faixa(v, SAIDA.de, SAIDA.ate))
  // a névoa aparece com a conexão e se apaga junto com o resto no fim da cena
  // (assim a troca para a cena da obsidiana acontece no escuro, sem linha)
  const nevoa = useTransform([conexao, saida], ([c, s]: number[]) => c * 0.7 * s)
  const texto = useTransform(p, (v) => (calmo ? 1 : faixa(v, TEXTO.de, TEXTO.ate)))
  const textoY = useTransform(texto, [0, 1], [16, 0])

  return (
    <section ref={ref} className="rev rev-handshake" aria-label="Handshake">
      <div ref={palco} className="rev-palco">
        {/* a névoa aparece ao redor quando a conexão se acende */}
        <motion.div className="rev-nevoa" style={{ opacity: nevoa }}>
          <Nevoa />
        </motion.div>

        <motion.div className="rev-conteudo" style={{ opacity: saida }}>
          <header className="rev-cabecalho">
            <h2 className="rev-titulo">HANDSHAKE</h2>
            <p className="rev-subtitulo">Como começa uma conexão TCP</p>
          </header>

          <div className="tcp" role="img" aria-label="Dois computadores trocam os sinais SYN, SYN-ACK e ACK e ficam conectados.">
            <Computador brilho={telas} acesa={telasAcesas} />
            <div className="tcp-linha">
              <motion.div className="tcp-conexao" style={{ opacity: conexao }} />
              {!calmo && PACOTES.map((pacote) => <PacoteNaLinha key={pacote.rotulo} p={a} pacote={pacote} />)}
            </div>
            <Computador brilho={telas} acesa={telasAcesas} espelhado />
          </div>

          {calmo ? (
            <ol className="tcp-passos-lista">
              {PASSOS.slice(0, 3).map((passo) => (
                <li key={passo.texto}>{passo.texto}</li>
              ))}
            </ol>
          ) : (
            <div className="tcp-passos" aria-hidden="true">
              {PASSOS.map((passo) => (
                <Legenda key={passo.texto} p={a} passo={passo} />
              ))}
            </div>
          )}

          <motion.p className="rev-texto" style={{ opacity: texto, y: calmo ? 0 : textoY }}>
            {TEXTO_HANDSHAKE}
          </motion.p>
        </motion.div>
      </div>
    </section>
  )
}

// ---------- Cena 2: a água encontra a lava = obsidiana ----------
// Simples e leve: lava incandescente de um lado, água do outro. Elas se
// aproximam com a rolagem e, onde se tocam, sobe vapor que vira a névoa
// violeta do site; dela nasce a obsidiana da abertura.
// Lava e água são só degradês (quase não pesam); a única coisa desenhada pela
// placa de vídeo é o vapor.

function CenaObsidiana() {
  const ref = useRef<HTMLElement>(null)
  const calmo = Boolean(useReducedMotion())
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] })

  // lava e água deslizam das bordas até se encontrarem no meio
  const chegada = useTransform(p, (v) => (calmo ? 1 : faixa(v, 0.02, 0.24)))
  const lavaX = useTransform(chegada, [0, 1], ['-60%', '0%'])
  const aguaX = useTransform(chegada, [0, 1], ['60%', '0%'])
  // depois que a obsidiana nasce, as duas se apagam devagar
  const liquidos = useTransform(p, (v) => (calmo ? 0.35 : 1 - 0.65 * faixa(v, 0.5, 0.66)))
  // brilho quente no ponto onde se tocam
  const toque = useTransform(p, (v) => (calmo ? 0.4 : faixa(v, 0.2, 0.28) * (1 - 0.6 * faixa(v, 0.5, 0.66))))
  // o vapor sobe do ponto de contato e depois se abre pela tela
  const vapor = useTransform(p, (v) => (calmo ? 1 : faixa(v, 0.24, 0.36)))
  const vaporAltura = useTransform(p, (v) => (calmo ? 1 : 0.15 + 0.85 * faixa(v, 0.24, 0.5)))
  const abertura = useTransform(p, (v) => (calmo ? 1 : faixa(v, 0.36, 0.6)))
  const vaporLargura = useTransform(abertura, [0, 1], [0.3, 1.1])
  // a obsidiana surge de dentro da névoa, ainda quente, e esfria
  const bloco = useTransform(p, (v) => (calmo ? 1 : faixa(v, 0.5, 0.62)))
  const blocoEscala = useTransform(bloco, [0, 1], [0.85, 1])
  const calor = useTransform(p, (v) => (calmo ? 0 : faixa(v, 0.5, 0.56) * (1 - faixa(v, 0.58, 0.7))))
  const texto = useTransform(p, (v) => (calmo ? 1 : faixa(v, 0.66, 0.76)))
  const textoY = useTransform(texto, [0, 1], [16, 0])

  return (
    <section ref={ref} className="rev rev-obsidiana" aria-label="Obsidiana">
      <div className="rev-palco">
        <motion.div className="lv-liquidos" style={{ opacity: liquidos }} aria-hidden="true">
          <motion.div className={calmo ? 'lv-lava parado' : 'lv-lava'} style={{ x: lavaX }} />
          <motion.div className={calmo ? 'lv-agua parado' : 'lv-agua'} style={{ x: aguaX }} />
          <motion.div className="lv-toque" style={{ opacity: toque }} />
        </motion.div>

        {/* vapor: laranja embaixo, violeta em cima */}
        <motion.div
          className="lv-vapor"
          style={{ opacity: vapor, scaleX: vaporLargura, scaleY: vaporAltura }}
          aria-hidden="true"
        >
          <Nevoa aparencia="vapor" centroX={-4} centroY={0.5} sensibilidade={0.35} />
        </motion.div>

        {/* a luz violeta do site, atrás de onde a obsidiana vai nascer */}
        <motion.div className="lv-luz" style={{ opacity: abertura }} aria-hidden="true" />

        {/* em cima e embaixo, preto puro: emenda com as cenas vizinhas sem linha */}
        <div className="lv-vinheta" aria-hidden="true" />

        <div className="lv-obsidiana">
          <motion.div style={{ opacity: bloco, scale: calmo ? 1 : blocoEscala }}>
            <Obsidiana calmo={calmo} />
            {/* brilho de lava sobre o bloco, que se apaga quando ele se solidifica */}
            <motion.div className="lv-calor" style={{ opacity: calor }} />
          </motion.div>
        </div>

        <div className="lv-texto">
          <motion.p className="rev-texto" style={{ opacity: texto, y: calmo ? 0 : textoY }}>
            {TEXTO_OBSIDIANA}
          </motion.p>
        </div>
      </div>
    </section>
  )
}

function Revelacao() {
  return (
    <>
      <CenaHandshake />
      <CenaObsidiana />
    </>
  )
}

export default Revelacao
