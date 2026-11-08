"""Fecha a tira original de casas: a casa amarela fica inteira e as duas pontas ficam livres.

uso: python scripts/arte/montar_casas_original.py

A tira foi desenhada para emendar nela mesma: a ponta esquerda é o resto da casa amarela da ponta
direita. Quando ela entrou no sorteio junto com as casas soltas, cada ponta passou a encostar em
outra construção e a casa aparecia cortada ao meio. Este script leva o pedaço da esquerda para
depois da ponta direita, de modo que a tira não dependa mais de quem vem ao lado.

Entrada: PRD/referencias/casas-tira-original.webp
Saída:   src/features/corrida/imagens/cidade/casas.webp

As coordenadas abaixo são da entrada, medidas a olho com a emenda ampliada.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

RAIZ = Path(__file__).resolve().parents[2]
ENTRADA = RAIZ / "PRD/referencias/casas-tira-original.webp"
SAIDA = RAIZ / "src/features/corrida/imagens/cidade/casas.webp"

# Contorno do pedaço da casa amarela: telhado, parede lateral e cano, contornando a casa azul.
PEDACO_AMARELO = [
    (0, 60), (87, 60), (87, 140), (92, 150), (105, 170), (120, 195), (128, 210), (138, 232),
    (135, 244), (120, 256), (119, 284), (92, 296), (88, 305), (80, 310), (73, 318), (99, 345),
    (99, 395), (85, 385), (72, 372), (60, 372), (48, 378), (40, 387), (40, 520), (0, 520),
]
# Silhueta da moita que fica na frente da casa amarela e da azul. Vai junto para esconder a base da
# parede, que a arte não tem; a original continua na frente da casa azul.
MOITA = [
    (38, 385), (48, 376), (60, 370), (75, 370), (88, 382), (112, 405), (142, 425), (144, 452),
    (160, 455), (180, 470), (194, 517), (38, 517),
]
# Mancha da sobreposição antiga: uma luminária fantasma e uma coluna mais clara na parede.
MANCHA_X = (12, 44)
MANCHA_PAREDE_Y = (368, 464)
MANCHA_PEDRA_Y = (464, 498)
AMOSTRA_PAREDE_X = 8
DESLOCAMENTO_PEDRA = 28
# Parede lateral que a casa azul escondia, e o cano que corre na ponta dela.
LATERAL_Y = (284, 412)
LATERAL_X_INICIO = 68
LATERAL_AMOSTRA = (90, 260)
# Onde a pintura começa: abaixo do peitoril de cada janela da lateral.
LATERAL_X_JANELA = 86
LATERAL_TOPO_JANELA = 306
LATERAL_TOPO_LIVRE = 288
CANO_X = (108, 120)
CANO_LINHA = 270
# Borrão no telhado: faixa de x, faixa de y, e de onde vêm as telhas que o cobrem.
BORRAO_TELHADO = ((10, 44), (120, 156))
BORRAO_ORIGEM = (-34, -10)
HALO_Y = (108, 132)
# A árvore atrás da casa azul sumiria cortada em linha reta sem a amarela na frente: sai toda.
FIM_ARVORE_X = 232
# Halo quase invisível que a arte tem sobre o telhado.
ALFA_MINIMO = 40
FOLGA_TELHADO = 3


def mascara(contorno, altura: int, largura: int) -> np.ndarray:
    img = Image.new("L", (largura, altura), 0)
    ImageDraw.Draw(img).polygon(contorno, fill=255)
    return np.asarray(img) > 0


def verde(px: np.ndarray) -> np.ndarray:
    r, g, b = px[..., 0].astype(int), px[..., 1].astype(int), px[..., 2].astype(int)
    return (g > r - 5) & (g > b + 20)


def verde_forte(px: np.ndarray) -> np.ndarray:
    r, g, b = px[..., 0].astype(int), px[..., 1].astype(int), px[..., 2].astype(int)
    return (g > r + 15) & (g > b + 20)


def laranja(px: np.ndarray) -> np.ndarray:
    r, g, b = px[..., 0].astype(int), px[..., 1].astype(int), px[..., 2].astype(int)
    return (r > g + 40) & (g > b)


def main():
    tira = np.asarray(Image.open(ENTRADA).convert("RGBA")).copy()
    altura, largura = tira.shape[:2]
    limite = 240
    pedaco = mascara(PEDACO_AMARELO, altura, limite)
    moita = mascara(MOITA, altura, limite)
    esquerda = tira[:, :limite]

    # O que é folha, com o contorno escuro em volta: separa moita e árvore do que está atrás.
    folha = np.asarray(Image.fromarray(verde(esquerda)).filter(ImageFilter.MaxFilter(5))) > 0

    # Pedaço que vai para a direita: a casa, sem as folhas da árvore que encostam no telhado.
    cauda = np.zeros((altura, limite, 4), dtype=np.uint8)
    # Critério mais duro que o da moita: a parede lateral, na sombra, também puxa para o verde.
    arvore = np.asarray(Image.fromarray(verde_forte(esquerda)).filter(ImageFilter.MaxFilter(3))) > 0
    leva = pedaco.copy()
    leva[:300, 80:] &= ~arvore[:300, 80:]
    cauda[leva] = esquerda[leva]
    cauda[moita & folha] = esquerda[moita & folha]

    # Limpa a mancha na parede com a cor da mesma linha, e a pedra com o trecho ao lado.
    fundo = tira[:, -limite:]
    for y in range(*MANCHA_PAREDE_Y):
        linha = cauda[y]
        faixa = np.arange(*MANCHA_X)
        livres = faixa[~moita[y, faixa]]
        linha[livres] = esquerda[y, AMOSTRA_PAREDE_X]
    for y in range(*MANCHA_PEDRA_Y):
        for x in range(*MANCHA_X):
            if moita[y, x]:
                continue
            origem = x - DESLOCAMENTO_PEDRA
            cauda[y, x] = esquerda[y, origem] if origem >= 0 else fundo[y, origem]

    # A casa azul cobria o fim da parede lateral, e a arte não tem esse trecho: completa com a cor
    # da própria parede e prolonga o cano até a moita, para a casa terminar em linha reta.
    cor_parede = esquerda[LATERAL_AMOSTRA[1], LATERAL_AMOSTRA[0]]
    for y in range(*LATERAL_Y):
        for x in range(LATERAL_X_INICIO, CANO_X[1]):
            if moita[y, x] and folha[y, x]:
                continue
            if x >= CANO_X[0]:
                if cauda[y, x, 3] == 0:
                    cauda[y, x] = esquerda[CANO_LINHA, x]
            # Pinta por cima do que já há: o contorno do telhado azul e a sombra dele ficaram ali.
            elif y >= (LATERAL_TOPO_JANELA if x < LATERAL_X_JANELA else LATERAL_TOPO_LIVRE):
                cauda[y, x] = cor_parede

    # Telhado: a sobreposição antiga deixou um borrão. Cobre com telhas do mesmo telhado, um pouco
    # acima na descida, onde o desenho se repete. Antes, tira o halo que ela deixou sobre a cumeeira.
    (x0, x1), (y0, y1) = BORRAO_TELHADO
    cauda[HALO_Y[0] : HALO_Y[1], x0:x1][cauda[HALO_Y[0] : HALO_Y[1], x0:x1, 3] < 235] = 0
    for y in range(y0, y1):
        for x in range(x0, x1):
            ox, oy = x + BORRAO_ORIGEM[0], y + BORRAO_ORIGEM[1]
            amostra = esquerda[oy, ox] if ox >= 0 else fundo[oy, ox]
            if amostra[3] > 200 and cauda[y, x, 3] > 200:
                cauda[y, x] = amostra

    # Tira da esquerda o que foi levado. A moita continua, na frente da casa azul.
    fica = esquerda.copy()
    fica[pedaco & ~(moita & folha)] = 0
    # Sem a casa amarela, a árvore acaba em linha reta: sai tudo acima do telhado da casa azul.
    for x in range(FIM_ARVORE_X):
        telhado = np.where(laranja(fica[:320, x : x + 1])[:, 0] & (fica[:320, x, 3] > 128))[0]
        topo = int(telhado.min()) - FOLGA_TELHADO if len(telhado) else 320
        fica[:max(topo, 0), x] = 0

    saida = np.zeros((altura, largura + limite, 4), dtype=np.uint8)
    saida[:, limite:largura] = tira[:, limite:]
    saida[:, :limite] = fica
    resto = cauda[..., 3] > 0
    saida[:, largura:][resto] = cauda[resto]
    saida[saida[..., 3] < ALFA_MINIMO] = 0

    colunas = np.where((saida[..., 3] > 0).any(axis=0))[0]
    img = Image.fromarray(saida[:, colunas.min() : colunas.max() + 1])
    img.save(SAIDA, "WEBP", quality=90, method=6)
    print(f"{img.width} x {img.height} px, {SAIDA.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
