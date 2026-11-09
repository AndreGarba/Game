import { assinarMusica, lerMusicaLigada } from '../../data/preferencias.ts'
import urlCorrida from './trilhas/corrida.mp3'
import urlHome from './trilhas/home.mp3'

/*
 * Música de fundo. As trilhas vieram da ElevenLabs Music (`scripts/musica/gerar-trilhas.ts`) como
 * gravações de 60 s com um final no último compasso. O loop é um trecho do meio, de compasso a
 * compasso (`inicio`/`fim`, medidos na forma de onda), e a emenda é feita aqui ao decodificar: o
 * começo do trecho é cruzado com o que vinha logo depois do `fim`, então o salto do fim para o
 * começo cai no mesmo ponto da música. Web Audio em vez de <audio loop>: o elemento deixa um
 * buraco audível a cada volta e não aceita ponto de loop.
 */
export type NomeTrilha = 'home' | 'corrida'

const TRILHAS: Record<NomeTrilha, { url: string; inicio: number; fim: number }> = {
  // 100 BPM: 20 compassos de 2,4 s.
  home: { url: urlHome, inicio: 0.042, fim: 48.044 },
  // 150 BPM: 32 compassos de 1,6 s.
  corrida: { url: urlCorrida, inicio: 0.472, fim: 51.67 },
}

const VOLUME = 0.5
// Pausa e fim de partida: a música continua, mais baixa, para a volta não ser um susto.
const FATOR_ABAFADO = 0.35
const CRUZAMENTO_S = 0.12
const TROCA_S = 0.6

type Tocando = { nome: NomeTrilha; fonte: AudioBufferSourceNode; ganho: GainNode }

let contexto: AudioContext | null = null
let mestre: GainNode | null = null
let pedida: NomeTrilha | null = null
let tocando: Tocando | null = null
let abafada = false
let iniciado = false
const buffers = new Map<NomeTrilha, Promise<AudioBuffer>>()

function obterContexto(): AudioContext | null {
  if (contexto) return contexto
  const Construtor =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Construtor) return null
  contexto = new Construtor()
  mestre = contexto.createGain()
  mestre.gain.value = volumeAlvo()
  mestre.connect(contexto.destination)
  return contexto
}

function volumeAlvo(): number {
  if (!lerMusicaLigada()) return 0
  return abafada ? VOLUME * FATOR_ABAFADO : VOLUME
}

/** Só toca quando há trilha pedida, música ligada e o jogo na frente; fora disso, o áudio dorme. */
function deveTocar(): boolean {
  return pedida !== null && lerMusicaLigada() && document.visibilityState === 'visible'
}

function ajustar() {
  const ctx = contexto
  if (!ctx || !mestre) return
  mestre.gain.setTargetAtTime(volumeAlvo(), ctx.currentTime, 0.12)
  if (deveTocar()) {
    // Antes do primeiro toque o navegador recusa: o desbloqueio tenta de novo no gesto.
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
  } else if (ctx.state === 'running') {
    // Espera o volume descer antes de suspender, senão corta seco.
    const aguardado = ctx
    setTimeout(() => {
      if (!deveTocar() && aguardado.state === 'running') void aguardado.suspend().catch(() => {})
    }, 500)
  }
}

async function carregar(nome: NomeTrilha, ctx: AudioContext): Promise<AudioBuffer> {
  const { url, inicio, fim } = TRILHAS[nome]
  const bruto = await ctx.decodeAudioData(await (await fetch(url)).arrayBuffer())
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

function buffer(nome: NomeTrilha, ctx: AudioContext): Promise<AudioBuffer> {
  let promessa = buffers.get(nome)
  if (!promessa) {
    promessa = carregar(nome, ctx)
    // Falhou (rede, decodificação): esquece para tentar de novo na próxima troca de tela.
    promessa.catch(() => buffers.delete(nome))
    buffers.set(nome, promessa)
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

/** Troca a trilha de fundo, com fade. `null` para a música (abertura, que tem som próprio). */
export function tocarTrilha(nome: NomeTrilha | null) {
  pedida = nome
  const ctx = obterContexto()
  if (!ctx || !mestre) return
  if (tocando?.nome === nome) {
    ajustar()
    return
  }
  if (tocando) {
    soltar(tocando, ctx)
    tocando = null
  }
  ajustar()
  if (!nome) return
  const saida = mestre
  buffer(nome, ctx)
    .then((loop) => {
      // A tela pode ter mudado enquanto decodificava.
      if (pedida !== nome || tocando) return
      const fonte = ctx.createBufferSource()
      fonte.buffer = loop
      fonte.loop = true
      const ganho = ctx.createGain()
      ganho.gain.setValueAtTime(0, ctx.currentTime)
      ganho.gain.linearRampToValueAtTime(1, ctx.currentTime + TROCA_S)
      fonte.connect(ganho).connect(saida)
      fonte.start()
      tocando = { nome, fonte, ganho }
    })
    .catch(() => {})
}

/** Abaixa a música (pausa e fim de partida) sem parar a trilha. */
export function abafarMusica(abafar: boolean) {
  abafada = abafar
  ajustar()
}

// Todo gesto tenta destravar, não só o primeiro: o iOS volta a suspender o áudio depois de uma
// ligação ou de outro app tocar som, e o próximo toque precisa conseguir retomar.
const EVENTOS_GESTO = ['pointerdown', 'keydown', 'touchend'] as const

/**
 * Liga o tocador uma vez, na raiz do app. O navegador só deixa tocar som depois de um gesto. Também
 * segue o switch das configurações e dorme com o jogo em segundo plano (aba trocada, app
 * minimizado na casca).
 */
export function iniciarTocador() {
  if (iniciado) return
  iniciado = true
  const destravar = () => {
    obterContexto()
    ajustar()
  }
  for (const evento of EVENTOS_GESTO) window.addEventListener(evento, destravar, true)
  document.addEventListener('visibilitychange', ajustar)
  assinarMusica(ajustar)
}
