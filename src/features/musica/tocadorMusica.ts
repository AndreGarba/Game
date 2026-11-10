import { assinarMusica, lerMusicaLigada } from '../../data/preferencias.ts'
import { decodificar, iniciarAudio, obterContextoAudio } from '../som/contextoAudio.ts'
import urlBanho from './trilhas/banho.mp3'
import urlCorrida from './trilhas/corrida.mp3'
import urlHome from './trilhas/home.mp3'

/*
 * Música de fundo. As trilhas vieram da ElevenLabs Music (`scripts/musica/gerar-trilhas.ts`) como
 * gravações de 60 s com um final no último compasso. O loop é um trecho do meio, de compasso a
 * compasso (`inicio`/`fim`, medidos na forma de onda), e a emenda é feita aqui ao decodificar: o
 * começo do trecho é cruzado com o que vinha logo depois do `fim`, então o salto do fim para o
 * começo cai no mesmo ponto da música. Web Audio em vez de <audio loop>: o elemento deixa um
 * buraco audível a cada volta e não aceita ponto de loop.
 *
 * O fim de partida tem música própria: quando a imagem do banho entra, a trilha `banho`. Ela é
 * curta, da ElevenLabs de efeitos (`scripts/som/gerar-efeitos.ts`), e já veio como loop: toca
 * inteira, sem `inicio`/`fim`.
 */
export type NomeTrilha = 'home' | 'corrida' | 'banho'

interface Trilha {
  url: string
  // Trecho de compasso a compasso; sem eles, a gravação já é um loop e toca inteira.
  inicio?: number
  fim?: number
  // As gravações curtas saíram mais baixas que as da ElevenLabs Music (RMS 0,07 contra 0,18).
  volume?: number
}

const TRILHAS: Record<NomeTrilha, Trilha> = {
  // 100 BPM: 20 compassos de 2,4 s.
  home: { url: urlHome, inicio: 0.042, fim: 48.044 },
  // 150 BPM: 32 compassos de 1,6 s.
  corrida: { url: urlCorrida, inicio: 0.472, fim: 51.67 },
  banho: { url: urlBanho, volume: 2 },
}

// O banho entra com a imagem deslizando: depois da íris (`--fim-iris` 1 s + 0,05 s em tela-corrida.css).
const ENTRADA_BANHO_MS = 1050

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
  const { url, inicio, fim } = TRILHAS[nome]
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

let esperaBanho: ReturnType<typeof setTimeout> | undefined

// Troca de trilha pedida de fora (De novo, outra tela) desfaz o banho que ia entrar.
function cancelarFim() {
  clearTimeout(esperaBanho)
}

/** Troca a trilha de fundo, com fade. `null` para a música (abertura e história têm som próprio). */
export function tocarTrilha(nome: NomeTrilha | null) {
  cancelarFim()
  trocar(nome)
}

function trocar(nome: NomeTrilha | null) {
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
  // A partida pode acabar a qualquer momento: o banho fica decodificado antes.
  if (nome === 'corrida') loop('banho', ctx).catch(() => {})
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

/**
 * Fim de partida: a trilha da corrida sai na batida, sem vinheta, e o banho entra junto com a
 * imagem. Segue o switch como o resto da música (passa pelo mesmo ganho mestre).
 */
export function tocarFimDePartida() {
  cancelarFim()
  trocar(null)
  esperaBanho = setTimeout(() => trocar('banho'), ENTRADA_BANHO_MS)
}

/** Abaixa a música (pausa) sem parar a trilha. */
export function abafarMusica(abafar: boolean) {
  abafada = abafar
  ajustarVolume()
}

/** Liga o áudio e passa a seguir o switch das configurações. Uma vez, na raiz do app. */
export function iniciarTocador() {
  iniciarAudio()
  assinarMusica(ajustarVolume)
}
