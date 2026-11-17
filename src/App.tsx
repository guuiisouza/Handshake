import Cena from './Cena'
import Voo from './Voo'
import Galeria from './Galeria'
import './App.css'

function App() {
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