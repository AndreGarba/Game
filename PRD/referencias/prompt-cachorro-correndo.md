# Prompt — folha de sprites do cachorro correndo

Usado no ChatGPT (geração de imagem) com `cachorro-andando.webp` anexada como referência.
A folha gerada passa por `scripts/sprites/recortar-cachorro.py`.

---

Use the attached image as the character reference. Keep this exact dog: a small Shih Tzu with
long, fluffy cream/ivory fur, a big round head with long drooping ears, dark round eyes, a short
muzzle with a slightly greyish beard, a black nose, a pink tongue sticking out, a curled plume tail
over the back, and a black harness with a small red pattern around the chest and over the
shoulders. Same painterly, soft-shaded illustration style, same colors, same proportions.

Create a **sprite sheet of a full RUN CYCLE (gallop)** for a 2D side-scrolling endless runner game.

- **8 frames**, in **one single horizontal row**, left to right, in animation order. The last
  frame must loop back smoothly into the first.
- Strict **side view (profile), facing RIGHT**, the same camera angle in every frame.
- The dog is running fast and happy, escaping a bath: energetic, ears and fur flowing backwards
  with the speed, tail bouncing.
- Gallop phases, in this order:
  1. front legs reaching far forward, back legs pushing behind (stretched);
  2. front paws touching the ground, body starting to compress;
  3. front legs under the chest, back legs swinging forward;
  4. gathered pose: all four legs bunched under the body, back arched slightly;
  5. back paws touching the ground ahead of the hips;
  6. back legs pushing off, front legs lifting;
  7. extended flight: body stretched, all paws off the ground;
  8. front legs reaching forward again (slightly different from frame 1, so the loop is smooth).
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
