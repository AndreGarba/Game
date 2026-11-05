# Prompt — folha de sprites do cachorro correndo

Usado no ChatGPT (geração de imagem) com `cachorro-andando.webp` anexada como referência.
A folha gerada passa por `scripts/sprites/recortar-corrida.py`.

**Mínimo de 10 quadros por ciclo.** Com 8, o galope pula de pose em pose na velocidade do jogo; o
script recusa folha com menos de 10. Na primeira geração saíram 8 e foi preciso pedir de novo
(segunda mensagem abaixo).

---

Use the attached image as the character reference. Keep this exact dog: a small Shih Tzu with
long, fluffy cream/ivory fur, a big round head with long drooping ears, dark round eyes, a short
muzzle with a slightly greyish beard, a black nose, a pink tongue sticking out, a curled plume tail
over the back, and a black harness with a small red pattern around the chest and over the
shoulders. Same painterly, soft-shaded illustration style, same colors, same proportions.

Create a **sprite sheet of a full RUN CYCLE (gallop)** for a 2D side-scrolling endless runner game.

- **10 frames**, in **one single horizontal row**, left to right, in animation order. The last
  frame must loop back smoothly into the first.
- Strict **side view (profile), facing RIGHT**, the same camera angle in every frame.
- The dog is running fast and happy, escaping a bath: energetic, ears and fur flowing backwards
  with the speed, tail bouncing.
- Gallop phases, evenly spaced in time across one full stride:
  1. front legs reaching far forward, back legs stretched behind;
  2. front paws about to touch the ground;
  3. front paws on the ground, body starting to compress;
  4. front legs under the chest, back legs swinging forward;
  5. gathered pose: all four legs bunched under the body;
  6. back paws touching the ground ahead of the hips;
  7. back legs pushing off, front legs lifting;
  8. body extending, front legs reaching;
  9. extended flight: body stretched, all paws off the ground;
  10. front legs reaching forward, leading back into frame 1.
- **Same size and scale** for the dog in every frame; the head stays at about the same height
  (small natural bounce only).
- Every frame in an **equal-width cell**, the dog centered in its cell, with clear empty space
  between dogs (they must never touch or overlap).
- All paws that touch the ground sit on **the same baseline** across frames.
- **Transparent background** (PNG with alpha). If transparency is not possible: a perfectly flat,
  solid #00FF00 background, no gradient, no vignette.
- **No ground, no cast shadow, no text, no labels, no frame numbers, no borders.**
- The harness must look **identical in every frame** (same width, same pattern).
- High resolution, wide image (about 4096 × 512).
