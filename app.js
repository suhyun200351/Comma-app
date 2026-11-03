/* 콤마 app runtime — router, baseline fix, link binding */
(function () {
  'use strict';
  var W = 393, H = 852;
  var stage = document.getElementById('stage');
  var state = { key: null, history: [], loggedIn: false };
  var scale = 1;
  window.COMMA = state;

  /* ---------- fit stage to window ---------- */
  function fit() {
    var vw = document.documentElement.clientWidth || window.innerWidth, vh = window.innerHeight;
    if (vw < 700) {
      // 폰: 가로 폭에 꽉 맞춤(모든 기종). 세로가 모자라면 페이지 스크롤
      // Safari 안에서 열면 위 상태바(54) · 아래 홈 막대(34) 자리는 브라우저가 따로 쓰므로 잘라 냄
      // 홈 화면 앱(standalone)으로 열면 그 자리가 진짜 상태바 · 홈 막대라 그대로 둠
      var standalone = window.navigator.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
      var TOP = standalone ? 0 : 54, BOT = standalone ? 0 : 34;
      scale = vw / W;
      stage.style.transform = 'translateY(' + (-TOP * scale).toFixed(2) + 'px) scale(' + scale + ')';
      document.body.style.height = Math.floor((H - TOP - BOT) * scale) + 'px';
      document.documentElement.classList.add('phone');
    } else {
      // 컴퓨터 · 태블릿: 화면 안에 통째로 보이게
      scale = Math.min(vw / W, vh / H);
      stage.style.transform = 'translate(' + Math.max(0, (vw - W * scale) / 2) + 'px,' + Math.max(0, (vh - H * scale) / 2) + 'px) scale(' + scale + ')';
      document.body.style.height = '';
      document.documentElement.classList.remove('phone');
    }
  }
  window.addEventListener('resize', fit); fit();

  /* ---------- text baseline correction (Figma metrics) ---------- */
  function fixBaselines(root) {
    var lns = root.querySelectorAll('.ln');
    for (var i = 0; i < lns.length; i++) {
      var ln = lns[i]; if (ln.dataset.fixed) continue;
      var p = document.createElement('span'); p.className = 'bp'; ln.insertBefore(p, ln.firstChild);
      var d = parseFloat(ln.dataset.b) - (p.getBoundingClientRect().top - ln.getBoundingClientRect().top) / scale;
      p.remove(); ln.style.transform = 'translateY(' + d.toFixed(3) + 'px)'; ln.dataset.fixed = 1;
    }
  }

  /* ---------- geometry helpers ---------- */
  function rel(el, scr) {
    var a = el.getBoundingClientRect(), b = scr.getBoundingClientRect();
    var sc = el.closest('.scroller'); var st = sc ? sc.scrollTop : 0;
    return { x: (a.left - b.left) / scale, y: (a.top - b.top) / scale + st, w: a.width / scale, h: a.height / scale };
  }
  function txt(el) { return (el.textContent || '').replace(/​/g, '').replace(/\s*\n\s*/g, ' ').trim(); }
  function isWrap(el) { return !el || el.classList.contains('screen') || el.classList.contains('content') || el.classList.contains('scroller') || el.classList.contains('fixed'); }

  function findText(scr, re, idx) {
    var ts = [].slice.call(scr.querySelectorAll('.t')).filter(function (t) {
      var s = ''; t.querySelectorAll('.ln').forEach(function (l, i) { s += (i ? ' ' : '') + txt(l); });
      return re.test(s.trim());
    });
    ts.sort(function (a, b) { return rel(a, scr).y - rel(b, scr).y; });
    return ts[idx || 0];
  }
  function pick(t, scr, opt) {
    var anc = [], p = t.parentElement;
    while (p && !isWrap(p)) { anc.push(p); p = p.parentElement; }
    if (opt && opt.maxH) {
      var best = null;
      for (var i = 0; i < anc.length; i++) { var r = rel(anc[i], scr); if (r.h <= opt.maxH + 0.6 && r.w <= W + 0.6) best = anc[i]; else if (best) break; }
      return best || t;
    }
    for (var j = 0; j < anc.length; j++) { var r2 = rel(anc[j], scr); if (r2.h > 110) break; if (anc[j].dataset.comp || anc[j].dataset.paint) return anc[j]; }
    for (var k = 0; k < anc.length; k++) { if (rel(anc[k], scr).h <= 64.6) return anc[k]; }
    return t;
  }

  /* ---------- screen resolve ---------- */
  var KEYS = Object.keys(window.SCREENS);
  function S(pre) {
    if (window.SCREENS[pre]) return pre;
    var hit = KEYS.filter(function (k) { var n = window.SCREEN_META[k].name; return n === pre || n.indexOf(pre + ' ') === 0; });
    return hit.length ? hit[0] : null;
  }
  window.S = S;

  /* ---------- navigation ---------- */
  var transitioning = false;
  function go(dest, opts) {
    opts = opts || {};
    if (typeof dest === 'function') dest = dest();
    if (dest === 'BACK') return back();
    var k = S(dest); if (!k) { console.warn('no screen', dest); return; }
    if (busy) return;
    if (window.LOGIN_ONLY && window.LOGIN_ONLY.test(k) && !state.loggedIn) {
      state.afterLogin = k; if (state.key) state.history.push(state.key); show('A-1');
      setTimeout(function () { if (window.COMMA_TOAST) window.COMMA_TOAST('로그인하면 볼 수 있어요'); }, 260); return;
    }
    var m = window.MORPH && state.key && window.MORPH[state.key + '>' + k];
    if (m && m.sheet) { if (state.key) state.history.push(state.key); return sheetOpen(k, m); }
    if (m) return (m instanceof RegExp) ? morph(k, m) : flip(k, m);
    if (state.key && !opts.replace) state.history.push(state.key);
    show(k, opts);
  }

  /* ---------- in-place morph (accordion: 접히고 펼쳐지는 바) ---------- */
  var busy = false;
  window.COMMA_UNBUSY = function () { busy = false; };
  var HEADER = 103, BOTTOM = 740;
  var ease = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  function tween(ms, fn, done) {
    var t0 = performance.now();
    (function step(now) {
      var p = Math.min(1, (now - t0) / ms); fn(ease(p));
      if (p < 1) requestAnimationFrame(step); else if (done) done();
    })(t0);
  }
  function anchorRow(scr, re) { var t = findText(scr, re); return t ? pick(t, scr, { maxH: 60 }) : null; }
  function firstText(el) { var t = el.classList && el.classList.contains('t') ? el : el.querySelector && el.querySelector('.t'); return t ? txt(t) : ''; }
  function bodyBlocks(scr, anchor) {
    var out = [], ya = rel(anchor, scr).y;
    (function walk(el) {
      [].forEach.call(el.children, function (c) {
        if (!c.dataset || !c.dataset.name) { if (isWrap(c)) walk(c); return; }
        var r = rel(c, scr);
        if (r.h > 800 || r.y + r.h <= HEADER + .5 || r.y >= BOTTOM) return;
        if (c === anchor) { out.push(c); return; }
        var below = r.y >= ya + 1;
        var multi = [].filter.call(c.children, function (x) { return x.dataset && x.dataset.name; }).length > 1;
        if (c.contains(anchor) || r.y < HEADER - .5 || (below && r.h > 140 && multi && !c.classList.contains('t'))) walk(c);
        else out.push(c);
      });
    })(scr);
    return out;
  }
  function sameAt(scr, block) {
    var te = block.classList.contains('t') ? block : block.querySelector('.t'); if (!te) return false;
    var s = txt(te), ty = rel(te, block.closest('.screen')).y;
    return [].some.call(scr.querySelectorAll('.t'), function (t) { return txt(t) === s && Math.abs(rel(t, scr).y - ty) < 1.5; });
  }
  function setClip(el, top) { el.style.clipPath = top > 0 ? 'inset(' + top.toFixed(2) + 'px -400px -400px -400px)' : ''; }
  function slide(blocks, scr, from, to, clipTop, ms, done) {
    var base = blocks.map(function (b) { return rel(b, scr).y; }); // natural y (no transform yet)
    tween(ms, function (p) {
      var d = from + (to - from) * p;
      blocks.forEach(function (b, i) { b.style.transform = 'translateY(' + d.toFixed(2) + 'px)'; setClip(b, clipTop - (base[i] + d)); });
    }, done);
  }
  function reveal(scr, anchor) {
    var ya = rel(anchor, scr), lim = ya.y + ya.h - 1;
    var bl = bodyBlocks(scr, anchor).filter(function (b) { return b !== anchor && rel(b, scr).y >= lim; });
    bl.sort(function (a, b) { return rel(a, scr).y - rel(b, scr).y; });
    bl.forEach(function (b, i) {
      b.animate([{ opacity: 0, transform: 'translateY(28px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 420, delay: 40 + i * 55, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
    });
  }
  function spinIcons(oldRow, newRow) {
    var olds = [].map.call(oldRow.querySelectorAll('img'), function (i) { return i.getAttribute('src'); });
    [].forEach.call(newRow.querySelectorAll('img'), function (img) {
      if (olds.indexOf(img.getAttribute('src')) >= 0) return;
      img.animate([{ transform: 'rotate(-90deg)', opacity: .2 }, { transform: 'rotate(0)', opacity: 1 }], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
    });
  }
  /* ---------- FLIP morph: 같은 줄은 제자리에서 움직이고, 새 줄은 펼쳐지고, 아래 시트는 밀려 올라옴 ---------- */
  function namedKids(el) { return [].filter.call(el.children, function (x) { return x.dataset && x.dataset.name; }); }
  function flipBlocks(scr) {
    var out = [];
    (function walk(el) {
      [].forEach.call(el.children, function (c) {
        if (!c.dataset || !c.dataset.name) { if (isWrap(c)) walk(c); return; }
        var r = rel(c, scr);
        if (r.h > 800 || r.y + r.h <= HEADER + .5) return;
        if (/Status bar|Home Indicator/.test(c.dataset.name)) return;
        var kids = namedKids(c), sheet = isSheet(r);
        if (!c.dataset.comp && !c.classList.contains('t') && !sheet && kids.length && (kids.length === 1 || r.h > 100)) walk(c);
        else out.push(c);
      });
    })(scr);
    return out;
  }
  function isSheet(r) { return r.y > 300 && r.y + r.h >= 730 && r.h > 150 && r.h < 520; }
  function keyOf(b) { var te = b.classList.contains('t') ? b : b.querySelector('.t'); return te ? txt(te) : ''; }
  function ghost(el, scr, into) {
    var r = rel(el, scr), w = document.createElement('div');
    w.style.cssText = 'position:absolute;left:' + r.x + 'px;top:' + r.y + 'px;width:' + r.w + 'px;height:' + r.h + 'px;z-index:5;pointer-events:none';
    var c = el.cloneNode(true); c.style.left = '0px'; c.style.top = '0px'; c.style.transform = ''; w.appendChild(c); into.appendChild(w); return w;
  }
  function flip(k, spec) {
    var oldScr = stage.lastChild;
    var holder = document.createElement('div'); holder.innerHTML = window.SCREENS[k];
    var neu = holder.firstChild;
    neu.classList.add('in'); neu.style.transition = 'none'; neu.style.visibility = 'hidden';
    stage.appendChild(neu); fixBaselines(neu);
    busy = true;
    state.key = k; bind(neu, k);
    if (window.ENHANCE && window.ENHANCE[k]) { try { window.ENHANCE[k](neu, api); } catch (e) { console.error(e); } }
    var BO = flipBlocks(oldScr), BN = flipBlocks(neu);
    var aO = spec.a ? anchorRow(oldScr, spec.a) : null, aN = spec.b ? anchorRow(neu, spec.b) : null;
    var pos = function (b, scr) { return rel(b, scr); };
    var oldInfo = BO.map(function (b) { return { el: b, key: keyOf(b), r: pos(b, oldScr), used: false }; });
    var plan = BN.map(function (b) {
      var r = pos(b, neu), key = keyOf(b), m = null;
      if (aN && (b === aN || b.contains(aN) || aN.contains(b)) && aO) {
        m = oldInfo.filter(function (o) { return o.el === aO || o.el.contains(aO) || aO.contains(o.el); })[0];
      }
      if (!m && key) m = oldInfo.filter(function (o) { return !o.used && o.key === key; }).sort(function (p, q) { return Math.abs(p.r.y - r.y) - Math.abs(q.r.y - r.y); })[0];
      if (!m && !key) m = oldInfo.filter(function (o) { return !o.used && !o.key && o.el.dataset.name === b.dataset.name && Math.abs(o.r.x - r.x) < 2 && Math.abs(o.r.y - r.y) < 2 && Math.abs(o.r.w - r.w) < 2; })[0];
      if (m) m.used = true;
      return { el: b, r: r, m: m };
    });
    try { history.replaceState(null, '', '#' + encodeURIComponent(k)); } catch (e) {}
    // 떠나는 것들(새 화면에 없는 줄·시트)은 복제해서 사라지게
    var layer = document.createElement('div'); layer.style.cssText = 'position:absolute;left:0;top:0;width:393px;height:852px;pointer-events:none;z-index:4';
    oldInfo.forEach(function (o) {
      if (o.used) return;
      var g = ghost(o.el, oldScr, layer), sheet = isSheet(o.r);
      g.animate(sheet ? [{ transform: 'none' }, { transform: 'translateY(' + (852 - o.r.y) + 'px)' }] : [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(' + (o.r.y < 300 ? -14 : 14) + 'px)' }],
        { duration: sheet ? 340 : 130, easing: sheet ? 'cubic-bezier(.4,0,1,1)' : 'ease-in', fill: 'forwards' });
    });
    neu.appendChild(layer);
    neu.style.visibility = 'visible'; oldScr.remove();
    var D = 420, EZ = 'cubic-bezier(.2,.8,.2,1)', i = 0;
    plan.sort(function (p, q) { return p.r.y - q.r.y; }).forEach(function (p) {
      var el = p.el, r = p.r;
      if (p.m) {
        var dy = p.m.r.y - r.y, dh = p.m.r.h - r.h;
        if (Math.abs(dy) < .5 && Math.abs(dh) < .5 && p.m.el.style.background === el.style.background) return;
        var kf0 = { transform: 'translateY(' + dy + 'px)' }, kf1 = { transform: 'translateY(0)' };
        if (p.m.el.style.background !== el.style.background) { el.animate([{ backgroundColor: getComputedStyle(p.m.el).backgroundColor === 'rgba(0, 0, 0, 0)' ? 'rgba(21,21,21,0)' : p.m.el.style.background }, {}], { duration: 380, easing: EZ }); }
        if (dh < -.5) { kf0.clipPath = 'inset(0 0 ' + (-dh) + 'px 0)'; kf1.clipPath = 'inset(0 0 0 0)'; }
        el.animate([kf0, kf1], { duration: D, easing: EZ });
      } else if (isSheet(r)) {
        el.animate([{ transform: 'translateY(' + (852 - r.y) + 'px)' }, { transform: 'none' }], { duration: 440, delay: 60, easing: EZ, fill: 'backwards' });
      } else {
        el.animate([{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: 150 + (i++) * 50, easing: EZ, fill: 'backwards' });
      }
    });
    setTimeout(function () { layer.remove(); busy = false; }, 560);
  }

  function morph(k, re) {
    var oldScr = stage.lastChild;
    var holder = document.createElement('div'); holder.innerHTML = window.SCREENS[k];
    var neu = holder.firstChild;
    neu.classList.add('in'); neu.style.transition = 'none'; neu.style.visibility = 'hidden';
    stage.appendChild(neu); fixBaselines(neu);
    var aO = anchorRow(oldScr, re), aN = anchorRow(neu, re);
    if (!aO || !aN) { neu.remove(); state.history.push(state.key); return show(k); }
    busy = true;
    var yo = rel(aO, oldScr).y, yn = rel(aN, neu).y, d = yn - yo;
    state.key = k; bind(neu, k);
    if (window.ENHANCE && window.ENHANCE[k]) { try { window.ENHANCE[k](neu, api); } catch (e) { console.error(e); } }
    try { history.replaceState(null, '', '#' + encodeURIComponent(k)); } catch (e) {}
    function swap() {
      neu.style.visibility = 'visible';
      // 아래 고정 바(답변 입력 등)가 새로 생기면 살짝 떠오르게
      var oldTexts = [].map.call(oldScr.querySelectorAll('.t'), txt);
      [].forEach.call(neu.querySelectorAll('[data-name]'), function (el) {
        if (!el.parentElement || isWrap(el.parentElement) === false) return;
        var r = rel(el, neu); if (r.y < BOTTOM || r.h > 200) return;
        var tt = [].map.call(el.querySelectorAll('.t'), txt);
        if (tt.length && tt.every(function (x) { return oldTexts.indexOf(x) < 0; })) el.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 320, delay: 120, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
      });
      oldScr.remove();
    }
    function finish() { spinIcons(aO, aN); setTimeout(function () { busy = false; }, 120); }
    if (d < -1) {
      // 바가 위로 올라감: 위쪽 내용은 스크롤되듯 접혀 올라가고, 아래에서 새 내용이 올라옴
      var clipTop = HEADER, moving = [];
      bodyBlocks(oldScr, aO).forEach(function (b) {
        var r = rel(b, oldScr);
        if (r.y < yo - .5 && sameAt(neu, b)) clipTop = Math.max(clipTop, r.y + r.h); else moving.push(b);
      });
      slide(moving, oldScr, 0, d, clipTop, 440, function () { swap(); reveal(neu, aN); finish(); });
    } else if (d > 1) {
      // 바가 아래로 내려감: 아래 내용은 가라앉고, 위쪽 내용이 위에서 내려오며 펼쳐짐
      var lim = yo + rel(aO, oldScr).h - 1;
      bodyBlocks(oldScr, aO).forEach(function (b) {
        if (b !== aO && rel(b, oldScr).y >= lim) b.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(16px)' }], { duration: 180, easing: 'ease-in', fill: 'forwards' });
      });
      setTimeout(function () {
        var clip2 = HEADER, mv = [];
        bodyBlocks(neu, aN).forEach(function (b) {
          var r = rel(b, neu);
          if (r.y < yn - .5 && sameAt(oldScr, b)) clip2 = Math.max(clip2, r.y + r.h); else mv.push(b);
        });
        mv.forEach(function (b) { b.style.transform = 'translateY(' + (-d) + 'px)'; });
        swap();
        mv.forEach(function (b) { b.style.transform = ''; });
        slide(mv, neu, -d, 0, clip2, 440, function () { mv.forEach(function (b) { b.style.transform = ''; b.style.clipPath = ''; }); finish(); });
      }, 170);
    } else {
      // 바 위치는 그대로: 아래 내용만 가라앉았다가 새 내용이 아래에서 올라옴
      var lim0 = yo + rel(aO, oldScr).h - 1, gone = 0;
      bodyBlocks(oldScr, aO).forEach(function (b) {
        if (b !== aO && rel(b, oldScr).y >= lim0) { gone++; b.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(16px)' }], { duration: 160, easing: 'ease-in', fill: 'forwards' }); }
      });
      setTimeout(function () { swap(); reveal(neu, aN); finish(); }, gone ? 150 : 0);
    }
  }
  function back() {
    if (!state.history.length || busy) return;
    var p = state.history.pop(), m = window.MORPH && window.MORPH[state.key + '>' + p];
    if (m && m.unsheet) return sheetClose(p, m);
    if (m && !m.sheet) return (m instanceof RegExp) ? morph(p, m) : flip(p, m);
    show(p, { back: true });
  }

  /* ---------- bottom sheet (질문 남기기 등): 아래에서 밀려 올라오고, 위쪽을 누르면 닫힘 ---------- */
  function sheetEl(scr, name) { return scr.querySelector('[data-name="' + name + '"]'); }
  // 시트 위쪽 손잡이: 누르거나 아래로 끌면 시트가 내려감
  function grabber(scr, sheet) {
    if (!sheet) return;
    var r = rel(sheet, scr), area = document.createElement('div');
    area.style.cssText = 'position:absolute;left:0;top:' + r.y + 'px;width:393px;height:40px;z-index:6;touch-action:none;cursor:grab';
    (scr.querySelector('.content') || scr).appendChild(area);
    var y0 = null, dy = 0, moved = false;
    area.addEventListener('pointerdown', function (e) { y0 = e.clientY; dy = 0; moved = false; try { area.setPointerCapture(e.pointerId); } catch (x) {} });
    area.addEventListener('pointermove', function (e) { if (y0 === null) return; dy = Math.max(0, (e.clientY - y0) / scale); if (dy > 4) moved = true; sheet.style.transform = 'translateY(' + dy + 'px)'; });
    area.addEventListener('pointerup', function () {
      if (y0 === null) return; y0 = null;
      if (!moved || dy > 70) { back(); return; }
      sheet.animate([{ transform: 'translateY(' + dy + 'px)' }, { transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' }); sheet.style.transform = '';
    });
  }
  function sheetOpen(k, spec) {
    busy = true;
    var holder = document.createElement('div'); holder.innerHTML = window.SCREENS[k];
    var neu = holder.firstChild; neu.classList.add('in'); neu.style.transition = 'none';
    var old = stage.lastChild;
    stage.appendChild(neu); fixBaselines(neu);
    if (spec.keep) {
      // 지금 보던 화면을 그대로 뒤에 두고 시트만 올림
      neu.style.background = 'transparent';
      (spec.hide || []).forEach(function (n) { [].forEach.call(neu.querySelectorAll('[data-name="' + n + '"]'), function (e) { if (e.parentElement && e.parentElement.classList.contains('content')) e.style.visibility = 'hidden'; }); });
    }
    state.key = k; bind(neu, k);
    if (window.ENHANCE && window.ENHANCE[k]) { try { window.ENHANCE[k](neu, api); } catch (e) { console.error(e); } }
    if (!spec.keep) old.remove();
    var sh = sheetEl(neu, spec.sheet);
    if (sh) { var h = rel(sh, neu); sh.animate([{ transform: 'translateY(' + (852 - h.y) + 'px)' }, { transform: 'none' }], { duration: 460, easing: 'cubic-bezier(.2,.8,.2,1)' }); }
    setTimeout(function () { busy = false; }, 480);
  }
  function sheetClose(p, spec) {
    busy = true;
    var old = stage.lastChild, sh = sheetEl(old, spec.unsheet);
    var holder = document.createElement('div'); holder.innerHTML = window.SCREENS[p];
    var neu = holder.firstChild; neu.classList.add('in'); neu.style.transition = 'none';
    stage.insertBefore(neu, old); fixBaselines(neu);
    state.key = p; bind(neu, p);
    if (window.ENHANCE && window.ENHANCE[p]) { try { window.ENHANCE[p](neu, api); } catch (e) { console.error(e); } }
    // 시트만 내려가고 나머지(홈)는 그대로
    [].forEach.call(old.querySelectorAll('.under'), function (u) { u.style.visibility = 'hidden'; });
    old.style.background = 'transparent';
    if (sh) { var cur = sh.style.transform || 'none'; sh.style.transform = ''; var h = rel(sh, old); sh.animate([{ transform: cur }, { transform: 'translateY(' + (852 - h.y) + 'px)' }], { duration: 300, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' }); }
    setTimeout(function () { [].slice.call(stage.children).forEach(function (c) { if (c !== neu) c.remove(); }); busy = false; }, 310);
  }

  /* ---------- 그 자리 아코디언: + 누르면 아래로 펼쳐지고 − 누르면 접힘 (같은 화면 안) ---------- */
  var ICON_PLUS = 'data:image/svg+xml;base64,' + btoa('<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 8L14 8" stroke-miterlimit="10" stroke="#8EB500"/><path d="M8 2L8 14" stroke-miterlimit="10" stroke="#8EB500"/></svg>');
  var ICON_MINUS = 'data:image/svg+xml;base64,' + btoa('<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 8L14 8" stroke-miterlimit="10" stroke="#C5C5C1"/></svg>');
  var OPEN_BG = 'rgb(45,45,43)';
  function accordion(scr, specs) {
    var content = scr.querySelector('.content'), scroller = scr.querySelector('.scroller');
    var baseH = content ? parseFloat(content.style.height) : H, extra = 0;
    var secs = specs.map(function (sp) {
      var t = findText(scr, sp.head); if (!t) return null;
      var head = pick(t, scr, { maxH: 60 }), hr = rel(head, scr);
      var body = sp.make ? sp.make(scr, head) : (function () { var n = head.nextElementSibling; while (n && !(n.dataset && n.dataset.name)) n = n.nextElementSibling; return n; })();
      if (!body) return null;
      var br = rel(body, scr);
      var icon = [].filter.call(head.querySelectorAll('img'), function (i) { var r = rel(i, scr); return r.w <= 18 && r.x > 300; })[0];
      return { sp: sp, head: head, body: body, icon: icon, h: br.h, bottom: hr.y + hr.h + (sp.make ? 0 : br.h), headBottom: hr.y + hr.h, open: !sp.make, dy: 0 };
    }).filter(Boolean);
    // 아래로 밀리는 것들(원래 위치 기준)
    var movers = [];
    (function walk(el) {
      [].forEach.call(el.children, function (c) {
        if (!c.dataset || !c.dataset.name) { if (c.classList && c.classList.contains('content')) walk(c); return; }
        if (c.closest('.fixed')) return;
        var r = rel(c, scr); if (r.h > 800) return;
        var inside = secs.some(function (sc) { return sc.head === c || sc.body === c || c.contains(sc.head) || c.contains(sc.body); });
        if (inside && !secs.some(function (sc) { return sc.head === c || sc.body === c; })) return walk(c);
        movers.push({ el: c, y: r.y, dy: 0 });
      });
    })(content || scr);
    secs.forEach(function (sc, i) {
      if (sc.sp.closed && sc.open) {
        sc.open = false; sc.body.style.clipPath = 'inset(0 0 100% 0)'; sc.body.style.opacity = '0';
        if (sc.icon) sc.icon.src = ICON_PLUS; sc.head.style.backgroundColor = 'transparent';
        movers.forEach(function (m) { if (m.el !== sc.body && m.el !== sc.head && m.y >= sc.headBottom - .5) { m.dy -= sc.h; m.el.style.transform = 'translateY(' + m.dy + 'px)'; } });
        extra -= sc.h;
      }
      if (!sc.open) { sc.body.style.clipPath = 'inset(0 0 100% 0)'; sc.body.style.opacity = '0'; sc.bottom = sc.headBottom; }
      hot(sc.head, function () { toggle(sc); });
    });
    function setIcon(sc, open) {
      if (sc.icon) { sc.icon.src = open ? ICON_MINUS : ICON_PLUS; sc.icon.animate([{ transform: 'rotate(-90deg)', opacity: .3 }, { transform: 'none', opacity: 1 }], { duration: 300, easing: 'cubic-bezier(.2,.8,.2,1)' }); }
      sc.head.style.transition = 'background-color .3s'; sc.head.style.backgroundColor = open ? OPEN_BG : 'transparent';
    }
    function toggle(sc) {
      if (busy) return; busy = true;
      var open = !sc.open, d = open ? sc.h : -sc.h, D = 420, EZ = 'cubic-bezier(.2,.8,.2,1)';
      sc.open = open; setIcon(sc, open);
      // 이 섹션 아래에 있는 것들 이동
      movers.forEach(function (m) {
        if (m.el === sc.body || m.el === sc.head || m.y < sc.headBottom - .5) return;
        var from = m.dy; m.dy += d;
        m.el.animate([{ transform: 'translateY(' + from + 'px)' }, { transform: 'translateY(' + m.dy + 'px)' }], { duration: D, easing: EZ, fill: 'forwards' });
      });
      var b = sc.body, mv = movers.filter(function (m) { return m.el === b; })[0], by = mv ? mv.dy : 0;
      if (open) {
        b.style.opacity = '1';
        b.animate([{ clipPath: 'inset(0 0 100% 0)', transform: 'translateY(' + by + 'px)' }, { clipPath: 'inset(0 0 0% 0)', transform: 'translateY(' + by + 'px)' }], { duration: D, easing: EZ, fill: 'forwards' });
        [].forEach.call(namedKids(b), function (row, i) { row.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 360, delay: 60 + i * 50, easing: EZ, fill: 'backwards' }); });
        b.style.clipPath = '';
      } else {
        b.animate([{ clipPath: 'inset(0 0 0% 0)', transform: 'translateY(' + by + 'px)' }, { clipPath: 'inset(0 0 100% 0)', transform: 'translateY(' + by + 'px)' }], { duration: 320, easing: EZ, fill: 'forwards' });
      }
      extra += d;
      if (content) content.style.height = (baseH + Math.max(0, extra)) + 'px';
      setTimeout(function () { busy = false; }, D);
    }
    return secs;
  }

  /* ---------- 브라우저 뒤로가기 · 왼쪽 가장자리 스와이프 = 앱 안에서 뒤로 ---------- */
  try {
    history.pushState({ comma: 1 }, '', location.href);
    window.addEventListener('popstate', function () { back(); try { history.pushState({ comma: 1 }, '', location.href); } catch (e) {} });
  } catch (e) {}
  (function () {
    var sx = null, sy = 0;
    stage.addEventListener('touchstart', function (e) { var t = e.touches[0], x = (t.clientX - stage.getBoundingClientRect().left) / scale; if (x < 24) { sx = t.clientX; sy = t.clientY; } else sx = null; }, { passive: true });
    stage.addEventListener('touchend', function (e) { if (sx === null) return; var t = e.changedTouches[0]; if (t.clientX - sx > 70 && Math.abs(t.clientY - sy) < 60) back(); sx = null; }, { passive: true });
  })();
  window.go = go; window.back = back; window.COMMA_FIXB = fixBaselines;

  function show(k, opts) {
    opts = opts || {};
    var prevKey = state.key, prevScr = [].filter.call(stage.children, function (c) { return !c.classList.contains('fx'); }).pop() || null;
    var holder = document.createElement('div');
    holder.innerHTML = window.SCREENS[k];
    var scr = holder.firstChild;
    scr.classList.add('enter');
    stage.appendChild(scr);
    fixBaselines(scr);
    var old = [].filter.call(stage.children, function (c) { return !c.classList.contains('fx'); });
    state.key = k;
    bind(scr, k);
    if (window.ENHANCE && window.ENHANCE[k]) { try { window.ENHANCE[k](scr, api); } catch (e) { console.error(e); } }
    // 메뉴(☰): 열 때 오른쪽에서 밀려 들어오고, 닫을 때 오른쪽으로 밀려 나감
    var pk = (prevScr && prevScr.dataset && prevScr.dataset.key) || prevKey || '';
    var slide = !prevScr ? '' : (/^B0/.test(k) && !/^B0/.test(pk)) ? 'in' : (!/^B0/.test(k) && /^B0/.test(pk)) ? 'out' : '';
    if (!slide) burger(old, scr, k);
    // 모션(motion.js): 화면 등장 · 그래픽 · 모달 · 카드 뒤집기
    var mo = null;
    if (window.COMMA_MOTION) { try { mo = window.COMMA_MOTION(scr, k, { prev: prevScr, prevKey: prevKey, back: !!opts.back, replace: !!opts.replace || !!slide }) || null; } catch (e) { console.error('MOTION', k, e); } }
    if (slide) mo = null;
    if (mo && mo.under && prevScr && prevScr.parentNode === stage) stage.insertBefore(scr, prevScr);
    if (mo && mo.instant) { scr.style.transition = 'none'; scr.classList.add('in'); }
    if (mo && mo.fade) scr.style.transition = 'opacity ' + mo.fade + 'ms ease-out';
    var keep = (mo && mo.keep) || 220;
    var SL = 'cubic-bezier(.22,.8,.2,1)';
    if (slide === 'in') {
      scr.style.transition = 'none'; scr.classList.add('in');
      scr.animate([{ transform: 'translateX(393px)' }, { transform: 'translateX(0)' }], { duration: 440, easing: SL });
      if (prevScr) prevScr.animate([{ transform: 'translateX(0)', filter: 'brightness(1)' }, { transform: 'translateX(-60px)', filter: 'brightness(.55)' }], { duration: 440, easing: SL, fill: 'forwards' });
      keep = 460;
    } else if (slide === 'out' && prevScr && prevScr.parentNode === stage) {
      stage.insertBefore(scr, prevScr); scr.style.transition = 'none'; scr.classList.add('in');
      var SO = 'cubic-bezier(.45,0,.2,1)';
      scr.animate([{ transform: 'translateX(-60px)', filter: 'brightness(.55)' }, { transform: 'translateX(0)', filter: 'brightness(1)' }], { duration: 440, easing: SO });
      prevScr.style.transition = 'none';
      prevScr.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(393px)' }], { duration: 440, easing: SO, fill: 'forwards' });
      keep = 460;
    }
    requestAnimationFrame(function () {
      scr.classList.add('in');
      setTimeout(function () { for (var i = 0; i < old.length; i++) if (old[i] !== scr) old[i].remove(); }, keep);
    });
    try { history.replaceState(null, '', '#' + encodeURIComponent(k)); } catch (e) {}
    // 폰에서 페이지를 아래로 내린 채 다음 화면으로 가면 맨 위부터 보이게
    if (document.documentElement.classList.contains('phone') && window.scrollY > 0) window.scrollTo(0, 0);
  }

  /* ---------- 햄버거(☰) ↔ X 모션 ---------- */
  function menuIcon(scr) { return [].filter.call(scr.querySelectorAll('[data-name="icon"]'), function (e) { var r = rel(e, scr); return r.x > 300 && r.y < 110; })[0]; }
  function burger(olds, scr, k) {
    var prev = olds.filter(function (o) { return o !== scr && o.classList && o.classList.contains('screen'); }).pop(); if (!prev) return;
    var toMenu = /^B0/.test(k), fromMenu = /^B0/.test(prev.dataset.key || '');
    if (toMenu === fromMenu) return;
    var a = menuIcon(prev), b = menuIcon(scr); if (!a || !b) return;
    var r = rel(b, scr), box = document.createElement('div');
    box.style.cssText = 'position:absolute;left:' + r.x + 'px;top:' + r.y + 'px;width:' + r.w + 'px;height:' + r.h + 'px;z-index:20;pointer-events:none';
    var bars = [0, 1, 2].map(function (i) { var d = document.createElement('div'); d.style.cssText = 'position:absolute;left:5px;width:22px;height:1.6px;background:rgb(197,197,193);top:' + (8 + i * 7.2) + 'px;transform-origin:50% 50%'; box.appendChild(d); return d; });
    scr.appendChild(box); b.style.opacity = '0'; a.style.opacity = '0';
    var X = [{ transform: 'translateY(7.2px) rotate(45deg)' }, { opacity: 0, transform: 'scaleX(.2)' }, { transform: 'translateY(-7.2px) rotate(-45deg)' }];
    bars.forEach(function (bar, i) {
      var open = [{ transform: 'none', opacity: 1 }, X[i]], frames = toMenu ? open : open.slice().reverse();
      bar.animate(frames, { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
    });
    setTimeout(function () { b.style.transition = 'opacity .12s'; b.style.opacity = ''; setTimeout(function () { box.remove(); }, 120); }, 320);
  }

  /* ---------- link binding ---------- */
  function hot(el, fn) {
    if (!el) return;
    el.classList.add('hot');
    el.addEventListener('click', function (e) { e.stopPropagation(); fn(e); });
  }
  var api = { go: go, back: back, hot: hot, findText: findText, pick: pick, rel: rel, state: state, S: S, show: show, scale: function () { return scale; }, fixB: fixBaselines };
  window.COMMA_API = api; api.grabber = grabber; api.accordion = accordion; api.namedKids = namedKids;

  function bind(scr, k) {
    var all = [].slice.call(scr.querySelectorAll('[data-name]'));
    // generic: back arrows / close / menu / logo
    all.forEach(function (el) {
      var comp = el.dataset.comp || '', r;
      if (/Arrow Left/.test(comp) || /^Frame 20873322(31|33)$/.test(el.dataset.name)) {
        r = rel(el, scr);
        if (r.y < 120 && r.x < 60 && r.w <= 52) hot(el, function () { (window.TOP_BACK && window.TOP_BACK[k]) ? go(window.TOP_BACK[k]) : back(); });
      }
      if (/Property 2=Close/.test(comp)) {
        r = rel(el, scr);
        if (r.y < 120 && r.x < 60) hot(el, function () { closeX(k); });
      }
      if (/Back/.test(comp) && /Button/.test(comp)) hot(el, function () { (window.BOT_BACK && window.BOT_BACK[k]) ? go(window.BOT_BACK[k]) : back(); });
      else if (el.tagName === 'IMG' && !el.classList.contains('hot')) {
        r = rel(el, scr);
        if (r.x < 40 && r.y >= 735 && r.y < 800 && Math.abs(r.w - 48) < 5 && Math.abs(r.h - 48) < 5) hot(el, function () { (window.BOT_BACK && window.BOT_BACK[k]) ? go(window.BOT_BACK[k]) : back(); });
      }
      if (/^Rectangle 744$/.test(el.dataset.name)) { r = rel(el, scr); if (r.w >= 390 && r.h >= 840) hot(el, function () { back(); }); }
      if (el.dataset.name === 'icon') { r = rel(el, scr); if (r.y < 110 && r.x > 300) hot(el, function () { /^B0/.test(k) ? back() : go(state.loggedIn ? 'B0-2' : 'B0'); }); }
      if (el.dataset.name === 'Group 31') { r = rel(el, scr); if (r.y < 110 && r.x < 60) hot(el, function () { go(window.HOME ? window.HOME() : 'B-0'); }); }
    });
    var L = (window.LINKS || {})[k] || [];
    L.forEach(function (l) {
      var t = findText(scr, l[0], l[2] && l[2].idx);
      if (!t) { console.warn('link text not found', k, l[0]); return; }
      var el = (l[2] && l[2].self) ? t : pick(t, scr, l[2]);
      hot(el, function () { var d = l[1]; if (typeof d === 'function') d = d(api, scr); if (typeof d === 'string') go(d); });
    });
    var X = (window.EXTRA || {})[k]; if (X) X(scr, api);
    if (window.LIVE) { try { window.LIVE(scr, k, api); } catch (e) { console.error('LIVE', k, e); } }
    if (window.COMMA_GFX) { try { window.COMMA_GFX(scr, k); } catch (e) { console.error('GFX', k, e); } }
  }

  function closeX(k) {
    var sec = (window.SCREEN_META[k] || {}).sec || '';
    if (/^C1/.test(sec)) return go('C1-4');
    if (/^B1/.test(sec)) { state.history = []; return show(window.HOME ? window.HOME() : 'B-0', { back: true }); }
    // leave the current flow: pop history until section changes
    var cur = sec.split(' ')[0];
    while (state.history.length) {
      var p = state.history.pop();
      if (((window.SCREEN_META[p] || {}).sec || '').split(' ')[0] !== cur) return show(p, { back: true });
    }
    show(window.HOME ? window.HOME() : 'B-0', { back: true });
  }

  window.addEventListener('load', function () {
    document.fonts.ready.then(function () {
      var h = decodeURIComponent((location.hash || '').slice(1));
      // 11/3: 앱을 열면 늘 처음(A-1)부터 — 주소에 #S-7 같은 화면이 남아 있어도 무시(연결 끊김 화면에 갇히던 문제). 시험용으로만 ?dev 붙이면 # 화면으로 바로
      var dev = /[?&]dev\b/.test(location.search);
      show(dev && window.SCREENS[h] ? h : 'A-1');
    });
  });
})();
