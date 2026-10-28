# Harsh Purohit portfolio site: complete handoff

This document covers everything needed to continue, maintain, or rebuild the portfolio website for **Harsh Purohit**, a filmmaker based in Dubai, UAE (photographer, videographer, director). It is written for Claude Code or any developer picking the project up cold.

**Read before changing anything:**
- Section 2, *Design intent and the client's feedback history*. It lists every decision the client made, so nothing gets undone by accident.
- Section 14, *Rules that must not regress*.

---

## 0. Quick start

```bash
# build (Python 3.10+ standard library only)
python3 src/build.py            # writes dist/index.html, dist/artifact-fragment.html, copies images/ and fonts/

# view
open dist/index.html            # or: cd dist && python3 -m http.server 8000

# deploy: dist/ is a complete static site. Upload the folder to any static host (Vercel, Netlify, GitHub Pages, S3).

# tests (Node 18+ and Playwright)
npm i -D playwright && npx playwright install chromium
node tests/layout-sweep.js      # 5 viewports: overflow, overlap, spine continuity, links, hover card, lightbox
node tests/sharp-corners.js     # parses every line path and fails on any joint turning more than 12 degrees
node tests/edge-cases.js        # deep links, reduced motion, keyboard focus

# regenerate every PDF-derived asset (pip install pymupdf pillow numpy)
python3 tools/extract_from_pdf.py path/to/Harsh_Portfolio.pdf
```

**Do not edit `dist/` by hand.** Edit `src/` and rebuild. `dist/` is build output.

A live private version is currently hosted as a claude.ai artifact. It uses `dist/artifact-fragment.html`: the same page without `<html>`, `<head>` or `<body>`, because the artifact host wraps the page itself. Plus `images/` and `fonts/`.

---

## 1. Project layout

```
harsh-portfolio/
├── HANDOFF.md                 this file
├── CLAUDE.md                  short working rules for Claude Code (points here)
├── src/
│   ├── build.py               generates the whole page (HTML + inlined CSS + inlined JS)
│   ├── style.css              all styles; __ARROW__ is replaced by the cursor SVG at build time
│   ├── app.js                 scroll engine, maze lines, navigation, hover card, lightbox, routing
│   │                          (__FILMS__ is replaced by film metadata JSON at build time)
│   ├── films.json             ALL film copy: role, logline, approach, link, button label + contact details
│   ├── geo.json               exact geometry extracted from the PDF (lines, text boxes, still crops)
│   ├── images/                36 stills, 4 portrait layers, scribble, grain tile
│   └── fonts/                 self-hosted woff2 fallbacks for both typefaces
├── dist/                      build output (deployable)
├── tools/extract_from_pdf.py  regenerates geo.json + all images from the original Canva PDF
├── tests/                     Playwright checks (see section 13)
└── reference/
    ├── pdf-pages/             the 8 pages of Harsh's design PDF, rendered (the visual source of truth)
    ├── screenshots/           the current site at wide, laptop, tablet and phone sizes
    └── Harsh_Portfolio-content.pdf   Harsh's copy document (contact, roles, loglines, approaches, film links)
```

The original design PDF (`Harsh_Portfolio.pdf`, a Canva export of 8 pages at 2880 × 1620 pt, about 92 MB) is **not included** because of its size. `reference/pdf-pages/` holds renders of it. You only need the PDF itself to run `tools/extract_from_pdf.py`.

---

## 2. Design intent and the client's feedback history

### Original brief
- Show Harsh's personality and work to people who don't know him.
- Make it feel **engaging, not static**: "fluid and frenetic, not clean or polished".
- Use an **editorial and scrapbook aesthetic** that is postmodernist and loose. Nothing about his work is "clean", and the site should feel like talking to him.
- Motion is a core requirement. Ideas discussed: cursor-following elements, scroll-triggered reveals (hover a photo and a film blurb appears), and hover motion on images.
- **"Stick to the design and typeface of the PDF as much as possible."**

### Feedback received, in order. Every item is implemented, so do not undo any of it.
1. "Use scrollytelling. Look at the alignment of stuff, it's so off. Keep close to the PDF but movement can be creative. This is not a standard website. There should be a navigation panel and a page for BTS. **We are going for scrappy, not messy.**"
   - **Result:** every layout is placed on the PDF's exact coordinates, verified by overlaying renders on the PDF pages. Added the left rail, the index panel and a BTS section.
2. "Not every element should have scrollytelling. BTS scrollytelling is nice but keep it in the main roster. Remove the 'FRAME 1, FRAME 2' thing when I hover over the stills. Have a hyperlink at the bottom to see the film."
   - **Result:** only the cover, intro and BTS sections are scroll-pinned. Film pages scroll normally and animate once on arrival. BTS is a section in the main flow. The frame tags are removed. Each film has a "Watch the film" link.
3. Harsh supplied a content PDF and asked: "Add the approach below the stills for every film. Make the stills bigger. Make the lines in the background continuous like a maze. Add mild cursor-motivated movement, and don't make the cursor a circle, make it a black pointer."
   - **Result:** a notes band under each grid (approach, role, link). A full-width 3 × 2 grid scaled to the screen width. A two-spine maze line system that runs unbroken down the whole page. Mouse drift on the stills, title and scribble. A black arrow cursor.
4. "No sharp edges on the line."
   - **Result:** every join and corner uses the PDF's 22-unit corner radius. `tests/sharp-corners.js` enforces this.
5. "Remove the grain on the stills and put it only on the background."
   - **Result:** grain lives in the background layers only (scene grounds, the navy diagonal, the rail and the panel). Stills, type and lines are clean.

---

## 3. Visual system

### Colour tokens (`src/style.css`, `:root`)
| Token | Value | Use |
|---|---|---|
| `--navy` | `#0b174d` | Main ground (cover, contact, rail, panel, the diagonal band on film pages), navy lines, text on pale |
| `--pale` | `#d5e0d8` | Pale ground (intro, film pages below the diagonal, BTS), pale lines on navy |
| `--ink` | `#e7edf1` | Light text on navy (the PDF's text colour) |
| `--line` | `#cfd3cc` | Line colour on the cover and contact (the PDF's `#d3d0cb`), secondary labels on navy |
| `--orange` | `#b83d00` | The PDF's intro body text colour: intro body, role text, logline in the hover card, active index item, focus ring |
| `--paper` | `#eef1ec` | Polaroid card stock (BTS) |
| `--tape` | `rgba(232,221,186,.78)` | Masking tape on the polaroids |

The raw PDF colours were navy `#000950`, pale `#e7edf1`, cover line `#d3d0cb` and orange `#b83d00`, with a green paper texture multiplied over every page. The site tokens are the colours as they *render* in the PDF with that texture applied, so the site matches what Harsh sees.

The scribble on the intro is recoloured to `rgb(232,88,70)`.

The site is a **single committed dark look**: `color-scheme: dark`, and there is no light/dark switch by design.

### Typography
| Role | Typeface | Source | Where |
|---|---|---|---|
| Display | **Barriecito** 400 | Google Fonts + `fonts/barriecito-latin-400-normal.woff2` as `'Barriecito Local'` | Name, scene titles, "INTRODUCTION", "LET'S TALK", index titles, notes headings, polaroid captions, hover card title |
| Body / labels | **League Gothic** 400 | Google Fonts + `fonts/league-gothic-latin-400-normal.woff2` as `'League Gothic Local'` | Tagline, intro body, approach, role, buttons, rail, timecode, every uppercase label |

Both are the exact fonts embedded in Harsh's PDF (`Barriecito-Regular`, `LeagueGothic-Regular`). Font stacks: `--f-disp: 'Barriecito','Barriecito Local','Comic Sans MS',cursive` and `--f-body: 'League Gothic','League Gothic Local',Impact,'Arial Narrow',sans-serif`. Body letter-spacing is `.02em`, and labels use `.06–.12em`.

### Lines (the "maze")
- Stroke width is `4.17` canvas units: the PDF's 7.5 pt scaled to 1600 wide. On phones it's `4.5`. Caps and joins are round.
- **Corner radius: 22 canvas units everywhere** (the PDF's radius). No sharp joints are allowed.
- Line colour follows the ground: pale lines on navy, navy lines on pale. On film and BTS pages every line is drawn twice. A pale copy is clipped to the navy diagonal, and a navy copy is clipped to the pale area. So a line changes colour exactly where it crosses the diagonal and never disappears.
- See section 7 for the continuous spine system.

### Grain
- `images/grain-soft.jpg` is a 1000 × 667 greyscale tile taken from the PDF's paper texture, pre-softened toward mid-grey (`128 + (g − 128) × 0.32`). That lets it blend at full strength with `background-blend-mode: overlay`.
- It is applied to `.stage`, `.rail` and `.panel` as `background-image` at `720px auto`, with `background-blend-mode: overlay`.
- On film and BTS pages, the navy diagonal (an SVG) carries the same tile as an SVG `<pattern>` fill, 720 × 480, blended with `mix-blend-mode: overlay`.
- **Never** lay grain over the whole page again. The client explicitly removed it from the stills.

### Cursor
- On fine pointers, the cursor is a black arrow with a white outline: an SVG data URI built in `build.py` (`ARROW`), hotspot `3 2`. It applies to `.hp`, and to every `a` and `button` inside it.
- There is no custom circle cursor. The client rejected it.

---

## 4. Architecture: the canvas-and-stage model

Each section of the site (a **scene**) is a `<section class="scene">` containing:
- a `.stage`, which is the visible window, with the scene's background colour and grain;
- a `.cv` (canvas) inside it, a fixed-size coordinate space positioned and scaled with a CSS transform.

| Mode | Canvas size | When |
|---|---|---|
| Desktop | **1600 × 900** units (the PDF page at 1600 wide) | Viewport aspect ≥ 1.05 **and** width ≥ 700 px |
| Phone/portrait (`.pm` class on `#hp`) | **900 × 1600** units | Viewport aspect < 1.05 **or** width < 700 px (`layout()` in app.js) |

Every element inside the canvas is absolutely positioned with CSS variables on its inline style:
- `--x/--y/--w/--h` for desktop.
- `--X/--Y/--W/--H` (capitals) for phone.
- Font sizes use `--fs` on desktop and `--FS` on phone.

Most element types have both variants. Elements that exist in only one mode carry the class `dk` (desktop only) or `mb` (phone only).

**Scaling** (set in `layout()`):
- **Pinned scenes** (cover, intro, BTS) and contact use "contain" scaling. `k = min(W/cw, H/ch)`, centred, and letterbox bars take the stage background.
- **Film scenes** use width scaling. `k = W/1600` on desktop, capped at 1.25, or `W/900` on phone, with the top aligned. The stage height is set to the canvas content height × k. The content height is measured from the bottom of `.notes` plus 90 (desktop) or 110 (phone).
- `W` = viewport width minus the 76 px rail on desktop (the full width on phone). `H` = viewport height on desktop, or viewport height minus the 56 px top bar on phone.

This model is what keeps the alignment exact. **Do not convert scenes to flexbox or grid flow.** Positions are deliberate PDF coordinates.

---

## 5. Page structure and scene-by-scene specification

DOM order in `<main>`: `cover → about (intro) → jahaan → sugar → roots → guest-room → till-death → cuban → bts → contact`. The section ids double as hash routes.

### 5.1 Cover (`#cover`) is pinned, 1.7 viewports tall, on a navy ground. It matches PDF page 1.
- **Lines:** the two parallel PDF strokes, in `--line` colour. They draw in on load (0 → 0.75 of the intro timeline, staggered by 0.1).
- **Name**, positioned at the PDF text boxes:
  - "HARSH" at (507.6, 33.1), size 348.1.
  - "PUROHIT" at (547.2, 387.8), size 277.
  - Both Barriecito, `--ink`, line-height 1.2.
  - Each letter is its own span (`.lt`) so it can animate.
  - The `<h1>` has `aria-label="Harsh Purohit"`, and the letter spans are `aria-hidden`.
- **Tagline:** "PHOTOGRAPHER, VIDEOGRAPHER, DIRECTOR" in League Gothic 38.9 at (1061.4, 766.7).
- **Echo portrait:** four colour layers stacked back to front, each 676.9 × 1014.7 at y = 33.8.
  - `portrait-violet` at x −61.2, `portrait-purple` at −19.4, `portrait-red` at 42.1, `portrait-orange` at 90.5.
  - All four are clipped to x < 767.5 (`.portrait` container).
  - In CSS all layers sit at 90.5. JS translates each by its `data-o` offset (x − 90.5) to fan them out.
  - Only the orange layer has alt text ("Portrait of Harsh Purohit").
- **Phone layout:**
  - HARSH at (56, 70), size 268. PUROHIT at (56, 345), size 220. Tagline at (60, 630), size 44.
  - The name sits inside a framed rectangle from (30, 96) to (870, 698).
  - The portrait container starts at y 720. Layers are at left 250, 667 × 1000, with the fan scaled × 0.9.
- **Motion:**
  - On load there is a 1.9 s timed intro, not tied to scroll:
    - HARSH letters drop from −260 px with ±12–14° rotation and a slight overshoot (easeBack 1.25). Start times are 0.06 + i × 0.05, each lasting 0.32 of the timeline.
    - PUROHIT letters start at 0.22 + i × 0.05.
    - The portrait layers fan out from stacked (q 0.1 → 0.7).
    - The tagline wipes in (0.55 → 0.85).
  - On scroll (p 0 → 1): the echo spreads to 1 + 1.3p times its normal width, layers drift vertically by p × (3 − i) × 14, HARSH slides −40p and PUROHIT +28p (both × 0.35 on phone).
  - The mouse adds (i − 3) × 10 px horizontal and (3 − i) × 5 px vertical parallax per layer.

### 5.2 Introduction (`#about`) is pinned, 2.1 viewports tall, on a pale ground. It matches PDF page 2.
- **Lines:** the two navy PDF strokes. They draw in on scroll (0 → 0.5, staggered by 0.08).
- **Scribble:** `images/scribble.png` at (78.1, −1.1), 887.2 × 845.8. It wipes in left to right on scroll (0.1 → 0.55) and drifts with the mouse (10 px horizontal, 6 px vertical).
- **Title:** "INTRODUCTION" in Barriecito 198.5, navy, at (216.4, 89.9). It drops in at 0.08 → 0.3.
- **Body:** four lines placed exactly as in the PDF, in League Gothic 41.2, `--orange`, at x 629.5, width 880.5, at y 416.3 / 473.6 / 530.9 / 588.3. Each line is justified to the full width (`text-align-last: justify`, nowrap). Each wipes in at 0.42 + i × 0.07 → 0.58 + i × 0.07.
- **Copy** (the PDF typo "recieved" is corrected to "received"):
  > I am a filmmaker based in Dubai, UAE. I have directed, written, and been involved with multiple short films, documentaries, advertisements, and music videos that have received awards and recognition across the Gulf. I have also been involved with projects that have screened in countries all over the world.
- **Phone:** title at (74, 140), size 128, inside a frame from (44, 96) to (856, 338). The scribble is at (140, 362), 620 × 591, above the text so it never crosses it. The body is one justified paragraph at left 72, top 1010, width 756, size 48, line-height 1.28.

### 5.3 Film scenes (×6) scroll normally, are pale with a navy diagonal, and play once.
Ids: `jahaan`, `sugar`, `roots`, `guest-room`, `till-death`, `cuban`. Each section's height is its own content height, not pinned.
- **Diagonal band:**
  - Desktop: the PDF's band, extended. Navy covers the upper-left half-plane above the line from (1632.1, −17.8) to (−90.9, 943.8). The path is `D_BAND` in build.py.
  - Phone: navy is above the line from (1000, 200) to (−100, 1180), `M_BAND`. It was raised so it never reaches the notes text.
  - Grain is blended into the band (see section 3).
- **Title:** the PDF title text, positioned by the *centre* of each PDF line box with `translate: −50% 0`. Centring removes the few-pixel drift between the PDF's and the browser's Barriecito metrics.
  - Sizes: Jahaan 104.3, Sugar 62.8 (two lines), Roots 94.4, Guest Room 68, Till Death 52.2, Cuban 52.3 (two lines).
  - On phones the title is centred in a frame from (60, 90) to (840, 330), at min(PDF size, 78).
- **Lines:** the PDF's title frame, bracket and the navy route on the right, plus the maze joins (section 7). They draw in over 0 → 0.7 of the one-shot timeline.
- **Stills grid** (enlarged at the client's request; all stills share one crop ratio of 1.6):
  - Desktop: 3 columns × 2 rows, x from 50, y from 290, each 486 × 304, gap 21. The grid bottom is at 919.
  - Phone: 2 columns × 3 rows, x from 36, y from 380, each 405 × 253, gap 18.
  - `object-fit: cover`, so a little is trimmed from the wider and taller frames. The lightbox shows the full frame.
  - Order is the PDF's reading order: top row left to right, then the bottom row. See the table in section 8.
- **Notes band** under the grid:
  - Desktop: at (50, 991), width 1500. A flex row with a gap of 80: the **APPROACH** column (max 900 wide), then a 440-wide **ROLE** column with the role text and the watch button.
  - Phone: at (36, 1251), width 828, stacked.
  - Headings: Barriecito 44 (58 on phone), navy.
  - Approach paragraph: League Gothic 34 / 1.28 (42 on phone), navy.
  - Role: League Gothic 30 (38 on phone), `--orange`.
  - Button: a navy pill, `--ink` text, League Gothic 26 (36 on phone), turning orange and rotating −2° on hover. It opens the film in a new tab and includes visually hidden "(opens in a new tab)" text.
- **One-shot play:** when the section top passes 70 % of the viewport height, a 1.3 s timeline plays:
  - lines draw in;
  - stills rise 46 px and fade in, staggered (0.12 + i × 0.07 → 0.5 + i × 0.07);
  - the notes rise (0.5 → 1).
  - It never replays. Reduced motion shows the finished state immediately.
- **Hover** (fine pointers only):
  - The still's inner `.ph` lifts (translate −8, −8; rotate −1°) with a hard offset shadow (12 px 12 px 0 navy), and the image scales to 1.05.
  - Sibling stills desaturate (`saturate(.45) brightness(.75)`).
  - The **hover card** follows the cursor (section 9).
  - **There are no "FRAME 01" tags.** The client removed them.
- **Click** opens the lightbox (section 9).
- **Mouse drift:** each still translates by `--mx × d` px horizontally and `--my × d × 0.7` vertically, with d = [5, −4, 6, −5, 4, −6] by slot. The title moves by −4 × `--mx`. The values are smoothed (lerp 0.05). Drift uses the CSS `translate` property so it never conflicts with the `transform` used by the animations.

### 5.4 Behind the scenes (`#bts`) is pinned, 3.2 viewports tall, pale with the diagonal.
- It uses the same band, lines and title frame as a film page.
- **Title:** "BEHIND THE SCENES", Barriecito 72, centred on x 550.5 at y 108 (centred in the PDF title frame).
- **Strip:** six polaroids in a row that **translates horizontally as you scroll**. From x = canvas width + 40 to canvas width − strip width − 120 (−60 on phone), over p 0.06 → 0.92 with ease-out.
  - Desktop: top 285, gap 70. Each polaroid is 380 × 500 with 20 px padding, a 340 px navy photo slot with a dashed border, and a Barriecito 28 caption.
  - Phone: top 430, gap 80, 600 × 800 cards, 580 px slot, 44 px caption.
  - Rotations are [−3, 2.5, −1.5, 3, −2.5, 1.5]°, with a tape strip on each card (alternating ±4–5°).
- **Captions:** "ON SET / JAHAAN", "ON SET / TWO PACKETS OF SUGAR, TRUST ME.", "ON SET / ROOTS", "ON SET / THE GUEST ROOM", "ON SET / TILL DEATH DO US PART", "ON SET / COURTESY OF CUBAN EVANGELICAL BOB".
- **The photos are placeholders** ("[BTS PHOTO]"). Harsh has not supplied BTS images yet (see section 15).

### 5.5 Contact (`#contact`) is one viewport tall, navy, and plays once. It mirrors the cover.
- **Lines:** the cover's two strokes (`--line` colour). On phone, only the frame and its top lead-in, so no line crosses the links.
- **Heading:** "LET'S" at (547.6, 33.1), size 348.1 (the HARSH box moved 40 to the right), and "TALK" at (697.2, 387.8), size 277. The `<h2>` has `aria-label="Let's talk"`.
- **Who:** "HARSH PUROHIT" (Barriecito 58) and "FILMMAKER / DUBAI, UAE" (League Gothic 30, `--line`), at (40, 300), width 380.
- **Contact rows** at (470, 742), width 1110 (on phone: 60, 760, width 780, stacked):
  - EMAIL: `harshpurohit2318@gmail.com`, as a `mailto:` link.
  - PHONE: `+971 50 794 6891`, as a `tel:+971507946891` link.
  - Each row has a **COPY** button. It uses `navigator.clipboard`; on failure it selects the text and shows "SELECT TO COPY". The address and number are always visible as plain text, because `mailto:` and `tel:` links can silently fail in some hosts.
- **"BACK TO THE TOP"** pill at (40, 600) (phone: 60, 1440).
- **Motion:** LET'S drops at 0.1 → 0.35, TALK at 0.18 → 0.43, the who block slides in at 0.25 → 0.5, the rows wipe at 0.35 → 0.7, and the top link fades at 0.5 → 0.75.

---

## 6. Navigation

- **Rail** (desktop): fixed on the left, 76 px wide, navy with grain and a 3 px `--line` right border. Top to bottom:
  - an **HP** mark (links to `#cover`);
  - a vertical **progress track** with 10 ticks, one per scene, each a 44 px target. The active tick is orange. The track fills with overall scroll progress.
  - the current **scene name**, written vertically (hidden below 640 px of height);
  - a **timecode**, `TC 00:MM:SS:FF`, mapping total scroll to a 7:32 runtime at 24 fps;
  - an **INDEX** button that opens the panel.
- **Top bar** (phone): 56 px tall, with HP, the scene name, an INDEX button, and an orange progress underline (`--prog`).
- **Index panel:**
  - Slides in from the left (0.5 s, `cubic-bezier(.7,0,.2,1)`), `min(640px, 100vw − rail)` wide (full width on phone), with a scrim.
  - A numbered list: 00 Cover, 01 Introduction, 02 Jahaan (2025), 03 Two Packets of Sugar, Trust Me. (2025), 04 Roots (2026), 05 The Guest Room (2025), 06 Till Death Do Us Part (2025), 07 Courtesy of Cuban Evangelical Bob (2024), 08 Behind the Scenes, 09 Contact.
  - The current item is orange with `aria-current`.
  - Focus moves into the panel on open and returns to the INDEX button on close. Esc, the scrim and CLOSE all close it.
- **Routing:** plain hashes (`#jahaan`, `#bts`, and so on). Clicks on in-page links are intercepted:
  - pinned scenes jump to p 0.82 (BTS to 0.45) so they show assembled;
  - film and contact scenes jump to their top.
  - Deep links work on load. After fonts load, the page relays out and re-applies the hash only if the user hasn't scrolled yet.
- **Skip link:** "Skip to introduction", visible on focus.

---

## 7. The continuous maze lines (how they work)

Goal (client): "make the lines in the background continuous like a maze", with "no sharp edges".

1. Two **spines** run down the entire page: one 10 px in from the left edge of the stage and one 10 px in from the right (7 px on phone). Every scene draws its own spine segment from the very top to the very bottom of its stage, at the same screen x. So they join seamlessly across scene boundaries. `layout-sweep.js` verifies this at all ten boundaries.
2. Every stroke keeps its original path in `data-d0`. Loose ends are written with placeholder coordinates:
   - `M-900 y` means "start on the left spine";
   - `M2500/M2700 y` means "start on the right spine";
   - `…L1600.0 y L2500 y` or `…L2700 y` means "end on the right spine";
   - `…L-900 y` means "end on the left spine".
3. `joinLines()` in app.js converts the real spine positions into canvas units for that scene (`(px − x0)/k`). It then rewrites each placeholder as a **rounded 22-unit quarter curve that merges tangentially into the spine**, never a T-junction. The PDF's "hook" start (`M0 58.7 … 30.4 73.9`) becomes a smooth S-curve from the spine.
4. Each film's PDF line that originally ended behind the stills is extended down to y 951 (just below the grid), turns with a rounded corner, and runs left into the left spine. On phones, a line drops from the bottom of the title frame and does the same.
5. Two-tone clipping (section 3) keeps every line visible on both grounds.
6. Spines are static. The PDF strokes animate their drawing on top (stroke-dasharray). `measureDraws()` re-measures path lengths after every relayout.

**If you add a scene:**
- give its line art loose ends using the placeholders above;
- include `<path class="spine" data-side="l"/>` and `data-side="r"` inside its `.wires` svg (the `paths()` helper in build.py does this);
- run `tests/sharp-corners.js` and `tests/layout-sweep.js`.

---

## 8. Stills inventory (36 images)

All are WebP, 1000 px on the long edge, cropped *exactly* as the PDF masks them (`tools/extract_from_pdf.py` reads each clip rectangle). File numbers follow the PDF's internal image order, **not** the grid order. The site places them in reading order, as below.

| Film | Grid slot (reading order) | File | Pixel size | Original PDF crop rect (x, y, w, h in 1600x900 units) |
|---|---|---|---|---|
| Jahaan | 1 (top row, left) | `images/jahaan-1.webp` | 1000x753 | 238.1, 295.9, 344.2, 259.2 |
| Jahaan | 2 (top row, middle) | `images/jahaan-5.webp` | 1000x755 | 627.9, 295.9, 344.2, 259.2 |
| Jahaan | 3 (top row, right) | `images/jahaan-4.webp` | 1000x753 | 1017.8, 295.9, 344.2, 259.2 |
| Jahaan | 4 (bottom row, left) | `images/jahaan-2.webp` | 1000x753 | 238.1, 590.5, 344.2, 259.2 |
| Jahaan | 5 (bottom row, middle) | `images/jahaan-3.webp` | 1000x754 | 627.9, 590.5, 344.2, 259.2 |
| Jahaan | 6 (bottom row, right) | `images/jahaan-6.webp` | 1000x753 | 1017.9, 590.5, 344.2, 259.2 |
| Two Packets of Sugar, Trust Me. | 1 (top row, left) | `images/sugar-3.webp` | 1000x523 | 89.2, 326.0, 461.7, 239.2 |
| Two Packets of Sugar, Trust Me. | 2 (top row, middle) | `images/sugar-1.webp` | 1000x519 | 569.8, 326.0, 461.7, 239.2 |
| Two Packets of Sugar, Trust Me. | 3 (top row, right) | `images/sugar-5.webp` | 1000x521 | 1050.4, 326.0, 461.7, 239.2 |
| Two Packets of Sugar, Trust Me. | 4 (bottom row, left) | `images/sugar-4.webp` | 1000x519 | 87.7, 582.8, 461.7, 239.2 |
| Two Packets of Sugar, Trust Me. | 5 (bottom row, middle) | `images/sugar-2.webp` | 1000x518 | 568.3, 582.8, 461.7, 239.2 |
| Two Packets of Sugar, Trust Me. | 6 (bottom row, right) | `images/sugar-6.webp` | 1000x520 | 1050.4, 582.8, 460.4, 239.2 |
| Roots | 1 (top row, left) | `images/roots-3.webp` | 1000x671 | 152.1, 287.6, 418.3, 279.6 |
| Roots | 2 (top row, middle) | `images/roots-1.webp` | 1000x671 | 590.8, 287.6, 418.3, 279.6 |
| Roots | 3 (top row, right) | `images/roots-5.webp` | 1000x671 | 1029.6, 287.6, 418.3, 279.6 |
| Roots | 4 (bottom row, left) | `images/roots-4.webp` | 1000x672 | 152.1, 583.4, 418.3, 279.6 |
| Roots | 5 (bottom row, middle) | `images/roots-2.webp` | 1000x669 | 590.8, 583.4, 418.3, 279.6 |
| Roots | 6 (bottom row, right) | `images/roots-6.webp` | 1000x671 | 1029.6, 583.4, 418.3, 279.6 |
| The Guest Room | 1 (top row, left) | `images/guestroom-3.webp` | 1000x669 | 152.1, 287.6, 418.3, 279.6 |
| The Guest Room | 2 (top row, middle) | `images/guestroom-1.webp` | 1000x669 | 590.8, 287.6, 418.3, 279.6 |
| The Guest Room | 3 (top row, right) | `images/guestroom-5.webp` | 1000x668 | 1029.6, 287.6, 418.3, 279.6 |
| The Guest Room | 4 (bottom row, left) | `images/guestroom-4.webp` | 1000x669 | 152.1, 583.4, 418.3, 279.6 |
| The Guest Room | 5 (bottom row, middle) | `images/guestroom-2.webp` | 1000x669 | 590.8, 583.4, 418.3, 279.6 |
| The Guest Room | 6 (bottom row, right) | `images/guestroom-6.webp` | 1000x669 | 1029.6, 583.4, 418.3, 279.6 |
| Till Death Do Us Part | 1 (top row, left) | `images/tilldeath-3.webp` | 1000x518 | 89.2, 326.0, 461.7, 239.2 |
| Till Death Do Us Part | 2 (top row, middle) | `images/tilldeath-1.webp` | 1000x518 | 569.8, 326.0, 461.7, 239.2 |
| Till Death Do Us Part | 3 (top row, right) | `images/tilldeath-5.webp` | 1000x518 | 1050.4, 326.0, 461.7, 239.2 |
| Till Death Do Us Part | 4 (bottom row, left) | `images/tilldeath-4.webp` | 1000x518 | 87.7, 582.8, 461.7, 239.2 |
| Till Death Do Us Part | 5 (bottom row, middle) | `images/tilldeath-2.webp` | 1000x518 | 568.3, 582.8, 461.7, 239.2 |
| Till Death Do Us Part | 6 (bottom row, right) | `images/tilldeath-6.webp` | 1000x519 | 1050.4, 582.8, 460.4, 239.2 |
| Courtesy of Cuban Evangelical Bob | 1 (top row, left) | `images/cuban-3.webp` | 1000x671 | 152.1, 287.6, 418.3, 279.6 |
| Courtesy of Cuban Evangelical Bob | 2 (top row, middle) | `images/cuban-1.webp` | 1000x672 | 590.8, 287.6, 418.3, 279.6 |
| Courtesy of Cuban Evangelical Bob | 3 (top row, right) | `images/cuban-5.webp` | 1000x674 | 1032.9, 287.6, 415.0, 279.6 |
| Courtesy of Cuban Evangelical Bob | 4 (bottom row, left) | `images/cuban-4.webp` | 1000x670 | 152.1, 583.4, 418.3, 279.6 |
| Courtesy of Cuban Evangelical Bob | 5 (bottom row, middle) | `images/cuban-6.webp` | 1000x667 | 590.9, 583.4, 418.3, 279.6 |
| Courtesy of Cuban Evangelical Bob | 6 (bottom row, right) | `images/cuban-2.webp` | 1000x670 | 1029.6, 583.4, 418.3, 279.6 |

The "original PDF crop rect" is where each still sits on Harsh's PDF page. The site no longer uses those positions, because the grid was enlarged. It is kept so the PDF layout can be restored exactly if Harsh asks.

Alt text pattern: `"<Film> (<year>), frame <n>"`. The button label pattern: `"Enlarge <Film>, frame <n>"`.

### Other images
| File | What | Size |
|---|---|---|
| `portrait-violet.webp`, `portrait-purple.webp`, `portrait-red.webp`, `portrait-orange.webp` | The four duotone layers of Harsh's cut-out portrait (transparent background, from the PDF's soft masks) | 800 × 1200 RGBA |
| `scribble.png` | The orange hand-drawn scribble from the intro page, isolated from a render (body text excluded), recoloured `rgb(232,88,70)` | 1100 × 1049 RGBA |
| `grain-soft.jpg` | The paper grain tile (see section 3) | 1000 × 667 |

---

## 9. Hover card and lightbox

- **Hover card** (`.fcard`, fine pointers only):
  - 360 px wide, `--ink` background, a navy 3 px border, radius 18. It springs in (scale 0.7 → 1, rotate −6° → −2°).
  - It follows the cursor with lerp 0.14, offset +26 px horizontally and +24 px vertically. It flips to the left side near the right edge and stays clamped inside the viewport vertically.
  - Contents: the film title (Barriecito 28), the year chip (a navy pill), the **logline** (League Gothic 20, `--orange`), and "ROLE: …" (16, navy).
  - The data comes from `films.json` through `__FILMS__`.
- **Lightbox** (`.lb`):
  - A full-screen navy scrim (0.95). The still is shown uncropped (max 68 vh) with a 3 px `--ink` border, rotated −0.6°.
  - The caption is the alt text plus "ROLE: …".
  - PREV, CLOSE and NEXT buttons cycle through all 36 stills site-wide. The keyboard uses ← → Esc.
  - Focus moves to CLOSE on open and returns to the originating still on close.

---

## 10. All copy (verbatim). The source of truth is `src/films.json`.

**Cover:** HARSH / PUROHIT, then "PHOTOGRAPHER, VIDEOGRAPHER, DIRECTOR"

**Introduction:** see 5.2.

**Contact:** LET'S TALK. HARSH PUROHIT. FILMMAKER / DUBAI, UAE. EMAIL harshpurohit2318@gmail.com. PHONE +971 50 794 6891. BACK TO THE TOP.

| Film | Year | Role | Button | Link |
|---|---|---|---|---|
| Jahaan | 2025 | Writer, Director, Editor, and Sound Post Production. | WATCH THE FILM | https://www.youtube.com/watch?v=rOQH-rHGutc |
| Two Packets of Sugar, Trust Me. | 2025 | Writer, Director, Editor, and Sound Post Production. | WATCH THE FILM | https://www.youtube.com/watch?v=VAZgN3wG2-Q |
| Roots | 2026 | Co-Writer, Director, Editor, and Sound Post Production. | WATCH THE FILM | https://www.youtube.com/watch?v=iN8b0-Fx5Bw&t=60s |
| The Guest Room | 2025 | Co-Writer, Art Director, and Assembly Editor. | **WATCH THE TRAILER** | https://vimeo.com/1082246023 |
| Till Death Do Us Part | 2025 | Co-Writer and Script Supervisor. | WATCH THE FILM | https://vimeo.com/1097167845/c1daa043c7 |
| Courtesy of Cuban Evangelical Bob | 2024 | Writer, Director, Editor, and Sound Post Production. | WATCH THE FILM | https://www.youtube.com/watch?v=1SyM_RytuQ4 |

The links were cleaned of playlist and tracking parameters. The Till Death Vimeo link keeps its private hash (`c1daa043c7`) because the film won't play without it. The Roots link keeps `&t=60s` as Harsh supplied it.

**Loglines (hover card):**
- **Jahaan:** During a smoke break, a man retreats into magical memories where he is transported to an impressionistic dimension of colors and patterns. He pursues a mysterious yet familiar figure.
- **Two Packets of Sugar, Trust Me.:** One quiet morning at a bar, Adrian Catherine Shaw is visited by her future self and told she must stop her friend, Ryan, the waiter, from getting fired or risk losing her future. As the two versions of Adrian work together, they face their own struggles and differences.
- **Roots:** The true story of Monal Malhotra, an Indian chef in 90s Bahrain who was tasked with cooking for an all-Indian function while only specializing in European cuisine. The story follows his journey through Bahrain as he learns about Indian cuisine and reconnects with his culture.
- **The Guest Room:** When a group of strange salesmen arrive at his doorstep with shiny replacements for his home, an ordinary man slowly realizes that the products, and promises they offer, are much more sinister than they appear.
- **Till Death Do Us Part:** A comedy romance that I co-wrote for my senior year thesis.
- **Courtesy of Cuban Evangelical Bob:** Nicky and Patrick are two young and aspiring musicians. After another unsuccessful all-nighter, Nicky begins to have doubts about his pursuit of music. While trying to make coffee, and under the influence of an unidentified laced joint, Nicky and Patrick discover the innate rhythm of the world and the meaning of life.

**Approaches (notes band under the stills):**
- **Jahaan:** Jahaan is a story about culture, and the pursuit of identity. I treated it as a study of visual and surrealist storytelling, where the approach was to communicate beyond the surface and challenge the film form.
- **Two Packets of Sugar, Trust Me.:** I have always been interested in films that use stylised storytelling. "Two Packets of Sugar, Trust Me." is an attempt to tell an intimate story of self-reflection in a similarly elevated style.
- **Roots:** As someone who is interested in narratives pertaining to identity and culture, Chef Monal Malhotra's story really resonated with me. Interconnecting the story between the modern day and the 90s was both exciting and daunting given the small scale, run-and-gun nature of the production.
- **The Guest Room:** Socio-political commentary and analysis is one of the prime ways that filmmaking can engage in important dialog. The Guest Room is about the unfeeling nature of capitalism and how it has adverse effects on people on a micro and macro scale.
- **Till Death Do Us Part:** Till Death Do Us Part is a dissection of relationships and the complexity of opposing natures in the context of love. While the film's approach is absurdist, there is a sincerity at the core which drives it.
- **Courtesy of Cuban Evangelical Bob:** Artists tend to struggle quite a bit with imposter syndrome. Within this story, both the protagonists, Nicky and Patrick act as the personifications of self-doubt and belief. Using comedy as a medium of expression, the short film tells the story of aspiring artists.

**Editorial notes:**
- Till Death has only one paragraph in Harsh's content PDF. Its first sentence is used as the logline, and the rest as the approach, so nothing repeats.
- Cuban Evangelical Bob has no year in the content PDF. 2024 comes from the design PDF.
- Spelling is kept as Harsh wrote it ("stylised", "colors", "dialog"), apart from the "recieved" fix on the intro.

### PDF text geometry (for exact placement)
| Page | Text | Font | Size (canvas px) | Bounding box x0, y0, x1, y1 |
|---|---|---|---|---|
| cover | HARSH | Barriecito-Regular | 348.1 | 507.6, 33.1, 1531.6, 450.8 |
| cover | PUROHIT | Barriecito-Regular | 277.0 | 547.2, 387.8, 1492.0, 720.1 |
| cover | PHOTOGRAPHER, VIDEOGRAPHER, DIRECTOR | LeagueGothic-Regular | 38.9 | 1061.4, 766.7, 1509.5, 813.4 |
| intro | INTRODUCTION | Barriecito-Regular | 198.5 | 216.4, 89.9, 1383.5, 328.1 |
| intro | I am a filmmaker based in Dubai, UAE. I have directed, written, and been | LeagueGothic-Regular | 41.2 | 629.5, 416.3, 1510.0, 465.7 |
| intro | involved with multiple short films, documentaries, advertisements, and music | LeagueGothic-Regular | 41.2 | 629.5, 473.6, 1510.0, 523.0 |
| intro | videos that have recieved awards and recognition across the Gulf. I have also | LeagueGothic-Regular | 41.2 | 629.5, 530.9, 1510.0, 580.4 |
| intro | been involved with projects that have screened in countries all over the world. | LeagueGothic-Regular | 41.2 | 629.5, 588.3, 1508.5, 637.7 |
| jahaan | JAHAAN (2025) | Barriecito-Regular | 104.3 | 223.6, 86.8, 879.5, 212.0 |
| sugar | TWO PACKETS OF SUGAR, | Barriecito-Regular | 62.8 | 235.1, 67.8, 865.6, 143.2 |
| sugar | TRUST ME. (2025) | Barriecito-Regular | 62.8 | 318.9, 155.6, 781.8, 230.9 |
| roots | ROOTS (2026) | Barriecito-Regular | 94.4 | 281.6, 92.8, 817.9, 206.1 |
| guestroom | THE GUEST ROOM (2025) | Barriecito-Regular | 68.0 | 208.1, 108.6, 904.7, 190.2 |
| tilldeath | TILL DEATH DO US PART (2025) | Barriecito-Regular | 52.2 | 220.9, 118.1, 884.2, 180.7 |
| cuban | COURTESY OF CUBAN | Barriecito-Regular | 52.3 | 340.2, 82.8, 777.5, 145.5 |
| cuban | EVANGELICAL BOB (2024) | Barriecito-Regular | 52.3 | 289.1, 155.8, 828.6, 218.5 |

Line paths for every page are in `src/geo.json` → `<page>.strokes[].d` (SVG path data in 1600 × 900 units).

---

## 11. Scroll engine (app.js)

- **Scene registry:** built at startup from `.scene` elements. It collects `.an` animated elements (`data-fx`, `data-a`, `data-b`), `path.draw` strokes (with their own `data-a`/`data-b`), cover letters, portrait layers and the BTS track.
- **Progress for pinned scenes:** `p = clamp((top0 − rect.top + 0.5H) / (sectionHeight − H + 0.5H))`. It begins half a viewport early so assembly starts while the scene slides in.
- **Element animation:** the local progress `t = clamp((p − a)/(b − a))`, eased (easeOut cubic; easeBack 1.25 for "deal" moves). Effects:

  | `data-fx` | What it does |
  |---|---|
  | `drop` | Falls from −150 with −6° rotation, fading in |
  | `left` | Slides from −320 with −4° rotation |
  | `rise` | Rises 46 px and fades in |
  | `wipe` | Reveals left to right with clip-path inset |
  | `fade` | Fades in |
  | `band` | Slides the diagonal in. Kept for reuse but currently unused |
  | `deal` | Kept for reuse but currently unused |

- **Line drawing:** `stroke-dasharray` and `stroke-dashoffset`.
- **Once-scenes** (`data-len="1"`: films and contact): `play()` runs a 1.3 s timed timeline the first time the section top passes 70 % of the viewport.
- **Cover:** a 1.9 s load timeline (`runIntro`) after fonts are ready, with a 900 ms safety timeout. Scroll then drives the echo spread.
- **Updates:** batched with requestAnimationFrame on scroll. Scenes whose progress hasn't changed are skipped.
- **`layout()`** runs on load, on resize (debounced 120 ms) and after fonts load. It:
  1. decides desktop or phone mode;
  2. sizes the sections and stages;
  3. sets each canvas transform;
  4. runs `joinLines()`;
  5. re-measures the strokes.
- **Reduced motion** (`prefers-reduced-motion: reduce`): every scene shows fully assembled, CSS transitions are off, and the cover shows finished. The BTS strip still follows scroll linearly, because sliding it is how you reach the cards.

---

## 12. Accessibility

- Real `<button>` for every still (`aria-label="Enlarge <Film>, frame n"`) and for every control. Real `<a href>` for links.
- The visible focus ring is 3 px `--orange` with 4 px offset. On stills, the ring sits on the inner image.
- One `<h1>` (the name). The `<h2>`s are the scene titles. Film titles include a visually hidden full title with the year, and the decorative per-line spans are `aria-hidden`.
- Decorative SVGs, the scribble and the extra portrait layers are `aria-hidden`.
- The rail's scene name is `aria-live="polite"`.
- Text contrast meets 4.5:1 or better: `--orange` on `--pale` is about 6:1 and `--ink` on `--navy` is about 14:1.
- Tap targets are at least 44 px.

---

## 13. Testing (all must pass before shipping)

| Script | Checks |
|---|---|
| `tests/layout-sweep.js` | At 1920×950, 1440×800, 1280×640, 820×1180 (touch) and 390×844 (phone): no element outside its stage; no text or still overlaps; film titles fit their frame; stills fully shown after scrolling through; **spines unbroken at every scene boundary and spanning every stage**; spines never pass through the notes; no sideways scroll; all six watch links correct with `target=_blank`; hover card text, cursor, mouse drift and lightbox (desktop sizes); no console errors |
| `tests/sharp-corners.js` | Parses every visible line path on 4 viewports; fails on any joint turning more than 12° |
| `tests/edge-cases.js` | Deep links `#bts` and `#roots`, reduced motion (everything visible), keyboard focus ring |

The tests write screenshots to `tests/out/` for visual review. Always look at the phone screenshots: most of the bugs found during the build were phone-only. For example, the navy diagonal once covered the approach text, a film stage was offset by the 56 px top bar, and lines were too short to curve at phone scale.

---

## 14. Rules that must not regress

1. **Stay on the PDF:** Barriecito and League Gothic only, navy/pale/orange only, the PDF's stroke weight and 22-unit corner radius.
2. **Scrappy, not messy.** Motion may be playful, but everything must settle into exact alignment. Never leave things permanently crooked, clipped or overlapping.
3. **Scrollytelling only on the cover, intro and BTS.** Film pages scroll normally and animate once.
4. **No "FRAME 01" tags on hover.**
5. **No circle cursor.** Use the black arrow.
6. **No sharp corners on any line.** Run `sharp-corners.js`.
7. **Lines stay continuous** through the spines. Run `layout-sweep.js`.
8. **Grain only on backgrounds**, never over stills, type or lines.
9. **Keep stills large**, in the full-width grid. Lightbox images are uncropped.
10. Edit `src/`, then rebuild `dist/`. Never hand-edit `dist/`.

---

## 15. Open items, placeholders and suggestions

- **BTS photos:** the strip is driven by the `bts` list in `src/films.json` (image, crop focus `pos`, caption, alt text). To add or reorder photos, put a WebP (1000 px long edge) in `src/images/`, add an entry, and rebuild. Captions are descriptive; tie them to film titles once Harsh confirms which shoot each photo is from.
- **No Instagram or showreel link** has been supplied. The contact section shows email and phone only. If Harsh adds them, use the same `<li>` pattern.
- **Approach for Till Death:** the split described in section 10. Confirm it with Harsh.
- **Cuban year (2024):** from the design PDF. Confirm it.
- **Fonts:** loaded from Google Fonts first, with self-hosted woff2 fallbacks. For full independence, remove the Google `<link>` tags in build.py, since the local files are complete.
- **Not done yet** (suggestions only):
  - favicon and Open Graph image (a still or the portrait);
  - `og:` and `twitter:` meta tags;
  - analytics;
  - a custom domain;
  - lazy-loading thresholds tuned for slow connections;
  - an optional sound-design toggle, which would suit a filmmaker's site.
- **Grain tile:** `tools/extract_from_pdf.py` regenerates it with a percentile contrast stretch, which differs very slightly from the shipped tile. That's acceptable; keep whichever one looks right.

---

## 16. How each asset was made (provenance)

- **Geometry:** from PyMuPDF.
  - `get_drawings()` gives the stroke paths, converted to SVG in 1600 × 900 units with a scale of 1600/2880.
  - `get_text('dict')` gives the text spans with their sizes and boxes.
  - `get_drawings(extended=True)` gives the clip rectangles.
- **Stills:** each PDF image is cropped to its clip rectangle, mapped from page space into image pixels, so each one matches what Harsh framed in Canva. The baked-in black bars in some source frames are removed in the process.
- **Portrait:** the four colour layers on page 1, each combined with its PDF soft mask into RGBA.
- **Scribble:** page 2 is rendered at 2×, orange-red pixels are kept by the measure `(r − max(g,b)) > 25`, and the intro text box is masked out. The result is recoloured and cropped. Small gaps where navy lines crossed it in the PDF are covered by the lines on the site, exactly as in the PDF.
- **Grain:** the PDF's 2000 × 1333 paper texture, converted to greyscale, contrast-stretched and softened.
