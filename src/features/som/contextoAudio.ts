/*
 * Um AudioContext para o jogo todo (música e efeitos). O navegador só libera som depois de um
 * gesto, então todo toque ou tecla tenta destravar, não só o primeiro: o iOS volta a suspender o
 * áudio depois de uma ligação ou de outro app tocar som. Com o jogo em segundo plano (aba trocada,
 * app minimizado na casca), o contexto dorme.
 */
let contexto: AudioContext | null = null
let iniciado = false

const EVENTOS_GESTO = ['pointerdown', 'keydown', 'touchend'] as const

export function obterContextoAudio(): AudioContext | null {
  if (contexto) return contexto
  const Construtor =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Construtor) return null
  contexto = new Construtor()
  return contexto
}

function ajustar() {
  const ctx = contexto
  if (!ctx) return
  if (document.visibilityState === 'visible') {
    // Antes do primeiro gesto o navegador recusa; o próximo toque tenta de novo.
    if (ctx.state !== 'running') void ctx.resume().catch(() => {})
  } else if (ctx.state === 'running') {
    void ctx.suspend().catch(() => {})
  }
}

/** Liga o destravamento por gesto e o sono em segundo plano. Uma vez, na raiz do app. */
export function iniciarAudio() {
  if (iniciado) return
  iniciado = true
  const destravar = () => {
    obterContextoAudio()
    ajustar()
  }
  for (const evento of EVENTOS_GESTO) window.addEventListener(evento, destravar, true)
  document.addEventListener('visibilitychange', ajustar)
}

/** Baixa e decodifica um som, uma vez por URL. Falhou: esquece, para tentar de novo depois. */
const decodificados = new Map<string, Promise<AudioBuffer>>()
export function decodificar(url: string, ctx: AudioContext): Promise<AudioBuffer> {
  let promessa = decodificados.get(url)
  if (!promessa) {
    promessa = fetch(url)
      .then((resposta) => resposta.arrayBuffer())
      .then((dados) => ctx.decodeAudioData(dados))
    promessa.catch(() => decodificados.delete(url))
    decodificados.set(url, promessa)
  }
  return promessa
}
