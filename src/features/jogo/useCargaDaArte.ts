import { useEffect, useSyncExternalStore } from 'react'
import { carregarArteDoJogo } from './arte/index.ts'
import { assinarCarga, estadoDaCarga, type EstadoDaCarga } from './arte/carregarArte.ts'

/**
 * Começa a carga da arte do jogo (se ainda não começou) e acompanha o progresso. Quem segura a
 * entrada no jogo (a home) lê `liberada`; o canvas não precisa: ele pede a arte a cada quadro.
 */
export function useCargaDaArte(): EstadoDaCarga {
  useEffect(() => {
    void carregarArteDoJogo()
  }, [])
  return useSyncExternalStore(assinarCarga, estadoDaCarga)
}
