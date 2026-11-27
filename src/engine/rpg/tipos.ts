import type { EstadoRng } from '../rng.ts'

// Mundo do RPG isométrico, como o motor vê: chão plano em metros (x para a direita, z para a
// frente da câmera), sem altura. Altura e aparência são dados de desenho que viajam junto
// (`altura`, `visual`, `variante`) e o motor ignora.

export type IdCena = 'rua' | 'agencia' | 'escritorio' | 'agencia_pan' | 'escritorio_pan' | 'concessionaria'

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
//   quadro:   abre o quadro de avisos "Entregas 2026" (a tela mostra o conteúdo pelo id do sólido).
export type TipoInteracao = 'porta' | 'conversa' | 'olhar' | 'quadro'

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

// Peça suspensa (a caixa de vidro e as vigas do MASP): só desenho, o motor não colide com ela.
// `y` é a altura da base e `altura`, a da peça.
export interface Suspenso extends Retangulo {
  visual: string
  y: number
  altura: number
}

// Letreiro em postes (placa de rua, portal do feirão). Só desenho: os postes, se baterem, são
// sólidos à parte. `y` é a altura da base do painel.
export interface Letreiro {
  variante: string
  x: number
  z: number
  largura: number
  altura: number
  y: number
}

// Figurantes: gente que anda sozinha pela `area`, sem conversa. Batem nos sólidos e nos NPCs,
// mas atravessam o jogador e uns aos outros, para nunca prender ninguém nem tampar porta.
// Patinete em movimento é a exceção: atropela o jogador e o derruba (`tombo`), sem bloquear.
// O soco do jogador derruba qualquer um deles (e os NPCs), com a mesma linha do tempo.
export interface GrupoFigurantes {
  quantidade: number
  area: Retangulo
  visuais: string[]
  // Sem veículo, anda a pé.
  veiculo?: 'patinete'
  // Atravessa a avenida: vai de uma ponta da área (uma calçada) à outra e espera lá.
  travessia?: boolean
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
  letreiros?: Letreiro[]
  suspensos?: Suspenso[]
  figurantes?: GrupoFigurantes[]
}

// Entrada de um tick. dx e dz em −1, 0 ou 1, já em eixos do mundo; correr vale enquanto o botão
// está segurado; interagir e voltar valem só no tick em que chegam (borda do botão).
export interface Entrada {
  dx: number
  dz: number
  correr: boolean
  interagir: boolean
  voltar: boolean
  // Botão de soco: vale só no tick em que chega, como o A.
  socar: boolean
  // Chute na bola (R ou o botão do HUD): também só no tick em que chega. Campo novo entra no fim.
  chutar: boolean
  // Clique (ou toque) na Livia: abre a conversa de qualquer distância, na rua. Só no tick em que chega.
  clicarLivia: boolean
}

// Derrubado (por patinete ou soco): ticks desde a queda (1 a TICKS_TOMBO, 0 = de pé) e o sentido
// do tranco, normalizado aproximado. A mesma linha do tempo vale para jogador, figurante e NPC.
export interface Tombo {
  tombo: number
  tomboX: number
  tomboZ: number
}

export interface JogadorRpg extends Tombo {
  // Aparência do personagem escolhido (`visual` do elenco). Só desenho: o motor não lê.
  visual: string
  x: number
  z: number
  dirX: number
  dirZ: number
  andando: boolean
  correndo: boolean
  // Fase da animação do passo, em "ticks de andar": soma PASSO_ANDANDO ou PASSO_CORRENDO por tick.
  fasePasso: number
  // Ticks que faltam em que patinete não derruba (conta depois de levantar).
  invulneravel: number
  // Ticks desde que apertou o soco (1 a TICKS_SOCO); 0 = não está socando.
  soco: number
  // Ticks até poder socar de novo.
  recargaSoco: number
  // Ticks desde que apertou o chute (1 a TICKS_CHUTE); 0 = não está chutando.
  chute: number
  // Ticks que faltam do efeito da caneta de Mounjaro (TICKS_CANETA no tick do achado; 0 = normal).
  // Só desenho: o quadrado de colisão não muda.
  fino: number
}

export type FaseTombo = 'de-pe' | 'caindo' | 'no-chao' | 'levantando'

export interface DialogoAberto {
  id: string
  linha: number
  linhas: number
  // Quem fala (id do NPC ou do objeto), para o desenho virar o NPC para o jogador.
  origem: string
}

// Manifestante do vão livre do MASP. `placa` é o índice da frase do cartaz (a copy é da tela) e
// `vaga`, o lugar dele na roda em volta do jogador.
export interface Manifestante {
  id: number
  visual: string
  placa: number
  casaX: number
  casaZ: number
  x: number
  z: number
  xAnterior: number
  zAnterior: number
  dirX: number
  dirZ: number
  andando: boolean
  fasePasso: number
  // Ticks que faltam do contorno de um poste ou pilar, e para que lado (1 ou −1).
  desvio: number
  ladoDesvio: number
}

export interface Figurante extends Tombo {
  id: string
  visual: string
  // Personagem do elenco que não foi escolhido (id), andando pelo mapa; null para gente comum.
  elenco: string | null
  veiculo: 'patinete' | null
  // Índice do grupo na cena: é a área por onde ele anda.
  grupo: number
  x: number
  z: number
  // Posição do tick anterior, para o desenho interpolar.
  xAnterior: number
  zAnterior: number
  alvoX: number
  alvoZ: number
  // Ticks parado antes de escolher outro alvo.
  espera: number
  ticksNoTrajeto: number
  // Direção do último passo (não normalizada a ±1: o desenho só tira o ângulo).
  dirX: number
  dirZ: number
  andando: boolean
  fasePasso: number
  // Ticks que faltam do susto de quem atropelou o jogador (parado, balançando no desenho).
  susto: number
}

// `revistar`: esconderijo sem conversa nem diálogo, ainda não revistado (procura o cartão).
export type TipoAlvo = TipoInteracao | 'revistar'

export interface Revista {
  cena: IdCena
  id: string
  achou: boolean
  tick: number
}

// Cartões Ultra Blue: onde estão (chave `cena:id`), o que já foi revistado e a contagem.
export interface Cartoes {
  escondidos: Record<string, true>
  revistados: Record<string, true>
  achados: number
  // A última revista: a UI mostra o aviso e o desenho solta o cartão quando muda.
  ultimaRevista: Revista | null
  // Tick em que achou o último cartão: o tempo da partida (pausa não roda tick).
  concluidoEm: number | null
}

// Balão de festa, solto ao fechar um quadro de entregas. Fica na cena onde caiu (não some ao
// sair e voltar). `y` é a altura do balão: exceção ao chão plano, só dos balões, porque flutuar
// e cair é a regra deles (o jogador só empurra o que está na altura do corpo).
export interface Balao {
  id: number
  cena: IdCena
  // Índice da cor (paleta no desenho).
  cor: number
  x: number
  z: number
  y: number
  // Velocidade em metros por tick.
  vx: number
  vz: number
  vy: number
}

// Onde e quando a última festa (confete) estourou: o desenho solta o confete a partir daqui.
export interface Festa {
  cena: IdCena
  x: number
  z: number
  tick: number
}

export interface Alvo {
  id: string
  tipo: TipoAlvo
  // Cena de destino, quando é porta.
  destino?: IdCena
}

export type LadoDoGol = 'esquerdo' | 'direito'

// Quem tocou a bola por último de propósito (chute ou condução); a defesa da Livia não conta.
export type AutorDaBola = 'jogador' | 'livia'

// Bola do campo de futebol (sempre na rua). `espera` conta os ticks até voltar ao centro depois
// de um gol ou de sair do campo; enquanto conta, não marca outro gol.
export interface Bola {
  x: number
  z: number
  vx: number
  vz: number
  espera: number
  // Ao alcance do chute agora: o HUD mostra o botão R só assim.
  aoAlcance: boolean
  // Gols do jogador (os da Livia ficam em `livia.gols`).
  gols: number
  ultimoGol: { tick: number; lado: LadoDoGol; autor: AutorDaBola } | null
  // Último toque de propósito, e o tick do último chute do jogador (a Livia reage a ele).
  autor: AutorDaBola | null
  chutadaEm: number | null
}

// O que a Livia está fazendo neste tick (o desenho e os testes leem; o motor recalcula a cada tick).
//   meta:      parada na frente do gol mais perto da bola, acompanhando a bola em z.
//   pressao:   correndo para roubar a bola de quem vai pegar ou conduz.
//   conducao:  com a bola, levando-a para o gol que ataca (`ataca`).
//   chute:     chutando para o gol.
//   defesa:    correndo para a linha do chute do jogador.
//   conversa:  parada, falando com o jogador.
//   caida:     derrubada por soco.
export type ModoLivia = 'meta' | 'pressao' | 'conducao' | 'chute' | 'defesa' | 'conversa' | 'caida'

// Livia, a NPC do campo de futebol (não é do elenco). Mora no motor, como a bola: rouba, conduz,
// chuta e defende a cada tick, e tudo precisa repetir igual. Fica sempre dentro do campo.
export interface Livia extends Tombo {
  x: number
  z: number
  xAnterior: number
  zAnterior: number
  dirX: number
  dirZ: number
  andando: boolean
  correndo: boolean
  fasePasso: number
  modo: ModoLivia
  // Ticks desde que começou o chute (1 a TICKS_CHUTE); 0 = não está chutando.
  chute: number
  // Gol que ela ataca enquanto está com a bola; null sem a posse.
  ataca: LadoDoGol | null
  // Ticks em que não toca na bola (depois de chutar ou defender).
  recarga: number
  gols: number
  defesas: number
  ultimaDefesa: number | null
}

// Faixa da avenida por onde os carros andam: `z` é a borda de menor z da faixa ocupada pelo carro
// e `sentido` é +1 (para +x) ou −1.
export interface FaixaCarros {
  z: number
  sentido: number
}

// Carro andando na avenida (sempre na rua, mesmo com o jogador num interior). `x` é o canto de
// menor x da caixa; a faixa dá o z. Não atropela: para antes de quem estiver na frente.
export interface Carro {
  id: number
  faixa: number
  // Cor (o desenho escolhe pela paleta).
  variante: string
  x: number
  // Posição do tick anterior, para o desenho interpolar (igual a `x` quando reaparece).
  xAnterior: number
  // Metros por tick, nunca negativa.
  vel: number
  // Algo à frente dentro de DIST_FREIO: o desenho acende a luz de freio.
  freando: boolean
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
  // Gerador da partida: esconde os cartões ao criar o mundo e depois sorteia os figurantes. O
  // jogador e as portas não dependem dele.
  rng: EstadoRng
  figurantes: Figurante[]
  // NPCs da cena atual derrubados por soco, por id; quem levantou sai da lista. Caem no lugar:
  // NPC não tem posição no estado, e o quadrado de colisão continua onde estava.
  npcsDerrubados: Record<string, Tombo>
  cartoes: Cartoes
  // Personagem jogável escolhido (id do elenco) e a cena de cada um dos que não foram.
  personagem: string
  elencoNoMapa: Record<string, IdCena>
  // Quadro de entregas aberto (id do sólido): o jogador fica parado e a tela mostra a modal.
  quadro: string | null
  baloes: Balao[]
  // Próximo id de balão (só cresce: o desenho acompanha cada balão pelo id).
  proximoBalao: number
  festa: Festa | null
  bola: Bola
  livia: Livia
  carros: Carro[]
  // Tick da última buzina (um carro freou pelo jogador); a UI toca o som quando muda.
  buzina: number | null
  manifestantes: Manifestante[]
  // Jogador na área do MASP: os manifestantes cercam e seguem.
  protesto: boolean
  // Tick em que achou a caneta de Mounjaro pela última vez: a UI mostra o aviso quando muda e o
  // desenho tira daqui o afinar e a volta ao normal.
  caneta: number | null
}
