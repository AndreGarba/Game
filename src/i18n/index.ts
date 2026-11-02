import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enJogo from '../locales/en/jogo.json'
import esJogo from '../locales/es/jogo.json'
import ptJogo from '../locales/pt/jogo.json'

export const IDIOMAS = ['pt', 'en', 'es'] as const
export type Idioma = (typeof IDIOMAS)[number]

export const recursos = {
  pt: { jogo: ptJogo },
  en: { jogo: enJogo },
  es: { jogo: esJogo },
} as const

function detectarIdioma(): Idioma {
  for (const preferido of navigator.languages ?? [navigator.language]) {
    const base = preferido.toLowerCase().slice(0, 2)
    const achado = IDIOMAS.find((i) => i === base)
    if (achado) return achado
  }
  return 'pt'
}

export function localeAtual(): string {
  return { pt: 'pt-BR', en: 'en', es: 'es' }[i18n.language as Idioma] ?? 'pt-BR'
}

void i18n.use(initReactI18next).init({
  resources: recursos,
  lng: detectarIdioma(),
  fallbackLng: 'pt',
  defaultNS: 'jogo',
  interpolation: { escapeValue: false },
})

document.documentElement.lang = localeAtual()

export default i18n
