// Densidade do canvas da corrida: quantos pixels do aparelho por pixel CSS.
//
// Celular com densidade 3 desenharia ~2340 × 1080 pixels a cada quadro, com 6 ou 7 camadas de
// parallax empilhadas: é a maior parte do custo do quadro, e a arte das camadas foi feita para
// 720 pixels de altura (o quadro de 360 em 2×), então acima de 2 não aparece detalhe novo.
export const DENSIDADE_MAX = 2

export function densidadeDaCorrida(): number {
  return Math.min(window.devicePixelRatio || 1, DENSIDADE_MAX)
}

// Altura da arte das camadas em pixels: o quadro de 360 desenhado em 2×.
const ALTURA_REFERENCIA_ARTE = 720

/**
 * Quanto da resolução da arte o aparelho consegue mostrar (até 1). Sai da maior moldura de celular
 * deitado (19,5:9) que cabe na tela, em qualquer orientação: a carga começa antes da corrida, às
 * vezes com o celular em pé, e a moldura vira junto com ele.
 */
export function fracaoDaArteNaTela(): number {
  const maior = Math.max(screen.width, screen.height)
  const menor = Math.min(screen.width, screen.height)
  const alturaMoldura = Math.min(menor, (maior * 9) / 19.5)
  return Math.min(1, (alturaMoldura * densidadeDaCorrida()) / ALTURA_REFERENCIA_ARTE)
}
