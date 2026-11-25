import { describe, expect, it } from 'vitest'
import { atalhosDoComando, oQueATeclaAperta, TECLAS, TECLAS_DIRECAO, teclasDoComando, teclasDoDirecional } from '../src/features/rpg/teclas.ts'
import en from '../src/locales/en/jogo.json'
import es from '../src/locales/es/jogo.json'
import pt from '../src/locales/pt/jogo.json'

describe('teclas do RPG nos botões do HUD', () => {
  it('o botão mostra as duas primeiras teclas de cada comando, com o Espaço traduzido', () => {
    expect(teclasDoComando('a', pt.rpg.teclas.espaco)).toEqual(['Espaço', 'E'])
    expect(teclasDoComando('a', en.rpg.teclas.espaco)).toEqual(['Space', 'E'])
    expect(teclasDoComando('a', es.rpg.teclas.espaco)).toEqual(['Espacio', 'E'])
    expect(teclasDoComando('b', 'Espaço')).toEqual(['Esc', 'Q'])
    expect(teclasDoComando('b', 'Espaço', 1)).toEqual(['Esc'])
    expect(teclasDoComando('soco', 'Espaço')).toEqual(['F', 'J'])
    // Shift esquerdo e direito são a mesma tecla no botão.
    expect(teclasDoComando('correr', 'Espaço')).toEqual(['Shift'])
    expect(teclasDoComando('trocar', 'Espaço')).toEqual(['C'])
    expect(teclasDoComando('chute', 'Espaço')).toEqual(['R'])
  })

  it('cada lado do direcional mostra a letra e a seta', () => {
    expect(teclasDoDirecional()).toEqual({ cima: 'W ↑', esquerda: 'A ←', baixo: 'S ↓', direita: 'D →' })
  })

  it('aria-keyshortcuts lista todas as teclas do comando, sem repetir', () => {
    expect(atalhosDoComando('a')).toBe('Space E Enter')
    expect(atalhosDoComando('b')).toBe('Escape Q Backspace')
    expect(atalhosDoComando('correr')).toBe('Shift')
  })

  it('nenhuma tecla faz dois comandos', () => {
    const todas = [...Object.values(TECLAS).flat(), ...Object.keys(TECLAS_DIRECAO)]
    expect(new Set(todas).size).toBe(todas.length)
  })

  it('a tecla segurada afunda o botão do comando ou acende o lado do direcional', () => {
    expect(oQueATeclaAperta('KeyE')).toEqual({ comando: 'a' })
    expect(oQueATeclaAperta('Escape')).toEqual({ comando: 'b' })
    expect(oQueATeclaAperta('ShiftRight')).toEqual({ comando: 'correr' })
    expect(oQueATeclaAperta('KeyJ')).toEqual({ comando: 'soco' })
    expect(oQueATeclaAperta('KeyW')).toEqual({ lado: 'cima' })
    expect(oQueATeclaAperta('ArrowLeft')).toEqual({ lado: 'esquerda' })
    expect(oQueATeclaAperta('KeyZ')).toBeNull()
  })
})
