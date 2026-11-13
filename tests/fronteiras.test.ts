// Trava das regras do motor (CLAUDE.md, "Motor do jogo"): o motor é puro e determinístico, e a
// mesma pasta roda no navegador, no Node (testes, simulação) e no Deno (Edge Function).
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const PASTA_MOTOR = join(import.meta.dirname, '../src/engine')
const arquivos = readdirSync(PASTA_MOTOR).filter((f) => f.endsWith('.ts'))
// Comentário não conta: a regra é sobre código.
const codigo = (f: string) =>
  readFileSync(join(PASTA_MOTOR, f), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')

describe('fronteiras do motor', () => {
  it.each(arquivos)('%s só importa de dentro do motor, com extensão .ts', (arquivo) => {
    const imports = [...codigo(arquivo).matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]!)
    for (const origem of imports) {
      expect(origem, origem).toMatch(/^\.\/[\w.-]+\.ts$/)
    }
  })

  it.each(arquivos)('%s não usa aleatoriedade nem APIs do navegador', (arquivo) => {
    const proibidos = /\bMath\.(random|pow|exp|log|sin|cos|tan|atan2?|sqrt|hypot)\b|\b(window|document|localStorage|sessionStorage|fetch|Date\.now|performance)\b/
    expect(codigo(arquivo)).not.toMatch(proibidos)
  })
})
