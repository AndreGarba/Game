<!-- figma-ai-spec: v1.1.1 · platform: React + Vite · frames: 1 · tokens: 6 -->

# Carreira - Conqusitas

**Plataforma:** React + Vite  
**Plugin:** Figma to Design.md v1.1.1  
**Design system:** Fast DS  
**Skills:** `/fast-ds-components` e `/fast-ds-tokens`  
**Figma:** [`The Immortal`](https://www.figma.com/design/41hMpDyOsWyZIKkhMAmRdN/the-immortal?node-id=6881-30074) · página `|  Fluxograma` · node `6881:30074`  
**Complexidade:** 🟡 média (5 componentes DS · 1 frame · 6 tokens)  

## Anatomia

| # | Layer (Figma) | Status DS | Componente DS (Figma) | Variantes | Hint visual |
|---|---|---|---|---|---|
| 1 | `Tag` | — | `Tag` | `Style=Rare, Highlight=False` | — |
| 2 | `Footer` | — | `Footer` | `Type=1 Action` | — |
| 3 | `Button` | — | `Button` | `Type=Primary, Size=Medium, State=Enabled, Icon Only=False, Icon Right=false, Icon Left=false` | — |
| 4 | `Icon Left` | — | `Toggle` | `Name=Star Purple500, Outlined=True` | 🚫 `visible: false` — não presente neste estado |
| 5 | `Icon Right` | — | `AV` | `Name=Play Arrow, Outlined=False` | 🚫 `visible: false` — não presente neste estado |

> Use `/fast-ds-components` para mapear cada `Componente DS` para o componente correto e suas props.  
> As variantes (formato `Prop=Valor`) viram props do componente React.  
> **Hint visual** — comportamento/aparência deste componente neste contexto específico.

---

## Layout (auto-layout → flexbox)

| Camada | Direção | Alinhamento (justify · align) | Gap | Padding | Tamanho (w × h) |
|---|---|---|---|---|---|
| &nbsp;&nbsp;&nbsp;↳ `Card Equipe` | column | space-between · center | 87px | top 32px · right 0px · bottom 0px · left 0px | 360px (fixed) × 500px (fixed) |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;↳ `Frame 1590` | column | flex-start · center | 32px | 0px v · 24px h | 360px (fixed) × auto |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;↳ `Frame 1589` | column | flex-start · center | 12px | 0px (todos) | 312px (fixed) × auto |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;↳ `Frame 1591` | column | flex-start · center | 8px | 0px (todos) | 312px (fixed) × auto |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;↳ `Frame 2` | column | flex-start · flex-start | 12px | 0px (todos) | 328px (fixed) × auto |

> Use `/fast-ds-tokens` para resolver cada token → CSS variable.

### Blueprint visual

> Camadas com decisões de renderização não-óbvias — priorize para fidelidade visual.

| Camada | Dimensões | Decisão de renderização |
|---|---|---|
| `Card Equipe` | 360px (fixed) × 500px (fixed) | Lista/feed — coluna de 500px (considerar scroll) |


### CSS extras

> Propriedades não-óbvias que o gerador de auto-layout não emite automaticamente.

| Camada | Propriedades CSS |
|---|---|
| `Frame 1590` | `align-self: stretch` |
| `Frame 1589` | `align-self: stretch` |
| `Frame 1591` | `align-self: stretch` |


## Tokens

| Token (Figma) | CSS Variable | Valor bruto | Propriedade · Camada |
|---|---|---|---|
| `Grayscale/black` | `--Grayscale/black` | `?` | color · `Button` |
| `Grayscale/gray-200` | `--Grayscale/gray-200` | `?` | color · `Frame 1591` |
| `Grayscale/gray-700` | `--Grayscale/gray-700` | `?` | background · `Card Equipe` |
| `Grayscale/white` | `--Grayscale/white` | `?` | color · `Frame 1591` |
| `Primary/secondary-200` | `--Primary/secondary-200` | `?` | color · `Frame 1589` |
| `Primary/tertiary-200` | `--Primary/tertiary-200` | `?` | color · `Tag` |

> **Nunca hardcodear** os valores brutos — resolver para CSS variable (`var(--token, fallback)`) via `/fast-ds-tokens`.

### CSS Variables — copie para o `<style>`

```css
:root {
  --Grayscale/black: ?;
  --Grayscale/gray-200: ?;
  --Grayscale/gray-700: ?;
  --Grayscale/white: ?;
  --Primary/secondary-200: ?;
  --Primary/tertiary-200: ?;
}
```


---

## Tipografia

| Conteúdo | Text style (DS) | Fonte | Peso | Tamanho | Token tamanho | Line height | Letter-spacing | Token cor |
|---|---|---|---|---|---|---|---|---|
| "Raro" | `Uppercase/Overline/Bold` | Pathway Extreme | Bold | 10px | _—_ | 120.00000476837158% | _—_ | `Primary/tertiary-200` |
| "Conquista desbloqueada" | `Body/Small/Bold` | Pathway Extreme | Bold | 14px | _—_ | 137.99999952316284% | _—_ | `Primary/secondary-200` |
| "Graduado " | `Heading/Medium/Bold` | Pathway Extreme | Bold | 24px | _—_ | 115.99999666213989% | _—_ | `Grayscale/white` |
| "Subiu da F3 para F2" | `Body/Medium/Regular` | Pathway Extreme | Regular | 16px | _—_ | 150% | _—_ | `Grayscale/gray-200` |
| "Continuar" | `Body/Small/Bold` | Pathway Extreme | Bold | 14px | _—_ | 137.99999952316284% | _—_ | `Grayscale/black` |

---

## Implementação

1. Invoque `/fast-ds-components`.
2. Invoque `/fast-ds-tokens`.

### Regras

- TypeScript + React. Props em camelCase, componentes em PascalCase.
- Mantenha a estrutura de auto-layout da seção Layout usando flexbox.
- **Consulte as skills antes de escrever qualquer código.** Elas são a fonte de verdade deste design system — não deduza nomes de componentes, props nem valores de token.
- Nunca recriar componentes do design system com markup nativo — use o componente correspondente, conforme `/fast-ds-components`.
- Nunca hardcodear tokens — resolva cada valor para CSS variable consultando `/fast-ds-tokens`.
- Se algo da Anatomia não existir no design system, **sinalize** em vez de improvisar um componente ou chumbar o valor.
- Acessibilidade: `aria-*`, foco visível, suporte a teclado.

### Acessibilidade

- [ ] Textos visíveis têm contraste mínimo 4.5:1.
- [ ] Elementos interativos têm `aria-label` ou texto visível associado.
- [ ] Navegação por teclado e foco visível funcionam para todas as ações.

---

## Referência do design (HTML extraído)

> HTML extraído do Figma — referência estrutural, **não é código final**.  
> `data-component` → componente DS (ver Anatomia). `var(--token, fallback)` → resolver o token como CSS variable.

<details>
<summary><strong>Carreira - Conqusitas — 360×800px · node `6881:30074`</strong></summary>

```html
<div style="width: 360px; height: 800px; background: var(--Grayscale/gray-700, rgb(15, 19, 27))" data-figma-id="6881:30074" data-figma-name="Carreira - Conqusitas" data-figma-type="FRAME">
  <div style="width: 360px; height: 800px; background: var(--Grayscale/black, rgb(0, 0, 0)); opacity: 0.8999999761581421" data-figma-id="6881:30265" data-figma-name="Overlay" data-figma-type="RECTANGLE"></div>
  <div style="display: flex; flex-direction: column; gap: 87px; padding-top: 32px; padding-right: 0px; padding-bottom: 0px; padding-left: 0px; justify-content: space-between; align-items: center; width: 360px; height: 500px; background: var(--Grayscale/gray-700, rgb(15, 19, 27)); border-radius: 24px 24px 0px 0px" data-figma-id="6881:30266" data-figma-name="Card Equipe" data-figma-type="FRAME">
    <div style="display: flex; flex-direction: column; gap: 32px; padding-top: 0px; padding-right: 24px; padding-bottom: 0px; padding-left: 24px; justify-content: flex-start; align-items: center; width: 360px; height: 330px" data-figma-id="6881:30267" data-figma-name="Frame 1590" data-figma-type="FRAME">
      <div style="display: flex; flex-direction: column; gap: 12px; padding-top: 0px; padding-right: 0px; padding-bottom: 0px; padding-left: 0px; justify-content: flex-start; align-items: center; width: 312px; height: 59px" data-figma-id="6881:30268" data-figma-name="Frame 1589" data-figma-type="FRAME">
        <div style="display: flex; flex-direction: column; gap: 10px; padding-top: 8px; padding-right: 12px; padding-bottom: 8px; padding-left: 12px; justify-content: center; align-items: center; width: 53px; height: 28px; border: 1px solid rgb(67, 164, 255) /* token: Primary/tertiary-200 */; border-radius: 12px" data-component="Tag" data-variant="Style=Rare, Highlight=False" aria-label="Tag: Style=Rare, Highlight=False" data-figma-id="6881:30269" data-figma-name="Tag" data-figma-type="INSTANCE">Raro</div>
        <span style="font-size: 14px; font-family: "Pathway Extreme"; font-style: normal; font-weight: 700; line-height: 137.99999952316284%; letter-spacing: 0px; text-align: left; /* text-style: Body/Small/Bold */; color: var(--Primary/secondary-200, rgb(15, 254, 178))" data-figma-id="6881:30270" data-figma-name="Conquista desbloqueada" data-figma-type="TEXT">Conquista desbloqueada</span>
      </div>
      <div style="width: 141px; height: 147px" data-figma-id="6881:30271" data-figma-name="Group 5" data-figma-type="GROUP">
        <div style="width: 132px; height: 132px; background: var(--Primary/secondary-200, rgb(15, 254, 178))" data-figma-id="6881:30272" data-figma-name="Polygon 2" data-figma-type="POLYGON"></div>
        <div style="width: 132px; height: 132px; background: var(--Primary/primary, rgb(250, 254, 15))" data-figma-id="6881:30273" data-figma-name="Polygon 3" data-figma-type="POLYGON"></div>
        <div style="width: 132px; height: 132px; background: rgb(255, 255, 255)" data-figma-id="6881:30274" data-figma-name="Polygon 1" data-figma-type="POLYGON"></div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px; padding-top: 0px; padding-right: 0px; padding-bottom: 0px; padding-left: 0px; justify-content: flex-start; align-items: center; width: 312px; height: 60px" data-figma-id="6881:30275" data-figma-name="Frame 1591" data-figma-type="FRAME">
        <span style="font-size: 24px; font-family: "Pathway Extreme"; font-style: normal; font-weight: 700; line-height: 115.99999666213989%; letter-spacing: 0px; text-align: left; /* text-style: Heading/Medium/Bold */; color: var(--Grayscale/white, rgb(255, 255, 255))" data-figma-id="6881:30276" data-figma-name="Graduado" data-figma-type="TEXT">Graduado </span>
        <span style="font-size: 16px; font-family: "Pathway Extreme"; font-style: normal; font-weight: 400; line-height: 150%; letter-spacing: 0px; text-align: left; /* text-style: Body/Medium/Regular */; color: var(--Grayscale/gray-200, rgb(121, 133, 159))" data-figma-id="6881:30277" data-figma-name="Subiu da F3 para F2" data-figma-type="TEXT">Subiu da F3 para F2</span>
      </div>
    </div>
    <div style="display: flex; flex-direction: column; gap: 10px; padding-top: 16px; padding-right: 16px; padding-bottom: 16px; padding-left: 16px; justify-content: flex-start; align-items: flex-start; width: 360px; height: 80px; background: var(--Grayscale/gray-700, rgb(15, 19, 27))" data-component="Footer" data-variant="Type=1 Action" aria-label="Footer: Type=1 Action" data-figma-id="6881:30278" data-figma-name="Footer" data-figma-type="INSTANCE">Continuar</div>
  </div>
</div>
```

</details>

---

_Gerado por **Figma to Design.md** v1.1.1 · React + Vite · 2026-09-11 · arquivo `The Immortal` · página `|  Fluxograma`. Preview em base64 e bloco TSX placeholder omitidos nesta cópia versionada — ver o arquivo original anexado no chat para a imagem de preview._