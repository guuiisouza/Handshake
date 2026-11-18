import { useState } from 'react'
import './Instalacao.css'

export function estaInstalado() {
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
}

function Instalacao({ onPular }: { onPular: () => void }) {
  const [ajuda, setAjuda] = useState(false)

  return (
    <div className="inst">
      <h1 className="inst-titulo">HANDSHAKE</h1>
      <p className="inst-frase">Princesa, preparei uma coisa para você.</p>
      <p className="inst-sub">Antes, guarde ela na sua tela de início:</p>

      <ol className="inst-passos">
        <li><span>1</span> Toque no botão Compartilhar, o quadradinho com a seta para cima, na barra do Safari.</li>
        <li><span>2</span> Role para baixo e toque em "Adicionar à Tela de Início".</li>
        <li><span>3</span> Toque em "Adicionar", no canto de cima.</li>
        <li><span>4</span> Feche o Safari e abra pelo bloco roxo que apareceu na sua tela.</li>
      </ol>

      <button className="inst-link" onClick={() => setAjuda(!ajuda)}>
        Não encontrei essa opção
      </button>

      {ajuda && (
        <p className="inst-ajuda">
          Confira se você abriu pelo Safari, não por outro navegador. Se o botão Compartilhar não aparecer,
          toque uma vez no meio da tela para a barra voltar. Se ainda assim não der, me manda uma mensagem que eu te ajudo.
        </p>
      )}

      <button className="inst-pular" onClick={onPular}>Ver aqui mesmo</button>
    </div>
  )
}

export default Instalacao