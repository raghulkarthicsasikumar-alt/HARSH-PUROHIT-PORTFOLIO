"""
Rebuild every PDF-derived asset for the Harsh Purohit site from the original Canva export.

    pip install pymupdf pillow numpy
    python tools/extract_from_pdf.py path/to/Harsh_Portfolio.pdf

Writes into src/:
  geo.json                       exact geometry of every page, in a 1600 x 900 coordinate space
  images/<film>-<n>.webp         the 36 stills, cropped exactly as the PDF masks them (6 per film)
  images/portrait-<colour>.webp  the 4 colour layers of the echo portrait (RGBA, transparent background)
  images/scribble.png            the orange hand-drawn scribble from the Introduction page (RGBA)
  images/grain-soft.jpg          the paper grain tile, pre-softened for a full-strength overlay blend

Page order in the PDF (2880 x 1620 pt each, scaled by 1600/2880):
  1 cover, 2 intro, 3 jahaan, 4 sugar, 5 roots, 6 guestroom, 7 tilldeath, 8 cuban
"""
import io, json, sys
from pathlib import Path

import numpy as np
import pymupdf as fitz
from PIL import Image

SRC = Path(__file__).resolve().parent.parent / 'src'
IMG = SRC / 'images'
NAMES = ['cover', 'intro', 'jahaan', 'sugar', 'roots', 'guestroom', 'tilldeath', 'cuban']
S = 1600 / 2880                      # PDF points -> canvas units


def P(pt):
    return f"{pt.x * S:.1f} {pt.y * S:.1f}"


def path_d(items):
    """PyMuPDF drawing items -> SVG path data in canvas units."""
    out, last = [], None
    for it in items:
        k = it[0]
        if k == 'l':
            a, b = it[1], it[2]
            if last is None or abs(last.x - a.x) > .01 or abs(last.y - a.y) > .01:
                out.append('M' + P(a))
            out.append('L' + P(b)); last = b
        elif k == 'c':
            a, c1, c2, b = it[1:5]
            if last is None or abs(last.x - a.x) > .01 or abs(last.y - a.y) > .01:
                out.append('M' + P(a))
            out.append('C' + P(c1) + ' ' + P(c2) + ' ' + P(b)); last = b
        elif k == 're':
            r = it[1]
            out.append(f"M{r.x0*S:.1f} {r.y0*S:.1f}H{r.x1*S:.1f}V{r.y1*S:.1f}H{r.x0*S:.1f}Z"); last = None
        elif k == 'qu':
            q = it[1]
            out.append('M' + P(q.ul) + 'L' + P(q.ur) + 'L' + P(q.lr) + 'L' + P(q.ll) + 'Z'); last = None
    return ''.join(out)


def hexc(c):
    return '#%02x%02x%02x' % tuple(round(v * 255) for v in c)


def pix_to_pil(doc, xref):
    pix = fitz.Pixmap(doc, xref)
    if pix.n - pix.alpha > 3:
        pix = fitz.Pixmap(fitz.csRGB, pix)
    return Image.open(io.BytesIO(pix.tobytes('png')))


def main(pdf_path):
    doc = fitz.open(pdf_path)
    IMG.mkdir(parents=True, exist_ok=True)
    geo = {}
    for i, page in enumerate(doc):
        g = {'strokes': [], 'fills': [], 'imgs': [], 'texts': []}
        for dr in page.get_drawings():
            if dr['type'] == 's':
                g['strokes'].append({'d': path_d(dr['items']), 'c': hexc(dr['color']), 'w': round(dr['width'] * S, 2)})
            elif dr['type'] == 'f' and dr['fill'] != (0.0, 0.0, 0.0) and len(dr['items']) > 1:
                g['fills'].append({'d': path_d(dr['items']), 'c': hexc(dr['fill'])})
        clips = [dr for dr in page.get_drawings(extended=True) if dr['type'] == 'clip']
        small = [c for c in clips if c['scissor'].width * S < 1500]
        infos = [x for x in page.get_image_info(xrefs=True) if x['width'] != 2000]   # 2000px wide = grain texture
        for blk in page.get_text('dict')['blocks']:
            for line in blk.get('lines', []):
                for sp in line['spans']:
                    if sp['text'].strip():
                        g['texts'].append({'t': sp['text'], 'bbox': [round(v * S, 1) for v in sp['bbox']],
                                           'size': round(sp['size'] * S, 1), 'font': sp['font'], 'c': hex(sp['color'])})
        if i >= 2:
            # film pages: each still is clipped by a rectangle; crop the source image to exactly that rectangle
            used = set()
            for k, x in enumerate(infos):
                bb = fitz.Rect(x['bbox'])
                best = next(j for j, c in enumerate(small) if j not in used and
                            c['scissor'].x0 >= bb.x0 - 2 and c['scissor'].y0 >= bb.y0 - 2 and
                            c['scissor'].x1 <= bb.x1 + 2 and c['scissor'].y1 <= bb.y1 + 2)
                used.add(best)
                r = small[best]['scissor']
                im = pix_to_pil(doc, x['xref']).convert('RGB')
                sx, sy = im.size[0] / bb.width, im.size[1] / bb.height
                box = tuple(round(v) for v in ((r.x0 - bb.x0) * sx, (r.y0 - bb.y0) * sy, (r.x1 - bb.x0) * sx, (r.y1 - bb.y0) * sy))
                crop = im.crop(box); crop.thumbnail((1000, 1000))
                fn = f'{NAMES[i]}-{k + 1}.webp'
                crop.save(IMG / fn, quality=82)
                g['imgs'].append({'f': fn, 'r': [round(r.x0 * S, 1), round(r.y0 * S, 1), round(r.width * S, 1), round(r.height * S, 1)]})
        else:
            g['imgs'] = [{'xref': x['xref'], 'bbox': [round(v * S, 1) for v in x['bbox']]} for x in infos]
            g['clips'] = [[round(v * S, 1) for v in c['scissor']] for c in small]
        geo[NAMES[i]] = g
        print(f'page {i + 1} {NAMES[i]}: {len(g["strokes"])} strokes, {len(g["imgs"])} images, {len(g["texts"])} text runs')
    (SRC / 'geo.json').write_text(json.dumps(geo, indent=1))

    # echo portrait: 4 colour layers on page 1, each with a soft mask -> RGBA webp at 800 x 1200
    cover = doc[0]
    layers = [x for x in cover.get_image_info(xrefs=True) if x['width'] != 2000]
    for name, x in zip(['violet', 'purple', 'red', 'orange'], sorted(layers, key=lambda v: v['bbox'][0])):
        base = fitz.Pixmap(doc, x['xref'])
        info = doc.extract_image(x['xref'])
        rgb = pix_to_pil(doc, x['xref']).convert('RGB')
        if info.get('smask'):
            mask = pix_to_pil(doc, info['smask']).convert('L')
            rgb.putalpha(mask.resize(rgb.size))
        rgb.resize((800, 1200)).save(IMG / f'portrait-{name}.webp', quality=82)
        print('portrait layer', name)

    # scribble: render page 2 at 2x and keep only the orange-red strokes (the intro body text is excluded)
    pix = doc[1].get_pixmap(matrix=fitz.Matrix(2, 2))
    a = np.frombuffer(pix.samples, np.uint8).reshape(pix.height, pix.width, pix.n)[..., :3].astype(int)
    W = pix.width; sx = W / 1600
    red = (a[..., 0] - np.maximum(a[..., 1], a[..., 2])).clip(0, 255)
    x0, y0, x1, y1 = [int(v * sx) for v in (620, 405, 1520, 650)]
    red[y0:y1, x0:x1] = 0
    ys, xs = np.where(red > 25)
    out = np.zeros((pix.height, W, 4), np.uint8)
    out[..., 0], out[..., 1], out[..., 2] = 232, 88, 70
    out[..., 3] = np.clip((red - 20) * 3.2, 0, 255).astype(np.uint8)
    X0, Y0, X1, Y1 = xs.min() - 4, ys.min() - 4, xs.max() + 5, ys.max() + 5
    scrib = Image.fromarray(out).crop((X0, Y0, X1, Y1))
    scrib = scrib.resize((1100, round(1100 * scrib.size[1] / scrib.size[0])), Image.LANCZOS)
    scrib.save(IMG / 'scribble.png', optimize=True)
    print('scribble placed at canvas', round(X0 / sx, 1), round(Y0 / sx, 1), 'size', round((X1 - X0) / sx, 1), round((Y1 - Y0) / sx, 1))

    # grain: the 2000 x 1333 texture image, greyscale, contrast-stretched, then softened toward mid grey
    tex = next(x for x in cover.get_image_info(xrefs=True) if x['width'] == 2000)
    g = np.asarray(pix_to_pil(doc, tex['xref']).convert('L').resize((1000, 667))).astype(float)
    lo, hi = np.percentile(g, 1), np.percentile(g, 99)
    g = (g - lo) / max(1, hi - lo) * 255
    soft = 128 + (g - 128) * 0.32
    Image.fromarray(soft.clip(0, 255).astype('uint8')).save(IMG / 'grain-soft.jpg', quality=80)
    print('grain written')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
