import { useState } from 'react'
import Abertura from './Abertura'
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
      <Abertura />

      {/* a frase "Princesa, eu prometi que chegaria até você..." agora abre o mapa */}
      <Voo />

      <Galeria />
    </main>
  )
}

export default App