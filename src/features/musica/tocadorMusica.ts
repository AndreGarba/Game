import { assinarMusica, lerMusicaLigada } from '../../data/preferencias.ts'
import { decodificar, iniciarAudio, obterContextoAudio } from '../som/contextoAudio.ts'
import { ARPEJO_JOGO, ARPEJO_MENU, sintetizarArpejo } from './trilhasExemplo.ts'

/*
 * Música de fundo, em Web Audio em vez de <audio loop>: o elemento deixa um buraco audível a cada
 * volta e não aceita ponto de loop.
 *
 * Gravação de verdade quase nunca é loop: costuma ter introdução e um final no último compasso. O
 * loop é então um trecho do meio, de compasso a compasso (`inicio`/`fim`, medidos na forma de
 * onda), e a emenda é feita aqui ao decodificar: o começo do trecho é cruzado com o que vinha logo
 * depois do `fim`. Trilha regravada = medir `inicio`/`fim` de novo; valores velhos numa gravação
 * nova dão um tropeço a cada volta.
 */
export type NomeTrilha = 'menu' | 'jogo'

type Trilha =
  | {
      url: string
      // Trecho de compasso a compasso; sem eles, a gravação já é um loop e toca inteira.
      inicio?: number
      fim?: number
      volume?: number
    }
  | { sintetizar: (ctx: AudioContext) => AudioBuffer; volume?: number }

// Jogo novo: troque por `{ url: urlDoMp3, inicio, fim }` (import do mp3 como módulo).
const TRILHAS: Record<NomeTrilha, Trilha> = {
  menu: { sintetizar: (ctx) => sintetizarArpejo(ctx, ARPEJO_MENU) },
  jogo: { sintetizar: (ctx) => sintetizarArpejo(ctx, ARPEJO_JOGO) },
}

const VOLUME = 0.5
// Pausa e fim de partida: a música continua, mais baixa, para a volta não ser um susto.
const FATOR_ABAFADO = 0.35
const CRUZAMENTO_S = 0.12
const TROCA_S = 0.6

type Tocando = { nome: NomeTrilha; fonte: AudioBufferSourceNode; ganho: GainNode }

let mestre: GainNode | null = null
let pedida: NomeTrilha | null = null
let tocando: Tocando | null = null
let abafada = false
const loops = new Map<NomeTrilha, Promise<AudioBuffer>>()

function volumeAlvo(): number {
  if (!lerMusicaLigada()) return 0
  return abafada ? VOLUME * FATOR_ABAFADO : VOLUME
}

function obterMestre(ctx: AudioContext): GainNode {
  if (!mestre) {
    mestre = ctx.createGain()
    mestre.gain.value = volumeAlvo()
    mestre.connect(ctx.destination)
  }
  return mestre
}

/*
 * Desligada, a música vai a volume zero mas a trilha segue correndo: o contexto não pode dormir,
 * porque os efeitos sonoros usam o mesmo. Ao religar, ela volta no ponto em que estaria.
 */
function ajustarVolume() {
  const ctx = obterContextoAudio()
  if (!ctx || !mestre) return
  mestre.gain.setTargetAtTime(volumeAlvo(), ctx.currentTime, 0.12)
}

async function montarLoop(nome: NomeTrilha, ctx: AudioContext): Promise<AudioBuffer> {
  const trilha = TRILHAS[nome]
  if ('sintetizar' in trilha) return trilha.sintetizar(ctx)
  const { url, inicio, fim } = trilha
  const bruto = await decodificar(url, ctx)
  if (inicio === undefined || fim === undefined) return bruto
  const taxa = bruto.sampleRate
  const a = Math.round(inicio * taxa)
  const b = Math.round(fim * taxa)
  const cruzamento = Math.min(Math.round(CRUZAMENTO_S * taxa), bruto.length - b)
  const loop = ctx.createBuffer(bruto.numberOfChannels, b - a, taxa)
  for (let canal = 0; canal < bruto.numberOfChannels; canal++) {
    const origem = bruto.getChannelData(canal)
    const destino = loop.getChannelData(canal)
    destino.set(origem.subarray(a, b))
    // Potência constante: o começo entra enquanto o que seguia o `fim` sai.
    for (let i = 0; i < cruzamento; i++) {
      const x = (i / cruzamento) * (Math.PI / 2)
      destino[i] = (origem[a + i] ?? 0) * Math.sin(x) + (origem[b + i] ?? 0) * Math.cos(x)
    }
  }
  return loop
}

function loop(nome: NomeTrilha, ctx: AudioContext): Promise<AudioBuffer> {
  let promessa = loops.get(nome)
  if (!promessa) {
    promessa = montarLoop(nome, ctx)
    promessa.catch(() => loops.delete(nome))
    loops.set(nome, promessa)
  }
  return promessa
}

function soltar(atual: Tocando, ctx: AudioContext) {
  const agora = ctx.currentTime
  atual.ganho.gain.cancelScheduledValues(agora)
  atual.ganho.gain.setValueAtTime(atual.ganho.gain.value, agora)
  atual.ganho.gain.linearRampToValueAtTime(0, agora + TROCA_S)
  atual.fonte.stop(agora + TROCA_S + 0.05)
}

/** Troca a trilha de fundo, com fade. `null` para a música (a abertura tem som próprio). */
export function tocarTrilha(nome: NomeTrilha | null) {
  pedida = nome
  const ctx = obterContextoAudio()
  if (!ctx) return
  const saida = obterMestre(ctx)
  if (tocando?.nome === nome) return
  if (tocando) {
    soltar(tocando, ctx)
    tocando = null
  }
  if (!nome) return
  loop(nome, ctx)
    .then((buffer) => {
      // A tela pode ter mudado enquanto decodificava.
      if (pedida !== nome || tocando) return
      const fonte = ctx.createBufferSource()
      fonte.buffer = buffer
      fonte.loop = true
      const ganho = ctx.createGain()
      ganho.gain.setValueAtTime(0, ctx.currentTime)
      ganho.gain.linearRampToValueAtTime(TRILHAS[nome].volume ?? 1, ctx.currentTime + TROCA_S)
      fonte.connect(ganho).connect(saida)
      fonte.start()
      tocando = { nome, fonte, ganho }
    })
    .catch(() => {})
}

/** Abaixa a música (pausa, fim de partida) sem parar a trilha. */
export function abafarMusica(abafar: boolean) {
  abafada = abafar
  ajustarVolume()
}

/** Liga o áudio e passa a seguir o switch das configurações. Uma vez, na raiz do app. */
export function iniciarTocador() {
  iniciarAudio()
  assinarMusica(ajustarVolume)
}
