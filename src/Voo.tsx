import { useEffect, useState } from 'react'
import { MAPA, CELULA } from './mapa'
import './Voo.css'

// Horarios do voo em UTC. Lisboa 09:00 (UTC+0) -> Viracopos 16:20 (UTC-3) = 19:20 UTC.
const DECOLAGEM = new Date('2026-11-27T09:00:00Z').getTime()
const POUSO = new Date('2026-11-27T19:20:00Z').getTime()

// Deixe true para ver o aviao no meio da rota. Troque para false antes de entregar.
const MODO_TESTE = true
const PROGRESSO_TESTE = 0.45

const LARGURA = 360
const ALTURA = 252

const LISBOA = { x: 238, y: 75 }
const CURVA = { x: 185, y: 50 }
const VIRACOPOS = { x: 153, y: 214 }

const CORES_TERRA = ['#2b2b33', '#33333c', '#25252d']

// Aviao visto de cima, apontando para a direita. '#' = claro, '+' = sombra.
const DESENHO_AVIAO = [
  '.........####.......',
  '..........####......',
  '...........####.....',
  '...........####.....',
  '..#........#####....',
  '..###......#####....',
  '..#################.',
  '..##################',
  '..+++++++++++++++++.',
  '..+++......+++++....',
  '..+........+++++....',
  '...........++++.....',
  '...........++++.....',
  '..........++++......',
  '.........++++.......',
]
const PIXEL_AVIAO = 1.7

const ESTRELAS = [
  [18, 28], [62, 16], [128, 34], [196, 18], [252, 44],
  [310, 24], [344, 92], [96, 108], [210, 132], [330, 170],
  [36, 162], [120, 196], [268, 206], [60, 232], [300, 240],
]

function pontoNaRota(t: number) {
  const a = (1 - t) * (1 - t)
  const b = 2 * (1 - t) * t
  const c = t * t
  return {
    x: a * LISBOA.x + b * CURVA.x + c * VIRACOPOS.x,
    y: a * LISBOA.y + b * CURVA.y + c * VIRACOPOS.y,
  }
}

function direcaoNaRota(t: number) {
  const dx = 2 * (1 - t) * (CURVA.x - LISBOA.x) + 2 * t * (VIRACOPOS.x - CURVA.x)
  const dy = 2 * (1 - t) * (CURVA.y - LISBOA.y) + 2 * t * (VIRACOPOS.y - CURVA.y)
  return (Math.atan2(dy, dx) * 180) / Math.PI
}

function Continentes() {
  const blocos = []
  for (let linha = 0; linha < MAPA.length; linha++) {
    for (let coluna = 0; coluna < MAPA[linha].length; coluna++) {
      if (MAPA[linha][coluna] === '#') {
        const cor = CORES_TERRA[(linha * 7 + coluna * 13) % CORES_TERRA.length]
        blocos.push(
          <rect
            key={`t${linha}-${coluna}`}
            x={coluna * CELULA}
            y={linha * CELULA}
            width={CELULA - 0.3}
            height={CELULA - 0.3}
            fill={cor}
          />
        )
      }
    }
  }
  return <g>{blocos}</g>
}

function Estrelas() {
  return (
    <g>
      {ESTRELAS.map(([x, y], i) => (
        <rect key={`e${i}`} x={x} y={y} width="2" height="2" fill="#a97ad0" opacity="0.8" />
      ))}
    </g>
  )
}

function Aviao({ x, y, angulo }: { x: number; y: number; angulo: number }) {
  const largura = DESENHO_AVIAO[0].length * PIXEL_AVIAO
  const altura = DESENHO_AVIAO.length * PIXEL_AVIAO
  const pixels = []
  for (let linha = 0; linha < DESENHO_AVIAO.length; linha++) {
    for (let coluna = 0; coluna < DESENHO_AVIAO[linha].length; coluna++) {
      const c = DESENHO_AVIAO[linha][coluna]
      if (c === '#' || c === '+') {
        pixels.push(
          <rect
            key={`a${linha}-${coluna}`}
            x={coluna * PIXEL_AVIAO - largura / 2}
            y={linha * PIXEL_AVIAO - altura / 2}
            width={PIXEL_AVIAO}
            height={PIXEL_AVIAO}
            fill={c === '#' ? '#fbe9ff' : '#cf96ec'}
          />
        )
      }
    }
  }
  return (
    <g transform={`translate(${x} ${y}) rotate(${angulo})`}>
      <g opacity="0.45" filter="url(#brilhoAviao)">{pixels}</g>
      {pixels}
    </g>
  )
}

function BandeiraPortugal({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="0" y="0" width="7" height="12" fill="#1d6b3a" />
      <rect x="7" y="0" width="11" height="12" fill="#c8102e" />
      <rect x="5" y="4" width="4" height="4" fill="#f5d547" />
      <rect x="0" y="0" width="18" height="12" fill="none" stroke="#000000" strokeWidth="1" />
    </g>
  )
}

function BandeiraBrasil({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="0" y="0" width="18" height="12" fill="#1d9b4b" />
      <rect x="4" y="3" width="10" height="6" fill="#f5d547" />
      <rect x="7" y="4" width="4" height="4" fill="#1d4ea8" />
      <rect x="0" y="0" width="18" height="12" fill="none" stroke="#000000" strokeWidth="1" />
    </g>
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

  const aviao = pontoNaRota(progresso)
  const angulo = direcaoNaRota(progresso)
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

      <svg className="voo-mapa" viewBox={`0 0 ${LARGURA} ${ALTURA}`}>
        <defs>
          <filter id="brilhoAviao" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="2.5" />
          </filter>
          <filter id="brilhoRota" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        <Estrelas />
        <Continentes />

        <path
          d={`M ${LISBOA.x} ${LISBOA.y} Q ${CURVA.x} ${CURVA.y} ${VIRACOPOS.x} ${VIRACOPOS.y}`}
          fill="none"
          stroke="#c04dff"
          strokeWidth="5"
          opacity="0.35"
          filter="url(#brilhoRota)"
        />
        <path
          d={`M ${LISBOA.x} ${LISBOA.y} Q ${CURVA.x} ${CURVA.y} ${VIRACOPOS.x} ${VIRACOPOS.y}`}
          fill="none"
          stroke="#f0b8ff"
          strokeWidth="2"
          strokeDasharray="5 6"
          strokeLinecap="square"
        />

        <rect x={LISBOA.x - 9} y={LISBOA.y - 9} width="18" height="18" fill="#c04dff" opacity="0.3" />
        <rect x={LISBOA.x - 5} y={LISBOA.y - 5} width="10" height="10" fill="#f6e3ff" />
        <text x={LISBOA.x + 16} y={LISBOA.y - 2} fill="#ffffff" fontSize="15" fontFamily="'Pixelify Sans', sans-serif">
          Lisboa
        </text>
        <BandeiraPortugal x={LISBOA.x + 16} y={LISBOA.y + 4} />

        <rect x={VIRACOPOS.x - 9} y={VIRACOPOS.y - 9} width="18" height="18" fill="#c04dff" opacity="0.3" />
        <rect x={VIRACOPOS.x - 5} y={VIRACOPOS.y - 5} width="10" height="10" fill="#f6e3ff" />
        <text x={VIRACOPOS.x + 16} y={VIRACOPOS.y - 2} fill="#ffffff" fontSize="15" fontFamily="'Pixelify Sans', sans-serif">
          São Paulo
        </text>
        <text x={VIRACOPOS.x + 38} y={VIRACOPOS.y + 15} fill="#c8a8e0" fontSize="10">
          (Viracopos)
        </text>
        <BandeiraBrasil x={VIRACOPOS.x + 16} y={VIRACOPOS.y + 4} />

        <Aviao x={aviao.x} y={aviao.y} angulo={angulo} />
      </svg>

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