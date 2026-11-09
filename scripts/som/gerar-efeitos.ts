/*
 * Gera os efeitos sonoros da história na ElevenLabs (modelo eleven_text_to_sound_v3).
 *
 *   node --env-file=.env.local scripts/som/gerar-efeitos.ts <pasta-de-saida> [cena1 ...]
 *
 * Um efeito por quadro da história, tocado quando o quadro aparece. Os quadros entram a cada
 * 1,8 s (`INTERVALO_MS` da TelaHistoria): cada efeito cabe nisso, e o último, que fica na tela
 * até o toque, pode ser mais longo. A chave mora em `.env.local` e só este script a usa. Cada
 * geração gasta créditos e sai diferente da anterior.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'

// Mesmo mundo sonoro da trilha: desenho animado para todas as idades, nunca assustador.
const ESTILO = 'Family-friendly cartoon sound effect, clean and punchy, no music, no voices speaking words.'

const EFEITOS = {
  // Quadro 1: o cachorro dorme sonhando com churrasco.
  cena1: {
    duracao: 2.5,
    texto: 'A small fluffy dog snoring very calmly and peacefully while asleep, soft slow breaths with gentle little snores. ' + ESTILO,
  },
  // Quadro 2: o tutor abre a porta e chama para o banho.
  cena2: {
    duracao: 2,
    texto: 'A wooden door swung open quickly with a creak and bump, immediately followed by a small dog\'s startled surprised yelp. ' + ESTILO,
  },
  // Quadro 3: "não mesmo!" — o cachorro dispara.
  cena3: {
    duracao: 2,
    texto: 'Loud scrambling of small dog paws with claws skidding and tapping on a wooden floor as the dog bursts into a run. ' + ESTILO,
  },
  // Quadro 4: atravessa a porta da rua e some; o tutor grita "volte aqui!".
  cena4: {
    duracao: 3.5,
    texto: 'A loud crash of a wooden door bursting and splintering, then small dog paws running fast and fading away into the distance until silence. ' + ESTILO,
  },
} as const

type NomeEfeito = keyof typeof EFEITOS

async function main() {
  const [pasta, ...pedidos] = process.argv.slice(2)
  if (!pasta) throw new Error('Uso: gerar-efeitos.ts <pasta-de-saida> [cena1 ...]')
  if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY ausente: rode com --env-file=.env.local')
  }
  const nomes = (pedidos.length ? pedidos : Object.keys(EFEITOS)) as NomeEfeito[]
  for (const nome of nomes) if (!(nome in EFEITOS)) throw new Error(`Efeito desconhecido: ${nome}`)

  await mkdir(pasta, { recursive: true })
  const cliente = new ElevenLabsClient()
  const carimbo = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')

  for (const nome of nomes) {
    const { texto, duracao } = EFEITOS[nome]
    console.log(`Gerando ${nome} (${duracao} s)…`)
    const audio = await cliente.textToSoundEffects.convert({
      text: texto,
      modelId: 'eleven_text_to_sound_v3',
      durationSeconds: duracao,
      promptInfluence: 0.6,
      outputFormat: 'mp3_44100_128',
    })
    const destino = join(pasta, `${nome}-${carimbo}.mp3`)
    await writeFile(destino, new Uint8Array(await new Response(audio).arrayBuffer()))
    console.log(`  → ${destino}`)
  }
}

main().catch((erro: unknown) => {
  console.error(erro instanceof Error ? erro.message : erro)
  process.exit(1)
})
