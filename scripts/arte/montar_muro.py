"""Monta os trechos de muro da cidade a partir da arte do muro e da folha de painéis novos.

uso: python scripts/arte/montar_muro.py

Todo trecho começa num pilar e termina num painel, e todo painel encosta num pilar dos dois lados.
Então qualquer trecho emenda em qualquer outro: a junção é sempre painel | pilar, com o MESMO
pilar (recortado da arte original). É isso que deixa a sequência sorteada sem costura visível.

Entradas:
  src/features/corrida/imagens/cidade/muro.webp   arte original (pilares + 4 painéis)
  PRD/referencias/muro-paineis.png                6 painéis novos, gerados no ChatGPT
Saídas:
  src/features/corrida/imagens/cidade/muro-trecho-<n>.webp
"""
from pathlib import Path

import numpy as np
from PIL import Image

RAIZ = Path(__file__).resolve().parents[2]
ORIGINAL = RAIZ / "src/features/corrida/imagens/cidade/muro.webp"
FOLHA = RAIZ / "PRD/referencias/muro-paineis.png"
SAIDA = RAIZ / "src/features/corrida/imagens/cidade"

# Medidas da arte original (1404 × 260): o pilar ocupa x 226..293 e o painel cinza vai do topo
# do capitel do painel (y 42) até a base (y 258).
PILAR = (226, 294)
PAINEL_TOPO, PAINEL_BASE = 42, 259
ORIGINAIS = {
    "madeira": (460, 664),
    "cinza": (734, 978),
    "pata": (1047, 1260),
}
NOVOS = ["tijolo", "grafite", "portao", "cerca_viva", "janela", "correio"]

# Seis sequências de quatro painéis, misturando os da arte original com os novos.
TRECHOS = [
    ["madeira", "pata", "cinza", "tijolo"],
    ["grafite", "madeira", "cinza", "correio"],
    ["portao", "tijolo", "cerca_viva", "pata"],
    ["janela", "cinza", "madeira", "grafite"],
    ["cerca_viva", "correio", "portao", "cinza"],
    ["pata", "janela", "tijolo", "madeira"],
]


def paineis_novos(altura_painel: int) -> dict[str, Image.Image]:
    folha = Image.open(FOLHA).convert("RGBA")
    alfa = np.asarray(folha)[..., 3] > 128
    colunas = np.where(alfa.any(axis=0))[0]
    blocos, inicio, anterior = [], colunas[0], colunas[0]
    for x in colunas[1:]:
        if x > anterior + 3:
            blocos.append((inicio, anterior + 1))
            inicio = x
        anterior = x
    blocos.append((inicio, anterior + 1))
    assert len(blocos) == len(NOVOS), f"esperava {len(NOVOS)} painéis, achei {len(blocos)}"
    # A base comum de todos (y mais baixo) vira a base do painel; a altura sai da maioria.
    linhas = [np.where(alfa[:, a:b].any(axis=1))[0] for a, b in blocos]
    base = max(l.max() for l in linhas) + 1
    topo_comum = int(np.median([l.min() for l in linhas]))
    escala = altura_painel / (base - topo_comum)
    saida = {}
    for nome, (a, b), linha in zip(NOVOS, blocos, linhas):
        # A cerca viva passa um pouco do topo: mantém, ela cresce por cima do capitel.
        topo = min(linha.min(), topo_comum)
        pedaco = folha.crop((a, topo, b, base))
        tamanho = (round(pedaco.width * escala), round(pedaco.height * escala))
        saida[nome] = (pedaco.resize(tamanho, Image.LANCZOS), round((topo_comum - topo) * escala))
    return saida


def main():
    original = Image.open(ORIGINAL).convert("RGBA")
    altura = original.height
    pilar = original.crop((PILAR[0], 0, PILAR[1], altura))
    paineis: dict[str, tuple[Image.Image, int]] = {
        nome: (original.crop((a, 0, b, altura)), 0) for nome, (a, b) in ORIGINAIS.items()
    }
    for nome, (img, sobra) in paineis_novos(PAINEL_BASE - PAINEL_TOPO).items():
        paineis[nome] = (img, sobra)

    for i, sequencia in enumerate(TRECHOS, start=1):
        largura = sum(pilar.width + paineis[p][0].width for p in sequencia)
        trecho = Image.new("RGBA", (largura, altura), (0, 0, 0, 0))
        x = 0
        for nome in sequencia:
            img, sobra = paineis[nome]
            # Painel antes do pilar: o pilar fica por cima e cobre a borda do painel.
            if nome in ORIGINAIS:
                trecho.alpha_composite(img, (x + pilar.width, 0))
            else:
                trecho.alpha_composite(img, (x + pilar.width, PAINEL_TOPO - sobra))
            trecho.alpha_composite(pilar, (x, 0))
            x += pilar.width + img.width
        destino = SAIDA / f"muro-trecho-{i}.webp"
        trecho.save(destino, "WEBP", quality=90, method=6)
        print(destino.name, trecho.size)


if __name__ == "__main__":
    main()
