import { useState } from 'react'
import Voo from './Voo'
import Menu from './Menu'
import './App.css'

function App() {
  const [tela, setTela] = useState('abertura')

  if (tela === 'voo') {
    return <Voo onVoltar={() => setTela('menu')} />
  }

  if (tela === 'menu') {
    return <Menu onVoltar={() => setTela('voo')} />
  }

  return (
    <div className="abertura">
      <h1 className="logo">HANDSHAKE</h1>
      <p className="frase">
        Algumas distâncias existem apenas para serem vencidas.
      </p>
      <button className="botao" onClick={() => setTela('voo')}>
        Nossa história &gt;
      </button>
    </div>
  )
}

export default App