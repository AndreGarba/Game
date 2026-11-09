import { decodificar, obterContextoAudio } from '../../som/contextoAudio.ts'
import cena1 from './cena-1.mp3'
import cena2 from './cena-2.mp3'
import cena3 from './cena-3.mp3'
import cena4 from './cena-4.mp3'

/*
 * Um efeito por quadro da história, gerados na ElevenLabs (`scripts/som/gerar-efeitos.ts`):
 * ronco, porta abrindo com susto, patinhas disparando no assoalho, porta da rua arrebentando com
 * o cachorro sumindo ao longe. Não seguem o switch da música: são a cena, não a trilha.
 */
const EFEITOS = [cena1, cena2, cena3, cena4] as const

const VOLUME = 0.9
// Quadro novo corta o efeito do anterior, para o toque rápido não empilhar quatro sons.
const SAIDA_S = 0.25
// Efeito que demorou a decodificar não toca atrasado sobre o quadro seguinte.
const ATRASO_MAX_MS = 400

let atual: { fonte: AudioBufferSourceNode; ganho: GainNode } | null = null
let pedido = 0

/** Decodifica os quatro antes da história, para o primeiro quadro não sair mudo. */
export function preCarregarEfeitosHistoria() {
  const ctx = obterContextoAudio()
  if (!ctx) return
  for (const url of EFEITOS) decodificar(url, ctx).catch(() => {})
}

function soltarAtual(ctx: AudioContext) {
  if (!atual) return
  const agora = ctx.currentTime
  atual.ganho.gain.cancelScheduledValues(agora)
  atual.ganho.gain.setValueAtTime(atual.ganho.gain.value, agora)
  atual.ganho.gain.linearRampToValueAtTime(0, agora + SAIDA_S)
  atual.fonte.stop(agora + SAIDA_S + 0.05)
  atual = null
}

/** Toca o efeito do quadro `n` (1 a 4), cortando o anterior. */
export function tocarEfeitoQuadro(n: number) {
  const url = EFEITOS[n - 1]
  const ctx = obterContextoAudio()
  if (!url || !ctx) return
  soltarAtual(ctx)
  const meu = ++pedido
  const pedidoEm = performance.now()
  decodificar(url, ctx)
    .then((buffer) => {
      // Contexto parado (sem gesto ainda, app em segundo plano): o som tocaria fora de hora.
      if (meu !== pedido || ctx.state !== 'running' || performance.now() - pedidoEm > ATRASO_MAX_MS) return
      const fonte = ctx.createBufferSource()
      fonte.buffer = buffer
      const ganho = ctx.createGain()
      ganho.gain.value = VOLUME
      fonte.connect(ganho).connect(ctx.destination)
      fonte.start()
      atual = { fonte, ganho }
      fonte.onended = () => {
        if (atual?.fonte === fonte) atual = null
      }
    })
    .catch(() => {})
}

/** Saindo da história: o último efeito some rápido em vez de invadir a corrida. */
export function pararEfeitosHistoria() {
  pedido += 1
  const ctx = obterContextoAudio()
  if (ctx) soltarAtual(ctx)
}
