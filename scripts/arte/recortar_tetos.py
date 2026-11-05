"""Separa a folha dos tetos: placa e galho se sobrepõem em x, então saem por componente conectado;
toldo, viga e andaime saem por coluna. Cada teto é recortado no próprio contorno.

uso: python recortar_tetos.py folha.png pasta_saida
"""
import sys
from collections import deque

import numpy as np
from PIL import Image


def componentes(mascara: np.ndarray, passo: int = 3) -> np.ndarray:
    peq = mascara[::passo, ::passo]
    h, w = peq.shape
    rotulo = np.zeros((h, w), int)
    n = 0
    for y in range(h):
        for x in range(w):
            if peq[y, x] and not rotulo[y, x]:
                n += 1
                fila = deque([(y, x)])
                rotulo[y, x] = n
                while fila:
                    cy, cx = fila.popleft()
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < h and 0 <= nx < w and peq[ny, nx] and not rotulo[ny, nx]:
                            rotulo[ny, nx] = n
                            fila.append((ny, nx))
    # Dilata um passo para pegar a borda suavizada que a amostragem perdeu.
    dil = rotulo.copy()
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        vizinho = np.roll(np.roll(rotulo, dy, 0), dx, 1)
        dil = np.where(dil == 0, vizinho, dil)
    cheio = np.kron(dil, np.ones((passo, passo), int))[: mascara.shape[0], : mascara.shape[1]]
    return cheio


def salvar(arr: np.ndarray, destino: str, largura_px: int) -> None:
    img = Image.fromarray(arr)
    img = img.crop(img.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox())
    altura = round(img.height * largura_px / img.width)
    img = img.resize((largura_px, altura), Image.LANCZOS)
    img.save(destino, "WEBP", quality=88, method=6)
    print(destino, img.size, "proporção", round(img.width / img.height, 2))


def main():
    folha, pasta = sys.argv[1:3]
    rgba = np.asarray(Image.open(folha).convert("RGBA")).copy()
    mascara = rgba[:, :, 3] > 24
    colunas = mascara.any(axis=0)
    grupos, ini = [], None
    for x, o in enumerate(list(colunas) + [False]):
        if o and ini is None:
            ini = x
        elif not o and ini is not None:
            grupos.append((ini, x))
            ini = None
    (a0, a1), toldo, viga, andaime = grupos
    regiao = rgba[:, a0:a1].copy()
    rot = componentes(regiao[:, :, 3] > 24)
    tamanhos = sorted(((rot == r).sum(), r) for r in np.unique(rot) if r)
    maiores = [r for _, r in tamanhos[-2:]]
    # A placa fica à esquerda: o componente com o menor x médio.
    maiores.sort(key=lambda r: np.nonzero(rot == r)[1].mean())
    for r, nome, largura in zip(maiores, ("placa", "galho"), (200, 360)):
        peca = regiao.copy()
        peca[rot != r, 3] = 0
        salvar(peca, f"{pasta}/{nome}.webp", largura)
    for (x0, x1), nome, largura in zip((toldo, viga, andaime), ("toldo", "viga", "andaime"), (420, 380, 420)):
        salvar(rgba[:, x0:x1].copy(), f"{pasta}/{nome}.webp", largura)


if __name__ == "__main__":
    main()
