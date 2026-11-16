import './Menu.css'

const AREAS = [
  { id: 'memorias', icone: '🖼', titulo: 'Nossas\nMemórias' },
  { id: 'cartas', icone: '💌', titulo: 'Cartas\npara Você' },
  { id: 'recadinhos', icone: '💬', titulo: 'Nossos\nRecadinhos' },
  { id: 'trilha', icone: '🎧', titulo: 'Nossa\nTrilha Sonora' },
]

function Menu({ onVoltar }: { onVoltar: () => void }) {
  return (
    <div className="menu-tela">
      <h1 className="menu-titulo">HANDSHAKE</h1>
      <p className="menu-sub">Nossa história, em um só lugar.</p>

      <div className="menu-lista">
        {AREAS.map((area) => (
          <button key={area.id} className="menu-item">
            <span className="menu-icone">{area.icone}</span>
            <span>{area.titulo}</span>
            <span className="menu-seta">&gt;</span>
          </button>
        ))}
      </div>

      <button className="menu-voltar" onClick={onVoltar}>Voltar</button>
    </div>
  )
}

export default Menu