// Gera src/mapa.ts com os contornos reais dos continentes, a grade de
// latitude/longitude, as posições de Lisboa e Viracopos e os pontos da rota.
//
// Roda só no computador de quem desenvolve, uma vez (ou quando quiser mudar
// o recorte do mapa):   node scripts/gerar-mapa.mjs
// O site final não precisa de nenhuma dessas bibliotecas: ele só lê o arquivo gerado.
//
// Dados: Natural Earth (domínio público), via pacote world-atlas.

import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { geoMercator, geoPath, geoGraticule, geoInterpolate } from 'd3-geo'
import { feature } from 'topojson-client'

const require = createRequire(import.meta.url)
const mundo = JSON.parse(readFileSync(require.resolve('world-atlas/land-50m.json'), 'utf8'))
const terra = feature(mundo, mundo.objects.land)

// Pontos em [longitude, latitude]
const LISBOA = [-9.1342, 38.7742]     // Aeroporto Humberto Delgado
const VIRACOPOS = [-47.1345, -23.0074] // Aeroporto de Viracopos, Campinas

// Recorte bem maior que a rota: assim sobra mapa para preencher qualquer tela
// (iPhone em pé, computador largo, monitor ultralargo) sem faixas vazias.
const OESTE = -110, LESTE = 55, SUL = -50, NORTE = 62
const LARGURA = 1400

const projecao = geoMercator().fitWidth(LARGURA, {
  type: 'MultiPoint',
  coordinates: [[OESTE, SUL], [LESTE, SUL], [LESTE, NORTE], [OESTE, NORTE]],
})
const [, yNorte] = projecao([0, NORTE])
const [, ySul] = projecao([0, SUL])
projecao.translate([projecao.translate()[0], projecao.translate()[1] - yNorte])
const ALTURA = Math.round(ySul - yNorte)
projecao.clipExtent([[0, 0], [LARGURA, ALTURA]])

// Desenha um caminho SVG com números arredondados, pulando pontos quase
// colados uns nos outros (deixa o arquivo bem menor sem perder a forma).
function caminho(objeto, distanciaMinima) {
  const partes = []
  let ultimo = null
  let inicio = null
  const r = (n) => Math.round(n * 10) / 10
  const contexto = {
    moveTo(x, y) { partes.push(`M${r(x)} ${r(y)}`); ultimo = [x, y]; inicio = [x, y] },
    lineTo(x, y) {
      if (Math.hypot(x - ultimo[0], y - ultimo[1]) < distanciaMinima) return
      partes.push(`L${r(x)} ${r(y)}`)
      ultimo = [x, y]
    },
    closePath() { partes.push('Z'); ultimo = inicio },
    arc() {},
  }
  geoPath(projecao, contexto)(objeto)
  // remove anéis minúsculos (ilhotas de 1–2 pontos)
  return partes.join('').replace(/M[\d. -]+(L[\d. -]+){0,2}Z/g, '')
}

const continentes = caminho(terra, 1.8)
const grade = caminho(geoGraticule().step([10, 10]).extent([[OESTE, SUL], [LESTE + 0.1, NORTE + 0.1]])(), 2)

// Rota: arco de círculo máximo (o caminho mais curto pelo globo).
// 241 pontos igualmente espaçados em distância real: o ponto i corresponde
// a i/240 do trajeto.
const PONTOS = 240
const interpolar = geoInterpolate(LISBOA, VIRACOPOS)
const rota = []
for (let i = 0; i <= PONTOS; i++) {
  const [x, y] = projecao(interpolar(i / PONTOS))
  rota.push(Math.round(x * 10) / 10, Math.round(y * 10) / 10)
}

const ponto = (lonlat) => {
  const [x, y] = projecao(lonlat)
  return `{ x: ${Math.round(x * 10) / 10}, y: ${Math.round(y * 10) / 10} }`
}

const arquivo = `// ARQUIVO GERADO por scripts/gerar-mapa.mjs — não edite à mão.
// Contornos: Natural Earth 1:50m (domínio público). Projeção de Mercator,
// recorte de ${OESTE}° a ${LESTE}° de longitude e ${SUL}° a ${NORTE}° de latitude.

export const LARGURA = ${LARGURA}
export const ALTURA = ${ALTURA}

export const LISBOA = ${ponto(LISBOA)}
export const VIRACOPOS = ${ponto(VIRACOPOS)}

// Rota pelo arco de círculo máximo: pares x, y. O par i fica a i/${PONTOS} do trajeto.
export const ROTA: number[] = [${rota.join(',')}]

// Linhas de latitude e longitude a cada 10°
export const GRADE = '${grade}'

// Contorno dos continentes
export const CONTINENTES = '${continentes}'
`

writeFileSync(new URL('../src/mapa.ts', import.meta.url), arquivo)
console.log(`mapa.ts gerado: ${LARGURA}x${ALTURA}, ${(arquivo.length / 1024).toFixed(1)} KB`)
