import { useEffect, useRef } from 'react'

/*
 * Sem router, o voltar do celular fecha o app. Cada camada aberta por cima de outra empurra uma
 * entrada no histórico, e o voltar fecha só a camada do topo. A pilha é do módulo, não de cada
 * instância: com duas camadas abertas, um voltar não pode fechar as duas (CLAUDE.md, "Voltar
 * nativo"). O botão de fechar em tela chama `history.back()`, para passar pelo mesmo caminho.
 */
type Camada = { fechar: () => void }

const pilha: Camada[] = []
// popstate que nós mesmos provocamos ao tirar uma camada que fechou sem passar pelo voltar.
let voltasIgnoradas = 0
let ouvindo = false

function aoVoltar() {
  if (voltasIgnoradas > 0) {
    voltasIgnoradas -= 1
    return
  }
  pilha.pop()?.fechar()
}

/** Enquanto `aberta`, o voltar do celular (e `history.back()`) chama `fechar`. */
export function useVoltarNativoEmCamadas(aberta: boolean, fechar: () => void) {
  const fecharRef = useRef(fechar)
  fecharRef.current = fechar

  useEffect(() => {
    if (!aberta) return
    if (!ouvindo) {
      window.addEventListener('popstate', aoVoltar)
      ouvindo = true
    }
    const camada: Camada = { fechar: () => fecharRef.current() }
    pilha.push(camada)
    history.pushState({ camada: pilha.length }, '')
    return () => {
      const indice = pilha.indexOf(camada)
      if (indice === -1) return
      // Fechou por outro caminho (desmontou): tira a entrada que ela empurrou, sem fechar mais ninguém.
      pilha.splice(indice, 1)
      voltasIgnoradas += 1
      history.back()
    }
  }, [aberta])
}
