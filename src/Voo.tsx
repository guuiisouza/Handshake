import { useEffect, useState } from 'react'

const DECOLAGEM = new Date('2026-11-27T09:00:00Z').getTime()
const POUSO = new Date('2026-11-27T19:20:00Z').getTime()

const LISBOA = { x: 290, y: 60 }
const CURVA = { x: 170, y: 20 }
const VIRACOPOS = { x: 70, y: 190 }

function pontoNaRota(t: number) {
  const a = (1 - t) * (1 - t)
  const b = 2 * (1 - t) * t
  const c = t * t
  return {
    x: a * LISBOA.x + b * CURVA.x + c * VIRACOPOS.x,
    y: a * LISBOA.y + b * CURVA.y + c * VIRACOPOS.y,
  }
}

function Voo({ onVoltar }: { onVoltar: () => void }) {
  const [agora, setAgora] = useState(Date.now())

  useEffect(() => {
    const relogio = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(relogio)
  }, [])

  const total = POUSO - DECOLAGEM
  const progresso = Math.min(Math.max((agora - DECOLAGEM) / total, 0), 1)
  const falta = Math.max(POUSO - agora, 0)
  const horas = Math.floor(falta / 3600000)
  const minutos = Math.floor((falta % 3600000) / 60000)
  const aviao = pontoNaRota(progresso)
  const chegou = agora >= POUSO

  return (
    <div className="abertura">
      <h1 className="logo">HANDSHAKE</h1>

      <p className="frase">
        {chegou
          ? 'Agora, o oceano já não está entre nós.'
          : 'Princesa, eu prometi que chegaria até você...'}
      </p>

      <svg viewBox="0 0 360 220" style={{ width: '100%', maxWidth: 360 }}>
        <path
          d={`M ${LISBOA.x} ${LISBOA.y} Q ${CURVA.x} ${CURVA.y} ${VIRACOPOS.x} ${VIRACOPOS.y}`}
          fill="none"
          stroke="#b44cff"
          strokeWidth="2"
          strokeDasharray="6 6"
        />
        <rect x={LISBOA.x - 4} y={LISBOA.y - 4} width="8" height="8" fill="#e6c8ff" />
        <rect x={VIRACOPOS.x - 4} y={VIRACOPOS.y - 4} width="8" height="8" fill="#e6c8ff" />
        <text x={LISBOA.x + 10} y={LISBOA.y + 4} fill="#f3eaff" fontSize="12">Lisboa</text>
        <text x={VIRACOPOS.x + 10} y={VIRACOPOS.y + 4} fill="#f3eaff" fontSize="12">Viracopos</text>
        <text x={aviao.x} y={aviao.y} fill="#e6c8ff" fontSize="22" textAnchor="middle">✈</text>
      </svg>

      <div className="contagem">
        <span>Tempo para o nosso encontro</span>
        <strong>{horas}h {minutos}min</strong>
      </div>

      <div className="barra">
        <div className="barra-cheia" style={{ width: `${progresso * 100}%` }} />
      </div>

      <p className="frase">A cada minuto, mais perto de você.</p>

      <button className="botao" onClick={onVoltar}>Voltar</button>
    </div>
  )
}

export default Voo