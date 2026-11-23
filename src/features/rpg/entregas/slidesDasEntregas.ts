// Slides da modal "Entregas 2026": imagens em `src/features/rpg/arte/entregas/<id do quadro>/`,
// na ordem do nome do arquivo (por isso o prefixo 01-, 02-…). Soltar o arquivo basta; o texto
// alternativo de cada um mora em `rpg.entregas.quadros.<id>.slides.<nome sem extensão>`.

export interface SlideDasEntregas {
  nome: string
  url: string
}

const ARQUIVOS = import.meta.glob('../arte/entregas/*/*.{png,webp,jpg,jpeg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const SLIDES: Record<string, SlideDasEntregas[]> = {}
for (const [caminho, url] of Object.entries(ARQUIVOS)) {
  const [, quadro, arquivo] = /\.\.\/arte\/entregas\/([^/]+)\/([^/]+)$/.exec(caminho) ?? []
  if (!quadro || !arquivo) continue
  ;(SLIDES[quadro] ??= []).push({ nome: arquivo.replace(/\.[^.]+$/, ''), url })
}
for (const lista of Object.values(SLIDES)) lista.sort((a, b) => a.nome.localeCompare(b.nome))

export function slidesDoQuadro(quadro: string): SlideDasEntregas[] {
  return SLIDES[quadro] ?? []
}

export function quadrosComSlides(): string[] {
  return Object.keys(SLIDES)
}
