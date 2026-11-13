// Identidade sem login: um id anônimo do aparelho e o último nome digitado.
// O id só agrupa as partidas de um mesmo aparelho no ranking; não é segurança (CLAUDE.md).
//
// O id mora no IndexedDB, não no localStorage: o backup da casca Android leva o localStorage da
// WebView para o aparelho novo (res/xml/regras_*.xml) e deixa o IndexedDB de fora. Assim o
// recorde e o nome vão junto, e a identidade não é clonada entre aparelhos.
import { ID_JOGO } from '../configuracao.ts'

const BANCO = ID_JOGO
const LOJA = 'identidade'
const CHAVE_ID = 'jogadorId'
const CHAVE_NOME = `${ID_JOGO}:nome`

let idPrometido: Promise<string> | null = null

function abrirBanco(): Promise<IDBDatabase> {
  return new Promise((resolver, rejeitar) => {
    const pedido = indexedDB.open(BANCO, 1)
    pedido.onupgradeneeded = () => pedido.result.createObjectStore(LOJA)
    pedido.onsuccess = () => resolver(pedido.result)
    pedido.onerror = () => rejeitar(pedido.error)
  })
}

// Lê o id salvo ou grava um novo na mesma transação: duas abas abrindo juntas não criam dois ids.
async function lerOuCriarId(): Promise<string> {
  const banco = await abrirBanco()
  try {
    return await new Promise<string>((resolver, rejeitar) => {
      const transacao = banco.transaction(LOJA, 'readwrite')
      const loja = transacao.objectStore(LOJA)
      let id: string | null = null
      const leitura = loja.get(CHAVE_ID)
      leitura.onsuccess = () => {
        if (typeof leitura.result === 'string') {
          id = leitura.result
        } else {
          id = crypto.randomUUID()
          loja.put(id, CHAVE_ID)
        }
      }
      transacao.oncomplete = () => resolver(id!)
      transacao.onerror = () => rejeitar(transacao.error)
      transacao.onabort = () => rejeitar(transacao.error)
    })
  } finally {
    banco.close()
  }
}

// Sem IndexedDB (modo privado de alguns navegadores), o id vale até fechar a aba: cada sessão
// vira um jogador.
export function idDoJogador(): Promise<string> {
  idPrometido ??= lerOuCriarId().catch(() => crypto.randomUUID())
  return idPrometido
}

export function lerNome(): string {
  try {
    return localStorage.getItem(CHAVE_NOME) ?? ''
  } catch {
    return ''
  }
}

export function salvarNome(nome: string): void {
  try {
    localStorage.setItem(CHAVE_NOME, nome)
  } catch {
    // Sem armazenamento: o nome é pedido de novo na próxima partida.
  }
}
