import 'i18next'
import type { recursos } from './index.ts'

// O idioma-fonte (pt) gera o tipo das chaves: chave inexistente não compila.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'jogo'
    resources: (typeof recursos)['pt']
  }
}
