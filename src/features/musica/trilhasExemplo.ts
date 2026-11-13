/*
 * Trilhas do jogo de exemplo, sintetizadas na hora: o template não carrega mp3. Cada uma é um
 * arpejo de N compassos com tamanho exato de compasso, então o loop fecha sem emenda. Jogo novo
 * troca por gravações (`url` + `inicio`/`fim` em tocadorMusica.ts) e apaga este arquivo.
 */

interface Arpejo {
  bpm: number
  // Frequências em Hz, uma por colcheia; a sequência repete até completar os compassos.
  notas: readonly number[]
  compassos: number
}

export const ARPEJO_MENU: Arpejo = { bpm: 96, notas: [262, 330, 392, 494, 440, 392, 330, 294], compassos: 4 }
export const ARPEJO_JOGO: Arpejo = { bpm: 140, notas: [220, 262, 330, 262, 247, 294, 370, 294], compassos: 4 }

export function sintetizarArpejo(ctx: BaseAudioContext, { bpm, notas, compassos }: Arpejo): AudioBuffer {
  const taxa = ctx.sampleRate
  const colcheia = 60 / bpm / 2
  const totalColcheias = compassos * 8
  const amostrasPorNota = Math.round(colcheia * taxa)
  const buffer = ctx.createBuffer(1, amostrasPorNota * totalColcheias, taxa)
  const dados = buffer.getChannelData(0)
  for (let n = 0; n < totalColcheias; n++) {
    const freq = notas[n % notas.length]!
    const inicio = n * amostrasPorNota
    for (let i = 0; i < amostrasPorNota; i++) {
      const t = i / taxa
      // Ataque curto e decaimento: sem clique na troca de nota nem na volta do loop.
      const envelope = Math.min(1, i / (0.005 * taxa)) * Math.exp(-6 * t)
      const triangulo = (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * freq * t))
      dados[inicio + i] = 0.25 * envelope * triangulo
    }
  }
  return buffer
}
