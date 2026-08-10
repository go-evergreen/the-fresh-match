# The Fresh Match

A Ringana product-match quiz for **The Fresh Grove** — skincare, personal care, and supplements matched from your answers, with product copy and links from [ringana.com](https://www.ringana.com).

Built in the Fresh Grove pine + brass aesthetic. An exclusive team resource — share it with people you serve, and keep it within the circle.

## Develop

```bash
npm install
npm run dev
```

## Deploy to GitHub Pages

Push to `main` — GitHub Actions builds and deploys automatically. The Vite `base` is set to `./` so asset paths work for project sites.

Live: [https://go-evergreen.github.io/the-fresh-match/](https://go-evergreen.github.io/the-fresh-match/)

## Notes

- Product links open `https://www.ringana.com/produkt/{slug}/?lang=en` only.
- Product PNGs live in `public/products/` (sourced from the labeled Ringana product library).
- Educational tool from independent Fresh Partners — not an official Ringana site.
