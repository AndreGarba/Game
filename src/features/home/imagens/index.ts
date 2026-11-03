// Arte do Figma "Hora do banho", frame Home (7953:8401). Mesma resolução do Figma, recodificada
// de PNG para WebP (qualidade 88): 8,7 MB viraram 1,5 MB, sem diferença visível.
import azulejos from './azulejos.webp'
import botoes from './botoes.webp'
import espuma from './espuma.webp'
import logo from './logo.webp'

export const IMAGENS_HOME = { azulejos, espuma, logo, botoes }

/** Começa a baixar a arte da home enquanto a abertura toca, para a home abrir pronta. */
export function preCarregarImagensHome() {
  for (const src of Object.values(IMAGENS_HOME)) {
    const imagem = new Image()
    imagem.src = src
  }
}
