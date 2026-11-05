"""Separa os objetos de uma folha com fundo transparente (colunas vazias entre eles) e salva cada um
recortado no próprio contorno, em WebP.

uso: python recortar_sprites.py folha.png pasta_saida nome1:altura nome2:altura ...
"""
import sys

from PIL import Image


def main():
    folha, pasta, *pedidos = sys.argv[1:]
    img = Image.open(folha).convert("RGBA")
    alfa = img.getchannel("A").point(lambda v: 255 if v > 24 else 0)
    w, h = img.size
    ocupada = [alfa.crop((x, 0, x + 1, h)).getbbox() is not None for x in range(w)]

    grupos, ini = [], None
    for x, o in enumerate(ocupada + [False]):
        if o and ini is None:
            ini = x
        elif not o and ini is not None:
            if x - ini > 12:  # descarta brilho solto
                grupos.append((ini, x))
            ini = None
    print("objetos encontrados:", len(grupos), grupos)
    if len(grupos) != len(pedidos):
        sys.exit(f"esperava {len(pedidos)} objetos")

    for (x0, x1), pedido in zip(grupos, pedidos):
        nome, altura = pedido.split(":")
        peca = img.crop((x0, 0, x1, h))
        peca = peca.crop(peca.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox())
        altura = int(altura)
        peca = peca.resize((round(peca.width * altura / peca.height), altura), Image.LANCZOS)
        destino = f"{pasta}/{nome}.webp"
        peca.save(destino, "WEBP", quality=88, method=6)
        print(destino, peca.size, "proporção", round(peca.width / peca.height, 2))


if __name__ == "__main__":
    main()
