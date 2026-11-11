"""Troca o fundo liso (branco ou preto) de uma imagem sem alfa por transparência, inundando a
partir das bordas de cima. Para as peças que a IA entrega opacas mesmo pedindo fundo transparente.

uso: python tirar_fundo.py entrada.png saida.png [--tolerancia 40]
"""
import argparse

from PIL import Image, ImageChops, ImageDraw, ImageFilter


def main():
    p = argparse.ArgumentParser()
    p.add_argument("entrada")
    p.add_argument("saida")
    p.add_argument("--tolerancia", type=int, default=40)
    a = p.parse_args()

    img = Image.open(a.entrada).convert("RGB")
    w, h = img.size
    # Inunda uma cópia com uma cor que não existe na arte; o que mudou é fundo.
    marca = (255, 0, 254)
    copia = img.copy()
    for x in range(0, w, 16):
        if copia.getpixel((x, 0)) != marca:
            ImageDraw.floodfill(copia, (x, 0), marca, thresh=a.tolerancia)
    r, g, b = copia.split()
    fundo = ImageChops.multiply(
        ImageChops.multiply(r.point(lambda v: 255 if v == 255 else 0), g.point(lambda v: 255 if v == 0 else 0)),
        b.point(lambda v: 255 if v == 254 else 0),
    )
    # Come 1 px da borda: é onde sobra o halo da cor do fundo.
    alfa = ImageChops.invert(fundo).filter(ImageFilter.MinFilter(3))
    img.putalpha(alfa)
    img.save(a.saida)
    print(a.saida, img.size)


if __name__ == "__main__":
    main()
