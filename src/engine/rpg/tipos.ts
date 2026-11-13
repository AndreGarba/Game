// Mundo do RPG isométrico, como o motor vê: chão plano em metros (x para a direita, z para a
// frente da câmera), sem altura. Altura e aparência são dados de desenho que viajam junto
// (`altura`, `visual`, `variante`) e o motor ignora.

export type IdCena = 'rua' | 'agencia' | 'escritorio' | 'concessionaria'

// Retângulo no chão: (x, z) é o canto de menor x e menor z.
export interface Retangulo {
  x: number
  z: number
  largura: number
  profundidade: number
}

// O que acontece ao apertar A perto de um elemento.
//   porta:    troca de cena e põe o jogador em `destino`.
//   conversa: abre o diálogo `dialogo` (NPC).
//   olhar:    abre o diálogo `dialogo` (objeto: carro, bebedouro...).
export type TipoInteracao = 'porta' | 'conversa' | 'olhar'

export interface Destino {
  cena: IdCena
  x: number
  z: number
  // Para onde o jogador fica virado ao chegar (−1, 0 ou 1 em cada eixo).
  dirX: number
  dirZ: number
}

export interface Interacao {
  tipo: TipoInteracao
  // Chave do diálogo na copy (`rpg.dialogos.<dialogo>.<n>`) e quantas falas ele tem.
  dialogo?: string
  linhas?: number
  destino?: Destino
}

// Elemento que bloqueia a passagem. `visual` escolhe o modelo 3D; `variante`, a cor ou a arte.
export interface Solido extends Retangulo {
  id: string
  visual: string
  variante?: string
  altura: number
  // Quartos de volta (0 a 3) do modelo em torno do próprio centro. Só desenho: a colisão é o retângulo.
  giro?: number
  interacao?: Interacao
}

// Zona de porta: não bloqueia, só aceita interação.
export interface Porta extends Retangulo {
  id: string
  visual: string
  destino: Destino
}

export interface Npc {
  id: string
  x: number
  z: number
  // Aparência do personagem (paleta em features/rpg/visual).
  visual: string
  dirX: number
  dirZ: number
  dialogo: string
  linhas: number
}

// Faixa de chão sem colisão (calçada, asfalto, tapete, plataforma). `nivel` ordena a sobreposição.
export interface Decoracao extends Retangulo {
  visual: string
  nivel: number
}

export interface Cena {
  id: IdCena
  largura: number
  profundidade: number
  // Interior: a câmera corta as paredes da frente (x = largura e z = profundidade).
  interior: boolean
  piso: string
  // Placa (logo) na parede do fundo do interior, com o centro em x. Só desenho.
  placaParede?: { variante: string; x: number }
  solidos: Solido[]
  portas: Porta[]
  npcs: Npc[]
  decoracoes: Decoracao[]
}

// Entrada de um tick. dx e dz em −1, 0 ou 1, já em eixos do mundo; correr vale enquanto o botão
// está segurado; interagir e voltar valem só no tick em que chegam (borda do botão).
export interface Entrada {
  dx: number
  dz: number
  correr: boolean
  interagir: boolean
  voltar: boolean
}

export interface JogadorRpg {
  x: number
  z: number
  dirX: number
  dirZ: number
  andando: boolean
  correndo: boolean
  // Fase da animação do passo, em "ticks de andar": soma PASSO_ANDANDO ou PASSO_CORRENDO por tick.
  fasePasso: number
}

export interface DialogoAberto {
  id: string
  linha: number
  linhas: number
  // Quem fala (id do NPC ou do objeto), para o desenho virar o NPC para o jogador.
  origem: string
}

export type TipoAlvo = TipoInteracao

export interface Alvo {
  id: string
  tipo: TipoAlvo
  // Cena de destino, quando é porta.
  destino?: IdCena
}

// Dado puro: structuredClone copia o mundo inteiro.
export interface EstadoMundo {
  versao: string
  tick: number
  cena: IdCena
  jogador: JogadorRpg
  alvo: Alvo | null
  dialogo: DialogoAberto | null
  // Quantas vezes o jogador trocou de cena: a UI usa para disparar o esmaecer.
  trocasDeCena: number
}
