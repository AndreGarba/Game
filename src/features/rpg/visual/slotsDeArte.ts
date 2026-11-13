// Slots de arte: cada imagem que o ChatGPT desenhar tem um nome fixo numa pasta de
// `src/features/rpg/arte/`. Arquivo presente → o jogo usa; ausente → cai na cor da paleta ou no
// desenho procedural. Não há lista para editar: soltar o arquivo com o nome certo basta
// (docs/ASSETS.md tem a tabela de nomes, tamanhos e transparência).

export type PastaArte = 'texturas' | 'fachadas' | 'placas' | 'portas' | 'hud'

// O Vite troca isto, no build, pela lista dos arquivos que existem na pasta. Pasta vazia = {}.
const ARQUIVOS = import.meta.glob('../arte/*/*.{png,webp,jpg,jpeg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const EXTENSOES = ['webp', 'png', 'jpg', 'jpeg']

export function urlDaArte(pasta: PastaArte, nome: string): string | null {
  for (const ext of EXTENSOES) {
    const url = ARQUIVOS[`../arte/${pasta}/${nome}.${ext}`]
    if (url) return url
  }
  return null
}

// Quantos metros do chão cada repetição de uma textura de piso cobre. Textura nova de piso
// herda 2 m se não estiver aqui.
export const METROS_POR_REPETICAO: Record<string, number> = {
  grama: 4,
  calcada: 2,
  asfalto: 4,
  'piso-escritorio': 2,
  'piso-concessionaria': 3,
  tapete: 3,
  plataforma: 5,
}
