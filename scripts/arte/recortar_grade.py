"""Separa os objetos de uma folha em grade (linhas e colunas, com fundo transparente entre eles)
e salva cada um recortado no próprio contorno, em WebP. Os nomes seguem a ordem de leitura:
linha por linha, da esquerda para a direita.

uso: python recortar_grade.py folha.png pasta_saida [--folga 24] nome1:altura nome2:altura ...
"""
import sys

from PIL import Image

# Faixa vazia mínima (px) para separar dois objetos; menor que isso é vão dentro do objeto
# (entre o cabo e o corpo do carrinho de mão, por exemplo).
FOLGA = 24


def faixas(ocupada):
    grupos, ini, vazio = [], None, 0
    for i, o in enumerate(ocupada + [False] * (FOLGA + 1)):
        if o:
            if ini is None:
                ini = i
            vazio = 0
        elif ini is not None:
            vazio += 1
            if vazio > FOLGA:
                fim = i - vazio + 1
                if fim - ini > 12:  # descarta brilho solto
                    grupos.append((ini, fim))
                ini = None
    return grupos


def main():
    global FOLGA
    folha, pasta, *pedidos = sys.argv[1:]
    if pedidos[0] == "--folga":
        FOLGA = int(pedidos[1])
        pedidos = pedidos[2:]
    img = Image.open(folha).convert("RGBA")
    alfa = img.getchannel("A").point(lambda v: 255 if v > 24 else 0)
    w, h = img.size

    pecas = []
    linhas = faixas([alfa.crop((0, y, w, y + 1)).getbbox() is not None for y in range(h)])
    for y0, y1 in linhas:
        tira = alfa.crop((0, y0, w, y1))
        for x0, x1 in faixas([tira.crop((x, 0, x + 1, y1 - y0)).getbbox() is not None for x in range(w)]):
            pecas.append((x0, y0, x1, y1))
    print("objetos encontrados:", len(pecas), pecas)
    if len(pecas) != len(pedidos):
        sys.exit(f"esperava {len(pedidos)} objetos")

    for caixa, pedido in zip(pecas, pedidos):
        nome, altura = pedido.split(":")
        peca = img.crop(caixa)
        peca = peca.crop(peca.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox())
        altura = int(altura)
        peca = peca.resize((round(peca.width * altura / peca.height), altura), Image.LANCZOS)
        destino = f"{pasta}/{nome}.webp"
        peca.save(destino, "WEBP", quality=88, method=6)
        print(destino, peca.size, "proporção", round(peca.width / peca.height, 2))


if __name__ == "__main__":
    main()
