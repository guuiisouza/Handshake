// ---------- Cafeterias: a última tela, com a votação ----------
// Ela escolhe um dos três lugares. O site manda só a letra (a, b ou c) para o
// servidor (worker/index.ts), que traduz para a cafeteria real e manda o e-mail.
// Pode trocar a escolha enquanto a votação estiver aberta.
// Depois do prazo (28/11, 12:00 de Brasília) esta tela nem aparece: quem
// decide é o App.tsx (useVotacaoAberta), e o site termina na obsidiana.
//
// Visual: mesma linha das outras telas (mesma névoa, mesmas classes de texto
// do Handshake e da obsidiana, mesmo respiro), uma tela inteira no paginador.
// iPhone: um cartão por vez, deslizando para os lados. Computador: os três
// lado a lado. Os três cartões têm sempre o mesmo tamanho e o mesmo peso.

import { useEffect, useRef, useState } from 'react'
import Nevoa from './Nevoa'
import { CenaCafe } from './CenasCafe'
import { OPCOES, type Opcao } from './prazoVotacao'
import { escolhaLembrada, lerEstado, votar } from './votacao'
import './Cafeterias.css'

const TITULO = 'Princesa, onde você gostaria que nossa primeira história juntos começasse?'
const SUBTITULO =
  'Preparei três lugares especiais para nós. Cada um tem seu próprio encanto. Escolha aquele que mais combina com você. O destino continua sendo uma surpresa...'

// Cada lugar: título, descrição curta, quatro características e o botão.
// (cena: descrição do desenho, só para leitor de tela)
type Lugar = { titulo: string; descricao: string; pontos: [string, string, string, string]; botao: string; cena: string }
const LUGARES: Record<Opcao, Lugar> = {
  a: {
    titulo: 'Cantinho aconchegante',
    descricao: 'Um café intimista, para conversar sem pressa.',
    pontos: ['Ambiente intimista', 'Decoração agradável', 'Cafés e pequenos lanches', 'Conversas tranquilas'],
    botao: 'Escolho esse cantinho',
    cena: 'Mesa pequena junto a uma janela, duas xícaras fumegando e uma luminária de luz âmbar',
  },
  b: {
    titulo: 'Livros e cafés',
    descricao: 'Entre estantes, um café e uma boa história.',
    pontos: ['Estantes cheias de livros', 'Clima calmo e acolhedor', 'Cafés especiais', 'Tardes sem pressa'],
    botao: 'Quero viver essa história',
    cena: 'Estante alta de livros, mesa com uma xícara e um livro aberto, luz entrando de lado',
  },
  c: {
    titulo: 'Doces e sobremesas',
    descricao: 'Um encontro com gosto de açúcar e carinho.',
    pontos: ['Doces e sobremesas', 'Ambiente leve e charmoso', 'Cafés e chás', 'Momentos doces a dois'],
    botao: 'Escolho esse doce momento',
    cena: 'Balcão com um bolo sob redoma de vidro, duas taças de sorvete e flores numa jarra',
  },
}

const MENSAGEM_FEITA =
  'Escolha feita, princesa! Agora deixa o resto comigo. O lugar ainda é um segredo, mas uma coisa eu posso garantir: não vejo a hora de finalmente estar ao seu lado.'
const ERRO_FALHA = 'Não consegui enviar agora. Tenta de novo em instantes?'
const ERRO_LIMITE = 'Por agora não dá para trocar de novo, mas a sua escolha está guardada.'

// centro de um cartão dentro do trilho que desliza
const centroDe = (el: HTMLElement) => el.offsetLeft + el.offsetWidth / 2

// aoEncerrar: o servidor avisou que o prazo acabou (a seção sai do site)
function Cafeterias({ aoEncerrar }: { aoEncerrar: () => void }) {
  const [escolha, setEscolha] = useState<Opcao | null>(escolhaLembrada)
  const [mudando, setMudando] = useState(false)
  const [enviando, setEnviando] = useState<Opcao | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  // iPhone: qual cartão está no centro da tela (para as bolinhas)
  const trilho = useRef<HTMLUListElement>(null)
  const [visivel, setVisivel] = useState(0)

  // confere com o servidor ao abrir (a escolha pode ter sido feita em outro aparelho)
  useEffect(() => {
    let ativo = true
    lerEstado().then((estado) => {
      if (!ativo) return
      if (!estado.aberta) aoEncerrar()
      else setEscolha(estado.escolha)
    })
    return () => {
      ativo = false
    }
  }, [aoEncerrar])

  const mostrarOpcoes = !escolha || mudando

  // ao trocar a escolha, o cartão da escolha atual já aparece no centro
  useEffect(() => {
    const el = trilho.current
    if (!mudando || !escolha || !el) return
    const cartao = el.children[OPCOES.indexOf(escolha)] as HTMLElement | undefined
    if (cartao) el.scrollLeft = centroDe(cartao) - el.clientWidth / 2
  }, [mudando, escolha])

  const aoDeslizar = () => {
    const el = trilho.current
    if (!el) return
    const centro = el.scrollLeft + el.clientWidth / 2
    const cartoes = Array.from(el.children) as HTMLElement[]
    let perto = 0
    cartoes.forEach((c, i) => {
      if (Math.abs(centroDe(c) - centro) < Math.abs(centroDe(cartoes[perto]) - centro)) perto = i
    })
    setVisivel(perto)
  }

  const irParaCartao = (i: number) => {
    const el = trilho.current
    const cartao = el?.children[i] as HTMLElement | undefined
    if (el && cartao) el.scrollTo({ left: centroDe(cartao) - el.clientWidth / 2, behavior: 'smooth' })
  }

  const escolher = async (opcao: Opcao) => {
    if (enviando) return
    setEnviando(opcao)
    setErro(null)
    const resultado = await votar(opcao)
    setEnviando(null)
    if (resultado.ok) {
      setEscolha(resultado.escolha)
      setMudando(false)
    } else if (resultado.motivo === 'encerrada') {
      aoEncerrar()
    } else if (resultado.motivo === 'limite') {
      if (resultado.escolha) setEscolha(resultado.escolha)
      setMudando(false)
      setErro(ERRO_LIMITE)
    } else {
      setErro(ERRO_FALHA)
    }
  }

  return (
    <section className="cafe" aria-label="Nossa primeira história">
      {/* a mesma névoa das outras telas, continuando a da obsidiana */}
      <div className="cafe-fundo" aria-hidden="true">
        <Nevoa centroY={0.6} />
      </div>

      <div className="cafe-conteudo">
        <header className="cafe-cabecalho">
          <h2 className="rev-destaque cafe-titulo">{TITULO}</h2>
          {/* o subtítulo aparece na primeira vez; ao trocar (ou com um aviso de
              erro), ele sai para tudo continuar cabendo numa tela */}
          {mostrarOpcoes && !escolha && !erro && <p className="rev-texto rev-texto-menor cafe-subtitulo">{SUBTITULO}</p>}
        </header>

        {mostrarOpcoes ? (
          <div className="cafe-escolha">
            {/* data-lateral: o paginador deixa o deslize para os lados com o navegador */}
            <ul ref={trilho} className="cafe-opcoes" data-lateral onScroll={aoDeslizar}>
              {OPCOES.map((opcao) => {
                const lugar = LUGARES[opcao]
                return (
                  <li key={opcao} className={opcao === escolha ? 'cafe-cartao atual' : 'cafe-cartao'}>
                    <figure className="cafe-figura">
                      <CenaCafe opcao={opcao} />
                      <figcaption className="cafe-so-leitor">{lugar.cena}</figcaption>
                    </figure>
                    <div className="cafe-cartao-textos">
                      <h3 className="cafe-cartao-titulo">{lugar.titulo}</h3>
                      <p className="cafe-cartao-descricao">{lugar.descricao}</p>
                      <ul className="cafe-pontos">
                        {lugar.pontos.map((ponto) => (
                          <li key={ponto}>{ponto}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="cafe-acao">
                      {opcao === escolha && <span className="cafe-atual">Sua escolha atual</span>}
                      <button
                        type="button"
                        className="cafe-botao"
                        disabled={enviando !== null}
                        aria-busy={enviando === opcao}
                        onClick={() => escolher(opcao)}
                      >
                        {enviando === opcao ? 'Enviando…' : lugar.botao}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>

            {/* bolinhas do iPhone: mostram qual cartão está na tela e levam até ele */}
            <div className="cafe-bolinhas">
              {OPCOES.map((opcao, i) => (
                <button
                  key={opcao}
                  type="button"
                  className={i === visivel ? 'cafe-bolinha ativa' : 'cafe-bolinha'}
                  aria-label={'Ver ' + LUGARES[opcao].titulo}
                  aria-current={i === visivel}
                  onClick={() => irParaCartao(i)}
                />
              ))}
            </div>

            {mudando && escolha && (
              <button type="button" className="cafe-mudar" disabled={enviando !== null} onClick={() => setMudando(false)}>
                Manter minha escolha
              </button>
            )}
          </div>
        ) : (
          <div className="cafe-feito">
            <figure className="cafe-figura cafe-escolhida">
              <CenaCafe opcao={escolha} />
              <figcaption className="cafe-so-leitor">{LUGARES[escolha].cena}</figcaption>
            </figure>
            <p className="cafe-feito-lugar">{LUGARES[escolha].titulo}</p>
            <p className="rev-texto cafe-mensagem">{MENSAGEM_FEITA}</p>
            <button
              type="button"
              className="cafe-mudar"
              onClick={() => {
                setErro(null)
                setMudando(true)
              }}
            >
              Mudar minha escolha
            </button>
          </div>
        )}

        {/* avisos de erro (lidos também pelo leitor de tela) */}
        <p className="cafe-erro" role="status" aria-live="polite">
          {erro}
        </p>
      </div>

      <footer className="rodape">Criado por Guilherme Souza</footer>
    </section>
  )
}

export default Cafeterias
