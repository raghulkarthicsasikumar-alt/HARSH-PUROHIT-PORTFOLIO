(function () {
  'use strict';
  var FILMS = __FILMS__;
  var hp = document.getElementById('hp');
  var main = document.getElementById('main-view');
  var rail = hp.querySelector('.rail');
  var railScene = hp.querySelector('.rail-scene');
  var railTc = hp.querySelector('.rail-tc');
  var railFill = hp.querySelector('.rail-fill');
  var menuBtn = hp.querySelector('.rail-menu');
  var panel = document.getElementById('panel');
  var scrim = hp.querySelector('.scrim');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var clamp = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };
  var easeBack = function (t) { var c = 1.25; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

  // ---------- scene registry ----------
  var scenes = [].slice.call(hp.querySelectorAll('.scene')).map(function (sec) {
    var s = {
      el: sec, id: sec.id, kind: sec.getAttribute('data-kind'), len: parseFloat(sec.getAttribute('data-len')) || 2,
      label: sec.getAttribute('data-label'), cv: sec.querySelector('.cv'), last: -1,
      once: sec.getAttribute('data-len') === '1', played: -1,
      anims: [].slice.call(sec.querySelectorAll('.an')).map(function (el) {
        return { el: el, fx: el.getAttribute('data-fx'), a: parseFloat(el.getAttribute('data-a')), b: parseFloat(el.getAttribute('data-b')), r: parseFloat(el.getAttribute('data-r') || '0'), last: -1 };
      }),
      draws: [].slice.call(sec.querySelectorAll('path.draw')).map(function (p) {
        return { el: p, a: parseFloat(p.getAttribute('data-a')), b: parseFloat(p.getAttribute('data-b')), len: 0, last: -1 };
      }),
      letters: [].slice.call(sec.querySelectorAll('.lt')),
      layers: [].slice.call(sec.querySelectorAll('.pl')),
      lines: [].slice.call(sec.querySelectorAll('.name .line')),
      track: sec.querySelector('.track')
    };
    return s;
  });

  var pm = false, W = 0, H = 0, top0 = 0;

  function measureDraws() {
    scenes.forEach(function (s) {
      s.draws.forEach(function (d) {
        if (d.el.getClientRects().length === 0) return;   // hidden variant (desktop vs phone)
        d.len = d.el.getTotalLength();
        d.el.style.strokeDasharray = d.len + ' ' + d.len;
        d.last = -1;
      });
      s.anims.forEach(function (a) { a.last = -1; });
      s.last = -1;
    });
  }

  function layout() {
    var w = window.innerWidth, h = window.innerHeight;
    pm = (w / h < 1.05) || w < 700;
    hp.classList.toggle('pm', pm);
    var railW = pm ? 0 : rail.offsetWidth;
    top0 = pm ? rail.offsetHeight : 0;
    W = w - railW; H = h - top0;
    var cw = pm ? 900 : 1600, ch = pm ? 1600 : 900;
    var sc = Math.min(W / cw, H / ch);
    var ox = (W - cw * sc) / 2, oy = (H - ch * sc) / 2;
    scenes.forEach(function (s) {
      var stage = s.el.querySelector('.stage'), k = sc, x0 = ox, y0 = oy, sh = H;
      if (s.kind === 'film') {
        // film pages scroll normally: scale to the width so the stills get as big as the screen allows
        k = pm ? W / 900 : Math.min(W / 1600, 1.25);
        x0 = (W - cw * k) / 2; y0 = 0;
        var notes = s.el.querySelector('.notes');
        sh = Math.ceil((notes.offsetTop + notes.offsetHeight + (pm ? 110 : 90)) * k);
        stage.style.height = sh + 'px';
      } else if (s.once) stage.style.height = H + 'px';
      else s.el.style.height = Math.round(s.len * H) + 'px';
      s.cv.style.transform = 'translate(' + x0.toFixed(2) + 'px,' + y0.toFixed(2) + 'px) scale(' + k.toFixed(5) + ')';
      joinLines(s, k, x0, y0, sh);
    });
    measureDraws();
    update(true);
  }

  // ---------- the maze: two spines run the full height of the page; every loose line end joins one ----------
  function joinLines(s, k, x0, y0, sh) {
    var gut = pm ? 7 : 10;
    var L = ((gut - x0) / k).toFixed(1), Rr = ((W - gut - x0) / k).toFixed(1);
    var top = (-y0 / k).toFixed(1), bot = ((sh - y0) / k).toFixed(1);
    s.el.querySelectorAll('.wires').forEach(function (svg) {
      if (svg.getClientRects().length === 0) return;
      svg.querySelectorAll('path.spine').forEach(function (p) {
        p.setAttribute('d', 'M' + (p.getAttribute('data-side') === 'l' ? L : Rr) + ' ' + top + 'V' + bot);
      });
      svg.querySelectorAll('path.draw').forEach(function (p) {
        // every loose end curves into a spine with the PDF's corner radius: no sharp joins
        var r = 22, Ln = +L, Rn = +Rr, fx = function (v) { return (+v).toFixed(1); };
        var d = p.getAttribute('data-d0');
        d = d.replace(/^M-900 58\.7L0\.0 58\.7L15\.2 58\.7C19\.2 58\.7 23\.1 60\.3 26\.0 63\.1C28\.8 66\.0 30\.4 69\.9 30\.4 73\.9/,
                      'M' + L + ' 18C' + L + ' 46 30.4 42 30.4 73.9')
             .replace(/^M-900 ([\d.]+)(L0\.0 \1)?/, function (m, y) { return 'M' + L + ' ' + fx(y - r) + 'Q' + L + ' ' + y + ' ' + fx(Ln + r) + ' ' + y; })
             .replace(/^M(?:2700|2500) ([\d.]+)/, function (m, y) { return 'M' + Rr + ' ' + fx(y - r) + 'Q' + Rr + ' ' + y + ' ' + fx(Rn - r) + ' ' + y; })
             .replace(/(?:L1600\.0 ([\d.]+))?L(?:2500|2700) ([\d.]+)$/, function (m, a, y) { return 'L' + fx(Rn - r) + ' ' + y + 'Q' + Rr + ' ' + y + ' ' + Rr + ' ' + fx(+y + r); })
             .replace(/L-900 ([\d.]+)$/, function (m, y) { return 'L' + fx(Ln + r) + ' ' + y + 'Q' + L + ' ' + y + ' ' + L + ' ' + fx(+y + r); });
        p.setAttribute('d', d);
      });
    });
  }

  // ---------- applying progress ----------
  function setT(a, t) {
    if (Math.abs(t - a.last) < 0.0005) return;
    a.last = t;
    var el = a.el, k = 1 - t, st = el.style;
    switch (a.fx) {
      case 'drop':
        st.transform = k ? 'translateY(' + (-k * 150).toFixed(1) + 'px) rotate(' + (-k * 6).toFixed(2) + 'deg)' : '';
        st.opacity = Math.min(1, t * 1.6);
        break;
      case 'left':
        st.transform = k ? 'translateX(' + (-k * 320).toFixed(1) + 'px) rotate(' + (-k * 4).toFixed(2) + 'deg)' : '';
        st.opacity = Math.min(1, t * 1.5);
        break;
      case 'deal':
        st.transform = k ? 'translate(' + (k * a.r * 18).toFixed(1) + 'px,' + (k * 380).toFixed(1) + 'px) rotate(' + (k * a.r * 2.2).toFixed(2) + 'deg) scale(' + (1 + k * 0.15).toFixed(3) + ')' : '';
        st.opacity = Math.min(1, t * 2.5);
        break;
      case 'wipe':
        st.clipPath = k ? 'inset(-12% ' + (k * 100).toFixed(2) + '% -12% -2%)' : '';
        break;
      case 'band':
        st.transform = k ? 'translate(' + (-k * 900).toFixed(1) + 'px,' + (-k * 520).toFixed(1) + 'px)' : '';
        break;
      case 'rise':
        st.transform = k ? 'translateY(' + (k * 46).toFixed(1) + 'px)' : '';
        st.opacity = t;
        break;
      case 'fade':
        st.opacity = t;
        break;
    }
  }

  function setDraw(d, t) {
    if (!d.len || Math.abs(t - d.last) < 0.0005) return;
    d.last = t;
    d.el.style.strokeDashoffset = (d.len * (1 - t)).toFixed(1);
  }

  var loadT = reduce ? 1 : 0;
  var mx = 0, my = 0;

  function applyCover(s, p) {
    var q = loadT;
    s.draws.forEach(function (d) { setDraw(d, easeOut(clamp((q - d.a) / (d.b - d.a)))); });
    s.letters.forEach(function (el) {
      var i = +el.getAttribute('data-i'), second = el.classList.contains('p');
      var a = (second ? 0.22 : 0.06) + i * 0.05;
      var t = easeBack(clamp((q - a) / 0.32)), k = 1 - t;
      el.style.transform = k > 0.001 ? 'translateY(' + (-k * 260).toFixed(1) + 'px) rotate(' + (k * (i % 2 ? 14 : -12)).toFixed(2) + 'deg)' : '';
      el.style.opacity = Math.min(1, t * 2);
    });
    s.anims.forEach(function (a) { setT(a, easeOut(clamp((q - a.a) / (a.b - a.a)))); });
    // echo: layers fan out on load, spread further as you scroll, lean toward the mouse
    var fan = easeOut(clamp((q - 0.1) / 0.6)) * (1 + p * 1.3);
    var k = pm ? 0.9 : 1;
    s.layers.forEach(function (img, i) {
      var o = parseFloat(img.getAttribute('data-o')) * k * fan + (fine ? mx * (i - 3) * 10 : 0);
      var y = (fine ? my * (3 - i) * 5 : 0) + p * (3 - i) * 14;
      img.style.transform = 'translate(' + o.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
    });
    var drift = pm ? 0.35 : 1;
    if (s.lines[0]) s.lines[0].style.transform = p ? 'translateX(' + (-p * 40 * drift).toFixed(1) + 'px)' : '';
    if (s.lines[1]) s.lines[1].style.transform = p ? 'translateX(' + (p * 28 * drift).toFixed(1) + 'px)' : '';
  }

  function applyScene(s, p) {
    if (s.kind === 'cover') { applyCover(s, p); return; }
    var pa = reduce ? 1 : p;   // reduced motion: scenes are shown fully assembled
    s.draws.forEach(function (d) { setDraw(d, easeOut(clamp((pa - d.a) / (d.b - d.a)))); });
    s.anims.forEach(function (a) {
      var t = clamp((pa - a.a) / (a.b - a.a));
      setT(a, a.fx === 'deal' ? easeBack(t) : easeOut(t));
    });
    if (s.track) {
      var tw = s.track.scrollWidth, cw = pm ? 900 : 1600;
      var from = cw + 40, to = cw - tw - (pm ? 60 : 120);
      var t = clamp((p - 0.06) / 0.86); if (!reduce) t = easeOut(t);
      s.track.style.transform = 'translateX(' + (from + (to - from) * t).toFixed(1) + 'px)';
    }
  }

  function progressOf(s) {
    var r = s.el.getBoundingClientRect();
    var total = s.el.offsetHeight - H;
    var lead = 0.5 * H;
    return clamp((top0 - r.top + lead) / (total + lead));
  }

  // ---------- rail state ----------
  var ticks = [].slice.call(hp.querySelectorAll('.tick'));
  var ixLinks = [].slice.call(hp.querySelectorAll('.ix a'));
  var current = '';
  function setCurrent(id, label) {
    if (id === current) return;
    current = id;
    railScene.textContent = label;
    ticks.concat(ixLinks).forEach(function (a) {
      var on = a.getAttribute('data-target') === id;
      a.classList.toggle('on', on);
      if (a.tagName === 'A' && a.closest('.ix')) { if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); }
    });
  }
  function timecode(f) {
    var secs = f * 452, fr = Math.floor((secs % 1) * 24);
    var s = Math.floor(secs), pad = function (n) { return (n < 10 ? '0' : '') + n; };
    return 'TC 00:' + pad(Math.floor(s / 60)) + ':' + pad(s % 60) + ':' + pad(fr);
  }

  function update(force) {
    var curId = 'cover', curLabel = 'COVER';
    scenes.forEach(function (s) {
      var top = s.el.getBoundingClientRect().top;
      if (top - top0 <= H * 0.45) { curId = s.id; curLabel = s.label; }
      if (s.once) {
        if (s.played < 0 && top < window.innerHeight * 0.7) play(s);
        else if (s.played < 0 && force) applyScene(s, 0);
        return;
      }
      var p = progressOf(s);
      if (force || s.kind === 'cover' || Math.abs(p - s.last) > 0.0004) { s.last = p; applyScene(s, p); }
    });
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var f = max > 0 ? clamp(window.scrollY / max) : 0;
    setCurrent(curId, curLabel);
    railTc.textContent = timecode(f);
    railFill.style.height = 'calc(' + (f * 100).toFixed(2) + '% - ' + (f * 28).toFixed(1) + 'px)';
    hp.style.setProperty('--prog', f.toFixed(4));
  }

  function play(s) {
    s.played = 0;
    if (reduce) { s.played = 1; applyScene(s, 1); return; }
    var t0 = performance.now();
    (function step(now) {
      s.played = clamp((now - t0) / 1300);
      applyScene(s, s.played);
      if (s.played < 1) requestAnimationFrame(step);
    })(t0);
  }

  var queued = false;
  function onScroll() { if (!queued) { queued = true; requestAnimationFrame(function () { queued = false; update(false); }); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  var rz;
  window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(layout, 120); });

  // cover assembly on load (time based, so the opening frame always completes)
  function runIntro() {
    if (reduce) { update(true); return; }
    var t0 = performance.now();
    (function step(now) {
      loadT = clamp((now - t0) / 1900);
      update(false);
      if (loadT < 1) requestAnimationFrame(step);
    })(t0);
  }

  // ---------- cursor + hover card ----------
  var card = hp.querySelector('.fcard');
  var fcT = card.querySelector('.fc-t'), fcY = card.querySelector('.fc-y'), fcL = card.querySelector('.fc-l'), fcR = card.querySelector('.fc-r');
  var drifters = scenes.filter(function (s) { return s.kind === 'film' || s.kind === 'intro'; });
  if (fine && !reduce) {
    var tx = -100, ty = -100, cx = tx, cy = ty;
    window.addEventListener('mousemove', function (e) { tx = e.clientX; ty = e.clientY; }, { passive: true });
    (function loop() {
      cx += (tx - cx) * 0.14; cy += (ty - cy) * 0.14;
      var cw = card.offsetWidth || 360, ch = card.offsetHeight || 200;
      var left = cx + cw + 40 > window.innerWidth ? cx - cw - 24 : cx + 26;
      var topY = Math.max(8, Math.min(cy + 24, window.innerHeight - ch - 12));
      card.style.transform = 'translate3d(' + left.toFixed(1) + 'px,' + topY.toFixed(1) + 'px,0)';
      if (tx >= 0) {
        var nx = (tx / window.innerWidth - 0.5) * 2, ny = (ty / window.innerHeight - 0.5) * 2;
        mx += (nx - mx) * 0.05; my += (ny - my) * 0.05;
        var vh = window.innerHeight;
        drifters.forEach(function (s) {
          var r = s.el.getBoundingClientRect();
          if (r.bottom < 0 || r.top > vh) return;
          s.cv.style.setProperty('--mx', mx.toFixed(3)); s.cv.style.setProperty('--my', my.toFixed(3));
        });
      }
      requestAnimationFrame(loop);
    })();
  }
  var stills = [].slice.call(main.querySelectorAll('.still'));
  stills.forEach(function (b) {
    b.addEventListener('mouseenter', function () {
      var f = FILMS[+b.getAttribute('data-film')];
      fcT.textContent = f.t; fcY.textContent = f.y; fcL.textContent = f.l; fcR.textContent = 'ROLE: ' + f.r.replace(/\.$/, '');
      card.classList.add('on');
    });
    b.addEventListener('mouseleave', function () { card.classList.remove('on'); });
    b.addEventListener('click', function () { openLb(stills.indexOf(b)); });
  });

  // ---------- lightbox ----------
  var lb = hp.querySelector('.lb'), lbImg = lb.querySelector('img'), lbT = lb.querySelector('.lb-t'), lbL = lb.querySelector('.lb-l'), at = -1;
  function openLb(i) {
    at = (i + stills.length) % stills.length;
    var img = stills[at].querySelector('img');
    lbImg.src = img.getAttribute('src'); lbImg.alt = img.alt; lbT.textContent = img.alt;
    lbL.textContent = 'ROLE: ' + FILMS[+stills[at].getAttribute('data-film')].r.replace(/\.$/, '');
    lb.hidden = false; card.classList.remove('on');
    lb.querySelector('[data-lb="0"]').focus();
  }
  function closeLb() { lb.hidden = true; if (stills[at]) stills[at].focus({ preventScroll: true }); at = -1; }
  lb.addEventListener('click', function (e) {
    var d = e.target.closest('[data-lb]');
    if (d) { var v = +d.getAttribute('data-lb'); if (v === 0) closeLb(); else openLb(at + v); }
    else if (e.target === lb) closeLb();
  });

  // ---------- copy contact details ----------
  hp.querySelectorAll('.copy').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      var done = function (ok) { btn.textContent = ok ? 'COPIED' : 'SELECT TO COPY'; setTimeout(function () { btn.textContent = 'COPY'; }, 1600); };
      var fallback = function () {
        var v = btn.parentNode.querySelector('.v'), r = document.createRange();
        r.selectNodeContents(v); var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r); done(false);
      };
      try { navigator.clipboard.writeText(text).then(function () { done(true); }, fallback); } catch (e) { fallback(); }
    });
  });

  // ---------- index panel ----------
  function openPanel() {
    panel.hidden = false; scrim.hidden = false;
    requestAnimationFrame(function () { panel.classList.add('open'); scrim.classList.add('open'); });
    menuBtn.setAttribute('aria-expanded', 'true');
    var on = panel.querySelector('.ix a.on') || panel.querySelector('.ix a');
    setTimeout(function () { on.focus({ preventScroll: true }); }, 60);
  }
  function closePanel(returnFocus) {
    if (panel.hidden) return;
    panel.classList.remove('open'); scrim.classList.remove('open');
    menuBtn.setAttribute('aria-expanded', 'false');
    setTimeout(function () { panel.hidden = true; scrim.hidden = true; }, reduce ? 0 : 480);
    if (returnFocus) menuBtn.focus();
  }
  menuBtn.addEventListener('click', function () { if (panel.hidden || !panel.classList.contains('open')) openPanel(); else closePanel(true); });
  panel.querySelector('.panel-x').addEventListener('click', function () { closePanel(true); });
  scrim.addEventListener('click', function () { closePanel(true); });

  document.addEventListener('keydown', function (e) {
    if (!lb.hidden) {
      if (e.key === 'Escape') closeLb();
      else if (e.key === 'ArrowRight') openLb(at + 1);
      else if (e.key === 'ArrowLeft') openLb(at - 1);
      return;
    }
    if (e.key === 'Escape' && !panel.hidden) closePanel(true);
  });

  // ---------- routing: #bts is its own page, every other #id is a scene ----------
  function sceneTarget(id) {
    var s = null;
    scenes.forEach(function (x) { if (x.id === id) s = x; });
    return s;
  }
  function jumpTo(id) {
    var s = sceneTarget(id);
    if (!s) { window.scrollTo(0, 0); return; }
    var secTop = s.el.getBoundingClientRect().top + window.scrollY - top0;
    var total = s.el.offsetHeight - H, lead = 0.5 * H;
    var want = s.kind === 'cover' ? 0 : s.kind === 'bts' ? 0.45 : 0.82;
    var y = s.once ? secTop : secTop + want * (total + lead) - lead;
    window.scrollTo(0, Math.max(0, Math.round(y)));
  }
  function route() {
    var id = decodeURIComponent(location.hash.slice(1));
    if (id) jumpTo(id);
    update(true);
  }
  hp.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    if (a.classList.contains('missing')) { e.preventDefault(); return; }
    var id = a.getAttribute('href').slice(1);
    if (!sceneTarget(id)) return;
    e.preventDefault();
    closePanel(false);
    if (location.hash === '#' + id) route();
    else location.hash = id;
  });
  window.addEventListener('hashchange', route);

  // ---------- boot ----------
  layout();
  if (location.hash) route();
  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 900); })]).then(runIntro);
  var moved = false;
  ['wheel', 'touchmove', 'keydown'].forEach(function (ev) { window.addEventListener(ev, function () { moved = true; }, { passive: true, once: true }); });
  fontsReady.then(function () { layout(); if (location.hash && !moved) route(); });
})();
