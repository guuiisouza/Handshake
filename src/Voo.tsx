import { useEffect, useRef, useState, type RefObject } from 'react'
import { ALTURA, CONTINENTES, GRADE, LARGURA, LISBOA, ROTA, VIRACOPOS } from './mapa'
import { agora, estadoDoVoo, formatarDuracao, type EstadoVoo } from './vooTempo'
import './Voo.css'

// ---------- Rota ----------
// ROTA tem os pontos do caminho mais curto pelo globo, igualmente espaçados
// em distância real. Por isso o progresso (0 a 1) vira um índice direto.

const TOTAL_PONTOS = ROTA.length / 2 - 1
const pontoDaRota = (i: number) => ({ x: ROTA[i * 2], y: ROTA[i * 2 + 1] })

// Posição e direção (em graus) do avião para um progresso de 0 a 1
function posicaoNaRota(progresso: number) {
  const posicao = Math.min(Math.max(progresso, 0), 1) * TOTAL_PONTOS
  const i = Math.min(Math.floor(posicao), TOTAL_PONTOS - 1)
  const f = posicao - i
  const a = pontoDaRota(i)
  const b = pontoDaRota(i + 1)
  return {
    x: a.x + (b.x - a.x) * f,
    y: a.y + (b.y - a.y) * f,
    angulo: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
  }
}

// Caminho SVG da rota inteira
const TRACADO_COMPLETO = Array.from({ length: TOTAL_PONTOS + 1 }, (_, i) => {
  const p = pontoDaRota(i)
  return `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`
}).join('')

// Caminho SVG só do trecho já percorrido
function tracadoPercorrido(progresso: number) {
  const fim = posicaoNaRota(progresso)
  const ultimo = Math.floor(Math.min(Math.max(progresso, 0), 1) * TOTAL_PONTOS)
  let d = `M${ROTA[0]} ${ROTA[1]}`
  for (let i = 1; i <= ultimo; i++) d += `L${ROTA[i * 2]} ${ROTA[i * 2 + 1]}`
  return d + `L${fim.x} ${fim.y}`
}

// ---------- Câmera ----------
// A câmera é o pedaço do mapa que aparece na tela (centro + largura/altura,
// em unidades do mapa). O mapa é bem maior que a tela; a câmera escolhe o
// recorte. Na parte 3c, a rolagem vai mover esta câmera.

type Ponto = { x: number; y: number }
type Camera = { cx: number; cy: number; largura: number; altura: number }
type Tela = { largura: number; altura: number }

// Retângulo que envolve a rota inteira (Lisboa a São Paulo)
const CAIXA_ROTA = (() => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (let i = 0; i < ROTA.length; i += 2) {
    x0 = Math.min(x0, ROTA[i]); x1 = Math.max(x1, ROTA[i])
    y0 = Math.min(y0, ROTA[i + 1]); y1 = Math.max(y1, ROTA[i + 1])
  }
  return { x0, y0, x1, y1 }
})()

// Espaço da tela (em pixels) que a rota NÃO pode ocupar: as faixas de texto
// em cima e embaixo, as laterais e o espaço do nome "Lisboa" à direita.
type Livre = { topo: number; base: number; esquerda: number; direita: number }

// Câmera que encaixa a área pedida dentro do espaço livre da tela (longe dos
// textos), preenchendo a tela inteira com mapa, sem faixas vazias.
// A câmera tem sempre o formato da tela e nunca sai das bordas do mapa.
function enquadrar(area: { x0: number; y0: number; x1: number; y1: number }, tela: Tela, livre: Livre): Camera {
  const larguraLivre = Math.max(tela.largura - livre.esquerda - livre.direita, 60)
  const alturaLivre = Math.max(tela.altura - livre.topo - livre.base, 60)
  // pixels por unidade do mapa: o maior zoom em que a área ainda cabe no espaço livre...
  let escala = Math.min(larguraLivre / (area.x1 - area.x0), alturaLivre / (area.y1 - area.y0))
  // ...mas sem mostrar menos mapa do que a tela precisa para ficar preenchida
  escala = Math.max(escala, tela.largura / LARGURA, tela.altura / ALTURA)
  const largura = tela.largura / escala
  const altura = tela.altura / escala
  // o centro da área vai para o centro do espaço livre
  const centroLivreX = livre.esquerda + larguraLivre / 2
  const centroLivreY = livre.topo + alturaLivre / 2
  const cx = (area.x0 + area.x1) / 2 - (centroLivreX - tela.largura / 2) / escala
  const cy = (area.y0 + area.y1) / 2 - (centroLivreY - tela.altura / 2) / escala
  const limitar = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max)
  return {
    cx: limitar(cx, largura / 2, LARGURA - largura / 2),
    cy: limitar(cy, altura / 2, ALTURA - altura / 2),
    largura,
    altura,
  }
}

// Converte um ponto do mapa em pixels da tela, para posicionar os elementos
// em HTML (marcadores, nomes e avião) por cima do desenho. Assim eles mantêm
// o mesmo tamanho na tela, seja no iPhone ou no computador.
// (Mesma conta do preserveAspectRatio "slice": preenche a tela e corta o excesso.)
function naTela(p: Ponto, camera: Camera, tela: Tela) {
  const escala = Math.max(tela.largura / camera.largura, tela.altura / camera.altura)
  return {
    left: `${(p.x - camera.cx) * escala + tela.largura / 2}px`,
    top: `${(p.y - camera.cy) * escala + tela.altura / 2}px`,
  }
}

// Acompanha o tamanho de um elemento na tela (incluindo o espaçamento interno)
function useTamanho(ref: RefObject<HTMLElement | null>, inicial: Tela): Tela {
  const [tela, setTela] = useState<Tela>(inicial)
  useEffect(() => {
    const elemento = ref.current
    if (!elemento) return
    const observar = new ResizeObserver(() => {
      const { width, height } = elemento.getBoundingClientRect()
      if (width > 0) setTela({ largura: width, altura: height })
    })
    observar.observe(elemento)
    return () => observar.disconnect()
  }, [ref])
  return tela
}

// ---------- Desenhos ----------

// Avião branco minimalista visto de cima, com o nariz apontando para a direita
function Aviao() {
  return (
    <svg className="mapa-aviao-desenho" viewBox="-13 -12 26 24" aria-hidden="true">
      <path d="M12 0C12-1 10.5-1.6 9-1.6L2-1.6-3-11h-2.5l3 9.4H-8l-2.5-3.4H-12l1.5 4.2v1.6L-12 5h1.5L-8 1.6h5.5l-3 9.4H-3L2 1.6h7c1.5 0 3-.6 3-1.6Z" />
    </svg>
  )
}

type PropsMarcador = { ponto: Ponto; nome: string; detalhe?: string; camera: Camera; tela: Tela; comAviao: boolean }

// comAviao: o avião está parado neste marcador; o nome se afasta para não ficar embaixo da asa
function Marcador({ ponto, nome, detalhe, camera, tela, comAviao }: PropsMarcador) {
  return (
    <div className={comAviao ? 'mapa-marcador com-aviao' : 'mapa-marcador'} style={naTela(ponto, camera, tela)}>
      <span className="mapa-marcador-ponto" />
      <span className="mapa-marcador-nome">
        {nome}
        {detalhe && <small>{detalhe}</small>}
      </span>
    </div>
  )
}

// Folgas em pixels em volta da rota: laterais, espaço para o nome "Lisboa"
// (à direita do ponto mais a leste da rota) e para "São Paulo / Viracopos"
// (abaixo do ponto mais ao sul).
const FOLGA_LATERAL = 28
const FOLGA_NOME_LISBOA = 110
const FOLGA_NOME_CAMPINAS = 40
const FOLGA_TEXTO = 20

type PropsMapa = { estado: EstadoVoo; topo: number; base: number }

function MapaVoo({ estado, topo, base }: PropsMapa) {
  const palco = useRef<HTMLDivElement>(null)
  const tela = useTamanho(palco, { largura: window.innerWidth, altura: window.innerHeight })
  const { progresso } = estado
  const aviao = posicaoNaRota(progresso)

  // Por enquanto a câmera fica parada mostrando a rota inteira, entre as
  // faixas de texto. Na parte 3c ela passa a ser controlada pela rolagem.
  const camera = enquadrar(CAIXA_ROTA, tela, {
    topo: topo + FOLGA_TEXTO,
    base: base + FOLGA_TEXTO + FOLGA_NOME_CAMPINAS,
    esquerda: FOLGA_LATERAL,
    direita: FOLGA_LATERAL + FOLGA_NOME_LISBOA,
  })

  const descricao =
    estado.fase === 'antes'
      ? 'Mapa da rota de Lisboa a São Paulo. O avião aguarda em Lisboa.'
      : estado.fase === 'durante'
        ? `Mapa da rota de Lisboa a São Paulo. Pela estimativa dos horários, o avião está a ${Math.round(progresso * 100)}% do caminho.`
        : 'Mapa da rota de Lisboa a São Paulo. O avião está em São Paulo.'
  const viewBox = [
    camera.cx - camera.largura / 2,
    camera.cy - camera.altura / 2,
    camera.largura,
    camera.altura,
  ].join(' ')

  return (
    <div className="mapa-palco" ref={palco} role="img" aria-label={descricao}>
      <svg
        className="mapa-desenho"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="terra" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2a2733" />
            <stop offset="1" stopColor="#1b1921" />
          </linearGradient>
          <radialGradient id="brilhoOceano" cx="0.55" cy="0.45" r="0.6">
            <stop offset="0" stopColor="rgb(168, 92, 255)" stopOpacity="0.08" />
            <stop offset="1" stopColor="rgb(168, 92, 255)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width={LARGURA} height={ALTURA} fill="url(#brilhoOceano)" />
        <path className="mapa-grade" d={GRADE} />
        <path className="mapa-terra" d={CONTINENTES} />

        {/* rota que falta: fina e apagada, com halo bem leve */}
        <path className="mapa-rota mapa-rota-futura-halo" d={TRACADO_COMPLETO} />
        <path className="mapa-rota mapa-rota-futura" d={TRACADO_COMPLETO} />

        {/* trecho percorrido: mais luminoso */}
        <path className="mapa-rota mapa-rota-feita-halo-largo" d={tracadoPercorrido(progresso)} />
        <path className="mapa-rota mapa-rota-feita-halo" d={tracadoPercorrido(progresso)} />
        <path className="mapa-rota mapa-rota-feita" d={tracadoPercorrido(progresso)} />
      </svg>

      <Marcador ponto={LISBOA} nome="Lisboa" camera={camera} tela={tela} comAviao={estado.fase === 'antes'} />
      <Marcador
        ponto={VIRACOPOS}
        nome="São Paulo"
        detalhe="Viracopos"
        camera={camera}
        tela={tela}
        comAviao={estado.fase === 'depois'}
      />

      <div
        className="mapa-aviao"
        style={{ ...naTela(aviao, camera, tela), transform: `translate(-50%, -50%) rotate(${aviao.angulo}deg)` }}
      >
        <Aviao />
      </div>
    </div>
  )
}

// Recalcula o horário ao abrir, ao voltar para o app (depois de ficar em
// segundo plano) e a cada 15 segundos. Não depende do app ficar aberto:
// a posição sai sempre da conta com o relógio.
function useRelogio(): number {
  const [instante, setInstante] = useState(agora)
  useEffect(() => {
    const atualizar = () => setInstante(agora())
    const aoVoltar = () => {
      if (!document.hidden) atualizar()
    }
    const relogio = setInterval(atualizar, 15000)
    document.addEventListener('visibilitychange', aoVoltar)
    window.addEventListener('pageshow', atualizar)
    window.addEventListener('focus', atualizar)
    return () => {
      clearInterval(relogio)
      document.removeEventListener('visibilitychange', aoVoltar)
      window.removeEventListener('pageshow', atualizar)
      window.removeEventListener('focus', atualizar)
    }
  }, [])
  return instante
}

// Textos de cada estado do voo
function textos(estado: EstadoVoo) {
  if (estado.fase === 'antes') {
    return { rotulo: 'Lisboa → São Paulo', principal: `Decolagem em ${formatarDuracao(estado.falta)}`, legenda: null }
  }
  if (estado.fase === 'durante') {
    return {
      rotulo: 'Em voo',
      principal: `Pouso previsto em ${formatarDuracao(estado.falta)}`,
      legenda: 'A cada minuto, mais perto de você.',
    }
  }
  return {
    rotulo: 'São Paulo',
    principal: 'A distância chegou ao fim.',
    legenda: 'Agora, o oceano já não está entre nós.',
  }
}

function Voo() {
  const instante = useRelogio()
  const estado = estadoDoVoo(instante)
  const { rotulo, principal, legenda } = textos(estado)

  // Altura das faixas de texto: a câmera deixa a rota e os marcadores fora delas
  const refTopo = useRef<HTMLElement>(null)
  const refBase = useRef<HTMLElement>(null)
  const topo = useTamanho(refTopo, { largura: 0, altura: 140 }).altura
  const base = useTamanho(refBase, { largura: 0, altura: 80 }).altura

  return (
    <section className="voo" aria-label="A viagem">
      <MapaVoo estado={estado} topo={topo} base={base} />

      <header className="voo-topo" ref={refTopo}>
        <p className="voo-rotulo">{rotulo}</p>
        <p className="voo-principal">{principal}</p>
        {legenda && <p className="voo-legenda">{legenda}</p>}
      </header>

      <footer className="voo-base" ref={refBase}>
        <p className="voo-horarios">Partida 27/11 às 09:00 em Lisboa · Chegada às 16:20 em São Paulo</p>
        <p className="voo-aviso">Trajeto estimado pelos horários previstos. Não é rastreamento em tempo real.</p>
      </footer>
    </section>
  )
}

export default Voo
