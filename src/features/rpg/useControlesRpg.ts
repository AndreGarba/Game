import { useEffect, useRef } from 'react'
import { digitando } from '../jogo/useControlesJogo.ts'
import type { DirecaoTela } from './direcao.ts'

// Teclado do RPG: setas ou WASD andam (segurar), Shift segurado corre; A = Espaço, E ou Enter;
// B = Esc, Q ou Backspace. O d-pad e o botão de correr da tela escrevem em `direcaoToque` e
// `correrToque`, e quem lê soma teclado e toque.

const TECLAS_DIRECAO: Record<string, [eixo: keyof DirecaoTela, valor: number]> = {
  ArrowUp: ['cima', 1],
  KeyW: ['cima', 1],
  ArrowDown: ['cima', -1],
  KeyS: ['cima', -1],
  ArrowLeft: ['direita', -1],
  KeyA: ['direita', -1],
  ArrowRight: ['direita', 1],
  KeyD: ['direita', 1],
}

const TECLAS_A = new Set(['Space', 'KeyE', 'Enter', 'NumpadEnter'])
const TECLAS_B = new Set(['Escape', 'KeyQ', 'Backspace'])
const TECLAS_CORRER = new Set(['ShiftLeft', 'ShiftRight'])

export interface ControlesRpg {
  // Direção atual (teclado + toque), lida a cada tick.
  direcao(): DirecaoTela
  correndo(): boolean
  // O d-pad e o botão de correr da tela gravam aqui.
  direcaoToque: { current: DirecaoTela }
  correrToque: { current: boolean }
}

export function useControlesRpg(ativo: boolean, aoA: () => void, aoB: () => void): ControlesRpg {
  const seguradas = useRef(new Set<string>())
  const direcaoToque = useRef<DirecaoTela>({ direita: 0, cima: 0 })
  const correrToque = useRef(false)
  const aoARef = useRef(aoA)
  aoARef.current = aoA
  const aoBRef = useRef(aoB)
  aoBRef.current = aoB
  const ativoRef = useRef(ativo)
  ativoRef.current = ativo

  useEffect(() => {
    function aoBaixar(evento: KeyboardEvent) {
      if (digitando(evento)) return
      // Com foco num botão (pausa, Menu), Enter e Espaço são dele.
      const emBotao = evento.target instanceof Element && evento.target.closest('button')
      if (TECLAS_DIRECAO[evento.code] || TECLAS_CORRER.has(evento.code)) {
        seguradas.current.add(evento.code)
        evento.preventDefault()
      } else if (TECLAS_A.has(evento.code) && !emBotao) {
        evento.preventDefault()
        if (!evento.repeat && ativoRef.current) aoARef.current()
      } else if (TECLAS_B.has(evento.code)) {
        evento.preventDefault()
        if (!evento.repeat) aoBRef.current()
      }
    }
    function aoSoltar(evento: KeyboardEvent) {
      seguradas.current.delete(evento.code)
    }
    // Trocou de aba com a tecla apertada: o keyup nunca chega.
    function aoPerderFoco() {
      seguradas.current.clear()
      direcaoToque.current = { direita: 0, cima: 0 }
      correrToque.current = false
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

  const controles = useRef<ControlesRpg>({
    direcao() {
      const d = { direita: direcaoToque.current.direita, cima: direcaoToque.current.cima }
      for (const codigo of seguradas.current) {
        const tecla = TECLAS_DIRECAO[codigo]
        if (tecla) d[tecla[0]] += tecla[1]
      }
      return d
    },
    correndo() {
      if (correrToque.current) return true
      for (const codigo of TECLAS_CORRER) if (seguradas.current.has(codigo)) return true
      return false
    },
    direcaoToque,
    correrToque,
  })
  return controles.current
}
