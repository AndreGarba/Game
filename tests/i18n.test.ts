// Toda chave do idioma-fonte (pt) existe nos outros, com as mesmas variáveis {{...}}: o tipo das
// chaves só olha o pt, então um idioma esquecido apareceria como a chave crua na tela.
import { describe, expect, it } from 'vitest'
import en from '../src/locales/en/jogo.json'
import es from '../src/locales/es/jogo.json'
import pt from '../src/locales/pt/jogo.json'

// Lista (falas de um diálogo) conta como árvore de chaves "0", "1"...: fala a menos num idioma acusa.
type Arvore = { [chave: string]: string | string[] | Arvore }

function folhas(arvore: Arvore, prefixo = ''): Map<string, string> {
  const saida = new Map<string, string>()
  for (const [chave, valor] of Object.entries(arvore)) {
    const caminho = prefixo ? `${prefixo}.${chave}` : chave
    if (typeof valor === 'string') saida.set(caminho, valor)
    else for (const [c, v] of folhas(valor as Arvore, caminho)) saida.set(c, v)
  }
  return saida
}

const variaveis = (texto: string) => [...texto.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).sort()

describe('locales', () => {
  const fonte = folhas(pt)

  it.each([
    ['en', en],
    ['es', es],
  ] as const)('%s tem as mesmas chaves e variáveis do pt', (_, idioma) => {
    const alvo = folhas(idioma)
    expect([...alvo.keys()].sort()).toEqual([...fonte.keys()].sort())
    for (const [chave, texto] of fonte) expect(variaveis(alvo.get(chave) ?? ''), chave).toEqual(variaveis(texto))
  })
})
