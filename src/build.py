import json, re, html, shutil
from pathlib import Path

SRC = Path(__file__).resolve().parent
DIST = SRC.parent / 'dist'

G = json.load(open(SRC / 'geo.json'))

FILMS = [
    ('jahaan',    'jahaan',     'JAHAAN', '2025'),
    ('sugar',     'sugar',      'TWO PACKETS OF SUGAR, TRUST ME.', '2025'),
    ('roots',     'roots',      'ROOTS', '2026'),
    ('guestroom', 'guest-room', 'THE GUEST ROOM', '2025'),
    ('tilldeath', 'till-death', 'TILL DEATH DO US PART', '2025'),
    ('cuban',     'cuban',      'COURTESY OF CUBAN EVANGELICAL BOB', '2024'),
]
DATA = json.load(open(SRC / 'films.json', encoding='utf-8'))
PRETTY = {'jahaan': 'Jahaan', 'sugar': 'Two Packets of Sugar, Trust Me.', 'roots': 'Roots',
          'guestroom': 'The Guest Room', 'tilldeath': 'Till Death Do Us Part',
          'cuban': 'Courtesy of Cuban Evangelical Bob'}


def extend(d):
    """Run edge-touching PDF lines past the canvas so letterbox bars never show a cut line."""
    d = re.sub(r'^M0\.0 ([\d.]+)', lambda m: f'M-900 {m.group(1)}L0.0 {m.group(1)}', d)
    d = re.sub(r'L1600\.0 ([\d.]+)$', lambda m: f'L1600.0 {m.group(1)}L2500 {m.group(1)}', d)
    return d


def f(v):
    return f'{v:.1f}'.rstrip('0').rstrip('.')


def pos(x, y, w=None, h=None, X=None, Y=None, W=None, H=None):
    s = f'--x:{f(x)};--y:{f(y)};'
    if w is not None: s += f'--w:{f(w)};'
    if h is not None: s += f'--h:{f(h)};'
    if X is not None: s += f'--X:{f(X)};--Y:{f(Y)};'
    if W is not None: s += f'--W:{f(W)};'
    if H is not None: s += f'--H:{f(H)};'
    return s


def paths(lst, cls, a, b, stagger=0.06, band=None, uid=''):
    """Line art for one variant (dk/mb). Each stroke keeps its PDF path in data-d0; the script joins its
    loose ends to the two page-long spines so the lines run continuously from scene to scene."""
    def strokes():
        return ''.join(f'<path class="draw" d="{d}" data-d0="{d}" data-a="{a + i * stagger:.2f}" data-b="{b + i * stagger:.2f}"/>'
                       for i, (d, c) in enumerate(lst)) + '<path class="spine" data-side="l"/><path class="spine" data-side="r"/>'
    vb = "0 0 1600 900" if cls == "dk" else "0 0 900 1600"
    if band:
        cid = f'{uid}-{cls}'
        return (f'<svg class="wires {cls}" viewBox="{vb}" aria-hidden="true"><defs>'
                f'<clipPath id="{cid}-in"><path d="{band}"/></clipPath>'
                f'<clipPath id="{cid}-out"><path clip-rule="evenodd" d="M-30000 -30000H30000V30000H-30000Z{band}"/></clipPath></defs>'
                f'<g clip-path="url(#{cid}-in)" stroke="var(--pale)">{strokes()}</g>'
                f'<g clip-path="url(#{cid}-out)" stroke="var(--navy)">{strokes()}</g></svg>')
    return f'<svg class="wires {cls}" viewBox="{vb}" aria-hidden="true"><g stroke="{lst[0][1]}">{strokes()}</g></svg>'


NAVY, PALE, LINE = 'var(--navy)', 'var(--pale)', 'var(--line)'

# ---------- mobile (900 x 1600) frame paths ----------
M_COVER = [
    ('M-900 24H560Q582 24 582 46V74Q582 96 604 96', LINE),
    ('M52 96Q30 96 30 118V676Q30 698 52 698H848Q870 698 870 676V118Q870 96 848 96Z', LINE),
    ('M-900 1572H120Q142 1572 142 1550V740Q142 718 164 718L2700 718', LINE),
]
# phone intro: copy box sits right under the title box, the scribble fills the space below it
MI_BOX = 376                     # top edge of the copy box (title box ends at 338)
MI_BOT = MI_BOX + 44 + 502 + 52  # paragraph top padding + paragraph (56px, ~502 units) + bottom padding
MI_SCRIB = dict(X=188, Y=MI_BOT + 30, W=524, H=500)
M_INTRO = [
    ('M-900 52H96Q118 52 118 74Q118 96 140 96', NAVY),
    ('M66 96Q44 96 44 118V316Q44 338 66 338H834Q856 338 856 316V118Q856 96 834 96Z', NAVY),
    ('M856 190C856 220 870 220 870 250V{t0}Q870 {t} 848 {t}H64Q42 {t} 42 {t1}V{b0}Q42 {b} 64 {b}L2700 {b}'.format(
        t=MI_BOX, t0=MI_BOX - 22, t1=MI_BOX + 22, b=MI_BOT, b0=MI_BOT - 22), NAVY),
]
M_FILM = [
    ('M-900 210H38', PALE),
    ('M82 90Q60 90 60 112V308Q60 330 82 330H818Q840 330 840 308V112Q840 90 818 90Z', PALE),
    ('M2700 1556H44Q22 1556 22 1534V372', NAVY),
]
# navy band on phones: upper-left half, steeper than the PDF's diagonal
M_BAND = 'M6500 -4700L-5600 6080L-9000 -9000Z'   # diagonal from (1000,200) to (-100,1180): clears the notes
D_BAND = 'M6801 -2902.6L-5259.9 3828.6L-6000 -6000Z'

# ---------- cover ----------
cv = G['cover']
cover_strokes = [(extend(s['d']), LINE) for s in cv['strokes']]
P_LAYERS = [('violet', -61.2), ('purple', -19.4), ('red', 42.1), ('orange', 90.5)]


def letters(word, cls):
    return ''.join(f'<span class="lt {cls}" data-i="{i}">{c}</span>' for i, c in enumerate(word))


def cover_scene():
    t = {x['t']: x for x in cv['texts']}
    H_, P_, T_ = t['HARSH'], t['PUROHIT'], t['PHOTOGRAPHER, VIDEOGRAPHER, DIRECTOR']
    layers = ''.join(
        f'<img class="pl" src="images/portrait-{n}.webp" alt="{"Portrait of Harsh Purohit" if n == "orange" else ""}" '
        f'data-o="{f(x - 90.5)}" style="{pos(x, 33.8, 676.9, 1014.7)}">'
        for n, x in P_LAYERS)
    return f'''
<section class="scene" id="cover" data-kind="cover" data-len="1.7" data-label="COVER" aria-label="Harsh Purohit">
<div class="stage" style="--bg:var(--navy)"><div class="cv">
{paths(cover_strokes, 'dk', 0.0, 0.75, 0.1)}
{paths(M_COVER, 'mb', 0.0, 0.7, 0.1)}
<div class="portrait" aria-hidden="false">{layers}</div>
<h1 class="name" aria-label="Harsh Purohit">
<span class="line l1" aria-hidden="true" style="{pos(H_['bbox'][0], H_['bbox'][1], X=56, Y=70)}--fs:{H_['size']};--FS:268">{letters('HARSH', 'h')}</span>
<span class="line l2" aria-hidden="true" style="{pos(P_['bbox'][0], P_['bbox'][1], X=56, Y=345)}--fs:{P_['size']};--FS:220">{letters('PUROHIT', 'p')}</span>
</h1>
<p class="tagline an" data-fx="wipe" data-a=".55" data-b=".85" style="{pos(T_['bbox'][0], T_['bbox'][1], X=60, Y=630)}--fs:{T_['size']};--FS:44">{T_['t']}</p>
</div></div>
</section>'''


def intro_scene():
    it = G['intro']
    strokes = [s['d'] for s in it['strokes']]
    strokes[0] = extend(strokes[0].split('C1638.3')[0])            # drop hook past right edge
    strokes[0] = re.sub(r'L1625\.9 825\.4$', 'L2500 825.4', strokes[0])
    strokes[1] = extend(strokes[1].split('C1647.1')[0])
    strokes[1] = re.sub(r'L1641\.9 858\.7$', 'L2500 858.7', strokes[1])
    T = it['texts']
    ttl = T[0]
    lines = [x['t'].replace('recieved', 'received') for x in T[1:]]
    body_lines = ''.join(
        f'<span class="bl an" data-fx="wipe" data-a="{.42 + i * .07:.2f}" data-b="{.58 + i * .07:.2f}" '
        f'style="{pos(x["bbox"][0], x["bbox"][1], x["bbox"][2] - x["bbox"][0])}">{html.escape(l)}</span>'
        for i, (x, l) in enumerate(zip(T[1:], lines)))
    para = ' '.join(lines)
    return f'''
<section class="scene" id="about" data-kind="intro" data-len="2.1" data-label="INTRODUCTION" aria-labelledby="intro-h">
<div class="stage" style="--bg:var(--pale)"><div class="cv">
<img class="scrib an" data-fx="wipe" data-a=".1" data-b=".55" src="images/scribble.png" alt="" aria-hidden="true" style="{pos(78.1, -1.1, 887.2, 845.8, **MI_SCRIB)}">
{paths([(s, NAVY) for s in strokes], 'dk', 0.0, 0.5, 0.08)}
{paths(M_INTRO, 'mb', 0.0, 0.5, 0.08)}
<h2 id="intro-h" class="ttl an big" data-fx="drop" data-a=".08" data-b=".3" style="{pos(ttl['bbox'][0], ttl['bbox'][1], X=74, Y=140)}--fs:{ttl['size']};--FS:128;color:var(--navy)">INTRODUCTION</h2>
<div class="body dk">{body_lines}</div>
<p class="body mb an" data-fx="wipe" data-a=".4" data-b=".7" style="top:{MI_BOX + 44}px">{html.escape(para)}</p>
</div></div>
</section>'''


# bigger stills: a full-width 3x2 grid on desktop, 2x3 on phones, one crop ratio throughout
DG = dict(x=50, y=290, w=486, h=304, gap=21)          # desktop canvas units
MG = dict(x=36, y=380, w=405, h=253, gap=18)          # phone canvas units
D_RUN = DG['y'] + 2 * DG['h'] + DG['gap'] + 32        # line run under the grid
M_RUN = MG['y'] + 3 * MG['h'] + 2 * MG['gap'] + 30
D_NOTES = D_RUN + 40
M_NOTES = M_RUN + 46


def band_svg(cls, d, uid):
    """Navy diagonal with the paper grain blended into it (grain lives on backgrounds only)."""
    vb = "0 0 1600 900" if cls == "dk" else "0 0 900 1600"
    pid = f'gr-{uid}-{cls}'
    return (f'<svg class="band {cls}" viewBox="{vb}" aria-hidden="true"><defs>'
            f'<pattern id="{pid}" patternUnits="userSpaceOnUse" width="720" height="480">'
            f'<image href="images/grain-soft.jpg" width="720" height="480"/></pattern></defs>'
            f'<path d="{d}" fill="var(--navy)"/><path d="{d}" fill="url(#{pid})" style="mix-blend-mode:overlay"/></svg>')


def film_lines(g, bts=False):
    a_d = g['strokes'][0]['d']                        # navy line, starts inside the canvas heading left
    b_d = g['strokes'][1]['d']                        # pale line, ends behind the stills heading down
    run_d = 870 if bts else D_RUN
    run_m = 1290 if bts else M_RUN
    dk = [('M2500 149.4L' + extend(a_d)[1:], NAVY), (extend(b_d) + f'V{run_d - 22}Q505.9 {run_d} 483.9 {run_d}L-900 {run_d}', PALE)]
    mb = [('M-900 46H100Q122 46 122 68Q122 90 144 90', PALE),
          ('M82 90Q60 90 60 112V308Q60 330 82 330H818Q840 330 840 308V112Q840 90 818 90Z', PALE),
          (f'M428 330Q450 330 450 352V{run_m - 22}Q450 {run_m} 428 {run_m}L-900 {run_m}', NAVY),
          ('M2700 355H700', NAVY)]
    return dk, mb


def film_scene(n, key, sid, title, year):
    g = G[key]
    dat = DATA[key]
    dk, mb = film_lines(g)
    imgs = sorted(g['imgs'], key=lambda x: (round(x['r'][1] / 60), x['r'][0]))
    still_html = []
    for i, x in enumerate(imgs):
        dx = DG['x'] + (i % 3) * (DG['w'] + DG['gap']); dy = DG['y'] + (i // 3) * (DG['h'] + DG['gap'])
        mx = MG['x'] + (i % 2) * (MG['w'] + MG['gap']); my = MG['y'] + (i // 2) * (MG['h'] + MG['gap'])
        num = i + 1
        alt = f'{PRETTY[key]} ({year}), frame {num}'
        depth = [5, -4, 6, -5, 4, -6][i]
        still_html.append(
            f'<button class="still an" data-fx="rise" data-a="{.12 + i * .07:.2f}" data-b="{.5 + i * .07:.2f}" data-film="{n}" '
            f'aria-label="Enlarge {html.escape(PRETTY[key])}, frame {num}" '
            f'style="{pos(dx, dy, DG["w"], DG["h"], mx, my, MG["w"], MG["h"])}--d:{depth}"><span class="ph"><img src="images/{x["f"]}" alt="{html.escape(alt)}" loading="lazy"></span></button>')
    tl = ''.join(
        f'<span class="tl" style="--cx:{f((t["bbox"][0] + t["bbox"][2]) / 2)};--y:{f(t["bbox"][1])};--fs:{t["size"]}">{html.escape(t["t"])}</span>'
        for t in g['texts'])
    fs_m = min(g['texts'][0]['size'], 78)
    watch = (f'<a class="watch" href="{html.escape(dat["url"])}" target="_blank" rel="noopener">'
             f'{dat["label"]} <span aria-hidden="true">&#8599;</span><span class="sr"> (opens in a new tab)</span></a>')
    return f'''
<section class="scene film" id="{sid}" data-kind="film" data-len="1" data-label="{html.escape(title)}" data-film="{n}" aria-label="{html.escape(PRETTY[key])} ({year})">
<div class="stage" style="--bg:var(--pale)"><div class="cv">
{band_svg('dk', D_BAND, sid)}
{band_svg('mb', M_BAND, sid)}
{paths(dk, 'dk', 0, .7, .15, band=D_BAND, uid=sid)}
{paths(mb, 'mb', 0, .7, .1, band=M_BAND, uid=sid)}
<h2 class="ttl film-t" style="--FS:{fs_m}"><span class="sr">{html.escape(title)} ({year})</span><span class="tls" aria-hidden="true">{tl}</span></h2>
{''.join(still_html)}
<div class="notes an" data-fx="rise" data-a=".5" data-b="1" style="{pos(DG['x'], D_NOTES, 1500, X=MG['x'], Y=M_NOTES, W=828)}">
<div class="n-ap"><h3 class="n-h">APPROACH</h3><p class="n-p">{html.escape(dat['approach'])}</p></div>
<div class="n-side"><h3 class="n-h">ROLE</h3><p class="n-r">{html.escape(dat['role'])}</p>{watch}</div>
</div>
</div></div>
</section>'''


def contact_scene():
    t = {x['t']: x for x in cv['texts']}
    H_, P_ = t['HARSH'], t['PUROHIT']
    return f'''
<section class="scene" id="contact" data-kind="contact" data-len="1" data-label="CONTACT" aria-labelledby="contact-h">
<div class="stage" style="--bg:var(--navy)"><div class="cv">
{paths(cover_strokes, 'dk', 0.0, 0.55, 0.1)}
{paths(M_COVER[:2], 'mb', 0.0, 0.55, 0.1)}
<h2 id="contact-h" class="name" aria-label="Let's talk">
<span class="line an" data-fx="drop" data-a=".1" data-b=".35" aria-hidden="true" style="{pos(H_['bbox'][0] + 40, H_['bbox'][1], X=56, Y=70)}--fs:{H_['size']};--FS:268">LET'S</span>
<span class="line an" data-fx="drop" data-a=".18" data-b=".43" aria-hidden="true" style="{pos(P_['bbox'][0] + 150, P_['bbox'][1], X=180, Y=360)}--fs:{P_['size']};--FS:232">TALK</span>
</h2>
<div class="who an" data-fx="left" data-a=".25" data-b=".5" style="{pos(40, 300, 380, X=60, Y=1230, W=780)}">
<span class="who-n">HARSH PUROHIT</span>
<span class="who-l">FILMMAKER / DUBAI, UAE</span>
</div>
<ul class="links an" data-fx="wipe" data-a=".35" data-b=".7" style="{pos(470, 742, 1110, X=60, Y=760, W=780)}">
<li><span class="k">EMAIL</span><span class="row"><a class="v" href="mailto:{DATA['contact']['email']}">{DATA['contact']['email']}</a><button class="copy" type="button" data-copy="{DATA['contact']['email']}">COPY</button></span></li>
<li><span class="k">PHONE</span><span class="row"><a class="v" href="tel:{DATA['contact']['phone'].replace(' ', '')}">{DATA['contact']['phone']}</a><button class="copy" type="button" data-copy="{DATA['contact']['phone']}">COPY</button></span></li>
</ul>
<a class="totop an" data-fx="fade" data-a=".5" data-b=".75" href="#cover" style="{pos(40, 600, X=60, Y=1440)}">BACK TO THE TOP</a>
</div></div>
</section>'''


def bts_scene():
    dk, mb = film_lines(G['jahaan'], bts=True)
    pols = []
    for i, ph in enumerate(DATA['bts']):
        r = [-3, 2.5, -1.5, 3, -2.5, 1.5][i % 6]
        pols.append(f'''<figure class="pol" style="--r:{r}deg">
<span class="tape" aria-hidden="true"></span>
<div class="ph-slot"><img src="images/{ph['img']}" alt="{html.escape(ph['alt'])}" loading="lazy" decoding="async" style="object-position:{ph['pos']}"></div>
<figcaption>{html.escape(ph['caption'])}</figcaption>
</figure>''')
    return f'''
<section class="scene" id="bts" data-kind="bts" data-len="3.2" data-label="BEHIND THE SCENES" aria-labelledby="bts-h">
<div class="stage" style="--bg:var(--pale)"><div class="cv">
{band_svg('dk', D_BAND, 'bts')}
{band_svg('mb', M_BAND, 'bts')}
{paths(dk, 'dk', 0, .2, .08, band=D_BAND, uid='bts')}
{paths(mb, 'mb', 0, .2, .08, band=M_BAND, uid='bts')}
<h2 id="bts-h" class="ttl film-t bts-t" style="--FS:74"><span class="tls"><span class="tl" style="--cx:550.5;--y:108;--fs:72">BEHIND THE SCENES</span></span></h2>
<div class="track">{''.join(pols)}</div>
</div></div>
</section>'''


SCENES = cover_scene() + intro_scene() + ''.join(film_scene(i, *f) for i, f in enumerate(FILMS)) + bts_scene() + contact_scene()

INDEX = [('cover', 'COVER', ''), ('about', 'INTRODUCTION', '')] + \
        [(sid, t, y) for _, sid, t, y in FILMS] + [('bts', 'BEHIND THE SCENES', ''), ('contact', 'CONTACT', '')]
index_html = ''.join(
    f'<li><a href="#{sid}" data-target="{sid}"><span class="ix-n">{i:02d}</span><span class="ix-t">{html.escape(t)}</span>'
    f'<span class="ix-y">{y}</span></a></li>' for i, (sid, t, y) in enumerate(INDEX))
ticks = ''.join(f'<a class="tick" href="#{sid}" data-target="{sid}" aria-label="{html.escape(t.title())}"><span></span></a>' for sid, t, y in INDEX)

film_meta = json.dumps([{'t': t, 'y': y, 'l': DATA[k]['logline'], 'r': DATA[k]['role']} for k, _, t, y in FILMS])

from urllib.parse import quote
ARROW = ("<svg xmlns='http://www.w3.org/2000/svg' width='26' height='30' viewBox='0 0 26 30'>"
         "<path d='M3 2.5V24l5.6-5.2 3.7 8.6 4-1.7-3.7-8.4H20Z' fill='black' stroke='white' stroke-width='1.8' stroke-linejoin='round'/></svg>")
css = open(SRC / 'style.css', encoding='utf-8').read().replace('__ARROW__', 'data:image/svg+xml,' + quote(ARROW))
js = open(SRC / 'app.js', encoding='utf-8').read().replace('__FILMS__', film_meta)

page = f'''<title>Harsh Purohit</title>
<meta name="description" content="Harsh Purohit, filmmaker based in Dubai, UAE. Photographer, videographer, director.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barriecito&amp;family=League+Gothic&amp;display=swap">
<style>
{css}
</style>
<div class="hp" id="hp">
<a class="skip" href="#about">Skip to introduction</a>
<header class="rail" aria-label="Site navigation">
<a class="rail-mark" href="#cover" data-target="cover" aria-label="Harsh Purohit, back to the cover">HP</a>
<nav class="rail-track" aria-label="Scenes">{ticks}<span class="rail-fill" aria-hidden="true"></span></nav>
<div class="rail-now" aria-live="polite"><span class="rail-scene">COVER</span></div>
<span class="rail-tc" aria-hidden="true">TC 00:00:00:00</span>
<button class="rail-menu" type="button" aria-expanded="false" aria-controls="panel"><span>INDEX</span></button>
</header>
<div class="scrim" hidden></div>
<aside class="panel" id="panel" aria-label="Index" hidden>
<div class="panel-in">
<div class="panel-top"><span class="panel-h">INDEX</span><button class="panel-x" type="button">CLOSE</button></div>
<ol class="ix">{index_html}</ol>
<p class="panel-foot">HARSH PUROHIT / PHOTOGRAPHER, VIDEOGRAPHER, DIRECTOR</p>
</div>
</aside>
<main id="main-view">{SCENES}
</main>
<div class="fcard" aria-hidden="true"><span class="fc-t">JAHAAN</span><span class="fc-y">2025</span><span class="fc-l"></span><span class="fc-r"></span></div>
<div class="lb" role="dialog" aria-modal="true" aria-label="Film still" hidden>
<figure class="lb-fig"><img src="" alt=""><figcaption><span class="lb-t"></span><span class="lb-l"></span></figcaption></figure>
<div class="lb-ctrl"><button type="button" data-lb="-1">PREV</button><button type="button" data-lb="0">CLOSE</button><button type="button" data-lb="1">NEXT</button></div>
</div>
</div>
<script>
{js}
</script>
'''
# 1) dist/index.html: a complete standalone document (open it directly or deploy the dist/ folder anywhere)
DIST.mkdir(exist_ok=True)
doc = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
       '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
       + page.split('<div class="hp" id="hp">')[0] + '</head>\n<body>\n<div class="hp" id="hp">'
       + page.split('<div class="hp" id="hp">', 1)[1] + '</body>\n</html>\n')
(DIST / 'index.html').write_text(doc, encoding='utf-8')
for sub in ('images', 'fonts'):
    if (DIST / sub).exists(): shutil.rmtree(DIST / sub)
    shutil.copytree(SRC / sub, DIST / sub)
# 2) dist/artifact-fragment.html: the same page without <html>/<head>/<body>, the form the claude.ai artifact host expects
(DIST / 'artifact-fragment.html').write_text(page, encoding='utf-8')
print('built', DIST / 'index.html', len(doc), 'bytes')
