# Harsh Purohit portfolio: working rules for Claude Code

Read `HANDOFF.md` before making changes. It has the full spec, all copy, the geometry and the client's feedback history.

## Commands
- Build: `python3 src/build.py` (generates `dist/`; never hand-edit `dist/`)
- Preview: `cd dist && python3 -m http.server 8000`
- Tests (run all three after every visual or layout change):
  - `node tests/layout-sweep.js`
  - `node tests/sharp-corners.js`
  - `node tests/edge-cases.js`
- Rebuild assets from the original design PDF: `python3 tools/extract_from_pdf.py Harsh_Portfolio.pdf`

## Where things live
- Copy, roles, links and contact details: `src/films.json`
- Markup and scene layout (PDF coordinates): `src/build.py`
- Styles and tokens: `src/style.css`
- Scroll engine, maze lines, navigation, hover card and lightbox: `src/app.js`

## Non-negotiables (client decisions)
- Stay on the PDF: Barriecito plus League Gothic; navy `#0b174d`, pale `#d5e0d8`, ink `#e7edf1`, orange `#b83d00`.
- Elements are absolutely positioned on a 1600×900 canvas (900×1600 on phones). Do not convert scenes to flow layout.
- "Scrappy, not messy": playful motion that always settles into exact alignment.
- Scrollytelling on the cover, intro and BTS only. Film pages scroll normally and animate once.
- No "FRAME 01" hover tags. No circle cursor: the cursor is a black arrow.
- Lines run continuously through the left and right spines, with 22-unit rounded joins and no sharp corners.
- Grain only on backgrounds, never on stills, type or lines.
- Stills stay large in the full-width grid. The lightbox shows uncropped frames.
- Check phone screenshots (`tests/out/`) every time: most past bugs were phone-only.
