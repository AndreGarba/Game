# Recorta a folha "WALK" do cachorro (5 quadros num fundo cinza) em sprites com transparência.
# Uso: python scripts/sprites/recortar-cachorro.py PRD/referencias/cachorro-andando.webp #        src/features/corrida/imagens/cachorro-andando.webp previa.png
# Precisa de Pillow e numpy. Se mudar o tamanho do quadro, atualize SPRITE_CACHORRO_ANDANDO.
import sys
from collections import deque
import numpy as np
from PIL import Image

src, out, prev = sys.argv[1], sys.argv[2], sys.argv[3]
im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
H, W, _ = im.shape
L = im.mean(axis=2)
sat = im.max(axis=2) - im.min(axis=2)
bg = np.median(im[0:10].reshape(-1, 3), axis=0)
Lbg = bg.mean()

# linha clara na borda de baixo da imagem
im[H-4:] = bg; L[H-4:] = Lbg; sat[H-4:] = 0
# apaga o letreiro WALK
im[0:85, 0:230] = bg
L[0:85, 0:230] = Lbg; sat[0:85, 0:230] = 0

# Embaixo (sombra no chão) aceita cinza bem escuro; em cima não, senão come o nariz preto.
limite_escuro = np.where(np.arange(H)[:, None] > 330, 14, 47)
fundo_cand = (sat < 22) & (L < 112) & (L > limite_escuro)
fundo = np.zeros((H, W), bool)
q = deque()
for x in range(W):
    for y in (0, H - 1):
        if fundo_cand[y, x]: fundo[y, x] = True; q.append((y, x))
for y in range(H):
    for x in (0, W - 1):
        if fundo_cand[y, x] and not fundo[y, x]: fundo[y, x] = True; q.append((y, x))
while q:
    y, x = q.popleft()
    for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
        ny, nx = y+dy, x+dx
        if 0 <= ny < H and 0 <= nx < W and not fundo[ny, nx] and fundo_cand[ny, nx]:
            fundo[ny, nx] = True; q.append((ny, nx))

# alfa suave na borda: o que é fundo mas mais claro que ele é fio de pelo misturado
alfa = np.ones((H, W), np.float32)
a_f = np.clip((L - Lbg - 8) / 55, 0, 1)
alfa[fundo] = a_f[fundo]
cor = im.copy()
m = fundo & (alfa > 0)
a = alfa[m][:, None]
cor[m] = np.clip((im[m] - (1 - a) * bg) / np.maximum(a, 1e-3), 0, 255)

rgba = np.dstack([cor, alfa * 255]).astype(np.uint8)
opaco = alfa > 0.5
contagem = opaco.sum(axis=0)
# 5 quadros espaçados ~400 px: corta no vale de pixels opacos perto de cada divisa
cortes = [0]
for i in range(1, 5):
    a, b = i * 400 - 70, i * 400 + 70
    cortes.append(a + int(np.argmin(contagem[a:b])))
cortes.append(W)
quadros = list(zip(cortes[:-1], cortes[1:]))
print('quadros', quadros)
# Rotula manchas conectadas (pixels com algum alfa) e entrega cada uma ao quadro do seu centro:
# o focinho de um quadro invade a coluna do rabo do seguinte.
visivel = alfa > 0.05
rotulo = np.zeros((H, W), np.int32)
manchas = []
n = 0
for y0 in range(H):
    for x0 in np.where(visivel[y0] & (rotulo[y0] == 0))[0]:
        if rotulo[y0, x0]: continue
        n += 1
        rotulo[y0, x0] = n
        pilha = [(y0, x0)]
        sx = sy = cnt = 0
        while pilha:
            y, x = pilha.pop()
            sx += x; cnt += 1
            for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
                ny, nx = y+dy, x+dx
                if 0 <= ny < H and 0 <= nx < W and visivel[ny, nx] and not rotulo[ny, nx]:
                    rotulo[ny, nx] = n; pilha.append((ny, nx))
        manchas.append((n, sx / cnt, cnt))
print('manchas', len(manchas), sorted(m[2] for m in manchas)[-8:])
grandes = sorted([m for m in manchas if m[2] > 2000], key=lambda m: m[1])
print('grandes', [(int(m[1]), m[2]) for m in grandes])
caixas = []
mascaras = []
for i in range(5):
    lo, hi = cortes[i], cortes[i+1]
    ids = [m[0] for m in manchas if m[2] > 15 and lo <= m[1] < hi]
    mask = np.isin(rotulo, ids)
    ys, xs = np.where(mask)
    caixas.append((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    mascaras.append(mask)
print('caixas', caixas)
lw = max(c[2]-c[0] for c in caixas) + 8
lh = max(c[3]-c[1] for c in caixas) + 8
folha = Image.new('RGBA', (lw * len(caixas), lh), (0, 0, 0, 0))
for i, (x0, y0, x1, y1) in enumerate(caixas):
    q = rgba[y0:y1, x0:x1].copy()
    q[..., 3] = np.where(mascaras[i][y0:y1, x0:x1], q[..., 3], 0)
    folha.paste(Image.fromarray(q), (i * lw + lw - 4 - (x1 - x0), lh - 4 - (y1 - y0)))
folha.save(out, 'WEBP', quality=90, method=6)
print('folha', folha.size, 'quadro', lw, lh)
fundo_prev = Image.new('RGBA', folha.size, (120, 200, 255, 255))
fundo_prev.alpha_composite(folha)
fundo_prev.convert('RGB').save(prev)
