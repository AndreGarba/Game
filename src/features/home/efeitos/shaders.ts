// Shaders da home. Rodam só na UI: o motor do jogo não depende de nada aqui, então sin, pow e
// hash por ponto flutuante são livres (a regra de aritmética básica vale só para a simulação).

export const VERTICE_TELA_CHEIA = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

// object-fit: cover + object-position, igual ao CSS da home. Posição medida de cima para baixo;
// a textura tem flipY, então o v da imagem cresce para cima.
const COBRIR = /* glsl */ `
vec2 cobrir(vec2 uv, vec2 tela, vec2 imagem, vec2 posicao) {
  float razaoTela = tela.x / tela.y;
  float razaoImagem = imagem.x / imagem.y;
  vec2 escala = razaoTela > razaoImagem ? vec2(1.0, razaoImagem / razaoTela) : vec2(razaoTela / razaoImagem, 1.0);
  vec2 deCima = vec2(uv.x, 1.0 - uv.y) * escala + (1.0 - escala) * posicao;
  return vec2(deCima.x, 1.0 - deCima.y);
}
`

const ACASO = /* glsl */ `
float acaso(float n) { return fract(sin(n * 127.1) * 43758.5453); }
vec2 acaso2(vec2 p) {
  return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}
`

/**
 * Azulejos com água: gotas grandes que descem aos trancos, deixando rastro e gotinhas, mais gotas
 * paradas que surgem e somem. Cada gota é uma lente: desvia a imagem por baixo, ganha brilho no
 * alto e borda escura, como nas gotas desenhadas na própria arte.
 */
export const FRAGMENTO_AZULEJOS = /* glsl */ `
uniform sampler2D uImagem;
uniform vec2 uTamanhoImagem;
uniform vec2 uPosicao;
uniform vec2 uTela;
uniform float uTempo;
varying vec2 vUv;

${COBRIR}
${ACASO}

const float COLUNAS = 7.0;      // trilhas de gota por altura de tela
const float RAIO = 0.024;       // raio da gota que escorre, em altura de tela

// xy: normal da lente (-1..1), z: cobertura
vec3 lente(vec2 d, float raio) {
  float dist = length(d);
  float cobertura = smoothstep(raio, raio * 0.75, dist);
  return vec3(d / raio * cobertura, cobertura);
}

vec3 escorrendo(vec2 p, float t) {
  float largura = 1.0 / COLUNAS;
  float coluna = floor(p.x / largura);
  float semente = acaso(coluna + 3.0);
  float velocidade = mix(0.05, 0.11, acaso(coluna + 17.0));

  // Aos trancos: avança rápido no meio de cada passo e quase para nas pontas.
  float passos = t * velocidade * 6.0 + semente * 40.0;
  float avanco = (floor(passos) + smoothstep(0.25, 0.75, fract(passos))) / 6.0;
  float volta = floor(avanco);
  // Nem toda trilha tem gota em toda volta: assim a parede não vira uma cortina.
  if (acaso(coluna * 7.0 + volta * 13.0) < 0.45) return vec3(0.0);

  float yCabeca = 1.12 - fract(avanco) * 1.3;
  float xBase = (coluna + 0.5) * largura + (semente - 0.5) * largura * 0.5;
  float balanco = 0.004 * sin(p.y * 38.0 + coluna * 5.0);
  float x = xBase + balanco;

  vec2 d = p - vec2(x, yCabeca);
  d.y *= d.y < 0.0 ? 0.85 : 1.25; // mais cheia embaixo, afinando para cima
  vec3 gota = lente(d, RAIO);

  // Rastro molhado acima da cabeça, afinando e sumindo com a distância.
  float acima = p.y - yCabeca;
  float comprimento = 0.28;
  float sobra = step(0.0, acima) * smoothstep(comprimento, 0.0, acima);
  float larguraRastro = RAIO * 0.3 * (1.0 - acima / comprimento);
  float rastro = smoothstep(larguraRastro, larguraRastro * 0.2, abs(p.x - x)) * sobra * 0.5;

  // Gotinhas que ficam pelo caminho.
  float passo = 0.035;
  float celula = floor(acima / passo);
  float dentro = fract(acima / passo) - 0.5;
  float existe = step(0.5, acaso(celula + coluna * 31.0 + volta * 7.0)) * sobra;
  vec3 gotinha = lente(vec2(p.x - x, dentro * passo), RAIO * 0.3) * existe;

  vec2 normal = gota.xy + gotinha.xy + vec2(sign(p.x - x) * rastro, 0.0);
  return vec3(normal, max(max(gota.z, gotinha.z), rastro));
}

vec3 paradas(vec2 p, float t) {
  float tamanho = 0.075;
  vec2 celula = floor(p / tamanho);
  vec2 sorteio = acaso2(celula);
  vec2 centro = (celula + 0.2 + sorteio * 0.6) * tamanho;
  float raio = mix(0.005, 0.013, acaso(sorteio.x * 91.0));
  // Cada uma tem seu ciclo: aparece, fica e evapora.
  float ciclo = fract(t * 0.04 + sorteio.y);
  float vida = smoothstep(0.0, 0.1, ciclo) * smoothstep(0.75, 0.55, ciclo);
  vec3 gota = lente(p - centro, raio * vida + 0.0001);
  return gota * step(0.35, sorteio.x);
}

void main() {
  vec2 p = vec2(vUv.x * uTela.x / uTela.y, vUv.y);
  vec3 a = escorrendo(p, uTempo);
  vec3 b = paradas(p, uTempo);
  vec2 normal = a.xy + b.xy;
  float cobertura = clamp(max(a.z, b.z), 0.0, 1.0);

  vec2 uv = cobrir(vUv, uTela, uTamanhoImagem, uPosicao);
  // Lente: dentro da gota a imagem aparece invertida e ampliada.
  vec3 cor = texture2D(uImagem, uv - normal * 0.03).rgb;

  float brilho = smoothstep(0.55, 0.0, length(normal - vec2(-0.35, 0.4))) * cobertura;
  float borda = smoothstep(0.55, 1.0, length(normal)) * cobertura;
  cor = cor * (1.0 - borda * 0.45) + vec3(brilho * 0.7);
  cor += vec3(0.08) * cobertura;

  gl_FragColor = vec4(cor, 1.0);
}
`

export const FRAGMENTO_IMAGEM = /* glsl */ `
uniform sampler2D uImagem;
uniform vec2 uTamanhoImagem;
uniform vec2 uPosicao;
uniform vec2 uTela;
varying vec2 vUv;

${COBRIR}

void main() {
  gl_FragColor = texture2D(uImagem, cobrir(vUv, uTela, uTamanhoImagem, uPosicao));
}
`

/** Vapor do banho: subindo da espuma, mais forte nas laterais, onde a espuma é mais alta. */
export const FRAGMENTO_VAPOR = /* glsl */ `
uniform vec2 uTela;
uniform float uTempo;
varying vec2 vUv;

${ACASO}

float ruido(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = acaso2(i).x;
  float b = acaso2(i + vec2(1.0, 0.0)).x;
  float c = acaso2(i + vec2(0.0, 1.0)).x;
  float d = acaso2(i + vec2(1.0, 1.0)).x;
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float soma = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    soma += ruido(p) * amplitude;
    p = p * 2.03 + vec2(1.7, 9.2);
    amplitude *= 0.5;
  }
  return soma;
}

void main() {
  vec2 p = vec2(vUv.x * uTela.x / uTela.y, vUv.y);
  vec2 q = p * 2.2 + vec2(uTempo * 0.025, -uTempo * 0.09);
  float torcao = fbm(q * 0.8 + vec2(0.0, -uTempo * 0.04));
  float nuvem = fbm(q + torcao * 1.4);

  float altura = smoothstep(0.95, 0.05, vUv.y);
  float lateral = mix(0.55, 1.0, smoothstep(0.15, 0.5, abs(vUv.x - 0.5)));
  float alfa = min(0.85, smoothstep(0.4, 0.7, nuvem) * altura * lateral * 1.6);

  gl_FragColor = vec4(vec3(1.0, 0.99, 0.97), alfa);
}
`
