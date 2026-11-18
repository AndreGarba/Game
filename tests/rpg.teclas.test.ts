import { describe, expect, it } from 'vitest'
import { atalhosDoComando, seloDoComando, seloDoDirecional, TECLAS, TECLAS_DIRECAO } from '../src/features/rpg/teclas.ts'
import en from '../src/locales/en/jogo.json'
import es from '../src/locales/es/jogo.json'
import pt from '../src/locales/pt/jogo.json'

describe('teclas do RPG nos botões do HUD', () => {
  it('o selo mostra as duas primeiras teclas de cada comando, com o Espaço traduzido', () => {
    expect(seloDoComando('a', pt.rpg.teclas.espaco)).toBe('Espaço / E')
    expect(seloDoComando('a', en.rpg.teclas.espaco)).toBe('Space / E')
    expect(seloDoComando('a', es.rpg.teclas.espaco)).toBe('Espacio / E')
    expect(seloDoComando('b', 'Espaço')).toBe('Esc / Q')
    expect(seloDoComando('b', 'Espaço', 1)).toBe('Esc')
    expect(seloDoComando('soco', 'Espaço')).toBe('F / J')
    // Shift esquerdo e direito são a mesma tecla no selo.
    expect(seloDoComando('correr', 'Espaço')).toBe('Shift')
    expect(seloDoDirecional()).toBe('↑←↓→ / WASD')
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
})
