// Simulação de balanceamento: o bot joga N partidas e cada log é reproduzido do zero com
// simularPartida, como o servidor faria. Divergência entre os dois é bug de determinismo.
//
//   npm run sim:partidas -- --partidas 30 --minutos 5
import { parseArgs } from 'node:util'
import { criarPartida, nivelEm, resultado, simularPartida, TICKS_POR_SEGUNDO } from '../src/engine/index.ts'
import { jogar } from './bot.ts'

const { values } = parseArgs({
  options: {
    partidas: { type: 'string', default: '20' },
    minutos: { type: 'string', default: '5' },
    seed: { type: 'string', default: '1' },
  },
})

const partidas = Number(values.partidas)
const limiteTicks = Number(values.minutos) * 60 * TICKS_POR_SEGUNDO
const seedInicial = Number(values.seed)

const linhas = []
const inicio = performance.now()
for (let i = 0; i < partidas; i++) {
  const seed = seedInicial + i
  const estado = criarPartida(seed)
  const log = jogar(estado, limiteTicks)
  const r = resultado(estado)
  const replay = simularPartida(seed, log)
  // O replay sem limite segue até o fim real; só compara quando o bot terminou a partida.
  if (estado.fim && JSON.stringify(replay) !== JSON.stringify(r)) {
    console.error('DIVERGÊNCIA no replay', { seed, bot: r, replay })
    process.exitCode = 1
  }
  linhas.push({
    seed,
    metros: r.distancia,
    pontos: r.pontos,
    segundos: Math.round(r.ticks / TICKS_POR_SEGUNDO),
    moedas: r.moedas,
    nivel: nivelEm(r.distancia),
    fim: estado.fim ? r.motivo : 'limite',
    comandos: log.length,
  })
}
console.table(linhas)

const metros = linhas.map((l) => l.metros).sort((a, b) => a - b)
const mediana = metros[Math.floor(metros.length / 2)]
const porMotivo = Object.groupBy(linhas, (l) => l.fim)
console.log(`mediana: ${mediana} m · mín ${metros[0]} · máx ${metros[metros.length - 1]}`)
console.log(
  'fim por motivo:',
  Object.fromEntries(Object.entries(porMotivo).map(([motivo, ls]) => [motivo, ls?.length ?? 0])),
)
console.log(`tempo de simulação: ${((performance.now() - inicio) / 1000).toFixed(1)} s`)
