import { VEL_INICIAL, VEL_MAX, velocidadeBase, type EstadoPartida } from '../../../engine/index.ts'
import { decodificar, obterContextoAudio } from '../../som/contextoAudio.ts'
import urlOfegante from './ofegante.mp3'
import urlPassosTutor from './passos-tutor.mp3'
import urlPouso from './pouso.mp3'

/*
 * Sons da corrida, gerados na ElevenLabs (`scripts/som/gerar-efeitos.ts`). Só UI: o motor não sabe
 * que existem. Saem do que já está desenhado em cada quadro (o cachorro do estado, o tutor da pose
 * que `desenharCena` calcula a partir do rastro), então batem com a animação e não com o tick.
 * Não seguem o switch da música, como os efeitos da história.
 *
 * - Ofegar: loop (a ElevenLabs gerou com `loop`, a costura não estala) enquanto a fase é
 *   `correndo`; acelera um pouco junto com o cachorro.
 * - Passos do tutor: uma corrida de 4 s recortada passo a passo. Cada passo toca quando o ciclo
 *   da animação dele completa meia volta (uma passada), e não com ele no ar ou deslizando.
 * - Pouso: o mesmo baque para o cachorro e para o tutor, cada um quando volta ao chão.
 */

/** Início (s) de cada passo bem marcado na gravação, medido pelo ataque na forma de onda. */
const PASSOS = [0.026, 0.358, 0.7, 1.032, 1.374, 1.712] as const
// Mais curto que o intervalo entre passadas na velocidade máxima (~0,1 s), com a cauda em fade.
const DURACAO_PASSO_S = 0.12

const VOLUME_OFEGANTE = 0.45
const VOLUME_PASSO = 1.1
const VOLUME_POUSO = 0.6
// Ofegar mais rápido conforme a velocidade sobe, sem virar desenho acelerado.
const RITMO_OFEGANTE_MIN = 0.95
const RITMO_OFEGANTE_MAX = 1.2

export interface PoseTutorSom {
  noChao: boolean
  abaixado: boolean
  // Mesma fase da animação do tutor: um ciclo (2π) são duas passadas.
  fase: number
}

let saida: GainNode | null = null
let ofegante: { fonte: AudioBufferSourceNode; ganho: GainNode } | null = null
let ofegarPedido = false
let ultimoX = Number.POSITIVE_INFINITY
let cachorroNoChao = true
let tutorNoChao = true
let passada: number | null = null
let proximoPasso = 0

function obterSaida(ctx: AudioContext): GainNode {
  if (!saida) {
    saida = ctx.createGain()
    saida.connect(ctx.destination)
  }
  return saida
}

/** Decodifica tudo antes da partida, para o primeiro pouso não sair mudo. */
export function preCarregarSonsCorrida() {
  const ctx = obterContextoAudio()
  if (!ctx) return
  for (const url of [urlOfegante, urlPassosTutor, urlPouso]) decodificar(url, ctx).catch(() => {})
}

/** Toca um som curto. `trecho` recorta [início, duração] da gravação, com a cauda em fade. */
function tocar(url: string, volume: number, trecho?: readonly [number, number]) {
  const ctx = obterContextoAudio()
  if (!ctx || ctx.state !== 'running') return
  decodificar(url, ctx)
    .then((buffer) => {
      // Ainda não decodificado no momento do pouso: tarde demais para tocar.
      if (ctx.state !== 'running') return
      const fonte = ctx.createBufferSource()
      fonte.buffer = buffer
      const ganho = ctx.createGain()
      const agora = ctx.currentTime
      ganho.gain.setValueAtTime(volume, agora)
      fonte.connect(ganho).connect(obterSaida(ctx))
      if (trecho) {
        const [inicio, duracao] = trecho
        ganho.gain.setValueAtTime(volume, agora + duracao * 0.5)
        ganho.gain.linearRampToValueAtTime(0, agora + duracao)
        fonte.start(agora, inicio, duracao)
      } else {
        fonte.start(agora)
      }
    })
    .catch(() => {})
}

function ritmoOfegante(estado: EstadoPartida): number {
  const t = (velocidadeBase(estado.cachorro.x) - VEL_INICIAL) / (VEL_MAX - VEL_INICIAL)
  return RITMO_OFEGANTE_MIN + (RITMO_OFEGANTE_MAX - RITMO_OFEGANTE_MIN) * Math.min(1, Math.max(0, t))
}

function soltarOfegante(ctx: AudioContext) {
  if (!ofegante) return
  const { fonte, ganho } = ofegante
  const agora = ctx.currentTime
  ganho.gain.cancelScheduledValues(agora)
  ganho.gain.setValueAtTime(ganho.gain.value, agora)
  ganho.gain.linearRampToValueAtTime(0, agora + 0.2)
  fonte.stop(agora + 0.25)
  ofegante = null
}

/** Liga o ofegar com a corrida em andamento e desliga na pausa e no fim. */
export function ofegar(ligado: boolean) {
  ofegarPedido = ligado
  const ctx = obterContextoAudio()
  if (!ctx) return
  if (!ligado) {
    soltarOfegante(ctx)
    return
  }
  if (ofegante) return
  decodificar(urlOfegante, ctx)
    .then((buffer) => {
      if (!ofegarPedido || ofegante) return
      const fonte = ctx.createBufferSource()
      fonte.buffer = buffer
      fonte.loop = true
      const ganho = ctx.createGain()
      ganho.gain.setValueAtTime(0, ctx.currentTime)
      ganho.gain.linearRampToValueAtTime(VOLUME_OFEGANTE, ctx.currentTime + 0.3)
      fonte.connect(ganho).connect(obterSaida(ctx))
      fonte.start()
      ofegante = { fonte, ganho }
    })
    .catch(() => {})
}

/** Chamado a cada quadro desenhado, com o estado da partida e a pose do tutor na tela. */
export function atualizarSonsCorrida(estado: EstadoPartida, tutor: PoseTutorSom) {
  const c = estado.cachorro
  const meiaVolta = Math.floor(tutor.fase / Math.PI)
  // Partida nova (x voltou para trás): começa sem pouso nem passo acumulado.
  if (c.x < ultimoX - 1) {
    cachorroNoChao = c.noChao
    tutorNoChao = tutor.noChao
    passada = meiaVolta
  }
  ultimoX = c.x

  if (c.noChao && !cachorroNoChao) tocar(urlPouso, VOLUME_POUSO)
  cachorroNoChao = c.noChao

  if (tutor.noChao && !tutorNoChao) {
    tocar(urlPouso, VOLUME_POUSO)
    // O pouso já é o pé no chão: a próxima passada conta a partir daqui.
    passada = meiaVolta
  }
  tutorNoChao = tutor.noChao

  if (!tutor.noChao || tutor.abaixado) {
    passada = meiaVolta
  } else if (passada === null || meiaVolta < passada) {
    passada = meiaVolta
  } else if (meiaVolta > passada) {
    passada = meiaVolta
    const inicio = PASSOS[proximoPasso % PASSOS.length]!
    proximoPasso += 1
    tocar(urlPassosTutor, VOLUME_PASSO, [inicio, DURACAO_PASSO_S])
  }

  const ctx = obterContextoAudio()
  if (ctx && ofegante) {
    const ritmo = ritmoOfegante(estado)
    if (Math.abs(ofegante.fonte.playbackRate.value - ritmo) > 0.01) {
      ofegante.fonte.playbackRate.setTargetAtTime(ritmo, ctx.currentTime, 0.5)
    }
  }
}

/** Saindo da corrida: o ofegar some e nada fica pendurado para a próxima partida. */
export function pararSonsCorrida() {
  ofegar(false)
  ultimoX = Number.POSITIVE_INFINITY
}
