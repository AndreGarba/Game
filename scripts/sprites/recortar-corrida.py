# Recorta a folha de corrida do cachorro (gerada no ChatGPT, fundo transparente, N quadros numa
# linha) numa folha de quadros de tamanho igual, pronta para o canvas.
# Uso: python scripts/sprites/recortar-corrida.py PRD/referencias/cachorro-correndo.png \
#        src/features/corrida/imagens/cachorro-correndo.webp [altura_saida] [previa.png]
# Precisa de Pillow e numpy. Imprime as medidas para SPRITE_CACHORRO_CORRENDO.
#
# Cada cachorro é uma mancha conectada de alfa. A posição dele dentro da sua célula é mantida:
# o quique e o avanço do galope que a arte desenhou continuam na animação.
import sys
import numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
altura_saida = int(sys.argv[3]) if len(sys.argv) > 3 else 256
previa = sys.argv[4] if len(sys.argv) > 4 else None

im = Image.open(src).convert('RGBA')
rgba = np.asarray(im).copy()
H, W, _ = rgba.shape
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
        soma_x = cnt = 0
        while pilha:
            y, x = pilha.pop()
            soma_x += x
            cnt += 1
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < H and 0 <= nx < W and visivel[ny, nx] and not rotulo[ny, nx]:
                    rotulo[ny, nx] = n
                    pilha.append((ny, nx))
        manchas.append((n, soma_x / cnt, cnt))

grandes = sorted([m for m in manchas if m[2] > 0.02 * H * W / 8], key=lambda m: m[1])
total = len(grandes)
print('quadros encontrados:', total)
celula = W / total

# Cada mancha pequena (pelo solto) vai para o cachorro mais próximo.
centros = np.array([m[1] for m in grandes])
dono = {}
for m in manchas:
    if m[2] < 4:
        continue
    dono[m[0]] = int(np.argmin(np.abs(centros - m[1])))

mascaras = [np.zeros((H, W), bool) for _ in range(total)]
for rid, i in dono.items():
    mascaras[i] |= rotulo == rid

# Caixa comum: união das caixas de cada cachorro, em coordenadas da sua célula.
esq, dir_, topo, base = celula, 0, H, 0
for i, mk in enumerate(mascaras):
    ys, xs = np.where(mk)
    x0 = i * celula
    esq = min(esq, xs.min() - x0)
    dir_ = max(dir_, xs.max() + 1 - x0)
    topo = min(topo, ys.min())
    base = max(base, ys.max() + 1)
margem = 6
esq, dir_ = int(np.floor(esq)) - margem, int(np.ceil(dir_)) + margem
topo, base = int(topo) - margem, int(base) + margem
lq, aq = dir_ - esq, base - topo

escala = altura_saida / aq
lq_s, aq_s = round(lq * escala), altura_saida
folha = Image.new('RGBA', (lq_s * total, aq_s), (0, 0, 0, 0))
for i, mk in enumerate(mascaras):
    x0 = int(round(i * celula)) + esq
    q = np.zeros((aq, lq, 4), np.uint8)
    # recorte com limites, preenchendo fora da imagem com transparente
    sx0, sx1 = max(0, x0), min(W, x0 + lq)
    sy0, sy1 = max(0, topo), min(H, base)
    pedaco = rgba[sy0:sy1, sx0:sx1].copy()
    pedaco[..., 3] = np.where(mk[sy0:sy1, sx0:sx1], pedaco[..., 3], 0)
    q[sy0 - topo:sy1 - topo, sx0 - x0:sx1 - x0] = pedaco
    folha.paste(Image.fromarray(q).resize((lq_s, aq_s), Image.LANCZOS), (i * lq_s, 0))

folha.save(out, 'WEBP', quality=90, method=6)
# Linha das patas: a pata mais baixa de todos os quadros, medida da base do quadro.
pes = round(margem * escala)
print(f'quadros={total} largura={lq_s} altura={aq_s} pes={pes}')
if previa:
    fundo = Image.new('RGBA', folha.size, (120, 200, 255, 255))
    fundo.alpha_composite(folha)
    fundo.convert('RGB').save(previa)
