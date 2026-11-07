"""Monta os trechos de muro da cidade a partir da arte do muro e da folha de painéis novos.

uso: python scripts/arte/montar_muro.py

Todo trecho começa num pilar e termina num painel, e todo painel encosta num pilar dos dois lados.
Então qualquer trecho emenda em qualquer outro: a junção é sempre painel | pilar, com o MESMO
pilar (recortado da arte original). É isso que deixa a sequência sorteada sem costura visível.

Entradas:
  src/features/corrida/imagens/cidade/muro.webp   arte original (pilares + 4 painéis)
  PRD/referencias/muro-paineis.png                6 painéis novos, gerados no ChatGPT
  PRD/referencias/muro-paineis-2.png              8 painéis novos, segundo lote
Saídas (em src/features/corrida/imagens/cidade/muro/):
  pilar.webp e <painel>.webp   peças soltas, todas com a altura da arte original
  trechos.json                 as sequências de painéis; o jogo monta cada trecho na hora
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image

RAIZ = Path(__file__).resolve().parents[2]
ORIGINAL = RAIZ / "src/features/corrida/imagens/cidade/muro.webp"
FOLHAS = [
    (RAIZ / "PRD/referencias/muro-paineis.png", ["tijolo", "grafite", "portao", "cerca_viva", "janela", "correio"]),
    (
        RAIZ / "PRD/referencias/muro-paineis-2.png",
        ["pedra", "cerca_branca", "garagem", "azulejo", "floreira", "mural_sol", "gato", "medidor"],
    ),
]
PECAS = RAIZ / "src/features/corrida/imagens/cidade/muro"

# Medidas da arte original (1404 × 260): o pilar ocupa x 226..293 e o painel cinza vai do topo
# do capitel do painel (y 42) até a base (y 258).
PILAR = (226, 294)
PAINEL_TOPO, PAINEL_BASE = 42, 259
ORIGINAIS = {
    "madeira": (460, 664),
    "cinza": (734, 978),
    "pata": (1047, 1260),
}

# Sequências de quatro painéis, misturando os da arte original com os novos. A ordem importa:
# o índice é o nome do arquivo, e o sorteio da pista depende dele. Trecho novo entra no fim.
TRECHOS = [
    ["madeira", "pata", "cinza", "tijolo"],
    ["grafite", "madeira", "cinza", "correio"],
    ["portao", "tijolo", "cerca_viva", "pata"],
    ["janela", "cinza", "madeira", "grafite"],
    ["cerca_viva", "correio", "portao", "cinza"],
    ["pata", "janela", "tijolo", "madeira"],
    # Segundo lote.
    ["pedra", "cerca_branca", "cinza", "gato"],
    ["garagem", "madeira", "azulejo", "floreira"],
    ["mural_sol", "cinza", "medidor", "pedra"],
    ["azulejo", "pata", "garagem", "cerca_viva"],
    ["floreira", "tijolo", "gato", "madeira"],
    ["cerca_branca", "grafite", "pedra", "cinza"],
    ["medidor", "portao", "mural_sol", "tijolo"],
    ["gato", "cinza", "cerca_branca", "janela"],
    ["madeira", "floreira", "correio", "garagem"],
    ["pedra", "azulejo", "madeira", "pata"],
    ["cinza", "mural_sol", "cerca_viva", "medidor"],
    ["tijolo", "garagem", "gato", "azulejo"],
    ["janela", "pedra", "floreira", "cerca_branca"],
    ["portao", "medidor", "cinza", "grafite"],
    ["correio", "cerca_branca", "mural_sol", "madeira"],
]


def paineis_novos(folha_caminho: Path, nomes: list[str], altura_painel: int) -> dict[str, tuple[Image.Image, int]]:
    folha = Image.open(folha_caminho).convert("RGBA")
    alfa = np.asarray(folha)[..., 3] > 128
    colunas = np.where(alfa.any(axis=0))[0]
    blocos, inicio, anterior = [], colunas[0], colunas[0]
    for x in colunas[1:]:
        if x > anterior + 3:
            blocos.append((inicio, anterior + 1))
            inicio = x
        anterior = x
    blocos.append((inicio, anterior + 1))
    assert len(blocos) == len(nomes), f"{folha_caminho.name}: esperava {len(nomes)} painéis, achei {len(blocos)}"
    # A base comum de todos (y mais baixo) vira a base do painel; a altura sai da maioria.
    linhas = [np.where(alfa[:, a:b].any(axis=1))[0] for a, b in blocos]
    base = max(l.max() for l in linhas) + 1
    topo_comum = int(np.median([l.min() for l in linhas]))
    escala = altura_painel / (base - topo_comum)
    saida = {}
    for nome, (a, b), linha in zip(nomes, blocos, linhas):
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
    for folha, nomes in FOLHAS:
        paineis.update(paineis_novos(folha, nomes, PAINEL_BASE - PAINEL_TOPO))
    usados = {p for t in TRECHOS for p in t}
    assert usados <= paineis.keys(), f"painel sem arte: {usados - paineis.keys()}"
    for t in TRECHOS:
        assert all(a != b for a, b in zip(t, t[1:])), f"painel repetido lado a lado em {t}"

    # Peças soltas, todas com a altura da arte original (o painel novo vai na altura do capitel):
    # o jogo monta cada trecho na hora, pilar + painel, e nada se repete em arquivo.
    PECAS.mkdir(parents=True, exist_ok=True)
    for velho in PECAS.glob("*.webp"):
        velho.unlink()
    pilar.save(PECAS / "pilar.webp", "WEBP", quality=88, method=6)
    for nome in sorted(usados):
        img, sobra = paineis[nome]
        peca = Image.new("RGBA", (img.width, altura), (0, 0, 0, 0))
        peca.alpha_composite(img, (0, 0 if nome in ORIGINAIS else PAINEL_TOPO - sobra))
        peca.save(PECAS / f"{nome}.webp", "WEBP", quality=88, method=6)
    (PECAS / "trechos.json").write_text(json.dumps({"trechos": TRECHOS}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    total = sum(f.stat().st_size for f in PECAS.glob("*.webp"))
    print(f"{len(usados) + 1} peças ({total // 1024} KB), {len(TRECHOS)} trechos em {PECAS.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()
