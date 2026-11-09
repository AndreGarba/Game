import { decodificar, obterContextoAudio } from '../../som/contextoAudio.ts'
import cena1 from './cena-1.mp3'
import cena1Musica from './cena-1-musica.mp3'
import cena2 from './cena-2.mp3'
import cena2Musica from './cena-2-musica.mp3'
import cena3 from './cena-3.mp3'
import cena3Musica from './cena-3-musica.mp3'
import cena4 from './cena-4.mp3'
import cena4Musica from './cena-4-musica.mp3'

/*
 * O som de cada quadro da história são duas gerações da ElevenLabs (`scripts/som/gerar-efeitos.ts`)
 * tocando juntas: o efeito puro (ronco, porta e susto, patinhas no assoalho, porta arrebentando e
 * patinhas sumindo) e a música de desenho da cena (na cena 1, só a canção de ninar; nas outras, a
 * cena inteira de novo com "tchan-tchan-TCHAN!", suspense e fanfarra de fuga por baixo). Somar aqui, e não num arquivo mixado, deixa o equilíbrio ajustável
 * sem gerar de novo. Não seguem o switch da música: são a cena, não a trilha.
 *
 * Volumes medidos nos arquivos: as patinhas da cena 3 saíram bem mais baixas que a música, e a
 * cena 4 somada no volume cheio passa de 1,0. O limitador no fim segura o que sobrar.
 */
const CENAS = [
  // Ronco reforçado e canção de ninar pura por baixo, as duas no mesmo nível médio.
  { efeito: cena1, musica: cena1Musica, volumeEfeito: 1.8, volumeMusica: 0.55 },
  { efeito: cena2, musica: cena2Musica, volumeEfeito: 0.9, volumeMusica: 0.75 },
  { efeito: cena3, musica: cena3Musica, volumeEfeito: 1.6, volumeMusica: 0.6 },
  { efeito: cena4, musica: cena4Musica, volumeEfeito: 0.8, volumeMusica: 0.7 },
] as const

// Quadro novo corta o som do anterior, para o toque rápido não empilhar quatro cenas.
const SAIDA_S = 0.25
// Som que demorou a decodificar não toca atrasado sobre o quadro seguinte.
const ATRASO_MAX_MS = 400

type Tocando = { fontes: AudioBufferSourceNode[]; ganho: GainNode }

let atual: Tocando | null = null
let pedido = 0
let limitador: DynamicsCompressorNode | null = null

/** Compressor de razão alta e ataque curto: só age no pico da soma, não muda o resto. */
function obterLimitador(ctx: AudioContext): DynamicsCompressorNode {
  if (!limitador) {
    limitador = ctx.createDynamicsCompressor()
    limitador.threshold.value = -3
    limitador.knee.value = 0
    limitador.ratio.value = 20
    limitador.attack.value = 0.003
    limitador.release.value = 0.1
    limitador.connect(ctx.destination)
  }
  return limitador
}

/** Decodifica as oito camadas antes da história, para o primeiro quadro não sair mudo. */
export function preCarregarEfeitosHistoria() {
  const ctx = obterContextoAudio()
  if (!ctx) return
  for (const cena of CENAS) {
    decodificar(cena.efeito, ctx).catch(() => {})
    decodificar(cena.musica, ctx).catch(() => {})
  }
}

function soltarAtual(ctx: AudioContext) {
  if (!atual) return
  const agora = ctx.currentTime
  atual.ganho.gain.cancelScheduledValues(agora)
  atual.ganho.gain.setValueAtTime(atual.ganho.gain.value, agora)
  atual.ganho.gain.linearRampToValueAtTime(0, agora + SAIDA_S)
  for (const fonte of atual.fontes) fonte.stop(agora + SAIDA_S + 0.05)
  atual = null
}

/** Toca o som do quadro `n` (1 a 4), cortando o anterior. */
export function tocarEfeitoQuadro(n: number) {
  const cena = CENAS[n - 1]
  const ctx = obterContextoAudio()
  if (!cena || !ctx) return
  soltarAtual(ctx)
  const meu = ++pedido
  const pedidoEm = performance.now()
  Promise.all([decodificar(cena.efeito, ctx), decodificar(cena.musica, ctx)])
    .then(([efeito, musica]) => {
      // Contexto parado (sem gesto ainda, app em segundo plano): o som tocaria fora de hora.
      if (meu !== pedido || ctx.state !== 'running' || performance.now() - pedidoEm > ATRASO_MAX_MS) return
      const ganho = ctx.createGain()
      ganho.connect(obterLimitador(ctx))
      // As duas camadas começam no mesmo instante do relógio do áudio, para não desencontrar.
      const inicio = ctx.currentTime + 0.01
      const fontes = [
        { buffer: efeito, volume: cena.volumeEfeito },
        { buffer: musica, volume: cena.volumeMusica },
      ].map(({ buffer, volume }) => {
        const fonte = ctx.createBufferSource()
        fonte.buffer = buffer
        const camada = ctx.createGain()
        camada.gain.value = volume
        fonte.connect(camada).connect(ganho)
        fonte.start(inicio)
        return fonte
      })
      const tocando: Tocando = { fontes, ganho }
      atual = tocando
      // A camada mais longa decide quando a cena acabou.
      const ultima = efeito.duration >= musica.duration ? fontes[0] : fontes[1]
      if (ultima) {
        ultima.onended = () => {
          if (atual === tocando) atual = null
        }
      }
    })
    .catch(() => {})
}

/** Saindo da história: o último som some rápido em vez de invadir a corrida. */
export function pararEfeitosHistoria() {
  pedido += 1
  const ctx = obterContextoAudio()
  if (ctx) soltarAtual(ctx)
}
