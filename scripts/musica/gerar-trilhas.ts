/*
 * Gera as trilhas de fundo na ElevenLabs Music (modelo music_v2_5).
 *
 *   node --env-file=.env.local scripts/musica/gerar-trilhas.ts <pasta-de-saida> [home|corrida ...]
 *
 * A chave mora em `.env.local` (fora do git, criada por `npx @elevenlabs/cli onboard`) e só este
 * script a usa: o jogo nunca fala com a ElevenLabs, ele toca os arquivos prontos. O resultado é a
 * gravação bruta; o loop sem emenda sai de `scripts/musica/preparar_loop.py`.
 *
 * Cada geração gasta créditos da conta, e o mesmo prompt dá uma música diferente a cada vez. Os
 * prompts ficam aqui para a trilha poder ser refeita no mesmo espírito.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'

// Sem intro, sem final e sem fade: o loop é cortado do meio da gravação.
const SEM_EMENDA =
  'Full groove from the very first beat, no intro, no ending, no fade-out, no breakdown; ' +
  'steady tempo and energy the whole time so any bar can loop back to the start.'

const TRILHAS = {
  home: {
    duracaoMs: 60_000,
    prompt:
      'Playful, cozy cartoon bath-time theme for the title screen of a family-friendly mobile game ' +
      'about a mischievous puppy who hates baths. Instrumental. 100 BPM, 4/4, bright major key. ' +
      'Strummed ukulele, glockenspiel and xylophone melody, pizzicato strings, warm upright bass, ' +
      'light brushed drums, little bubbly pops. Cheerful, cheeky and warm, never sleepy. ' +
      SEM_EMENDA,
  },
  corrida: {
    duracaoMs: 60_000,
    prompt:
      'Fast comedic cartoon chase music for an endless-runner mobile game: a puppy running across ' +
      'the city to escape bath time, its owner chasing with a sponge. Instrumental. 150 BPM, 4/4, ' +
      'major key with playful chromatic runs. Punchy brass stabs, fast pizzicato strings, ' +
      'xylophone runs, bouncy tuba bass, driving snare and toms, slide-whistle and cymbal accents. ' +
      'Energetic and silly, never scary or dark. ' +
      SEM_EMENDA,
  },
} as const

type NomeTrilha = keyof typeof TRILHAS

async function main() {
  const [pasta, ...pedidas] = process.argv.slice(2)
  if (!pasta) throw new Error('Uso: gerar-trilhas.ts <pasta-de-saida> [home|corrida ...]')
  if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY ausente: rode com --env-file=.env.local')
  }
  const nomes = (pedidas.length ? pedidas : Object.keys(TRILHAS)) as NomeTrilha[]
  for (const nome of nomes) if (!(nome in TRILHAS)) throw new Error(`Trilha desconhecida: ${nome}`)

  await mkdir(pasta, { recursive: true })
  const cliente = new ElevenLabsClient()
  const carimbo = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')

  for (const nome of nomes) {
    const { prompt, duracaoMs } = TRILHAS[nome]
    console.log(`Gerando ${nome} (${duracaoMs / 1000} s)…`)
    const audio = await cliente.music.compose({
      prompt,
      musicLengthMs: duracaoMs,
      modelId: 'music_v2_5',
      forceInstrumental: true,
      outputFormat: 'mp3_48000_192',
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
