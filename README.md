# Harsh Purohit — Portfolio

Portfolio site for **Harsh Purohit**, a Dubai-based filmmaker (photographer, videographer, director).
A static, scroll-driven site built from the original Canva design: six short films, behind-the-scenes and contact.

## Build and preview

```bash
python3 src/build.py                 # generates dist/ (Python 3.10+, standard library only)
cd dist && python3 -m http.server 8000
```

`dist/` is build output. Edit `src/`, then rebuild.

## Tests

```bash
npm i -D playwright && npx playwright install chromium
npm test
```

## Deploy

Pushing to `main` builds and deploys `dist/` to GitHub Pages (`.github/workflows/pages.yml`).
Enable it once under **Settings → Pages → Source: GitHub Actions**.

See [`HANDOFF.md`](HANDOFF.md) for the full spec and [`CLAUDE.md`](CLAUDE.md) for working rules.
