import { useEffect, useSyncExternalStore } from 'react'
import { assinarCarga, carregarArteCorrida, estadoDaCarga, type EstadoDaCarga } from './imagens/index.ts'

/**
 * Começa a carga da arte da corrida (se ainda não começou) e acompanha o progresso. Quem segura a
 * entrada na corrida (a história) lê `liberada`; o canvas não precisa: ele pede a arte a cada quadro.
 */
export function useCargaDaCorrida(): EstadoDaCarga {
  useEffect(() => {
    void carregarArteCorrida()
  }, [])
  return useSyncExternalStore(assinarCarga, estadoDaCarga)
}
