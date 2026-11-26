import { useState } from 'react'
import Abertura from './Abertura'
import Voo from './Voo'
import Galeria from './Galeria'
import Revelacao from './Revelacao'
import Cafeterias from './Cafeterias'
import Instalacao, { estaInstalado } from './Instalacao'
import { usePaginas } from './Paginas'
import { useVotacaoAberta } from './votacao'
import './App.css'

function ehIphone() {
  const ua = window.navigator.userAgent
  const ipadNovo = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return /iPhone|iPad|iPod/.test(ua) || ipadNovo
}

function App() {
  const precisaTutorial = ehIphone() && !estaInstalado()
  const [mostrarApp, setMostrarApp] = useState(!precisaTutorial)
  // troca de página com um deslize (só depois do tutorial de instalação)
  usePaginas(mostrarApp)
  // a escolha da cafeteria só existe até 28/11, 12:00 de Brasília
  const [votacaoAberta, encerrarVotacao] = useVotacaoAberta()

  if (!mostrarApp) {
    return <Instalacao onPular={() => setMostrarApp(true)} />
  }

  return (
    <main className="pagina">
      <Abertura />

      {/* a frase "Princesa, eu prometi que chegaria até você..." agora abre o mapa */}
      <Voo />

      <Galeria />

      {/* depois do prazo, o site termina na obsidiana, com o rodapé */}
      <Revelacao comRodape={!votacaoAberta} />

      {/* última tela (até o prazo): a escolha da cafeteria, com o rodapé no pé */}
      {votacaoAberta && <Cafeterias aoEncerrar={encerrarVotacao} />}
    </main>
  )
}

export default App