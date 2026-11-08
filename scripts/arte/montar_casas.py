"""Recorta as casas da folha gerada no ChatGPT para a camada de casas da cidade.

uso: python scripts/arte/montar_casas.py

Entrada:
  PRD/referencias/casas-predios.png   5 casas e 5 prédios pequenos, lado a lado, fundo transparente
Saídas (em src/features/corrida/imagens/cidade/casas/):
  casa-<n>.webp                        uma casa por arquivo (os prédios da folha não entram)
  trechos.json                         a lista que a camada sorteia (inclui a tira original)

Todas as construções saem no MESMO canvas de altura, com a base no rodapé: a camada desenha cada
uma com a altura dela, então a escala entre casa e prédio fica a da folha (a porta tem o mesmo
tamanho em todas). Uma folga transparente dos lados separa uma construção da outra na rua.
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image

RAIZ = Path(__file__).resolve().parents[2]
FOLHA = RAIZ / "PRD/referencias/casas-predios.png"
SAIDA = RAIZ / "src/features/corrida/imagens/cidade/casas"

NOMES = [f"casa-{i}" for i in range(1, 6)] + [f"predio-{i}" for i in range(1, 6)]
# Os prédios saíram do jogo a pedido do André: ficam na folha (a contagem depende deles para achar
# os cortes), mas só as casas viram arquivo.
EXPORTAR = [n for n in NOMES if n.startswith("casa-")]
# Duas casas da folha encostam uma na outra: corte no vale de pixels entre elas.
CORTES_EXTRAS = [227, 675]
FOLGA = 36
# A tira original da camada também entra no sorteio (tem as árvores entre as casas).
ORIGINAL = "original"


def blocos(opaco: np.ndarray) -> list[tuple[int, int]]:
    colunas = np.where(opaco.any(axis=0))[0]
    lista, inicio, anterior = [], colunas[0], colunas[0]
    for x in colunas[1:]:
        if x > anterior + 1:
            lista.append((inicio, anterior + 1))
            inicio = x
        anterior = x
    lista.append((inicio, anterior + 1))
    for corte in CORTES_EXTRAS:
        lista = [p for a, b in lista for p in ([(a, corte), (corte, b)] if a < corte < b else [(a, b)])]
    return sorted(lista)


def main():
    folha = Image.open(FOLHA).convert("RGBA")
    opaco = np.asarray(folha)[..., 3] > 40
    pedacos = blocos(opaco)
    assert len(pedacos) == len(NOMES), f"esperava {len(NOMES)} construções, achei {len(pedacos)}"
    base = max(np.where(opaco[:, a:b].any(axis=1))[0].max() for a, b in pedacos) + 1
    topo = min(np.where(opaco[:, a:b].any(axis=1))[0].min() for a, b in pedacos)
    altura = base - topo

    SAIDA.mkdir(parents=True, exist_ok=True)
    for velho in SAIDA.glob("*.webp"):
        velho.unlink()
    for nome, (a, b) in zip(NOMES, pedacos):
        if nome not in EXPORTAR:
            continue
        recorte = folha.crop((a, topo, b, base))
        # Só o que é desta construção: o corte extra pode trazer pontas da vizinha. Coluna da borda
        # com quase nada opaco é resto da outra casa.
        alfa = np.asarray(recorte)[..., 3].copy()
        cheias = (alfa > 40).sum(axis=0)
        for x in list(range(0, 12)) + list(range(alfa.shape[1] - 12, alfa.shape[1])):
            if cheias[x] <= 4:
                alfa[:, x] = 0
        recorte.putalpha(Image.fromarray(alfa))
        canvas = Image.new("RGBA", (recorte.width + 2 * FOLGA, altura), (0, 0, 0, 0))
        canvas.alpha_composite(recorte, (FOLGA, 0))
        canvas.save(SAIDA / f"{nome}.webp", "WEBP", quality=88, method=6)
    trechos = [[nome] for nome in EXPORTAR] + [[ORIGINAL]]
    (SAIDA / "trechos.json").write_text(
        json.dumps({"trechos": trechos}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
    )
    total = sum(f.stat().st_size for f in SAIDA.glob("*.webp"))
    print(f"{len(EXPORTAR)} casas ({total // 1024} KB), altura {altura} px")


if __name__ == "__main__":
    main()
