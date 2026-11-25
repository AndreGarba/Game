import { useEffect, useState } from 'react'
import { digitando } from '../jogo/useControlesJogo.ts'
import { oQueATeclaAperta, type ComandoComTecla, type LadoDoDirecional } from './teclas.ts'

export interface TeclasApertadas {
  comandos: ReadonlySet<ComandoComTecla>
  lados: ReadonlySet<LadoDoDirecional>
}

const NADA: TeclasApertadas = { comandos: new Set(), lados: new Set() }

/**
 * Comandos e lados do direcional com a tecla segurada agora, só para o HUD afundar o botão. Quem
 * age é o `useControlesRpg`; isto não dispara nada.
 */
export function useTeclasApertadas(): TeclasApertadas {
  const [apertadas, setApertadas] = useState<TeclasApertadas>(NADA)

  useEffect(() => {
    const seguradas = new Set<string>()
    function publicar() {
      const comandos = new Set<ComandoComTecla>()
      const lados = new Set<LadoDoDirecional>()
      for (const codigo of seguradas) {
        const alvo = oQueATeclaAperta(codigo)
        if (alvo && 'comando' in alvo) comandos.add(alvo.comando)
        else if (alvo) lados.add(alvo.lado)
      }
      setApertadas({ comandos, lados })
    }
    function aoBaixar(evento: KeyboardEvent) {
      if (evento.repeat || digitando(evento) || !oQueATeclaAperta(evento.code)) return
      seguradas.add(evento.code)
      publicar()
    }
    function aoSoltar(evento: KeyboardEvent) {
      if (seguradas.delete(evento.code)) publicar()
    }
    // Trocou de aba com a tecla apertada: o keyup nunca chega.
    function aoPerderFoco() {
      seguradas.clear()
      setApertadas(NADA)
    }
    window.addEventListener('keydown', aoBaixar)
    window.addEventListener('keyup', aoSoltar)
    window.addEventListener('blur', aoPerderFoco)
    return () => {
      window.removeEventListener('keydown', aoBaixar)
      window.removeEventListener('keyup', aoSoltar)
      window.removeEventListener('blur', aoPerderFoco)
    }
  }, [])

  return apertadas
}
