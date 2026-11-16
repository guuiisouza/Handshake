import { useEffect, useState } from 'react'

const DECOLAGEM = new Date('2026-11-27T09:00:00Z').getTime()
const POUSO = new Date('2026-11-27T19:20:00Z').getTime()

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

  return (
    <main className="abertura">
      <h1 className="logo">HANDSHAKE</h1>
      <p className="frase">Princesa, eu prometi que chegaria até você...</p>

      {progresso < 1 ? (
        <>
          <p className="frase">A cada minuto, mais perto de você.</p>
          <div className="contagem">
            <span>Tempo para o nosso encontro</span>
            <strong>{horas}h {minutos}min</strong>
          </div>
        </>
      ) : (
        <p className="frase">Agora, o oceano já não está entre nós.</p>
      )}

      <div className="barra">
        <div className="barra-cheia" style={{ width: `${progresso * 100}%` }} />
      </div>

      <button className="botao" onClick={onVoltar}>Voltar</button>
    </main>
  )
}

export default Voo