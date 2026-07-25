# BuildBoard

A visual app builder — design screens, arrange components on a canvas, wire up data
sources, and generate code. Built with React + Vite + TypeScript, Tailwind, and zustand.
It runs entirely in the browser (state persists to `localStorage`), so there is no backend.

**Live app:** https://rvren.github.io/buildboard/

## Development

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # type-check and build to dist/
npm run preview  # preview the production build locally
```

## Deployment

Pushing to `main` triggers the GitHub Actions workflow in
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), which builds the app and
publishes `dist/` to GitHub Pages. No manual steps once it's set up.
