"""Prepara uma camada gerada por IA para o parallax: recorta, emenda as bordas e salva em WebP.

uso: python preparar_camada.py entrada.png saida.webp --altura 512 [--opaca] [--emenda 0.08] [--busca 0.3]
"""
import argparse

from PIL import Image


def main():
    p = argparse.ArgumentParser()
    p.add_argument("entrada")
    p.add_argument("saida")
    p.add_argument("--altura", type=int, required=True, help="altura final em px")
    p.add_argument("--opaca", action="store_true", help="camada sem transparência (céu)")
    p.add_argument("--emenda", type=float, default=0.08, help="fração da largura usada no cruzamento")
    p.add_argument("--busca", type=float, default=0.3, help="fração de cada ponta onde o corte pode cair")
    p.add_argument("--corte-topo", type=float, default=None, help="fração do topo a descartar")
    a = p.parse_args()

    img = Image.open(a.entrada).convert("RGBA")
    if not a.opaca:
        # Fundo magenta, se a IA não entregou alfa.
        px = img.load()
        w, h = img.size
        if img.getchannel("A").getextrema()[0] == 255:
            for y in range(h):
                for x in range(w):
                    r, g, b, _ = px[x, y]
                    if r > 200 and b > 200 and g < 90:
                        px[x, y] = (0, 0, 0, 0)
        caixa = img.getchannel("A").point(lambda v: 255 if v > 16 else 0).getbbox()
        if caixa:
            img = img.crop((0, caixa[1], img.width, caixa[3]))
    if a.corte_topo:
        img = img.crop((0, int(img.height * a.corte_topo), img.width, img.height))

    # Corte: procura um par de colunas (uma no começo, outra no fim) que se pareçam, para que a
    # mistura da emenda caia entre coisas parecidas e não deixe fantasma.
    import numpy as np

    w, h = img.size
    f = 400 / w  # busca numa cópia pequena; o corte volta para a escala original
    peq = np.asarray(img.resize((400, max(1, int(h * f))), Image.BILINEAR)).astype(np.float32)
    peq[..., :3] *= peq[..., 3:4] / 255
    op = max(3, int(400 * a.emenda))
    melhor = (1e30, 0, 400)
    busca = max(1, int(400 * a.busca))
    for ini in range(0, busca):
        faixa_ini = peq[:, ini : ini + op]
        for fim in range(400, 400 - busca, -1):
            d = float(np.abs(peq[:, fim - op : fim] - faixa_ini).mean())
            if d < melhor[0]:
                melhor = (d, ini, fim)
    ini, fim = round(melhor[1] / f), round(melhor[2] / f)
    img = img.crop((ini, 0, fim, h))
    print("corte", ini, fim, "de", w, "diferença", round(melhor[0], 1))

    # Emenda: a faixa final é misturada com o começo, e o resultado encolhe essa faixa. A última
    # coluna passa a ser vizinha da primeira, então a tira repete sem costura.
    w, h = img.size
    o = max(8, int(w * a.emenda))
    saida = img.crop((0, 0, w - o, h))
    inicio = img.crop((0, 0, o, h))
    fim = img.crop((w - o, 0, w, h))
    mascara = Image.linear_gradient("L").rotate(-90, expand=True).resize((o, h))  # 255 à esquerda
    mistura = Image.composite(fim, inicio, mascara)
    saida.paste(mistura, (0, 0))

    final_w = round(saida.width * a.altura / saida.height)
    saida = saida.resize((final_w, a.altura), Image.LANCZOS)
    saida.save(a.saida, "WEBP", quality=86, method=6)
    print(a.saida, saida.size)


if __name__ == "__main__":
    main()
