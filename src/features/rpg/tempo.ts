import { TICKS_POR_SEGUNDO } from '../../engine/rpg/index.ts'

/** Ticks do mundo como HH:MM:SS, com os dígitos do idioma. Passa de 99 h sem cortar. */
export function formatarTempo(ticks: number, locale: string): string {
  const segundos = Math.floor(ticks / TICKS_POR_SEGUNDO)
  const dois = (n: number) => n.toLocaleString(locale, { minimumIntegerDigits: 2, useGrouping: false })
  return `${dois(Math.floor(segundos / 3600))}:${dois(Math.floor((segundos % 3600) / 60))}:${dois(segundos % 60)}`
}
