// Janela de configurações. Peças geradas no ChatGPT numa folha só, sem texto, com a folha de
// botões da home como referência de estilo; a folha original está em
// PRD/referencias/configuracoes-folha.png. Recortadas por componente (os raios amarelos do
// switch e das notas ficaram de fora) e recodificadas em WebP (qualidade 88).
import engrenagem from './engrenagem.webp'
import fechar from './fechar.webp'
import musicaDesligada from './musica-desligada.webp'
import musicaLigada from './musica-ligada.webp'
import painel from './painel.webp'
import pino from './pino.webp'
import trilhoDesligado from './trilho-desligado.webp'
import trilhoLigado from './trilho-ligado.webp'

export const IMAGENS_CONFIGURACOES = {
  engrenagem,
  fechar,
  musicaDesligada,
  musicaLigada,
  painel,
  pino,
  trilhoDesligado,
  trilhoLigado,
}

/** A engrenagem aparece na home; o resto baixa junto para a janela abrir já desenhada. */
export function preCarregarImagensConfiguracoes() {
  for (const src of Object.values(IMAGENS_CONFIGURACOES)) {
    const imagem = new Image()
    imagem.src = src
  }
}
