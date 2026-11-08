"""Prepara as peças do muro da cidade: painéis (os "muros") e conexões (os pilares entre eles).

uso: python scripts/arte/montar_muro.py

Regra de montagem (aplicada pelo jogo, ao vivo, em desenharCena.ts):
  - um mesmo painel se repete lado a lado, sem conexão no meio, de 3 a 10 vezes;
  - quando o painel muda, entra uma conexão sorteada entre as 11;
  - o painel seguinte nunca é igual ao anterior.
Toda junção de painéis diferentes é painel | conexão | painel, e toda conexão tem a mesma base e a
mesma altura de corpo: por isso qualquer ordem emenda sem costura.

Entradas:
  src/features/corrida/imagens/cidade/muro.webp   arte original (pilar + painéis madeira, cinza, pata)
  PRD/referencias/muro-paineis.png                6 painéis, gerados no ChatGPT
  PRD/referencias/muro-paineis-2.png              8 painéis, segundo lote
  PRD/referencias/muro-conexoes.png               10 conexões novas
Saídas (em src/features/corrida/imagens/cidade/muro/):
  painel-<nome>.webp, conexao-<nome>.webp   todas no MESMO canvas de altura, base no rodapé
  muro.json                                 listas de painéis e conexões e a faixa de repetição
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image

RAIZ = Path(__file__).resolve().parents[2]
ORIGINAL = RAIZ / "src/features/corrida/imagens/cidade/muro.webp"
FOLHAS_PAINEIS = [
    (RAIZ / "PRD/referencias/muro-paineis.png", ["tijolo", "grafite", "portao", "cerca_viva", "janela", "correio"]),
    (
        RAIZ / "PRD/referencias/muro-paineis-2.png",
        ["pedra", "cerca_branca", "garagem", "azulejo", "floreira", "mural_sol", "gato", "medidor"],
    ),
]
FOLHA_CONEXOES = RAIZ / "PRD/referencias/muro-conexoes.png"
NOMES_CONEXOES = [
    "tijolo", "pedra", "luminaria", "madeira", "ferro", "vaso", "azulejo", "interfone", "hera", "bola",
]
SAIDA = RAIZ / "src/features/corrida/imagens/cidade/muro"
REPETICAO = {"min": 3, "max": 10}

# Medidas da arte original (1404 × 260): o pilar ocupa x 226..293 (corpo do topo do capitel, y 1,
# até a base, y 258) e o painel cinza vai do capitel do painel (y 42) até a base.
PILAR = (226, 294)
PILAR_TOPO, BASE = 1, 259
PAINEL_TOPO = 42
ORIGINAIS = {"madeira": (460, 664), "cinza": (734, 978), "pata": (1047, 1260)}


def blocos(opaco: np.ndarray) -> list[tuple[int, int]]:
    colunas = np.where(opaco.any(axis=0))[0]
    lista, inicio, anterior = [], colunas[0], colunas[0]
    for x in colunas[1:]:
        if x > anterior + 3:
            lista.append((inicio, anterior + 1))
            inicio = x
        anterior = x
    lista.append((inicio, anterior + 1))
    return lista


def recortar(caminho: Path, nomes: list[str], altura_corpo: int, corpo_por_largura: bool):
    """Recorta cada peça da folha e escala para o corpo ter `altura_corpo` px.

    O corpo vai da base comum até o topo "cheio" da peça: nos painéis, o topo comum da maioria
    (a cerca viva passa por cima); nas conexões, a primeira linha em que a peça já tem quase a
    largura toda (o capitel), para que lâmpada, vaso e bola fiquem como enfeite acima.
    Devolve {nome: (imagem, px acima do topo do corpo)}.
    """
    folha = Image.open(caminho).convert("RGBA")
    opaco = np.asarray(folha)[..., 3] > 128
    pedacos = blocos(opaco)
    assert len(pedacos) == len(nomes), f"{caminho.name}: esperava {len(nomes)} peças, achei {len(pedacos)}"
    base = max(np.where(opaco[:, a:b].any(axis=1))[0].max() for a, b in pedacos) + 1
    topos_corpo = []
    for a, b in pedacos:
        sub = opaco[:, a:b]
        if corpo_por_largura:
            larguras = sub.sum(axis=1)
            topos_corpo.append(int(np.where(larguras > 0.8 * larguras.max())[0].min()))
        else:
            topos_corpo.append(int(np.where(sub.any(axis=1))[0].min()))
    corpo = base - int(np.median(topos_corpo))
    escala = altura_corpo / corpo
    saida = {}
    for nome, (a, b) in zip(nomes, pedacos):
        topo = int(np.where(opaco[:, a:b].any(axis=1))[0].min())
        pedaco = folha.crop((a, topo, b, base))
        tamanho = (round(pedaco.width * escala), round(pedaco.height * escala))
        acima = round((base - corpo - topo) * escala)
        saida[nome] = (pedaco.resize(tamanho, Image.LANCZOS), max(0, acima))
    return saida


def main():
    original = Image.open(ORIGINAL).convert("RGBA")

    conexoes = {"pilar": (original.crop((PILAR[0], PILAR_TOPO, PILAR[1], BASE)), 0)}
    conexoes.update(recortar(FOLHA_CONEXOES, NOMES_CONEXOES, BASE - PILAR_TOPO, corpo_por_largura=True))

    paineis = {nome: (original.crop((a, PAINEL_TOPO, b, BASE)), 0) for nome, (a, b) in ORIGINAIS.items()}
    for folha, nomes in FOLHAS_PAINEIS:
        paineis.update(recortar(folha, nomes, BASE - PAINEL_TOPO, corpo_por_largura=False))

    # Canvas comum: o mais alto dos enfeites acima do capitel do pilar. Toda peça tem a base no
    # rodapé, e o jogo desenha todas com a mesma altura: a escala fica igual entre elas.
    folga = max(acima for _, acima in conexoes.values())
    altura_canvas = folga + (BASE - PILAR_TOPO)

    def salvar(nome: str, img: Image.Image):
        canvas = Image.new("RGBA", (img.width, altura_canvas), (0, 0, 0, 0))
        canvas.alpha_composite(img, (0, altura_canvas - img.height))
        canvas.save(SAIDA / f"{nome}.webp", "WEBP", quality=88, method=6)

    SAIDA.mkdir(parents=True, exist_ok=True)
    for velho in list(SAIDA.glob("*.webp")) + list(SAIDA.glob("*.json")):
        velho.unlink()
    for nome, (img, _) in conexoes.items():
        salvar(f"conexao-{nome}", img)
    for nome, (img, _) in paineis.items():
        salvar(f"painel-{nome}", img)

    dados = {
        "paineis": sorted(paineis),
        "conexoes": sorted(conexoes),
        "repeticao": REPETICAO,
        # Onde fica a base do muro no canvas (fração da altura): o jogo põe isso na linha do piso.
        "alturaCanvas": altura_canvas,
        "alturaPilar": BASE - PILAR_TOPO,
    }
    (SAIDA / "muro.json").write_text(json.dumps(dados, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    total = sum(f.stat().st_size for f in SAIDA.glob("*.webp"))
    print(f"{len(paineis)} painéis, {len(conexoes)} conexões ({total // 1024} KB), canvas {altura_canvas} px")


if __name__ == "__main__":
    main()
