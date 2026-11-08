# Recorta a folha de corrida do cachorro (gerada no ChatGPT, fundo transparente, N quadros numa
# linha) numa folha de quadros de tamanho igual, pronta para o canvas.
# Uso: python scripts/sprites/recortar-corrida.py PRD/referencias/cachorro-correndo.png \
#        src/features/corrida/imagens/cachorro-correndo.webp [altura_saida] [previa.png]
# Precisa de Pillow e numpy. Imprime as medidas para SPRITE_CACHORRO_CORRENDO.
#
# Cada cachorro é uma mancha conectada de alfa. Na horizontal, todos os quadros são alinhados pelo
# tronco (parte de cima da mancha: corpo e cabeça, sem as patas): a IA desenha o cachorro
# escorregando para trás dentro da célula ao longo do ciclo, e na volta ao quadro 1 isso vira um
# tranco para a frente. Na vertical a posição original fica: é o quique do galope e o contato das
# patas com o chão.
import argparse
import sys
import numpy as np
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument('entrada')
parser.add_argument('saida')
parser.add_argument('altura_saida', nargs='?', type=int, default=256)
parser.add_argument('previa', nargs='?')
# Menos que 10 e o galope "pula" de pose em pose na velocidade do jogo. Animações que não são o
# ciclo de corrida (o slide do abaixar) passam o próprio mínimo.
parser.add_argument('--quadros-minimos', type=int, default=10)
# Alfa a partir do qual o pixel é personagem. Algumas folhas saem com o fundo em alfa 1-2; a do
# slide saiu com um véu branco em alfa 180-196 e o cachorro em 248: aí passa --alfa-fundo 205.
parser.add_argument('--alfa-fundo', type=float, default=8)
args = parser.parse_args()
src, out, altura_saida, previa = args.entrada, args.saida, args.altura_saida, args.previa
QUADROS_MINIMOS = args.quadros_minimos

im = Image.open(src).convert('RGBA')
rgba = np.asarray(im).copy()
H, W, _ = rgba.shape
# Normaliza o alfa entre o fundo e o personagem: senão o fundo vira uma névoa e o personagem fica
# levemente transparente.
alfa = np.clip((rgba[..., 3].astype(np.float32) - args.alfa_fundo) / (240 - args.alfa_fundo), 0, 1)
rgba[..., 3] = (alfa * 255).astype(np.uint8)
alfa = rgba[..., 3]
visivel = alfa > 8

# Rotula manchas conectadas (4-vizinhança).
rotulo = np.zeros((H, W), np.int32)
manchas = []
n = 0
for y0 in range(H):
    linha = np.where(visivel[y0] & (rotulo[y0] == 0))[0]
    for x0 in linha:
        if rotulo[y0, x0]:
            continue
        n += 1
        rotulo[y0, x0] = n
        pilha = [(y0, x0)]
        soma_x = soma_y = cnt = 0
        while pilha:
            y, x = pilha.pop()
            soma_x += x
            soma_y += y
            cnt += 1
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < H and 0 <= nx < W and visivel[ny, nx] and not rotulo[ny, nx]:
                    rotulo[ny, nx] = n
                    pilha.append((ny, nx))
        manchas.append((n, soma_x / cnt, cnt, soma_y / cnt))

# Um personagem é uma mancha com pelo menos 30% da área da maior; o resto é pelo solto.
maior = max(m[2] for m in manchas)
grandes = [m for m in manchas if m[2] > 0.3 * maior]
# Linhas da grade: centro vertical a mais de 15% da altura da imagem do anterior abre linha nova.
grandes.sort(key=lambda m: m[3])
linhas = []
for m in grandes:
    if linhas and abs(m[3] - linhas[-1][-1][3]) < 0.15 * H:
        linhas[-1].append(m)
    else:
        linhas.append([m])
grandes = [m for linha in linhas for m in sorted(linha, key=lambda m: m[1])]
linha_de = {m[0]: i for i, linha in enumerate(linhas) for m in linha}
total = len(grandes)
print('quadros encontrados:', total, 'em', len(linhas), 'linha(s)')
if total < QUADROS_MINIMOS:
    sys.exit(f'A folha tem {total} quadros; o mínimo para a corrida é {QUADROS_MINIMOS}.')

# Cada mancha pequena (pelo solto, cadarço) vai para o personagem mais próximo.
centros = np.array([(m[1], m[3]) for m in grandes])
dono = {}
for m in manchas:
    if m[2] < 4:
        continue
    d = (centros[:, 0] - m[1]) ** 2 + (centros[:, 1] - m[3]) ** 2
    dono[m[0]] = int(np.argmin(d))

mascaras = [np.zeros((H, W), bool) for _ in range(total)]
for rid, i in dono.items():
    mascaras[i] |= rotulo == rid

# Na vertical cada quadro fica na posição da sua linha da grade: a base da linha (pé mais baixo
# dela) vira a base comum.
base_linha = {}
for i, mk in enumerate(mascaras):
    l = linha_de[grandes[i][0]]
    base_linha[l] = max(base_linha.get(l, 0), np.where(mk)[0].max())
desloc_y = [base_linha[linha_de[grandes[i][0]]] for i in range(total)]

# Âncora horizontal de cada quadro: centro do tronco (55% de cima da altura do cachorro).
ancoras = []
for mk in mascaras:
    ys, xs = np.where(mk)
    topo_i, base_i = ys.min(), ys.max()
    tronco = ys < topo_i + (base_i - topo_i) * 0.55
    ancoras.append(xs[tronco].mean())

# Caixa comum, em coordenadas relativas à âncora de cada quadro.
esq, dir_, topo, base = 0, 0, 0, -H
for i, mk in enumerate(mascaras):
    ys, xs = np.where(mk)
    esq = min(esq, xs.min() - ancoras[i])
    dir_ = max(dir_, xs.max() + 1 - ancoras[i])
    topo = min(topo, ys.min() - desloc_y[i])
    base = max(base, ys.max() + 1 - desloc_y[i])
margem = 6
esq, dir_ = int(np.floor(esq)) - margem, int(np.ceil(dir_)) + margem
topo, base = int(topo) - margem, int(base) + margem
lq, aq = dir_ - esq, base - topo

escala = altura_saida / aq
lq_s, aq_s = round(lq * escala), altura_saida
folha = Image.new('RGBA', (lq_s * total, aq_s), (0, 0, 0, 0))
for i, mk in enumerate(mascaras):
    x0 = int(round(ancoras[i])) + esq
    y0 = int(desloc_y[i]) + topo
    q = np.zeros((aq, lq, 4), np.uint8)
    # recorte com limites, preenchendo fora da imagem com transparente
    sx0, sx1 = max(0, x0), min(W, x0 + lq)
    sy0, sy1 = max(0, y0), min(H, y0 + aq)
    pedaco = rgba[sy0:sy1, sx0:sx1].copy()
    pedaco[..., 3] = np.where(mk[sy0:sy1, sx0:sx1], pedaco[..., 3], 0)
    q[sy0 - y0:sy1 - y0, sx0 - x0:sx1 - x0] = pedaco
    folha.paste(Image.fromarray(q).resize((lq_s, aq_s), Image.LANCZOS), (i * lq_s, 0))

folha.save(out, 'WEBP', quality=90, method=6)
# Linha das patas: a pata mais baixa de todos os quadros, medida da base do quadro.
pes = round(margem * escala)
print(f'quadros={total} largura={lq_s} altura={aq_s} pes={pes}')
if previa:
    fundo = Image.new('RGBA', folha.size, (120, 200, 255, 255))
    fundo.alpha_composite(folha)
    fundo.convert('RGB').save(previa)
