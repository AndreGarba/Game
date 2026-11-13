import { ID_JOGO } from '../configuracao.ts'

// Recorde local do aparelho. Quando houver conta e ranking, este passa a ser só o cache.
const CHAVE = `${ID_JOGO}:recorde`

export function lerRecorde(): number {
  try {
    const valor = Number(localStorage.getItem(CHAVE))
    return Number.isFinite(valor) && valor > 0 ? valor : 0
  } catch {
    return 0
  }
}

// Devolve true se o placar virou o novo recorde.
export function registrarPlacar(pontos: number): boolean {
  if (pontos <= lerRecorde()) return false
  try {
    localStorage.setItem(CHAVE, String(pontos))
  } catch {
    // Modo privado ou armazenamento cheio: o recorde vale só nesta sessão.
  }
  return true
}
