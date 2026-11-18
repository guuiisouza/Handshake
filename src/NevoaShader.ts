// Névoa de "tinta na água" desenhada pela placa de vídeo (WebGL puro, sem biblioteca).
//
// Como funciona, em resumo:
// - Um pequeno programa (o "shader", abaixo em GLSL) roda para cada pixel do canvas
//   e decide a cor e a transparência da fumaça naquele ponto.
// - A fumaça vem de ruído "dobrado sobre si mesmo" (domain warping): o resultado
//   são fiapos que se enrolam em redemoinhos, como tinta se espalhando na água.
// - O JavaScript daqui só passa alguns números por quadro: o tempo, o quanto a
//   fumaça está agitada e onde está o dedo/mouse.
//
// Cuidados com o iPhone (bateria e fluidez):
// - o canvas é desenhado em resolução reduzida e ampliado (fumaça é borrada, não se nota);
// - no máximo ~30 quadros por segundo;
// - a animação pausa quando a névoa sai da tela ou o app vai para segundo plano.

const VERTICES = `
attribute vec2 a_posicao;
void main() {
  gl_Position = vec4(a_posicao, 0.0, 1.0);
}
`

const FUMACA = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 u_res;        // tamanho do canvas em pixels
uniform float u_tempo;     // tempo (corre mais rápido quando agitado)
uniform float u_agitacao;  // 0 = calma, 1 = bem agitada
uniform vec2 u_ponteiro;   // dedo/mouse (0 a 1)
uniform float u_forca;     // força do redemoinho perto do dedo/mouse
uniform vec2 u_centro;     // onde fica a obsidiana (0 a 1)

float sorteio(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float ruido(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(sorteio(i), sorteio(i + vec2(1.0, 0.0)), u.x),
             mix(sorteio(i + vec2(0.0, 1.0)), sorteio(i + vec2(1.0, 1.0)), u.x), u.y);
}

const mat2 GIRO = mat2(0.8, 0.6, -0.6, 0.8);

// soma de ruídos do grande ao pequeno
float camadas(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * ruido(p);
    p = GIRO * p * 2.02 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float menor = min(u_res.x, u_res.y);
  vec2 p = gl_FragCoord.xy / menor;          // 1 unidade = menor lado da tela
  vec2 centro = u_centro * u_res / menor;
  vec2 ponteiro = u_ponteiro * u_res / menor;
  float t = u_tempo;

  // Redemoinho em volta do dedo/mouse
  vec2 dp = p - ponteiro;
  float giro = u_forca * 1.6 * exp(-dot(dp, dp) * 6.0);
  p = ponteiro + mat2(cos(giro), -sin(giro), sin(giro), cos(giro)) * dp;

  // Tinta na água: o ruído é dobrado duas vezes sobre si mesmo
  vec2 s = p * 1.6;
  s.y -= t * 0.05;                           // a fumaça sobe
  vec2 q = vec2(camadas(s + vec2(0.0, t * 0.04)),
                camadas(s + vec2(5.2, 1.3) - t * 0.03));
  float dobra = 3.2 + u_agitacao * 1.5;
  vec2 r = vec2(camadas(s + dobra * q + vec2(1.7, 9.2) + 0.10 * t),
                camadas(s + dobra * q + vec2(8.3, 2.8) + 0.08 * t));
  float f = camadas(s + 3.0 * r);

  // fiapos: só as partes mais densas aparecem
  float fiapos = smoothstep(0.36, 0.9, f) * (0.55 + 0.45 * clamp(length(r), 0.0, 1.0));

  // Onde a névoa aparece: densa nas bordas e embaixo, rala em volta da obsidiana
  float distancia = length(p - centro);
  float longe = smoothstep(0.22, 0.7, distancia);
  float baixo = smoothstep(0.6, 0.0, uv.y);
  float borda = smoothstep(0.28, 0.5, max(abs(uv.x - 0.5), abs(uv.y - 0.5)));
  float mascara = clamp(0.35 + baixo * 0.75 + borda * 0.5, 0.0, 1.0) * mix(0.03, 1.0, longe);

  // Cores: violeta escuro -> violeta -> lilás onde a luz atrás da pedra alcança
  vec3 escuro = vec3(0.16, 0.06, 0.32);
  vec3 violeta = vec3(0.52, 0.26, 0.95);
  vec3 lilas = vec3(0.85, 0.74, 1.0);
  vec3 cor = mix(escuro, violeta, clamp(f * f * 2.2, 0.0, 1.0));
  cor = mix(cor, lilas, clamp(length(q) - 0.6, 0.0, 1.0) * 0.5);
  cor = mix(cor, lilas, exp(-distancia * distancia * 3.0) * 0.35);
  float densidade = fiapos * mascara;
  float alfa = densidade * 0.85;

  // Partículas brilhantes bem pequenas, subindo e piscando.
  // Elas aparecem quase só dentro da fumaça (como pó brilhando na tinta),
  // para não virar um "céu estrelado".
  vec2 g = p * 32.0;
  g.y -= t * 0.9;
  g.x += sin(g.y * 0.15 + t * 0.3) * 0.6;
  vec2 celula = floor(g);
  float h = sorteio(celula);
  float brilho = 0.0;
  if (h > 0.9) {
    vec2 lugar = vec2(sorteio(celula + 7.1), sorteio(celula + 3.7)) * 0.6 + 0.2;
    float pisca = 0.5 + 0.5 * sin(t * 2.0 + h * 60.0);
    float naFumaca = 0.06 + 0.94 * smoothstep(0.04, 0.3, densidade);
    brilho = smoothstep(0.13, 0.0, length(fract(g) - lugar)) * pisca * naFumaca;
  }

  // cor "pré-multiplicada" pela transparência (o canvas é transparente)
  gl_FragColor = vec4(cor * alfa + lilas * brilho * 0.8, clamp(alfa + brilho * 0.8, 0.0, 1.0));
}
`

type Opcoes = {
  estatico: boolean          // true = "Reduzir movimento": um quadro só, parado
  centro: [number, number]   // posição da obsidiana na tela (0 a 1, de baixo para cima)
}

export type ControleNevoa = { parar: () => void }

function compilar(gl: WebGLRenderingContext, tipo: number, codigo: string) {
  const shader = gl.createShader(tipo)
  if (!shader) return null
  gl.shaderSource(shader, codigo)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }
  return shader
}

// Liga a névoa no canvas. Se o aparelho não suportar WebGL, chama aoFalhar()
// (para mostrar a névoa simples) e devolve null.
export function iniciarNevoaWebGL(
  canvas: HTMLCanvasElement,
  { estatico, centro }: Opcoes,
  aoFalhar: () => void,
): ControleNevoa | null {
  const gl = canvas.getContext('webgl', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    powerPreference: 'low-power',
  })
  if (!gl) {
    aoFalhar()
    return null
  }

  const vertices = compilar(gl, gl.VERTEX_SHADER, VERTICES)
  const fumaca = compilar(gl, gl.FRAGMENT_SHADER, FUMACA)
  const programa = gl.createProgram()
  if (!vertices || !fumaca || !programa) {
    aoFalhar()
    return null
  }
  gl.attachShader(programa, vertices)
  gl.attachShader(programa, fumaca)
  gl.linkProgram(programa)
  if (!gl.getProgramParameter(programa, gl.LINK_STATUS)) {
    aoFalhar()
    return null
  }
  gl.useProgram(programa)

  // Um triângulo grande que cobre a tela inteira
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const posicao = gl.getAttribLocation(programa, 'a_posicao')
  gl.enableVertexAttribArray(posicao)
  gl.vertexAttribPointer(posicao, 2, gl.FLOAT, false, 0, 0)

  const u = {
    res: gl.getUniformLocation(programa, 'u_res'),
    tempo: gl.getUniformLocation(programa, 'u_tempo'),
    agitacao: gl.getUniformLocation(programa, 'u_agitacao'),
    ponteiro: gl.getUniformLocation(programa, 'u_ponteiro'),
    forca: gl.getUniformLocation(programa, 'u_forca'),
    centro: gl.getUniformLocation(programa, 'u_centro'),
  }
  gl.uniform2f(u.centro, centro[0], centro[1])

  // Estado da animação
  let tempo = 12
  let agitacao = 0      // valor suave usado no desenho
  let alvoAgitacao = 0  // sobe com rolagem/toque/mouse e vai baixando sozinho
  let forca = 0
  let ponteiro: [number, number] = [0.5, 0.5]
  let ultimoQuadro = performance.now()
  let rodando = false
  let naTela = true
  let raf = 0

  function ajustarTamanho() {
    const caixa = canvas.getBoundingClientRect()
    if (!gl || caixa.width === 0 || caixa.height === 0) return
    // resolução reduzida, com um teto de pixels para não pesar no celular
    let escala = Math.min(window.devicePixelRatio || 1, 2) * 0.6
    const MAXIMO = 450000
    if (caixa.width * caixa.height * escala * escala > MAXIMO) {
      escala = Math.sqrt(MAXIMO / (caixa.width * caixa.height))
    }
    canvas.width = Math.max(1, Math.round(caixa.width * escala))
    canvas.height = Math.max(1, Math.round(caixa.height * escala))
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.uniform2f(u.res, canvas.width, canvas.height)
  }

  function desenhar() {
    if (!gl) return
    gl.uniform1f(u.tempo, tempo)
    gl.uniform1f(u.agitacao, agitacao)
    gl.uniform2f(u.ponteiro, ponteiro[0], ponteiro[1])
    gl.uniform1f(u.forca, forca)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  function quadro(agora: number) {
    raf = requestAnimationFrame(quadro)
    const dt = Math.min((agora - ultimoQuadro) / 1000, 0.1)
    if (dt < 1 / 32) return // limite de ~30 quadros por segundo
    ultimoQuadro = agora

    alvoAgitacao *= Math.exp(-dt * 1.5)
    agitacao += (alvoAgitacao - agitacao) * Math.min(dt * 4, 1)
    forca *= Math.exp(-dt * 1.2)
    tempo = (tempo + dt * (1 + agitacao * 2.5)) % 10000
    desenhar()
  }

  // Liga ou pausa conforme a névoa está na tela e o app está aberto
  function atualizar() {
    const deveRodar = naTela && !document.hidden
    if (deveRodar && !rodando) {
      rodando = true
      ultimoQuadro = performance.now()
      raf = requestAnimationFrame(quadro)
    } else if (!deveRodar && rodando) {
      rodando = false
      cancelAnimationFrame(raf)
    }
  }

  // ---- Interação: rolagem, toque e mouse agitam a fumaça ----
  let ultimaRolagem = window.scrollY
  let ultimoPonto: [number, number] | null = null

  function aoRolar() {
    const delta = Math.abs(window.scrollY - ultimaRolagem)
    ultimaRolagem = window.scrollY
    alvoAgitacao = Math.min(1, alvoAgitacao + delta * 0.0025)
  }

  function lerPonto(e: PointerEvent): [number, number] {
    const caixa = canvas.getBoundingClientRect()
    return [(e.clientX - caixa.left) / caixa.width, 1 - (e.clientY - caixa.top) / caixa.height]
  }

  function aoMover(e: PointerEvent) {
    if (ultimoPonto) {
      const distancia = Math.hypot(e.clientX - ultimoPonto[0], e.clientY - ultimoPonto[1])
      alvoAgitacao = Math.min(1, alvoAgitacao + distancia * 0.0012)
      forca = Math.min(1, forca + distancia * 0.004)
    }
    ultimoPonto = [e.clientX, e.clientY]
    ponteiro = lerPonto(e)
  }

  function aoTocar(e: PointerEvent) {
    ultimoPonto = [e.clientX, e.clientY]
    ponteiro = lerPonto(e)
    forca = Math.min(1, forca + 0.5)
    alvoAgitacao = Math.min(1, alvoAgitacao + 0.25)
  }

  function aoPerderContexto(e: Event) {
    e.preventDefault()
    parar()
    aoFalhar()
  }

  const observarTamanho = new ResizeObserver(() => {
    ajustarTamanho()
    if (estatico) desenhar()
  })
  observarTamanho.observe(canvas)
  canvas.addEventListener('webglcontextlost', aoPerderContexto)

  let observarTela: IntersectionObserver | null = null

  ajustarTamanho()
  if (estatico) {
    // "Reduzir movimento": um quadro parado, sem reagir a nada
    desenhar()
  } else {
    window.addEventListener('scroll', aoRolar, { passive: true })
    window.addEventListener('pointermove', aoMover, { passive: true })
    window.addEventListener('pointerdown', aoTocar, { passive: true })
    document.addEventListener('visibilitychange', atualizar)
    observarTela = new IntersectionObserver(([entrada]) => {
      naTela = entrada.isIntersecting
      atualizar()
    })
    observarTela.observe(canvas)
    desenhar()
    atualizar()
  }

  function parar() {
    rodando = false
    cancelAnimationFrame(raf)
    window.removeEventListener('scroll', aoRolar)
    window.removeEventListener('pointermove', aoMover)
    window.removeEventListener('pointerdown', aoTocar)
    document.removeEventListener('visibilitychange', atualizar)
    canvas.removeEventListener('webglcontextlost', aoPerderContexto)
    observarTamanho.disconnect()
    observarTela?.disconnect()
    if (gl) {
      gl.deleteBuffer(buffer)
      gl.deleteProgram(programa)
      gl.deleteShader(vertices)
      gl.deleteShader(fumaca)
    }
  }

  return { parar }
}
