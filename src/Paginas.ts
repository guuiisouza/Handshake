// ---------- Paginador ----------
// Transforma a rolagem em "páginas", no estilo Apple: um deslize de dedo, um
// giro da rodinha ou uma tecla levam suavemente até a próxima parada.
//
// Importante: ele só move a rolagem. As animações guiadas pela rolagem
// (abertura, mapa, galeria) continuam lendo a posição da página como antes,
// então tocam sozinhas durante o deslize. Nenhuma animação foi reescrita.
//
// Proteções:
// - com uma foto ampliada (a página fica travada), o paginador não interfere;
// - o gesto de pinça (zoom, dois dedos) e o Ctrl + rodinha continuam livres;
// - a rolagem do VoiceOver e a barra de rolagem não são bloqueadas;
// - com "Reduzir movimento", a troca é um esmaecer curto, sem deslize.

import { useEffect } from 'react'

type Parada = {
  y: number
  minimo: number // duração mínima (ms) para chegar aqui: dá tempo de a animação do caminho tocar
}

// Ritmo das trocas: por volta de 1 segundo
const DESLIZE_MINIMO = 1000 // ms: uma tela
const DESLIZE_NORMAL_MAXIMO = 1400 // ms: trechos mais longos levam só um pouco mais
const DESLIZE_MAXIMO = 1800 // ms
const VOO_DA_CAMERA = 1500 // ms: o deslize que leva ao estado do voo (a câmera atravessa o oceano)
const OBSIDIANA_SE_DISSOLVE = 1200 // ms: o deslize que leva à frase da abertura

// Bloqueio curto depois de cada troca: um gesto não pula duas telas sem
// querer. Conta a partir do gesto (não do fim do deslize nem das animações),
// então nunca trava: passado esse tempo, um gesto novo já troca de novo,
// mesmo no meio do deslize.
const BLOQUEIO_DEPOIS_DA_TROCA = 450 // ms

// Gesto mínimo para trocar de tela, calibrado para cada aparelho, para a
// troca ter a mesma sensação em todos: um gesto claro troca uma tela, na
// hora, e um esbarrão não troca.
// - Mouse: cada clique da rodinha chega de uma vez (~100 px). Um clique troca.
const CLIQUE_DE_MOUSE = 50 // px num único evento, depois de uma pausa
// - Trackpad: chega aos poucos (eventos de 2 a 30 px). Precisa somar um
//   deslize decidido, não só encostar.
const TRACKPAD_MINIMO = 110 // px somados no mesmo gesto
// - Dedo (iPhone): troca assim que o dedo passa do limite, sem esperar soltar
//   a tela (antes esperava, e por isso o iPhone parecia mais lento).
const DEDO_MINIMO = 60 // px arrastados
const PETELECO_MINIMO = 25 // px, num gesto rápido (menos de 0,25 s), ao soltar

function topo(el: Element): number {
  return el.getBoundingClientRect().top + window.scrollY
}

// As paradas são medidas na hora de cada gesto: se a tela mudar de tamanho
// ou uma imagem terminar de carregar, os pontos continuam certos.
export function paradas(): Parada[] {
  const tela = window.innerHeight
  const lista: Parada[] = []

  // Abertura: a obsidiana no começo, depois a frase inteira na tela
  // (a abertura vai de 0 a 1 entre o topo dela e o fim dela; a frase fica
  // inteira a partir de 0,7)
  const abertura = document.querySelector<HTMLElement>('.abertura-nova')
  if (abertura) {
    const t = topo(abertura)
    lista.push({ y: t, minimo: 0 })
    lista.push({ y: t + (abertura.offsetHeight - tela) * 0.85, minimo: OBSIDIANA_SE_DISSOLVE })
  }

  // Mapa: a frase "Princesa..." perto de Lisboa (quando o mapa acaba de
  // ocupar a tela) e o estado do voo (90% do trilho, antes de a parte de
  // baixo escurecer). Depois do pouso não há frase nem voo da câmera: uma parada só.
  const voo = document.querySelector<HTMLElement>('.voo')
  if (voo) {
    const t = topo(voo)
    const trilho = voo.offsetHeight - tela
    const temFrase = Boolean(voo.querySelector('.voo-frase-caixa'))
    if (temFrase) lista.push({ y: t, minimo: 0 })
    lista.push({ y: t + trilho * 0.9, minimo: temFrase ? VOO_DA_CAMERA : 0 })
  }

  // Galeria: no iPhone, uma página por par de fotos; no computador, a mesa
  const pares = document.querySelectorAll('.galeria-par')
  if (pares.length > 0) pares.forEach((par) => lista.push({ y: topo(par), minimo: 0 }))
  else {
    const galeria = document.querySelector('.galeria')
    if (galeria) lista.push({ y: topo(galeria), minimo: 0 })
  }

  // Handshake e cena final
  document.querySelectorAll('.rev').forEach((cena) => lista.push({ y: topo(cena), minimo: 0 }))

  // dentro dos limites da página, em ordem, sem repetidas
  const fim = document.documentElement.scrollHeight - tela
  return lista
    .map((p) => ({ ...p, y: Math.round(Math.min(Math.max(p.y, 0), fim)) }))
    .sort((a, b) => a.y - b.y)
    .filter((p, i, todas) => i === 0 || p.y - todas[i - 1].y > 4)
}

// Curva do deslize: cubic-bezier(0.45, 0, 0.15, 1). Começa macio (sem
// tranco), ganha velocidade e assenta bem devagar na tela nova, no estilo
// das transições da Apple.
const CURVA = [0.45, 0, 0.15, 1] as const
function suave(t: number): number {
  const [x1, y1, x2, y2] = CURVA
  const bez = (a: number, b: number, s: number) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3
  // acha o "s" da curva que corresponde ao tempo t (busca binária, precisa o bastante)
  let baixo = 0
  let alto = 1
  for (let k = 0; k < 24; k++) {
    const meio = (baixo + alto) / 2
    if (bez(x1, x2, meio) < t) baixo = meio
    else alto = meio
  }
  return bez(y1, y2, (baixo + alto) / 2)
}

// Situações em que o paginador não deve mexer em nada
function livre(): boolean {
  // foto ampliada: a galeria trava a página (overflow: hidden)
  if (document.documentElement.style.overflow === 'hidden') return true
  return Boolean(document.querySelector('dialog[open]'))
}

function campoDeTexto(alvo: EventTarget | null): boolean {
  if (!(alvo instanceof HTMLElement)) return false
  return alvo.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo.tagName)
}

export function usePaginas(ligado: boolean) {
  useEffect(() => {
    if (!ligado) return

    const calmo = window.matchMedia('(prefers-reduced-motion: reduce)')
    // animando: um deslize do paginador está em andamento. NÃO é uma trava:
    // um gesto novo no meio do deslize muda o destino na hora (veja ir()).
    let animando = false
    let indice = 0 // em qual parada a página está (ou para qual está indo)
    let quadro = 0
    let seguranca = 0
    let seguranca2 = 0

    // ----- Troca de página -----

    // para o deslize (ou o esmaecer) que estiver em andamento, onde estiver
    const terminar = () => {
      animando = false
      cancelAnimationFrame(quadro)
      clearTimeout(seguranca)
      clearTimeout(seguranca2)
    }

    // véu preto usado na troca sem movimento ("Reduzir movimento")
    let veu: HTMLDivElement | null = null
    const esmaecer = (destino: number) => {
      if (!veu) {
        veu = document.createElement('div')
        veu.setAttribute('aria-hidden', 'true')
        Object.assign(veu.style, {
          position: 'fixed',
          inset: '0',
          zIndex: '9999',
          background: 'var(--preto)',
          opacity: '0',
          pointerEvents: 'none',
          transition: 'opacity 160ms ease',
        })
        document.body.appendChild(veu)
      }
      const v = veu
      terminar() // um esmaecer novo substitui o anterior
      animando = true
      v.style.opacity = '1'
      seguranca = window.setTimeout(() => {
        window.scrollTo(0, destino)
        v.style.opacity = '0'
        seguranca2 = window.setTimeout(terminar, 180)
      }, 170)
    }

    const deslizar = (destino: number, minimo: number) => {
      terminar() // um deslize novo substitui o anterior, a partir de onde a página está
      const inicio = window.scrollY
      const distancia = destino - inicio
      const telas = Math.abs(distancia) / window.innerHeight
      const normal = Math.min(Math.max(850 + 150 * telas, DESLIZE_MINIMO), DESLIZE_NORMAL_MAXIMO)
      const duracao = Math.min(Math.max(normal, minimo), DESLIZE_MAXIMO)
      const comeco = performance.now()
      animando = true
      const passo = (agora: number) => {
        const t = Math.min((agora - comeco) / duracao, 1)
        window.scrollTo(0, inicio + distancia * suave(t))
        if (t < 1) quadro = requestAnimationFrame(passo)
        else terminar()
      }
      quadro = requestAnimationFrame(passo)
      // se o navegador parar de desenhar (app em segundo plano), não fica travado
      seguranca = window.setTimeout(() => {
        window.scrollTo(0, destino)
        terminar()
      }, duracao + 600)
    }

    // Vai até a parada i. Funciona a qualquer momento, inclusive no meio de
    // outro deslize: ele é interrompido e o novo começa de onde a página está.
    const irPara = (i: number) => {
      const lista = paradas()
      const alvo = lista[i]
      if (!alvo) return
      indice = i
      if (Math.abs(alvo.y - window.scrollY) < 2) {
        terminar()
        return
      }
      // voltando, a animação do trecho toca ao contrário, no mesmo tempo da ida
      const atual = lista.findIndex((p) => p.y >= window.scrollY - 4)
      const minimo = alvo.y > window.scrollY ? alvo.minimo : (lista[atual]?.minimo ?? 0)
      if (calmo.matches) esmaecer(alvo.y)
      else deslizar(alvo.y, minimo)
    }

    // Próxima (1) ou anterior (-1).
    // - Página parada: a partir de onde ela está. Se estiver entre duas
    //   paradas (depois de uma rolagem do VoiceOver, por exemplo), vai para a
    //   parada seguinte naquela direção.
    // - No meio de um deslize: a partir do destino dele. Outro gesto para o
    //   mesmo lado avança mais uma tela; para o outro lado, volta.
    // - Logo depois de uma troca (bloqueio curto), o gesto é ignorado.
    let ultimaTroca = -Infinity
    const bloqueado = () => performance.now() - ultimaTroca < BLOQUEIO_DEPOIS_DA_TROCA
    const ir = (direcao: number) => {
      if (bloqueado()) return
      ultimaTroca = performance.now()
      const lista = paradas()
      let i: number
      if (animando) i = indice + direcao
      else {
        const y = window.scrollY
        i = direcao > 0 ? lista.findIndex((p) => p.y > y + 4) : lista.map((p) => p.y < y - 4).lastIndexOf(true)
      }
      if (i >= 0 && i < lista.length) irPara(i)
    }

    // ----- Rodinha e trackpad -----
    // Depois de um deslize, o trackpad continua mandando "rolagem" por um ou
    // dois segundos (inércia), cada vez mais fraca. Esse resto é ignorado para
    // um gesto trocar exatamente uma página. A trava solta assim que aparece
    // um gesto NOVO, mesmo no meio da inércia e mesmo no meio de um deslize:
    // - uma pausa curta na rodinha (cada clique de um mouse comum);
    // - a direção muda (para cima depois de para baixo, e vice-versa);
    // - a força volta a subir (um novo deslize por cima da inércia).
    // Assim a trava nunca fica presa: basta parar a rodinha por um instante.
    // Ela só filtra a inércia; nunca espera um deslize ou animação acabar.
    let acumulado = 0
    let ultimaRodinha = 0
    let travada = false
    let direcaoTravada = 0
    let forcaAnterior = 0
    let cliqueDeMouse = false
    const aoRodar = (e: WheelEvent) => {
      if (livre() || e.ctrlKey) return // Ctrl + rodinha = zoom
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      e.preventDefault()
      const agora = performance.now()
      // rodinha medida em linhas (Firefox): ~40 px por linha, como nos outros navegadores
      const fator = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? window.innerHeight : 1
      const delta = e.deltaY * fator
      const forca = Math.abs(delta)
      const intervalo = agora - ultimaRodinha
      const pausa = intervalo > 120
      ultimaRodinha = agora

      if (travada) {
        const outraDirecao = Math.sign(delta) !== direcaoTravada
        const subiu = forca > forcaAnterior * 1.3 + 4
        // Depois de uma pausa curta, só é gesto novo se a força não diminuir:
        // a inércia enfraquece a cada evento (uns 4%), mesmo quando o
        // computador engasga desenhando a névoa e atrasa os eventos em até
        // 0,2 s; já cada clique da rodinha de um mouse tem sempre a mesma força.
        // Uma pausa longa (0,3 s) é sempre gesto novo.
        const novoDepoisDaPausa = (pausa && forca >= 10 && forca >= forcaAnterior) || intervalo > 300
        forcaAnterior = forca
        if (!(novoDepoisDaPausa || outraDirecao || subiu)) return // ainda é a inércia do mesmo gesto
        // gesto novo durante o bloqueio curto: ignorado (a trava continua, e
        // um gesto seguinte, depois do bloqueio, é reconhecido normalmente)
        if (bloqueado()) return
        travada = false
        acumulado = 0
        // gesto novo emendado: um evento forte sozinho é um clique de mouse;
        // um começo fraco é um novo deslize de trackpad
        cliqueDeMouse = forca >= CLIQUE_DE_MOUSE
      }
      if (bloqueado()) return
      // começo de um gesto: um evento forte sozinho é um clique de mouse
      if (pausa) {
        acumulado = 0
        cliqueDeMouse = forca >= CLIQUE_DE_MOUSE
      }
      if (forca < 1) return // restinho de inércia
      acumulado += delta
      if (Math.abs(acumulado) >= (cliqueDeMouse ? CLIQUE_DE_MOUSE : TRACKPAD_MINIMO)) {
        travada = true
        direcaoTravada = Math.sign(acumulado)
        forcaAnterior = forca
        ir(direcaoTravada)
        acumulado = 0
      }
    }

    // ----- Dedo (iPhone) -----
    let toque: { x: number; y: number; t: number; trocou: boolean } | null = null
    const aoTocar = (e: TouchEvent) => {
      if (livre() || e.touches.length > 1) {
        toque = null // dois dedos: pinça livre
        return
      }
      const p = e.touches[0]
      toque = { x: p.clientX, y: p.clientY, t: performance.now(), trocou: false }
    }
    const aoArrastar = (e: TouchEvent) => {
      if (!toque || e.touches.length > 1 || livre()) {
        toque = null
        return
      }
      e.preventDefault() // a página não rola sozinha: quem move é o paginador
      if (toque.trocou) return // um gesto troca uma tela só
      const p = e.touches[0]
      const dy = toque.y - p.clientY
      const dx = toque.x - p.clientX
      // passou do limite ainda com o dedo na tela: troca agora
      if (Math.abs(dy) > DEDO_MINIMO && Math.abs(dy) > Math.abs(dx)) {
        toque.trocou = true
        ir(Math.sign(dy))
      }
    }
    const aoSoltar = (e: TouchEvent) => {
      if (!toque || toque.trocou) {
        toque = null
        return
      }
      const p = e.changedTouches[0]
      const dy = toque.y - p.clientY
      const dx = toque.x - p.clientX
      const tempo = performance.now() - toque.t
      toque = null
      if (Math.abs(dy) < Math.abs(dx)) return
      // arrastada decidida, ou um "peteleco" curto e rápido
      if (Math.abs(dy) > DEDO_MINIMO || (Math.abs(dy) > PETELECO_MINIMO && tempo < 250)) ir(Math.sign(dy))
    }

    const aoCancelar = () => {
      toque = null
    }

    // ----- Teclado -----
    const aoTeclar = (e: KeyboardEvent) => {
      if (livre() || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || campoDeTexto(e.target)) return
      // espaço num botão continua apertando o botão
      if (e.key === ' ' && e.target instanceof HTMLButtonElement) return
      let acao: (() => void) | null = null
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) acao = () => ir(1)
      else if (e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) acao = () => ir(-1)
      else if (e.key === 'Home') acao = () => irPara(0)
      else if (e.key === 'End') acao = () => irPara(paradas().length - 1)
      if (!acao) return
      e.preventDefault()
      acao()
    }

    // ----- Rolagem por outros meios (VoiceOver, barra de rolagem) -----
    // Não é bloqueada; só anota em qual parada a página ficou.
    let fimDaRolagem = 0
    const aoRolar = () => {
      if (animando) return
      clearTimeout(fimDaRolagem)
      fimDaRolagem = window.setTimeout(() => {
        const y = window.scrollY
        const lista = paradas()
        let perto = 0
        lista.forEach((p, i) => {
          if (Math.abs(p.y - y) < Math.abs(lista[perto].y - y)) perto = i
        })
        indice = perto
      }, 150)
    }

    // ----- Tela muda de tamanho (girar o celular, redimensionar a janela) -----
    // A página volta para o ponto certo da mesma parada.
    let fimDoAjuste = 0
    const aoRedimensionar = () => {
      clearTimeout(fimDoAjuste)
      fimDoAjuste = window.setTimeout(() => {
        if (animando || livre()) return
        const alvo = paradas()[indice]
        if (alvo) window.scrollTo(0, alvo.y)
      }, 200)
    }

    window.addEventListener('wheel', aoRodar, { passive: false })
    window.addEventListener('touchstart', aoTocar, { passive: true })
    window.addEventListener('touchmove', aoArrastar, { passive: false })
    window.addEventListener('touchend', aoSoltar, { passive: true })
    window.addEventListener('touchcancel', aoCancelar, { passive: true })
    window.addEventListener('keydown', aoTeclar)
    window.addEventListener('scroll', aoRolar, { passive: true })
    window.addEventListener('resize', aoRedimensionar)
    return () => {
      terminar()
      clearTimeout(fimDaRolagem)
      clearTimeout(fimDoAjuste)
      veu?.remove()
      window.removeEventListener('wheel', aoRodar)
      window.removeEventListener('touchstart', aoTocar)
      window.removeEventListener('touchmove', aoArrastar)
      window.removeEventListener('touchend', aoSoltar)
      window.removeEventListener('touchcancel', aoCancelar)
      window.removeEventListener('keydown', aoTeclar)
      window.removeEventListener('scroll', aoRolar)
      window.removeEventListener('resize', aoRedimensionar)
    }
  }, [ligado])
}
