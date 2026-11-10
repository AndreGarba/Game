/*
 * Gera os efeitos sonoros do jogo na ElevenLabs (modelo eleven_text_to_sound_v3): os da história
 * (`cena*`) e os da corrida (`ofegante`, `passos-tutor`, `pouso`).
 *
 *   node --env-file=.env.local scripts/som/gerar-efeitos.ts <pasta-de-saida> [cena1 ofegante ...]
 *
 * Corrida (`src/features/corrida/som/`): o ofegar é pedido como loop e toca sem parar enquanto o
 * cachorro corre; os passos do tutor são uma corrida inteira, recortada passo a passo no jogo
 * (`PASSOS` em `sonsCorrida.ts`, medidos na forma de onda: gerou de novo, mede de novo).
 *
 * Cada quadro tem duas camadas que o jogo toca juntas (`src/features/historia/sons/`): o efeito
 * puro (`cenaN`) e a mesma cena com música de desenho por baixo (`cenaN-musica`). Os quadros
 * entram a cada 1,8 s (`INTERVALO_MS` da TelaHistoria): cada som cabe nisso, e o último, que
 * fica na tela até o toque, pode ser mais longo. As duas camadas de uma cena têm a mesma duração
 * para acabarem juntas. A chave mora em `.env.local` e só este script a usa. Cada geração gasta
 * créditos e sai diferente da anterior; trocou uma camada, confira o equilíbrio em
 * `efeitosHistoria.ts`.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'

const ESTILO_EFEITO = 'Family-friendly cartoon sound effect, clean and punchy, no music, no voices speaking words.'
// A camada de música conta o clima (sono, suspense, susto) como trilha de cartoon clássico.
const ESTILO_MUSICA =
  'Classic family-friendly cartoon soundtrack moment, comedic and expressive, no voices speaking words, never scary.'

const EFEITOS = {
  // Quadro 1: o cachorro dorme sonhando com churrasco.
  cena1: {
    duracao: 2.5,
    texto: 'A small fluffy dog snoring very calmly and peacefully while asleep, soft slow breaths with gentle little snores. ' + ESTILO_EFEITO,
  },
  // Só a canção de ninar: o ronco vem da camada `cena1`. Pedir os dois juntos deixava a melodia
  // sumida atrás do ronco.
  'cena1-musica': {
    duracao: 2.5,
    texto:
      'A gentle, sweet cartoon lullaby melody played on a music box and celesta, slow, soft and dreamy, ' +
      'a clear simple tune like a bedtime song, warm soft pad underneath. Music only, no snoring, no other sounds. ' +
      ESTILO_MUSICA,
  },
  // Quadro 2: o tutor abre a porta e chama para o banho.
  cena2: {
    duracao: 2,
    texto: "A wooden door swung open quickly with a creak and bump, immediately followed by a small dog's startled surprised yelp. " + ESTILO_EFEITO,
  },
  'cena2-musica': {
    duracao: 2,
    texto:
      "A wooden door swung open quickly with a creak, a small dog's startled yelp, and a big dramatic " +
      'cartoon orchestral shock sting "dun-dun-DUN!" with brass and timpani. ' + ESTILO_MUSICA,
  },
  // Quadro 3: "não mesmo!" — o cachorro dispara.
  cena3: {
    duracao: 2,
    texto: 'Loud scrambling of small dog paws with claws skidding and tapping on a wooden floor as the dog bursts into a run. ' + ESTILO_EFEITO,
  },
  'cena3-musica': {
    duracao: 2,
    texto:
      'Comedic cartoon suspense music with fast tremolo strings and pizzicato rising in tension, over loud ' +
      'scrambling small dog paws with claws skidding on a wooden floor as the dog bursts into a run. ' + ESTILO_MUSICA,
  },
  // Quadro 4: atravessa a porta da rua e some; o tutor grita "volte aqui!".
  cena4: {
    duracao: 3.5,
    texto: 'A loud crash of a wooden door bursting and splintering, then small dog paws running fast and fading away into the distance until silence. ' + ESTILO_EFEITO,
  },
  'cena4-musica': {
    duracao: 3.5,
    texto:
      'A loud crash of a wooden door bursting and splintering with a cartoon cymbal hit, then a zippy cartoon ' +
      'chase flourish of xylophone and brass while small dog paws run fast and fade away into the distance. ' + ESTILO_MUSICA,
  },
  // Corrida: toca em loop o tempo todo, então nada que chame atenção sozinho (latido, ganido).
  ofegante: {
    duracao: 4,
    loop: true,
    texto:
      'A small happy dog panting steadily and quickly while running, rhythmic short breaths in and out with the ' +
      'tongue out, even and constant, no barking, no whining. ' + ESTILO_EFEITO,
  },
  'passos-tutor': {
    duracao: 4,
    texto:
      'An adult person running steadily on a city sidewalk in sneakers, clear distinct footsteps with an even ' +
      'rhythm, each step separate and crisp, no breathing, no background noise. ' + ESTILO_EFEITO,
  },
  // Um só para o cachorro e o tutor: o baque leve de patinhas não agradou.
  pouso: {
    duracao: 0.7,
    texto: 'An adult person landing on a sidewalk with both sneakers after a jump, a solid heavy cartoon thud, short. ' + ESTILO_EFEITO,
  },
} as const satisfies Record<string, { duracao: number; texto: string; loop?: boolean }>

type NomeEfeito = keyof typeof EFEITOS

async function main() {
  const [pasta, ...pedidos] = process.argv.slice(2)
  if (!pasta) throw new Error('Uso: gerar-efeitos.ts <pasta-de-saida> [cena1 ofegante ...]')
  if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY ausente: rode com --env-file=.env.local')
  }
  const nomes = (pedidos.length ? pedidos : Object.keys(EFEITOS)) as NomeEfeito[]
  for (const nome of nomes) if (!(nome in EFEITOS)) throw new Error(`Efeito desconhecido: ${nome}`)

  await mkdir(pasta, { recursive: true })
  const cliente = new ElevenLabsClient()
  const carimbo = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')

  for (const nome of nomes) {
    const efeito: { texto: string; duracao: number; loop?: boolean } = EFEITOS[nome]
    const { texto, duracao } = efeito
    console.log(`Gerando ${nome} (${duracao} s)…`)
    const audio = await cliente.textToSoundEffects.convert({
      text: texto,
      modelId: 'eleven_text_to_sound_v3',
      durationSeconds: duracao,
      loop: efeito.loop ?? false,
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
