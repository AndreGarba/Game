// Arte do Figma "Hora do banho", frame Home (7953:8401), baixada sem alteração.
import azulejos from './azulejos.png'
import botoes from './botoes.png'
import espuma from './espuma.png'
import logo from './logo.png'

export const IMAGENS_HOME = { azulejos, espuma, logo, botoes }

/** Começa a baixar a arte da home enquanto a abertura toca: são vários MB. */
export function preCarregarImagensHome() {
  for (const src of Object.values(IMAGENS_HOME)) {
    const imagem = new Image()
    imagem.src = src
  }
}
