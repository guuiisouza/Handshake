import { useEffect, useRef, useState, type RefObject } from 'react'
import { ALTURA, CONTINENTES, GRADE, LARGURA, LISBOA, ROTA, VIRACOPOS } from './mapa'
import './Voo.css'

// Horarios do voo em UTC. Lisboa 09:00 (UTC+0) -> Viracopos 16:20 (UTC-3) = 19:20 UTC.
const DECOLAGEM = new Date('2026-11-27T09:00:00Z').getTime()
const POUSO = new Date('2026-11-27T19:20:00Z').getTime()

// Deixe true para ver o aviao no meio da rota. Troque para false antes de entregar.
const MODO_TESTE = true
const PROGRESSO_TESTE = 0.45

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

// Retângulo que envolve a rota inteira (Lisboa a Campinas)
const CAIXA_ROTA = (() => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (let i = 0; i < ROTA.length; i += 2) {
    x0 = Math.min(x0, ROTA[i]); x1 = Math.max(x1, ROTA[i])
    y0 = Math.min(y0, ROTA[i + 1]); y1 = Math.max(y1, ROTA[i + 1])
  }
  return { x0, y0, x1, y1 }
})()

// Câmera que mostra a área pedida inteira, com folga, e com a MESMA proporção
// da tela (assim o mapa preenche tudo, sem faixas vazias). Nunca sai do mapa.
function enquadrar(area: { x0: number; y0: number; x1: number; y1: number }, tela: Tela, folga = 0.22): Camera {
  const larguraArea = area.x1 - area.x0
  const alturaArea = area.y1 - area.y0
  const margem = Math.max(larguraArea, alturaArea) * folga
  let largura = larguraArea + margem * 2
  let altura = alturaArea + margem * 2
  const proporcaoTela = tela.largura / tela.altura
  // aumenta o lado que falta para ficar com o formato da tela
  if (largura / altura < proporcaoTela) largura = altura * proporcaoTela
  else altura = largura / proporcaoTela
  // não pode ser maior que o próprio mapa
  const reducao = Math.max(largura / LARGURA, altura / ALTURA, 1)
  largura /= reducao
  altura /= reducao
  // centraliza, sem deixar a câmera passar da borda do mapa
  const limitar = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max)
  return {
    cx: limitar((area.x0 + area.x1) / 2, largura / 2, LARGURA - largura / 2),
    cy: limitar((area.y0 + area.y1) / 2, altura / 2, ALTURA - altura / 2),
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

// Acompanha o tamanho de um elemento na tela
function useTamanho(ref: RefObject<HTMLElement | null>): Tela {
  const [tela, setTela] = useState<Tela>({ largura: window.innerWidth, altura: window.innerHeight })
  useEffect(() => {
    const elemento = ref.current
    if (!elemento) return
    const observar = new ResizeObserver(([entrada]) => {
      const { width, height } = entrada.contentRect
      if (width > 0 && height > 0) setTela({ largura: width, altura: height })
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

type PropsMarcador = { ponto: Ponto; nome: string; detalhe?: string; camera: Camera; tela: Tela }

function Marcador({ ponto, nome, detalhe, camera, tela }: PropsMarcador) {
  return (
    <div className="mapa-marcador" style={naTela(ponto, camera, tela)}>
      <span className="mapa-marcador-ponto" />
      <span className="mapa-marcador-nome">
        {nome}
        {detalhe && <small>{detalhe}</small>}
      </span>
    </div>
  )
}

function MapaVoo({ progresso }: { progresso: number }) {
  const palco = useRef<HTMLDivElement>(null)
  const tela = useTamanho(palco)
  const aviao = posicaoNaRota(progresso)

  // Por enquanto a câmera fica parada mostrando a rota inteira.
  // Na parte 3c ela passa a ser controlada pela rolagem.
  const camera = enquadrar(CAIXA_ROTA, tela)
  const viewBox = [
    camera.cx - camera.largura / 2,
    camera.cy - camera.altura / 2,
    camera.largura,
    camera.altura,
  ].join(' ')

  return (
    <div className="mapa-palco" ref={palco}>
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

      <Marcador ponto={LISBOA} nome="Lisboa" camera={camera} tela={tela} />
      <Marcador ponto={VIRACOPOS} nome="Campinas" detalhe="Viracopos" camera={camera} tela={tela} />

      <div
        className="mapa-aviao"
        style={{ ...naTela(aviao, camera, tela), transform: `translate(-50%, -50%) rotate(${aviao.angulo}deg)` }}
      >
        <Aviao />
      </div>
    </div>
  )
}

function Voo({ onVoltar }: { onVoltar: () => void }) {
  const [agora, setAgora] = useState(Date.now())

  useEffect(() => {
    const relogio = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(relogio)
  }, [])

  const total = POUSO - DECOLAGEM
  const progressoReal = Math.min(Math.max((agora - DECOLAGEM) / total, 0), 1)
  const progresso = MODO_TESTE ? PROGRESSO_TESTE : progressoReal

  const falta = Math.max(POUSO - agora, 0)
  const horas = Math.floor(falta / 3600000)
  const minutos = Math.floor((falta % 3600000) / 60000)

  const chegou = agora >= POUSO

  const TOTAL_BLOCOS = 20
  const blocosAcesos = Math.round(progresso * TOTAL_BLOCOS)

  return (
    <div className="voo">
      <div className="voo-coracao">— ♥ —</div>
      <h1 className="voo-titulo">HANDSHAKE</h1>

      <p className="voo-frase">
        {chegou
          ? 'Agora, o oceano já não está entre nós.'
          : 'Princesa, eu prometi que chegaria até você...'}
      </p>

      <MapaVoo progresso={progresso} />

      <p className="voo-legenda">A cada minuto, mais perto de você.</p>

      <div className="voo-contagem">
        <span>✈ Tempo para o nosso encontro</span>
        <strong>{horas}h {minutos}min</strong>
      </div>

      <div className="voo-barra">
        {Array.from({ length: TOTAL_BLOCOS }, (_, i) => (
          <div key={i} className={i < blocosAcesos ? 'voo-bloco aceso' : 'voo-bloco'} />
        ))}
      </div>

        <button className="voo-voltar" onClick={onVoltar}>Nossa história &gt;</button>
    </div>
  )
}

export default Voo
