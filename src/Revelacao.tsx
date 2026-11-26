import { useEffect, useRef, type RefObject } from 'react'
import { animate, motion, useMotionValue, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react'
import Nevoa from './Nevoa'
import Obsidiana from './Obsidiana'
import { faixa } from './vooCamera'
import './Revelacao.css'

// Revelação final, em duas cenas de mais ou menos uma tela cada. As duas
// tocam sozinhas, uma vez, quando aparecem (não dependem da rolagem):
// 1. HANDSHAKE: dois computadorzinhos trocam os pacotes SYN, SYN-ACK e ACK
//    de uma conexão TCP; quando o ACK chega, a conexão se acende.
// 2. Obsidiana: uma luz de água e uma de lava se encontram, viram a névoa
//    violeta do site e dela nasce o mesmo bloco da abertura.
// As duas cenas ficam sobre um fundo comum (névoa e luzes), parado na tela:
// a passagem de uma para a outra não tem emenda.
// Com "Reduzir movimento", nada viaja nem cresce: tudo aparece no lugar.

// Textos do documento mestre (sem mudanças)
const TEXTO_HANDSHAKE =
  'Na tecnologia, um handshake é o primeiro passo para estabelecer uma conexão. E foi assim com a gente: antes do primeiro abraço, mesmo longe, já tínhamos encontrado uma maneira de nos conectar.'
const TEXTO_OBSIDIANA =
  'No Minecraft, quando a água encontra uma fonte de lava, nasce a obsidiana. Eu escolhi esse bloco porque me lembra a gente: duas histórias diferentes que se encontraram e criaram algo forte, capaz de abrir caminhos para um mundo novo.'
// Frases curtas em destaque, acima de cada explicação
const FRASE_HANDSHAKE = 'A conexão veio antes do abraço.'
const FRASE_OBSIDIANA = 'Duas histórias, um mundo novo.'

// Curva suave (começa e termina devagar), como um movimento de câmera
const suave = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
// trecho(v, de, ate): 0 antes de "de", 1 depois de "ate", com a curva suave no meio
const trecho = (v: number, de: number, ate: number) => suave(faixa(v, de, ate))

// ---------- Cena 1: handshake TCP ----------

// A troca de pacotes toca sozinha, uma vez, em DURACAO segundos.
// Os números abaixo dizem em que trecho dessa animação (0 = começo, 1 = fim)
// cada coisa acontece.
const DURACAO = 5.8
type Pacote = { rotulo: string; doPrimeiro: boolean; de: number; ate: number }
const PACOTES: Pacote[] = [
  { rotulo: 'SYN', doPrimeiro: true, de: 0.03, ate: 0.21 },
  { rotulo: 'SYN-ACK', doPrimeiro: false, de: 0.26, ate: 0.44 },
  { rotulo: 'ACK', doPrimeiro: true, de: 0.49, ate: 0.67 },
]
const CONEXAO = { de: 0.67, ate: 0.76 } // a linha se acende quando o ACK chega

// Legenda de cada passo (e o trecho da animação em que aparece)
const PASSOS = [
  { texto: 'SYN — o primeiro computador pede para começar uma conexão', de: 0, ate: 0.23 },
  { texto: 'SYN-ACK — o segundo recebe o pedido e responde que aceita', de: 0.23, ate: 0.46 },
  { texto: 'ACK — o primeiro confirma, e os dois estão prontos', de: 0.46, ate: 0.69 },
  { texto: 'Conexão estabelecida', de: 0.69, ate: 2 },
]

// Depois da conexão: a frase em destaque e, logo abaixo, a explicação
const FRASE = { de: 0.7, ate: 0.84 }
const TEXTO = { de: 0.8, ate: 0.96 }

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

// Relógio das duas cenas: toca a animação uma vez, em "duracao" segundos,
// quando a cena aparece (quase toda na tela) e volta ao começo quando ela sai
// totalmente da tela. Assim, ao voltar, a animação recomeça do zero.
// Devolve o andamento, de 0 (começo) a 1 (fim). Com "Reduzir movimento",
// fica direto no fim.
function useTocarUmaVez(palco: RefObject<HTMLDivElement | null>, calmo: boolean, duracao: number) {
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
        // (encostada na borda, com só uma fresta de menos de 2% à vista, também conta como fora)
        if (!entrada.isIntersecting || entrada.intersectionRatio < 0.02) {
          // saiu totalmente da tela: volta ao começo
          tocando?.stop()
          tocando = null
          jaTocou = false
          andamento.set(0)
        } else if (entrada.intersectionRatio >= 0.6 && !jaTocou) {
          jaTocou = true
          tocando = animate(andamento, 1, { duration: duracao, ease: 'linear' })
        }
      },
      { threshold: [0, 0.02, 0.6] },
    )
    observador.observe(elemento)
    return () => {
      observador.disconnect()
      tocando?.stop()
    }
  }, [andamento, calmo, palco, duracao])

  return andamento
}

type PropsCena = {
  palco: RefObject<HTMLDivElement | null>
  a: MotionValue<number> // andamento da animação da cena (0 a 1)
  calmo: boolean
}

function CenaHandshake({ palco, a, calmo }: PropsCena) {
  // "Reduzir movimento": a conexão já aparece pronta, sem pacotes viajando
  const conexao = useTransform(a, (v) => (calmo ? 1 : faixa(v, CONEXAO.de, CONEXAO.ate)))
  const telas = useTransform(conexao, [0, 1], [0.35, 1])
  const telasAcesas = useTransform(conexao, [0, 1], [0, 0.22])
  const frase = useTransform(a, (v) => (calmo ? 1 : trecho(v, FRASE.de, FRASE.ate)))
  const fraseY = useTransform(frase, [0, 1], [12, 0])
  const texto = useTransform(a, (v) => (calmo ? 1 : trecho(v, TEXTO.de, TEXTO.ate)))
  const textoY = useTransform(texto, [0, 1], [12, 0])

  return (
    <section className="rev rev-handshake" aria-label="Handshake">
      <div ref={palco} className="rev-palco">
        <div className="rev-conteudo">
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

          <div className="rev-textos">
            <motion.p className="rev-destaque" style={{ opacity: frase, y: calmo ? 0 : fraseY }}>
              {FRASE_HANDSHAKE}
            </motion.p>
            <motion.p className="rev-texto rev-texto-menor" style={{ opacity: texto, y: calmo ? 0 : textoY }}>
              {TEXTO_HANDSHAKE}
            </motion.p>
          </div>
        </div>
      </div>
    </section>
  )
}

// ---------- Cena 2: duas luzes = obsidiana ----------
// Abstrata e calma: uma luz azul-esverdeada (a água) e uma luz laranja (a
// lava) entram de lados opostos e se aproximam devagar. Ao se encontrarem, se
// fundem na névoa violeta do site; dela surge a obsidiana da abertura e, com
// ela se estabilizando, a frase e a explicação.
// As luzes e a névoa ficam no fundo comum das duas cenas (FundoComum, abaixo);
// aqui ficam só a obsidiana e o texto.
// Não depende da rolagem: toca sozinha, uma vez, quando a cena aparece.
const DURACAO_OBSIDIANA = 8 // segundos

function CenaObsidiana({ palco, a, calmo, secao }: PropsCena & { secao: RefObject<HTMLElement | null> }) {
  // a obsidiana surge da névoa e se estabiliza
  const bloco = useTransform(a, (v) => (calmo ? 1 : trecho(v, 0.55, 0.82)))
  const blocoEscala = useTransform(bloco, [0, 1], [0.92, 1])
  const blocoY = useTransform(bloco, [0, 1], [14, 0])
  // a frase e a explicação aparecem enquanto ela se estabiliza
  const frase = useTransform(a, (v) => (calmo ? 1 : trecho(v, 0.7, 0.88)))
  const fraseY = useTransform(frase, [0, 1], [12, 0])
  const texto = useTransform(a, (v) => (calmo ? 1 : trecho(v, 0.78, 0.96)))
  const textoY = useTransform(texto, [0, 1], [12, 0])

  return (
    <section ref={secao} className="rev rev-obsidiana" aria-label="Obsidiana">
      <div ref={palco} className="rev-palco">
        <div className="lv-centro">
          <motion.div className="lv-bloco" style={{ opacity: bloco, scale: calmo ? 1 : blocoEscala, y: calmo ? 0 : blocoY }}>
            <Obsidiana calmo={calmo} />
          </motion.div>
          <div className="rev-textos">
            <motion.p className="rev-destaque" style={{ opacity: frase, y: calmo ? 0 : fraseY }}>
              {FRASE_OBSIDIANA}
            </motion.p>
            <motion.p className="rev-texto rev-texto-menor" style={{ opacity: texto, y: calmo ? 0 : textoY }}>
              {TEXTO_OBSIDIANA}
            </motion.p>
          </div>
        </div>
        <footer className="rodape">Criado por Guilherme Souza</footer>
      </div>
    </section>
  )
}

// ---------- Fundo comum das duas cenas ----------
// Uma camada só, parada na tela enquanto as duas cenas rolam por cima dela:
// a névoa (com as partículas), a luz violeta e as luzes da água e da lava.
// Como é a mesma camada nas duas cenas, não existe emenda entre elas: a névoa
// simplesmente continua. Cada luz muda de intensidade aos poucos, pela rolagem
// e pelas animações, sem saltos de brilho.
type PropsFundo = {
  aHandshake: MotionValue<number>
  aObsidiana: MotionValue<number>
  entrada: MotionValue<number> // 0 = só o handshake na tela; 1 = a cena da obsidiana ocupa a tela
  calmo: boolean
}

function FundoComum({ aHandshake, aObsidiana, entrada, calmo }: PropsFundo) {
  // quanto da cena da obsidiana já entrou (com curva suave)
  const vis = useTransform(entrada, (e) => suave(e))
  // névoa: acende com a conexão do handshake (no mesmo nível de antes:
  // 70% de intensidade x 70% de opacidade = 0,49), continua igual durante a
  // passagem e fica mais forte quando as luzes se fundem
  const nevoa = useTransform([aHandshake, aObsidiana, vis], ([h, o, e]: number[]) => {
    const conexao = calmo ? 1 : faixa(h, CONEXAO.de, CONEXAO.ate)
    const naObsidiana = 0.49 + 0.41 * (calmo ? 1 : trecho(o, 0.42, 0.8))
    return conexao * 0.49 * (1 - e) + naObsidiana * e
  })
  // as luzes vão surgindo nas laterais conforme a cena da obsidiana entra;
  // ficam um pouco mais fortes ao se aproximar e se dissolvem ao se encontrar
  const luzes = useTransform([aObsidiana, entrada], ([o, e]: number[]) => {
    if (calmo) return 0
    const surgir = suave(Math.min(1, e / 0.6))
    return (0.55 * surgir + 0.3 * trecho(o, 0, 0.4)) * (1 - trecho(o, 0.42, 0.72))
  })
  // as luzes se aproximam devagar, das bordas até o centro
  const aproximacao = useTransform(aObsidiana, (v) => trecho(v, 0, 0.58))
  const aguaX = useTransform(aproximacao, (t) => `${-40 * (1 - t)}vw`)
  const lavaX = useTransform(aproximacao, (t) => `${40 * (1 - t)}vw`)
  const luzesEscala = useTransform(aObsidiana, (v) => 1 - 0.25 * trecho(v, 0.38, 0.7))
  // enquanto se aproximam, as duas cores vão ganhando o violeta do site:
  // o encontro já nasce violeta (sem misturar em cinza)
  const tomVioleta = useTransform(aObsidiana, (v) => trecho(v, 0.18, 0.5))
  const tomProprio = useTransform(tomVioleta, (t) => 1 - t)
  // no encontro nasce a luz violeta (e some de novo se a pessoa voltar para o handshake)
  const violeta = useTransform([aObsidiana, vis], ([o, e]: number[]) => (calmo ? 1 : trecho(o, 0.36, 0.68)) * e)
  const violetaEscala = useTransform(aObsidiana, (v) => 0.6 + 0.4 * trecho(v, 0.36, 0.68))

  return (
    <div className="rev-fundo" aria-hidden="true">
      <motion.div className="rev-fundo-nevoa" style={{ opacity: nevoa }}>
        <Nevoa centroY={0.6} />
      </motion.div>

      <div className="lv-luzes">
        <motion.div className="lv-luz" style={{ x: aguaX, opacity: luzes, scale: luzesEscala }}>
          <motion.div className={calmo ? 'lv-luz-cor lv-agua parado' : 'lv-luz-cor lv-agua'} style={{ opacity: tomProprio }} />
          <motion.div className={calmo ? 'lv-luz-cor lv-roxa parado' : 'lv-luz-cor lv-roxa'} style={{ opacity: tomVioleta }} />
        </motion.div>
        <motion.div className="lv-luz" style={{ x: lavaX, opacity: luzes, scale: luzesEscala }}>
          <motion.div className={calmo ? 'lv-luz-cor lv-lava parado' : 'lv-luz-cor lv-lava'} style={{ opacity: tomProprio }} />
          <motion.div className={calmo ? 'lv-luz-cor lv-roxa parado' : 'lv-luz-cor lv-roxa'} style={{ opacity: tomVioleta }} />
        </motion.div>
        <motion.div className="lv-violeta" style={{ opacity: violeta, scale: violetaEscala }} />
      </div>
    </div>
  )
}

function Revelacao() {
  const calmo = Boolean(useReducedMotion())
  const palcoHandshake = useRef<HTMLDivElement>(null)
  const palcoObsidiana = useRef<HTMLDivElement>(null)
  const secaoObsidiana = useRef<HTMLElement>(null)
  // cada cena toca a própria animação, uma vez, quando aparece
  const aHandshake = useTocarUmaVez(palcoHandshake, calmo, DURACAO)
  const aObsidiana = useTocarUmaVez(palcoObsidiana, calmo, DURACAO_OBSIDIANA)
  // passagem entre as cenas: 0 quando a cena da obsidiana começa a entrar por
  // baixo, 1 quando ela ocupa a tela
  const { scrollYProgress: entrada } = useScroll({ target: secaoObsidiana, offset: ['start end', 'start start'] })

  return (
    <div className="rev-final">
      <FundoComum aHandshake={aHandshake} aObsidiana={aObsidiana} entrada={entrada} calmo={calmo} />
      <CenaHandshake palco={palcoHandshake} a={aHandshake} calmo={calmo} />
      <CenaObsidiana palco={palcoObsidiana} a={aObsidiana} calmo={calmo} secao={secaoObsidiana} />
    </div>
  )
}

export default Revelacao
