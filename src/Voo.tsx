import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react'
import Nevoa from './Nevoa'
import { CONTINENTES, GRADE, LISBOA, ROTA, VIRACOPOS } from './mapa'
import { agora, estadoDoVoo, formatarDuracao, fraseJuntos, tempoJuntos, unidade, type EstadoVoo } from './vooTempo'
import {
  TOTAL_PONTOS,
  areaDaRota,
  areaEmVolta,
  cameraNoPercurso,
  enquadrar,
  faixa,
  naTela,
  pontoDaRota,
  posicaoNaRota,
  viewBox,
  type Area,
  type Livre,
  type Ponto,
  type Quadro,
  type Tela,
} from './vooCamera'
import './Voo.css'

// ---------- Linha do tempo da rolagem ----------
// A tela do mapa fica "grudada" enquanto a pessoa rola. Estes números dizem
// em que ponto dessa rolagem (0 a 1) cada coisa acontece.
const LINHA = {
  pertoDeLisboa: 0.12, // a câmera fica perto de Lisboa enquanto a frase está na tela
  rotaInteira: 0.55,   // termina de se afastar: a rota inteira aparece
  segura: 0.65,        // segura a rota inteira um pouco
  final: 0.88,         // chega ao enquadramento final do estado do voo
  saida: 0.92,         // a parte de baixo começa a escurecer, emendando com a galeria
}

// Folgas em pixels em volta da rota (laterais, nome "Lisboa" à direita do
// ponto mais a leste, nome "São Paulo" perto do ponto mais ao sul) e entre a
// rota e as faixas de texto.
const FOLGA_LATERAL = 28
const FOLGA_NOME_LISBOA = 110
const FOLGA_NOME_SAO_PAULO = 24
const FOLGA_TEXTO = 20
// Tamanho da área em volta de Lisboa no começo e de São Paulo depois do pouso (unidades do mapa)
const RAIO_LISBOA = 70
const RAIO_SAO_PAULO = 60

// ---------- Rota ----------

const TRACADO_COMPLETO = Array.from({ length: TOTAL_PONTOS + 1 }, (_, i) => {
  const p = pontoDaRota(i)
  return `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`
}).join('')

// Caminho SVG só do trecho já percorrido
function tracadoPercorrido(progresso: number) {
  const fim = posicaoNaRota(progresso)
  const ultimo = Math.floor(Math.min(Math.max(progresso, 0), 1) * TOTAL_PONTOS)
  let d = `M${ROTA[0]} ${ROTA[1]}`
  for (let i = 1; i <= ultimo; i++) d += `L${ROTA[i * 2]} ${ROTA[i * 2 + 1]}`
  return d + `L${fim.x} ${fim.y}`
}

// Onde a câmera termina, conforme o estado do voo
function areaFinal(estado: EstadoVoo): Area {
  if (estado.fase === 'antes') return areaDaRota(0, 0.25) // de volta a Lisboa, com o começo da rota
  if (estado.fase === 'depois') return areaEmVolta(VIRACOPOS, RAIO_SAO_PAULO) // São Paulo no centro, sem a rota
  return areaDaRota(estado.progresso - 0.3, estado.progresso + 0.3) // em volta do avião, com costa à vista
}

// ---------- Medidas ----------

// Acompanha o tamanho de um elemento na tela
function useTamanho(ref: RefObject<HTMLElement | null>, inicial: Tela): Tela {
  const [tamanho, setTamanho] = useState<Tela>(inicial)
  useEffect(() => {
    const elemento = ref.current
    if (!elemento) return
    const observar = new ResizeObserver(() => {
      const { width, height } = elemento.getBoundingClientRect()
      if (width > 0) setTamanho({ largura: width, altura: height })
    })
    observar.observe(elemento)
    return () => observar.disconnect()
  }, [ref])
  return tamanho
}

// ---------- Relógio ----------

// Recalcula o horário ao abrir, ao voltar para o app (depois de ficar em
// segundo plano), a cada 15 segundos e bem na virada de cada minuto (para o
// contador do mesmo fuso trocar na hora certa). Não depende do app ficar
// aberto: a posição sai sempre da conta com o relógio.
function useRelogio(): number {
  const [instante, setInstante] = useState(agora)
  useEffect(() => {
    let relogio = 0
    const atualizar = () => setInstante(agora())
    const proximo = () => {
      const ateVirarMinuto = 60000 - (agora() % 60000) + 20
      relogio = window.setTimeout(() => {
        atualizar()
        proximo()
      }, Math.min(15000, ateVirarMinuto))
    }
    proximo()
    const aoVoltar = () => {
      if (!document.hidden) atualizar()
    }
    document.addEventListener('visibilitychange', aoVoltar)
    window.addEventListener('pageshow', atualizar)
    window.addEventListener('focus', atualizar)
    return () => {
      clearTimeout(relogio)
      document.removeEventListener('visibilitychange', aoVoltar)
      window.removeEventListener('pageshow', atualizar)
      window.removeEventListener('focus', atualizar)
    }
  }, [])
  return instante
}

// Textos de cada estado do voo
function textos(estado: EstadoVoo) {
  if (estado.fase === 'antes') {
    return { rotulo: 'Lisboa → São Paulo', principal: `Decolagem em ${formatarDuracao(estado.falta)}`, legenda: null }
  }
  if (estado.fase === 'durante') {
    return {
      rotulo: 'Em voo',
      principal: `Pouso previsto em ${formatarDuracao(estado.falta)}`,
      legenda: 'A cada minuto, mais perto de você.',
    }
  }
  return {
    rotulo: 'No mesmo fuso há',
    principal: null, // no lugar da frase, entra o contador
    legenda: 'No mesmo lugar desde o pouso.',
  }
}

// ---------- Contador do mesmo fuso (depois do pouso) ----------

// Números grandes com o nome da unidade embaixo. Os zeros da frente somem
// (1 hora depois do pouso mostra só horas e minutos). O leitor de tela lê a
// frase inteira, sem anunciar de novo a cada minuto.
function Contador({ instante }: { instante: number }) {
  const tempo = tempoJuntos(instante)
  const { dias, horas, minutos } = tempo
  const blocos = [
    { valor: dias, nome: unidade(dias, 'dia', 'dias') },
    { valor: horas, nome: unidade(horas, 'hora', 'horas') },
    { valor: minutos, nome: unidade(minutos, 'minuto', 'minutos') },
  ]
  const primeiro = blocos.findIndex((b) => b.valor > 0)
  return (
    <div className="voo-contador">
      <span className="voo-so-leitor">{fraseJuntos(tempo)}</span>
      {primeiro === -1 ? (
        <p className="voo-contador-instantes" aria-hidden="true">
          instantes
        </p>
      ) : (
        <div className="voo-contador-blocos" aria-hidden="true">
          {blocos.slice(primeiro).map((b, i) => (
            <div key={b.nome.replace(/s$/, '')} className="voo-contador-bloco">
              {/* a chave muda junto com o número: ele entra com uma transição suave */}
              <span key={b.valor} className="voo-contador-numero">
                {i === 0 ? b.valor : String(b.valor).padStart(2, '0')}
              </span>
              <span className="voo-contador-nome">{b.nome}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------- Desenhos ----------

// Avião branco minimalista visto de cima, com o nariz apontando para a direita
function Aviao() {
  return (
    <svg className="mapa-aviao-desenho" viewBox="-13 -12 26 24" aria-hidden="true">
      <path d="M12 0C12-1 10.5-1.6 9-1.6L2-1.6-3-11h-2.5l3 9.4H-8l-2.5-3.4H-12l1.5 4.2v1.6L-12 5h1.5L-8 1.6h5.5l-3 9.4H-3L2 1.6h7c1.5 0 3-.6 3-1.6Z" />
    </svg>
  )
}

// Depois do pouso: dois pontos de luz se aproximam em São Paulo e viram um
// pequeno coração, com um brilho que pulsa devagar. A animação só começa
// quando o mapa aparece (classe "coracao-ativo", posta na camada do mapa).
function Coracao() {
  return (
    <span className="mapa-coracao" aria-hidden="true">
      <span className="mapa-coracao-brilho" />
      <span className="mapa-coracao-ponto mapa-coracao-ponto-esquerdo" />
      <span className="mapa-coracao-ponto mapa-coracao-ponto-direito" />
      <svg className="mapa-coracao-desenho" viewBox="0 0 24 24">
        <path d="M12 21s-7.5-4.6-10-9.3C.3 8.4 1.7 4.3 5.3 3.2 8 2.4 10.4 3.7 12 6c1.6-2.3 4-3.6 6.7-2.8 3.6 1.1 5 5.2 3.3 8.5C19.5 16.4 12 21 12 21Z" />
      </svg>
    </span>
  )
}

// comAviao: o avião (ou o coração, depois do pouso) está neste marcador;
// o nome se afasta para não ficar embaixo dele.
// coracao: no lugar do ponto de luz, mostra o coração.
type PropsMarcador = { nome: string; comAviao: boolean; coracao?: boolean; ref: RefObject<HTMLDivElement | null> }

function Marcador({ nome, comAviao, coracao = false, ref }: PropsMarcador) {
  return (
    <div ref={ref} className={comAviao ? 'mapa-marcador com-aviao' : 'mapa-marcador'}>
      {coracao ? <Coracao /> : <span className="mapa-marcador-ponto" />}
      <span className="mapa-marcador-nome">{nome}</span>
    </div>
  )
}

// Coloca um elemento HTML na posição da tela (sem o React redesenhar nada)
function posicionar(elemento: HTMLElement | null, p: Ponto, extra = '') {
  if (elemento) elemento.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)${extra}`
}

function opacidade(elemento: HTMLElement | null, valor: number) {
  if (elemento) elemento.style.opacity = String(Math.round(valor * 1000) / 1000)
}

// O nome da cidade fica à direita do ponto. Se não couber até a borda
// direita, passa para a esquerda; e, se o ponto vai saindo da tela durante o
// movimento da câmera, o nome se apaga antes de ficar cortado.
function ajustarNome(marcador: HTMLDivElement | null, p: Ponto, tela: Tela) {
  const nome = marcador?.querySelector<HTMLElement>('.mapa-marcador-nome')
  if (!marcador || !nome) return
  let largura = Number(nome.dataset.largura)
  if (!largura) {
    largura = nome.offsetWidth // medido uma vez só
    nome.dataset.largura = String(largura)
  }
  const afastamento = marcador.classList.contains('com-aviao') ? 22 : 12
  const margem = 8
  const aDireita = p.x + afastamento + largura <= tela.largura - margem
  marcador.classList.toggle('nome-esquerda', !aDireita)
  const esquerda = aDireita ? p.x + afastamento : p.x - afastamento - largura
  const direita = esquerda + largura
  // distância até a borda mais próxima (os nomes têm uns 16px de altura)
  const folga = Math.min(esquerda, tela.largura - direita, p.y - 10, tela.altura - (p.y + 10))
  opacidade(nome, faixa(folga, 0, 16))
}

// ---------- Tela do voo ----------

function Voo() {
  const instante = useRelogio()
  const estado = estadoDoVoo(instante)
  const { fase, progresso } = estado
  const { rotulo, principal, legenda } = textos(estado)
  const calmo = Boolean(useReducedMotion())

  const secao = useRef<HTMLElement>(null)
  const palco = useRef<HTMLDivElement>(null)
  const svgTerra = useRef<SVGSVGElement>(null)
  const svgRota = useRef<SVGSVGElement>(null)
  const camada = useRef<HTMLDivElement>(null)
  const nevoa = useRef<HTMLDivElement>(null)
  const veu = useRef<HTMLDivElement>(null)
  const veuTopo = useRef<HTMLDivElement>(null)
  const veuBase = useRef<HTMLDivElement>(null)
  const frase = useRef<HTMLDivElement>(null)
  const topo = useRef<HTMLElement>(null)
  const base = useRef<HTMLElement>(null)
  const marcadorLisboa = useRef<HTMLDivElement>(null)
  const marcadorSaoPaulo = useRef<HTMLDivElement>(null)
  const aviaoRef = useRef<HTMLDivElement>(null)

  const tela = useTamanho(palco, { largura: window.innerWidth, altura: window.innerHeight })
  const alturaFrase = useTamanho(frase, { largura: 0, altura: 120 }).altura
  const alturaTopo = useTamanho(topo, { largura: 0, altura: 140 }).altura
  const alturaBase = useTamanho(base, { largura: 0, altura: 80 }).altura
  // altura da seção inteira, medida só quando muda (não a cada quadro: ler
  // tamanhos durante o movimento força o navegador a recalcular a página)
  const alturaSecao = useTamanho(secao, { largura: 0, altura: window.innerHeight * 3 }).altura

  const aviao = useMemo(() => posicaoNaRota(progresso), [progresso])

  // Os enquadramentos da câmera ao longo da rolagem
  const quadros = useMemo<Quadro[]>(() => {
    const lados = { esquerda: FOLGA_LATERAL, direita: FOLGA_LATERAL + FOLGA_NOME_LISBOA }
    const livreFrase: Livre = { topo: alturaFrase + FOLGA_TEXTO, base: FOLGA_TEXTO + FOLGA_NOME_SAO_PAULO, ...lados }
    const livreTexto: Livre = { topo: alturaTopo + FOLGA_TEXTO, base: alturaBase + FOLGA_TEXTO + FOLGA_NOME_SAO_PAULO, ...lados }
    const final = enquadrar(areaFinal({ fase, progresso, falta: 0 }), tela, livreTexto)
    // "Reduzir movimento" e depois do pouso: a câmera não voa, já começa
    // direto no enquadramento final (depois do pouso, em São Paulo)
    if (calmo || fase === 'depois') return [{ em: 0, camera: final }]
    const perto = enquadrar(areaEmVolta(LISBOA, RAIO_LISBOA), tela, livreFrase)
    const inteira = enquadrar(areaDaRota(0, 1), tela, livreTexto)
    return [
      { em: 0, camera: perto },
      { em: LINHA.pertoDeLisboa, camera: perto },
      { em: LINHA.rotaInteira, camera: inteira },
      { em: LINHA.segura, camera: inteira },
      { em: LINHA.final, camera: final },
    ]
  }, [tela, alturaFrase, alturaTopo, alturaBase, fase, progresso, calmo])

  // Rolagem: 0 quando o mapa começa a entrar por baixo da tela, 1 no fim.
  // A câmera segue a rolagem exatamente, sem mola: ela nunca se move sozinha
  // nem fica atrasada. A suavidade vem do deslize do paginador (Paginas.ts).
  // Assim, se a pessoa trocar de tela no meio do voo da câmera, a câmera
  // simplesmente acompanha a página, na hora; nada espera o voo terminar.
  const { scrollYProgress: rolagem } = useScroll({ target: secao, offset: ['start end', 'end end'] })

  // Aplica a câmera e as transparências direto nos elementos, a cada quadro,
  // sem o React recalcular a tela (fica bem mais leve no iPhone).
  const aplicar = useCallback(
    (q: number) => {
      // parte da rolagem em que o mapa ainda está entrando na tela
      const entrando = alturaSecao > 0 ? Math.min(tela.altura / alturaSecao, 1) : 0.4
      const entrada = faixa(q, 0, entrando)
      const p = faixa(q, entrando, 1)

      const camera = cameraNoPercurso(p, quadros)
      const caixa = viewBox(camera)
      svgTerra.current?.setAttribute('viewBox', caixa)
      svgRota.current?.setAttribute('viewBox', caixa)
      const pLisboa = naTela(LISBOA, camera, tela)
      const pSaoPaulo = naTela(VIRACOPOS, camera, tela)
      posicionar(marcadorLisboa.current, pLisboa)
      posicionar(marcadorSaoPaulo.current, pSaoPaulo)
      ajustarNome(marcadorLisboa.current, pLisboa, tela)
      ajustarNome(marcadorSaoPaulo.current, pSaoPaulo, tela)
      posicionar(aviaoRef.current, naTela(aviao, camera, tela), ` translate(-50%, -50%) rotate(${aviao.angulo}deg)`)

      // véu escuro que se abre enquanto o mapa entra (continua o fundo da abertura)
      const opVeu = 0.92 * (1 - faixa(entrada, 0.15, 1))
      // frase de abertura do mapa: surge na entrada e se dissolve quando a câmera se afasta
      // (só começa quando a frase da abertura já saiu da tela)
      // (depois do pouso, a frase da promessa não aparece)
      const opFrase = fase === 'depois' ? 0 : faixa(entrada, 0.75, 1) * (1 - faixa(p, 0.16, 0.28))
      // contagem e aviso: surgem quando a rota inteira está na tela
      // (depois do pouso, já surgem junto com o mapa, em São Paulo)
      const opTextos = fase === 'depois' ? faixa(entrada, 0.6, 1) : faixa(p, 0.45, 0.58)
      // névoa: mais visível na entrada, depois bem leve e só nas bordas
      const opNevoa = 0.85 - 0.6 * faixa(p, 0, 0.4)

      opacidade(veu.current, opVeu)
      // a borda de cima do mapa fica no mesmo preto do fim da abertura enquanto
      // está visível (sem linha na emenda) e só se dissolve depois que a tela gruda
      opacidade(veuTopo.current, 1 - faixa(p, 0, 0.12))
      // saída: a parte de baixo escurece aos poucos até o preto da galeria,
      // para a troca de cena não parecer um corte
      opacidade(veuBase.current, faixa(p, LINHA.saida, 1))
      opacidade(frase.current, opFrase)
      opacidade(topo.current, opTextos)
      opacidade(base.current, opTextos)
      opacidade(nevoa.current, opNevoa)

      // A rota, o avião e os marcadores se apagam suavemente antes de chegar
      // às faixas de texto visíveis: nenhum texto fica em cima deles,
      // nem no meio do voo da câmera.
      const mascaraTopo = Math.max(alturaFrase * Math.min(1, opFrase * 4), alturaTopo * Math.min(1, opTextos * 4))
      const mascaraBase = alturaBase * Math.min(1, opTextos * 4)
      camada.current?.style.setProperty('--mascara-topo', `${Math.round(mascaraTopo)}px`)
      camada.current?.style.setProperty('--mascara-base', `${Math.round(mascaraBase)}px`)

      // depois do pouso: os pontos começam a se juntar quando o mapa aparece
      // (uma vez só: a classe não sai mais, e o coração fica)
      if (fase === 'depois' && opTextos > 0.5) camada.current?.classList.add('coracao-ativo')
    },
    [quadros, tela, aviao, alturaFrase, alturaTopo, alturaBase, alturaSecao, fase],
  )

  useMotionValueEvent(rolagem, 'change', aplicar)
  // aplica também ao abrir e sempre que algo muda (tamanho da tela, estado do voo)
  useLayoutEffect(() => aplicar(rolagem.get()), [aplicar, rolagem])

  const descricao =
    fase === 'antes'
      ? 'Mapa da rota de Lisboa a São Paulo. O avião aguarda em Lisboa.'
      : fase === 'durante'
        ? `Mapa da rota de Lisboa a São Paulo. Pela estimativa dos horários, o avião está a ${Math.round(progresso * 100)}% do caminho.`
        : 'Mapa de São Paulo. Um pequeno coração de luz marca São Paulo.'

  return (
    <section ref={secao} className="voo" aria-label="A viagem">
      <div ref={palco} className="voo-palco">
        {/* continentes e grade (a camada mais pesada) */}
        <svg ref={svgTerra} className="mapa-svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <linearGradient id="terra" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2a2733" />
              <stop offset="1" stopColor="#1b1921" />
            </linearGradient>
          </defs>
          <path className="mapa-grade" d={GRADE} />
          <path className="mapa-terra" d={CONTINENTES} />
        </svg>

        {/* névoa por cima do continente e por baixo da rota: a rota nunca fica embaçada */}
        <div ref={nevoa} className="voo-nevoa">
          <Nevoa />
        </div>

        {/* rota, marcadores e avião (camada leve) */}
        <div ref={camada} className="mapa-camada" role="img" aria-label={descricao}>
          {/* depois do pouso, a rota sai de cena */}
          {fase !== 'depois' && (
            <svg ref={svgRota} className="mapa-svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
              {/* rota que falta: fina e apagada, com halo bem leve */}
              <path className="mapa-rota mapa-rota-futura-halo" d={TRACADO_COMPLETO} />
              <path className="mapa-rota mapa-rota-futura" d={TRACADO_COMPLETO} />
              {/* trecho percorrido: mais luminoso */}
              <path className="mapa-rota mapa-rota-feita-halo-largo" d={tracadoPercorrido(progresso)} />
              <path className="mapa-rota mapa-rota-feita-halo" d={tracadoPercorrido(progresso)} />
              <path className="mapa-rota mapa-rota-feita" d={tracadoPercorrido(progresso)} />
            </svg>
          )}

          <Marcador ref={marcadorLisboa} nome="Lisboa" comAviao={fase === 'antes'} />
          <Marcador ref={marcadorSaoPaulo} nome="São Paulo" comAviao={fase === 'depois'} coracao={fase === 'depois'} />

          {/* depois do pouso, o avião sai de cena e fica o coração */}
          {fase !== 'depois' && (
            <div ref={aviaoRef} className="mapa-aviao">
              <Aviao />
            </div>
          )}
        </div>

        <div ref={veu} className="voo-veu" aria-hidden="true" />
        <div ref={veuTopo} className="voo-veu-topo" aria-hidden="true" />
        <div ref={veuBase} className="voo-veu-base" aria-hidden="true" />

        {fase !== 'depois' && (
          <div ref={frase} className="voo-frase-caixa">
            <p className="voo-frase">Princesa, eu prometi que chegaria até você...</p>
          </div>
        )}

        <header ref={topo} className="voo-topo">
          <p className="voo-rotulo" aria-hidden={fase === 'depois' ? true : undefined}>
            {rotulo}
          </p>
          {fase === 'depois' ? <Contador instante={instante} /> : <p className="voo-principal">{principal}</p>}
          {legenda && <p className="voo-legenda">{legenda}</p>}
        </header>

        <footer ref={base} className="voo-base">
          <p className="voo-horarios">Partida 27/11 às 09:00 em Lisboa · Chegada às 16:20 em São&nbsp;Paulo</p>
          <p className="voo-aviso">Trajeto estimado pelos horários previstos. Não é rastreamento em tempo real.</p>
        </footer>
      </div>
    </section>
  )
}

export default Voo
