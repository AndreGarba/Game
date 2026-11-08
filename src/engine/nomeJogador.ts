// Nome que aparece no ranking. Mora no motor porque a mesma regra roda no navegador (prévia do
// que vai aparecer) e na Edge Function (o que vale), como simularPartida.
export const NOME_MAX = 16

// Sem caractere de controle nem invisível, espaços colapsados.
export function normalizarNome(bruto: string): string {
  return bruto
    .normalize('NFC')
    .replace(/[\p{C}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Conta caracteres como o char_length do Postgres (pontos de código), não unidades UTF-16.
export function nomeValido(nome: string): boolean {
  const tamanho = [...nome].length
  return tamanho >= 1 && tamanho <= NOME_MAX
}
