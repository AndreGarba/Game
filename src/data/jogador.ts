// Identidade sem login: um id anônimo do aparelho e o último nome digitado.
// O id só agrupa as partidas de um mesmo aparelho no ranking; não é segurança (CLAUDE.md).
const CHAVE_ID = 'horadobanho:jogadorId'
const CHAVE_NOME = 'horadobanho:nome'

// Sem armazenamento (modo privado), o id vale até fechar a aba: cada sessão vira um jogador.
let idDaSessao: string | null = null

export function idDoJogador(): string {
  try {
    const salvo = localStorage.getItem(CHAVE_ID)
    if (salvo) return salvo
    const novo = crypto.randomUUID()
    localStorage.setItem(CHAVE_ID, novo)
    return novo
  } catch {
    idDaSessao ??= crypto.randomUUID()
    return idDaSessao
  }
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
