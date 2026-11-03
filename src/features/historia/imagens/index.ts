// Arte do Figma "Hora do banho", frame Story (7954:8586). Quadros reduzidos a 1280 px de largura
// (cada um ocupa até 417 px na tela: 3× ainda cabe) e recodificados em WebP: 26 MB viraram 1,6 MB.
import balaoFala from './balao-fala.webp'
import balaoPensamento from './balao-pensamento.webp'
import divisoria1 from './divisoria-1.svg'
import divisoria2 from './divisoria-2.svg'
import fundoBalao1 from './fundo-balao-1.svg'
import fundoBalao2 from './fundo-balao-2.svg'
import fundoBalao3 from './fundo-balao-3.svg'
import fundoBalao4 from './fundo-balao-4.svg'
import quadroDormindo from './quadro-dormindo.webp'
import quadroFuga from './quadro-fuga.webp'
import quadroPorta from './quadro-porta.webp'
import quadroRua from './quadro-rua.webp'

export const IMAGENS_HISTORIA = {
  quadroDormindo,
  quadroPorta,
  quadroFuga,
  quadroRua,
  balaoPensamento,
  balaoFala,
  fundoBalao1,
  fundoBalao2,
  fundoBalao3,
  fundoBalao4,
  divisoria1,
  divisoria2,
}

/** A história vem logo depois do Jogar: baixa antes, para os quadros não aparecerem pela metade. */
export function preCarregarImagensHistoria() {
  for (const src of Object.values(IMAGENS_HISTORIA)) {
    const imagem = new Image()
    imagem.src = src
  }
}
