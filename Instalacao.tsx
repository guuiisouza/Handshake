import { useState } from 'react'
import Cena from './Cena'
import Voo from './Voo'
import Galeria from './Galeria'
import Instalacao, { estaInstalado } from './Instalacao'
import './App.css'

function ehIphone() {
  const ua = window.navigator.userAgent
  const ipadNovo = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return /iPhone|iPad|iPod/.test(ua) || ipadNovo
}

function App() {
  const precisaTutorial = ehIphone() && !estaInstalado()
  const [mostrarApp, setMostrarApp] = useState(!precisaTutorial)

  if (!mostrarApp) {
    return <Instalacao onPular={() => setMostrarApp(true)} />
  }

  return (
    <main className="pagina">
      <Cena>
        <h1 className="logo">HANDSHAKE</h1>
        <p className="frase">Algumas distâncias existem apenas para serem vencidas.</p>
        <p className="dica">Role para baixo</p>
      </Cena>

      <Cena>
        <p className="frase-grande">Princesa, eu prometi que chegaria até você...</p>
      </Cena>

      <Voo onVoltar={() => {}} />

      <Galeria />
    </main>
  )
}

export default App