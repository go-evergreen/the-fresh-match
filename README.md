# The Fresh Match

A Ringana product-match quiz for Taylor's network — skincare, personal care, and supplements matched from your answers, with product copy and links from [ringana.com](https://www.ringana.com).

Built to match the **Ringana with Taylor** (tay-goes-fresh) pine + brass aesthetic.

## Develop

```bash
npm install
npm run dev
```

## Deploy to GitHub Pages

```bash
npm run build
```

Push the `dist/` folder to your GitHub Pages branch (or use Actions). The Vite `base` is set to `./` so asset paths work for project sites.

Suggested repo name: `the-fresh-match` → `https://tayrourke.github.io/the-fresh-match/`

## Notes

- Product links open `https://www.ringana.com/produkt/{slug}/?lang=en` only.
- Product PNGs live in `public/products/` (sourced from the labeled Ringana product library).
- Educational tool from an independent Fresh Partner — not an official Ringana site.
