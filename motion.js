/* 콤마 모션 — 수현 피그마 화면 위에 움직임만 더함 (모양·위치는 그대로)
   · 그래픽: 하프톤(쉼표·십자) 칸이 하나씩 켜지며 등장, 빛 띠가 동전 위를 빙글 돎
   · 오류: ! 동전 흔들림, 숫자·토스트 흔들림, 연결 끊김 굴비 흔들림, 돋보기 찾는 움직임
   · 모달: 튀어 오르며 열리고 작아지며 닫힘
   · 화면: 새로 생긴 내용만 아래에서 차례로 올라옴
   · 계획 카드(C3-5·6): 한 바퀴 반 돌며 등장 → 덜렁덜렁 → 누르면 뒤집힘 → 저장하면 돌며 빠짐
   · 질문책(B-0 → B3-1): 책이 떠올라 펼쳐지고 흰 속지가 촤라락 → 닫히며 상세 표지 자리로
   · 온보딩(A-1): 쉼표 동전이 세로축으로 빙글 (배경은 그대로) */
(function () {
  'use strict';
  var RM = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var EZ = 'cubic-bezier(.2,.8,.2,1)', POP = 'cubic-bezier(.34,1.56,.64,1)', IN = 'cubic-bezier(.5,0,.9,.4)', SINE = 'cubic-bezier(.37,0,.63,1)';
  function api() { return window.COMMA_API; }
  function stage() { return document.getElementById('stage'); }
  function hashOf(el) { var s = (el.getAttribute && el.getAttribute('src')) || ''; var m = s.match(/([0-9a-f]{16})\.svg$/); return m ? m[1] : ''; }
  function txt(el) { return (el.textContent || '').replace(/​/g, '').replace(/\s+/g, ' ').trim(); }
  function div(css) { var d = document.createElement('div'); d.style.cssText = css; return d; }
  function anim(el, frames, opt) { try { return el.animate(frames, opt); } catch (e) { return null; } }

  /* ---------- 흔들기(오류) : transform을 건드리지 않게 translate 속성으로 ---------- */
  function shake(el, amp) {
    if (!el || RM) return; amp = amp || 6;
    anim(el, [{ translate: '0 0' }, { translate: -amp + 'px 0' }, { translate: amp * .8 + 'px 0' }, { translate: -amp * .55 + 'px 0' }, { translate: amp * .3 + 'px 0' }, { translate: '0 0' }], { duration: 420, easing: 'ease-out' });
  }
  window.COMMA_SHAKE = shake;

  /* ---------- 그래픽 종류 (피그마 에셋 이름) ---------- */
  var KIND = {
    '2e2b20ee9c982882': 'logo',   // A-1 쉼표 동전
    'd2db8d90e1eb8bf8': 'bang',   // ! 동전 (S-4 · S-5 · F-1′)
    '68d477a36e52fb35': 'bang',   // ! 동전 (C1-6-4)
    'e712710c59ea9da0': 'glass',  // 돋보기 (S-6 · 검색 결과 없음)
    'd0d27b74a89c7be6': 'fish',   // 굴비 (S-7 연결 끊김)
    'ef90a2e371d4c0cd': 'boxes',  // 보관함 (E0-1)
    'd479457106637437': 'float3'  // 떠 있는 동전 셋 (C0-1)
  };
  var ERROR_SCREENS = /^(S-4|C1-6-4)$/;

  function inline(img) {
    var h = hashOf(img), src = window.GFX && window.GFX[h]; if (!src) return null;
    var box = document.createElement('div');
    box.className = 'gfxbox'; box.style.cssText = img.style.cssText;
    for (var k in img.dataset) box.dataset[k] = img.dataset[k];
    box.dataset.gfx = KIND[h]; box.dataset.asset = h;
    var inn = div('left:0;top:0;width:100%;height:100%'); inn.className = 'gfxin';
    inn.innerHTML = src;
    var svg = inn.firstElementChild;
    svg.removeAttribute('width'); svg.removeAttribute('height');
    svg.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible';
    box.appendChild(inn);
    img.parentNode.replaceChild(box, img);
    return box;
  }
  function cells(box) {
    if (box._cells) return box._cells;
    var svg = box.querySelector('svg'), vb = svg.viewBox.baseVal, W = vb.width || 100, H = vb.height || 100;
    box._cells = [].map.call(svg.querySelectorAll('path'), function (p) {
      var b; try { b = p.getBBox(); } catch (e) { b = { x: 0, y: 0, width: 0, height: 0 }; }
      return { p: p, x: (b.x + b.width / 2) / W, y: (b.y + b.height / 2) / H, f: (p.getAttribute('fill') || '').toUpperCase() };
    });
    return box._cells;
  }
  // 칸이 하나씩 켜짐 (하프톤 조립)
  function ripple(box, o) {
    o = o || {};
    var order = o.order || function (c) { return (c.x + c.y) / 2; };
    var frames = o.frames || [{ opacity: 0, transform: 'scale(.15)' }, { opacity: 1, transform: 'none' }];
    cells(box).forEach(function (c) {
      if (o.only && !o.only(c)) return;
      anim(c.p, frames, { duration: o.dur || 360, delay: (o.delay || 0) + order(c) * (o.span || 520) + Math.random() * (o.jitter == null ? 70 : o.jitter), easing: o.easing || EZ, fill: 'backwards' });
    });
  }
  var MASK = {};
  // 빛 띠가 동전 위를 빙글 (그래픽 모양으로 가린 겹침 한 장 → 가볍게)
  function sheen(box, ms) {
    if (box.querySelector('.sheen')) return;
    var h = box.dataset.asset;
    if (!MASK[h]) MASK[h] = 'url("data:image/svg+xml;charset=utf-8,' + encodeURIComponent(window.GFX[h]) + '")';
    var url = MASK[h];
    var ov = div('left:0;top:0;width:100%;height:100%;overflow:hidden;pointer-events:none;-webkit-mask:' + url + ' center/contain no-repeat;mask:' + url + ' center/contain no-repeat');
    ov.className = 'sheen';
    var sp = div('left:-50%;top:-50%;width:200%;height:200%;background:conic-gradient(from 0deg,rgba(255,255,255,.62),rgba(255,255,255,0) 58deg,rgba(0,0,0,0) 140deg,rgba(0,0,0,.42) 200deg,rgba(0,0,0,0) 262deg,rgba(255,255,255,0) 302deg,rgba(255,255,255,.62))');
    ov.appendChild(sp); box.querySelector('.gfxin').appendChild(ov);
    anim(sp, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: ms || 8000, iterations: Infinity });
  }
  function bob(el, amp, ms, delay) {
    return anim(el, [{ translate: '0 0', easing: SINE }, { translate: '0 ' + (-amp) + 'px', easing: SINE }, { translate: '0 0' }], { duration: ms, delay: delay || 0, iterations: Infinity });
  }
  // 떠 있는 동전 셋: 칸을 동전별로 묶어 따로 둥둥
  function split3(box) {
    if (box._groups) return box._groups;
    var cs = cells(box), cen = [[.25, .17], [.75, .4], [.4, .82]];
    for (var it = 0; it < 6; it++) {
      var acc = cen.map(function () { return [0, 0, 0]; });
      cs.forEach(function (c) { var bi = 0, bd = 9; cen.forEach(function (q, i) { var d = Math.pow(c.x - q[0], 2) + Math.pow(c.y - q[1], 2); if (d < bd) { bd = d; bi = i; } }); c.g = bi; acc[bi][0] += c.x; acc[bi][1] += c.y; acc[bi][2]++; });
      cen = acc.map(function (a, i) { return a[2] ? [a[0] / a[2], a[1] / a[2]] : cen[i]; });
    }
    var svg = box.querySelector('svg'), NS = 'http://www.w3.org/2000/svg';
    box._groups = cen.map(function () { var g = document.createElementNS(NS, 'g'); svg.appendChild(g); return g; });
    cs.forEach(function (c) { box._groups[c.g].appendChild(c.p); });
    return box._groups;
  }

  /* 화면에 붙을 때마다(이동 · 접힘 포함): 그래픽을 칸 단위로 바꾸고 계속 도는 움직임 시작 */
  function gfxInit(root, k) {
    if ((k === 'B-0' || k === 'B2-1') && root.classList && root.classList.contains('screen')) homeCoin(root);
    if (!window.GFX) return;
    [].slice.call(root.querySelectorAll('img')).forEach(function (img) {
      var h = hashOf(img); if (!KIND[h]) return;
      var box = inline(img); if (!box || RM) return;
      var kd = box.dataset.gfx, inn = box.querySelector('.gfxin');
      if (/^(logo|bang)$/.test(kd)) sheen(box, kd === 'bang' ? 9000 : 8000);
      if (kd === 'logo') coinSpin(box);
      if (kd === 'bang' && !ERROR_SCREENS.test(k)) bob(inn, 5, 3400, 1100);
      if (kd === 'glass') anim(inn, [
        { translate: '0 0', rotate: '0deg', easing: SINE }, { translate: '6px -4px', rotate: '-5deg', easing: SINE }, { translate: '0 -8px', rotate: '0deg', easing: SINE },
        { translate: '-6px -4px', rotate: '5deg', easing: SINE }, { translate: '0 0', rotate: '0deg' }], { duration: 2800, delay: 700, iterations: Infinity });
      if (kd === 'fish') {
        var top = cells(box).reduce(function (a, c) { return c.y < a.y ? c : a; }, { y: 9, x: .5 });
        inn.style.transformOrigin = (top.x * 100).toFixed(1) + '% 0';
        anim(inn, [{ rotate: '2.4deg', easing: SINE }, { rotate: '-2.4deg', easing: SINE }, { rotate: '2.4deg' }], { duration: 3200, delay: 1700, iterations: Infinity });
      }
      if (kd === 'float3') split3(box).forEach(function (g, i) { bob(g, [4, 5, 3.5][i], [3000, 3700, 4300][i], i * 400); });
    });
  }
  window.COMMA_GFX = gfxInit;

  /* 처음 나타날 때 한 번 */
  function gfxEnter(root, k) {
    if (RM) return;
    [].forEach.call(root.querySelectorAll('.gfxbox'), function (box) {
      var kd = box.dataset.gfx, inn = box.querySelector('.gfxin');
      if (kd === 'logo') ripple(box, { span: 760 });
      if (kd === 'bang') {
        var R = function (c) { return Math.min(1, Math.hypot(c.x - .5, c.y - .5) / .5); };
        ripple(box, { order: R, span: 460, only: function (c) { return c.f !== '#F7F7F5'; } });
        ripple(box, { only: function (c) { return c.f === '#F7F7F5'; }, order: function (c) { return c.y; }, span: 260, delay: 420, dur: 520, easing: POP, jitter: 20,
          frames: [{ opacity: 0, transform: 'translateY(-34px)' }, { opacity: 1, transform: 'none' }] });
        if (ERROR_SCREENS.test(k)) setTimeout(function () { shake(inn, 7); }, 1050);
      }
      if (kd === 'glass') ripple(box, { order: function (c) { return Math.min(1, Math.hypot(c.x - .4, c.y - .4) / .7); }, span: 480 });
      if (kd === 'fish') {
        anim(inn, [{ rotate: '16deg', easing: 'ease-out' }, { rotate: '-10deg', offset: .3, easing: 'ease-in-out' }, { rotate: '6deg', offset: .55, easing: 'ease-in-out' }, { rotate: '-3deg', offset: .78, easing: 'ease-in-out' }, { rotate: '2.4deg' }], { duration: 1700 });
        ripple(box, { only: function (c) { return c.y > .55; }, order: function (c) { return Math.abs(c.x - .5) * 2; }, span: 380, delay: 150 });
      }
      if (kd === 'boxes') ripple(box, { order: function (c) { return 1 - c.y; }, span: 620, dur: 420, easing: POP, jitter: 40,
        frames: [{ opacity: 0, transform: 'translateY(-18px)' }, { opacity: 1, transform: 'none' }] });
      if (kd === 'float3') split3(box).forEach(function (g, i) {
        anim(g, [{ opacity: 0, translate: '0 22px' }, { opacity: 1, translate: '0 0' }], { duration: 620, delay: 120 + i * 140, easing: POP, fill: 'backwards' });
      });
    });
  }
  window.COMMA_GFX_ENTER = gfxEnter;

  /* ---------- 화면 등장: 앞 화면에 없던 내용만 차례로 ---------- */
  function blocksOf(scr) {
    var A = api(), content = scr.querySelector('.content'), out = [];
    if (!content) return out;
    (function walk(el, depth) {
      [].forEach.call(el.children, function (c) {
        if (!c.dataset || !c.dataset.name) return;
        var r = A.rel(c, scr);
        if (c.querySelector && c.querySelector('.nostagger')) return;
        if (r.h > 520 && depth < 3) return walk(c, depth + 1);
        if (r.y < 100 || r.y > 700 || r.h > 520 || r.w < 1 || r.h < 1) return;
        var cs = getComputedStyle(c); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return;
        out.push({ el: c, r: r, key: [].map.call(c.querySelectorAll('.t'), txt).join('|') || ('#' + c.dataset.name + Math.round(r.x) + ',' + Math.round(r.w) + ',' + Math.round(r.h)) });
      });
    })(content, 0);
    return out.sort(function (a, b) { return a.r.y - b.r.y || a.r.x - b.r.x; });
  }
  function enter(scr, prev) {
    var mine = blocksOf(scr); if (!mine.length) return;
    var seen = prev && prev.isConnected ? blocksOf(prev) : [];
    var i = 0;
    mine.forEach(function (b) {
      if (seen.some(function (s) { return s.key === b.key && Math.abs(s.r.y - b.r.y) < 6; })) return;
      if (i >= 12) return;
      anim(b.el, [{ opacity: 0, translate: '0 16px' }, { opacity: getComputedStyle(b.el).opacity, translate: '0 0' }], { duration: 440, delay: 30 + i * 48, easing: EZ, fill: 'backwards' });
      i++;
    });
  }

  /* ---------- 모달 ---------- */
  function modalOf(scr) { return scr && scr.querySelector('[data-comp="Step Item/State=Modal"]'); }
  function modalIn(scr) {
    var m = modalOf(scr); if (!m) return;
    anim(m, [{ opacity: 0, scale: '.9', translate: '0 14px' }, { opacity: 1, scale: '1', translate: '0 0' }], { duration: 380, delay: 40, easing: POP, fill: 'backwards' });
  }
  function modalOut(prev) {
    var m = modalOf(prev); if (!m) return;
    anim(m, [{ opacity: 1, scale: '1' }, { opacity: 0, scale: '.94' }], { duration: 200, easing: IN, fill: 'forwards' });
  }

  /* ---------- 부호 동전 (수현 「콤마 홈 동전」 · 「콤마 동전 길」 프로토타입 그대로)
     칸마다 부호 하나: 테두리 + 굵게 · 그늘 % · 몸통 + · 밝은 면 − · 광택 , (흰 쉼표) ---------- */
  var LIME = '#D3FF31', L7 = '#8EB500', WHITE = '#F7F7F5', GR = '#71706C', GR7 = '#4C4C49';
  function drawCoin(ctx, cx, cy, R, u, face, shade, theta, seed) {
    var c = Math.cos(theta), sx = Math.abs(c), T = Math.max(1, u * 0.2);
    var rect = function (x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(x - w / 2, y - h / 2, w, h); };
    var plus = function (x, y, k, col, th) { th = th || T; rect(x, y, u * k, th, col); rect(x, y, th, u * k, col); };
    var minus = function (x, y, col) { rect(x, y, u * 0.72, T, col); };
    var pct = function (x, y, col) {
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x - u * .22, y - u * .22, u * .15, 0, 6.2832); ctx.arc(x + u * .22, y + u * .22, u * .15, 0, 6.2832); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = T * 0.8; ctx.beginPath(); ctx.moveTo(x + u * .34, y - u * .38); ctx.lineTo(x - u * .34, y + u * .38); ctx.stroke();
    };
    var comma = function (x, y, col) { // 네모 쉼표
      var a = u * 0.42; rect(x, y - u * .14, a, a, col);
      ctx.beginPath(); ctx.moveTo(x, y + u * .07); ctx.lineTo(x + a / 2, y + u * .07); ctx.lineTo(x - a / 2, y + u * .44); ctx.lineTo(x - a / 2 - T * .2, y + u * .44); ctx.closePath(); ctx.fill();
    };
    var n = Math.ceil(R / u) + 1, i, j, x, y, ny;
    if (sx < 0.2) { // 옆면 = 막대: − 와 % 가 번갈아 (밀링)
      var cols = Math.max(2, Math.round(R * 2 * Math.max(sx, 0.12) / u));
      for (i = -n; i <= n; i++) for (j = 0; j < cols; j++) {
        x = cx + (j - (cols - 1) / 2) * u; y = cy + i * u; ny = (y - cy) / R;
        if (Math.abs(ny) > 1) continue;
        if (Math.abs(ny) > 0.86) plus(x, y, 0.9, shade, T * 1.3);
        else if ((i + j) % 2) minus(x, y, face); else pct(x, y, shade);
      }
      return;
    }
    var rxx = R * sx, shine = 0.55 * Math.sin(theta * 1.3 + seed);
    for (i = -n; i <= n; i++) for (j = -n; j <= n; j++) {
      x = cx + j * u; y = cy + i * u;
      var nx = (x - cx) / rxx; ny = (y - cy) / R; var d = Math.hypot(nx, ny);
      if (d > 1) continue;
      if (d > 0.86) { plus(x, y, 0.9, shade, T * 1.35); continue; } // 테두리
      var band = (nx + ny) * 0.707 - shine;
      if (Math.abs(band) < 0.08 && d < 0.8) { comma(x, y, WHITE); continue; } // 광택 = 흰 쉼표
      var h = ((i * 7 + j * 13 + seed * 5) % 3 + 3) % 3, sh = nx * 0.6 + ny * 0.8;
      if (sh > 0.2 && d > 0.3) { if (h === 2) plus(x, y, 0.8, shade); else pct(x, y, shade); } // 그늘
      else if (sh < -0.35) minus(x, y, face); // 밝은 면
      else plus(x, y, d > 0.72 ? 0.85 : 0.7, face); // 몸통
    }
  }
  var easeC = function (t) { return 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3); };
  // 캔버스를 화면 안(content 좌표)에 놓기
  function canvasAt(scr, x, y, w, h) {
    var c = document.createElement('canvas'), dpr = Math.min((window.devicePixelRatio || 1) * ((api().scale && api().scale()) || 1), 3);
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); c.className = 'nostagger';
    c.style.cssText = 'position:absolute;left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px;z-index:2';
    (scr.querySelector('.scroller .content') || scr.querySelector('.content') || scr).appendChild(c);
    var ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { c: c, ctx: ctx };
  }
  // 홈 위쪽 라임 동전: 8초에 한 바퀴 천천히
  function homeCoin(scr) {
    var A = api(), img = scr.querySelector('img[src$="99e387589301a343.svg"],img[src$="5cafc6a2865ad5de.svg"]'); if (!img) return;
    var r = A.rel(img, scr), k = r.w / 104, S = 120 * k;
    var cv = canvasAt(scr, r.x + r.w / 2 - S / 2, r.y + r.h / 2 - S / 2, S, S); img.style.visibility = 'hidden';
    var t0 = performance.now();
    (function frame(now) {
      if (!cv.c.isConnected) return;
      var th = RM ? 0 : ((now - t0) / 8000) * Math.PI * 2;
      cv.ctx.clearRect(0, 0, S, S); cv.ctx.save(); cv.ctx.scale(k, k); drawCoin(cv.ctx, 60, 60, 52, 4.2, LIME, L7, th, 3); cv.ctx.restore();
      if (!RM) requestAnimationFrame(frame);
    })(t0);
  }
  // B1-5 결과: 큰 동전이 세 바퀴 돌다 앞면에서 멈추고 4초에 한 번 흔들림 · 여섯 닢이 오른쪽에서 굴러 들어옴
  function stepResult(scr, back) {
    var A = api(), big = scr.querySelector('img[src$="e6160ccca3601717.svg"]'); if (!big) return;
    var steps = [].filter.call(scr.querySelectorAll('img'), function (i) { var r = A.rel(i, scr); return Math.abs(r.w - 48) < 2 && r.y > 480 && r.y < 640; })
      .sort(function (a, b) { return A.rel(a, scr).x - A.rel(b, scr).x; });
    var br = A.rel(big, scr), kb = br.w / 199.2, BS = 210 * kb;
    var bc = canvasAt(scr, br.x + br.w / 2 - BS / 2, br.y + br.h / 2 - BS / 2, BS, BS); big.style.visibility = 'hidden';
    bc.c.style.cursor = 'pointer';
    var rc = null, centers = [], kr = 48 / 54;
    if (steps.length === 6) {
      var r0 = A.rel(steps[0], scr), r5 = A.rel(steps[5], scr), left = r0.x - 6, top = r0.y + 24 - 31;
      rc = canvasAt(scr, left, top, r5.x + 48 + 6 - left, 62); rc.c.style.zIndex = 1;
      centers = steps.map(function (s) { var q = A.rel(s, scr); s.style.visibility = 'hidden'; return q.x + 24 - left; });
      rc.w = r5.x + 48 + 6 - left;
    }
    // 글자: 「…단계부터 시작해보세요」 4.5초, Now · Next 2.9초
    var lab = [].filter.call(scr.querySelectorAll('.t'), function (t) { return /단계부터/.test(txt(t)); })[0];
    var nn = [].filter.call(scr.querySelectorAll('.t'), function (t) { return /^(Now|Next)$/.test(txt(t)); });
    function hide(el, dy) { if (!el) return; el.style.transition = 'opacity .4s, translate .4s'; el.style.opacity = '0'; if (dy) el.style.translate = '0 6px'; }
    function show(el) { if (el) { el.style.opacity = ''; el.style.translate = ''; } }
    var t0 = performance.now() - (back ? 6000 : 0), spin0 = null, labOn = false, nnOn = false;
    if (!back && !RM) { hide(lab, true); nn.forEach(function (e) { hide(e); }); }
    var END = [Math.PI / 2, 0, 0.98, Math.PI / 2, Math.PI / 2, Math.PI / 2];
    function bigAngle(now) {
      var t = now - t0;
      if (spin0 !== null) { var s = (now - spin0) / 3000; if (s < 1) return Math.PI * 4 * (1 - easeC(s)); spin0 = null; t0 = now - 4500; }
      if (RM) return 0;
      if (t < 4400) return Math.PI * 6 * (1 - easeC((t - 400) / 4000)); // 천천히 세 바퀴 돌다 앞면에서 멈춤
      return (30 * Math.PI / 180) * Math.sin((t - 4400) / 4000 * Math.PI * 2); // 4초에 한 번 흔들림
    }
    bc.c.addEventListener('click', function (e) { e.stopPropagation(); spin0 = performance.now(); });
    (function frame(now) {
      if (!bc.c.isConnected) return;
      var t = now - t0, pop = RM ? 1 : easeC((t - 300) / 700), x = bc.ctx;
      x.clearRect(0, 0, BS, BS); x.save(); x.scale(kb, kb);
      x.translate(105, 105); x.scale(0.6 + 0.4 * pop, 0.6 + 0.4 * pop); x.translate(-105, -105);
      if (pop > 0) drawCoin(x, 105, 105, 96, 8, LIME, L7, bigAngle(now), 3);
      x.restore();
      if (rc) {
        rc.ctx.clearRect(0, 0, rc.w, 62);
        for (var q = 0; q < 6; q++) {
          var p = RM ? 1 : easeC((t - q * 180) / 2000);
          var cx = centers[q] + (1 - p) * (420 - q * 40) * kr, th = END[q] + (1 - p) * Math.PI * (4 + q), on = q === 1 || q === 2;
          drawCoin(rc.ctx, cx, 31, 27 * kr, 5 * kr, on ? LIME : GR, on ? L7 : GR7, th, q + 1);
        }
      }
      if (!labOn && (RM || t > 4500)) { labOn = true; show(lab); }
      if (!nnOn && (RM || t > 2900)) { nnOn = true; nn.forEach(show); }
      requestAnimationFrame(frame);
    })(t0 + (back ? 6000 : 0));
  }

  /* ---------- 계획 카드 (수현 「콤마 계획 카드」 프로토타입 그대로)
     앞 = C3-5 카드, 뒤 = C3-6 카드 · 두께 6px · 원근 900px · 유리 빛 띠
     처음: 한 바퀴 반(-540°→0°, 0.86→1) 1.4초 → 손대기 전까지 3초에 한 번 ±10° → 누르면 뒤집기 0.52초 · 끌면 따라 돎(1px=0.7°), 놓으면 가까운 면
     저장: 한 바퀴 돌며 작아져 위로 빠짐 0.7초 ---------- */
  var PC = null;
  var NOTCH = 'polygon(0 0,345px 0,345px 98.5px,331.36px 98.5px,331.36px 108.5px,345px 108.5px,345px 206px,331.36px 206px,331.36px 216px,345px 216px,345px 496.5px,0 496.5px,0 216px,13.64px 216px,13.64px 206px,0 206px,0 108.5px,13.64px 108.5px,13.64px 98.5px,0 98.5px)';
  function planCard(scr, info) {
    var A = api(), front = scr.querySelector('[data-name="Frame 2087332300"]'); if (!front) return;
    // 뒷면: C3-6 카드를 지금 값으로 채워서 가져옴
    var holder = document.createElement('div'); holder.innerHTML = window.SCREENS['C3-6'];
    var ts = holder.firstChild; ts.classList.add('in', 'fx'); ts.style.visibility = 'hidden'; ts.style.zIndex = '-1'; ts.style.transition = 'none';
    stage().insertBefore(ts, stage().firstChild);
    if (A.fixB) A.fixB(ts);
    try { if (window.LIVE) window.LIVE(ts, 'C3-6', A); } catch (e) { console.error(e); }
    var back = ts.querySelector('[data-name="Frame 2087332300"]');
    var W = parseFloat(front.style.width), H = parseFloat(front.style.height);
    var st = div('left:' + front.style.left + ';top:' + front.style.top + ';width:' + W + 'px;height:' + H + 'px;perspective:900px;touch-action:pan-y;cursor:grab;z-index:2');
    st.className = 'nostagger';
    var wob = div('left:0;top:0;width:100%;height:100%;transform-style:preserve-3d');
    var card = div('left:0;top:0;width:100%;height:100%;transform-style:preserve-3d');
    front.parentNode.insertBefore(st, front); st.appendChild(wob); wob.appendChild(card);
    var BF = 'backface-visibility:hidden;-webkit-backface-visibility:hidden;';
    card.appendChild(div('top:0;left:-3px;width:6px;height:100%;background:linear-gradient(180deg,#9A9D8C,#5E6250);transform:rotateY(90deg)'));
    card.appendChild(div('top:0;left:' + (W - 3) + 'px;width:6px;height:100%;background:linear-gradient(180deg,#9A9D8C,#5E6250);transform:rotateY(90deg)'));
    function face(el, isBack) {
      var f = div('left:0;top:0;width:100%;height:100%;' + BF + 'transform:' + (isBack ? 'rotateY(180deg) ' : '') + 'translateZ(3px)');
      el.style.left = '0px'; el.style.top = '0px'; f.appendChild(el);
      f.appendChild(div('left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:2;clip-path:' + NOTCH + ';background:linear-gradient(110deg,transparent 38%,rgba(255,255,255,.085) 47%,rgba(255,255,255,.025) 53%,transparent 62%);background-size:260% 100%;background-position:var(--sx,50%) 0;mix-blend-mode:screen'));
      card.appendChild(f);
    }
    face(front, false); if (back) face(back, true);
    ts.remove();
    var S = PC = { st: st, wob: wob, card: card, angle: 0, touched: false, amp: 0, target: 0, t0: null, last: null, busy: false };
    function set(a, ani) { card.style.transition = ani ? 'transform .52s cubic-bezier(.45,0,.25,1)' : 'none'; card.style.transform = 'rotateY(' + a + 'deg)'; }
    function sheen(sway) {
      var m; try { m = new DOMMatrix(getComputedStyle(card).transform); } catch (e) { return; }
      var deg = Math.atan2(-m.m13, m.m11) * 180 / Math.PI, d = (deg + sway) * Math.PI / 180;
      card.style.setProperty('--sx', (50 + Math.sin(d) * 70).toFixed(1) + '%');
    }
    (function tick(now) { // 3초에 한 번 ±10° (사인파) · 크기는 부드럽게 따라감
      if (!st.isConnected) return;
      if (S.t0 === null) { S.t0 = now; S.last = now; }
      var dt = now - S.last; S.last = now;
      S.amp += (S.target - S.amp) * Math.min(1, dt / 400);
      var a = S.amp * Math.sin((now - S.t0) / 3000 * Math.PI * 2);
      wob.style.transform = 'rotateY(' + a.toFixed(3) + 'deg)'; sheen(a);
      requestAnimationFrame(tick);
    })(performance.now());
    S.startSway = function () { if (!S.touched && !RM) { S.t0 = null; S.target = 10; } };
    S.stopSway = function () { S.touched = true; S.target = 0; };
    var dragging = false, moved = false, sx = 0, sa = 0;
    st.addEventListener('pointerdown', function (e) {
      if (S.busy) return; S.stopSway();
      dragging = true; moved = false; sx = e.clientX; sa = S.angle; try { st.setPointerCapture(e.pointerId); } catch (x) {}
    });
    st.addEventListener('pointermove', function (e) {
      if (!dragging) return; var dx = (e.clientX - sx) / ((A.scale && A.scale()) || 1);
      if (Math.abs(dx) > 4) moved = true; S.angle = sa + dx * 0.7; set(S.angle);
    });
    function up() {
      if (!dragging) return; dragging = false;
      S.angle = moved ? Math.round(S.angle / 180) * 180 : Math.round(S.angle / 180) * 180 + 180; set(S.angle, true);
    }
    st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up);
    st.addEventListener('click', function (e) { e.stopPropagation(); });
    if (!info.back && !RM) { // 처음 뜰 때 — 한 바퀴 반 돌고 앞면에서 멈춤
      S.busy = true;
      var an = anim(card, [{ transform: 'rotateY(-540deg) scale(.86)' }, { transform: 'rotateY(0deg) scale(1)' }], { duration: 1400, easing: 'cubic-bezier(.2,.7,.2,1)' });
      var done = function () { S.busy = false; set(0); S.startSway(); };
      if (an) an.onfinish = done; else done();
    } else S.startSway();
  }
  // 저장하기: 한 바퀴 돌며 작아져 위로 빠짐
  window.COMMA_CARD_OUT = function (done) {
    var S = PC; if (!S || !S.st.isConnected || RM) return done();
    S.stopSway(); S.busy = true; S.card.style.transition = 'none';
    anim(S.card, [{ transform: 'rotateY(' + S.angle + 'deg)', opacity: 1 }, { transform: 'rotateY(' + (S.angle + 360) + 'deg) scale(.3) translateY(-420px)', opacity: 0 }], { duration: 700, easing: 'cubic-bezier(.5,0,.8,.3)', fill: 'forwards' });
    setTimeout(done, 700);
  };

  /* ---------- 질문책 펼치기 (B-0 / B2-1 → B3-1) ---------- */
  var busyFx = false;
  function fxLayer() {
    var l = div('left:0;top:0;width:393px;height:852px;z-index:100;background:transparent;opacity:1;transition:none;pointer-events:auto');
    l.className = 'screen in fx';
    var st = stage(); st.insertBefore(l, st.firstChild);
    return l;
  }
  // 그림 한 장짜리 책(그림자 여백 포함)은 실제 책 부분만 — [왼, 위, 폭, 높이]
  var INSET = { '53e178108df4c379': [16, 12, 122, 197], '7c3f8fb00fe61452': [12, 12, 132, 213], '3452465a5d88b668': [16, 12, 116, 165], 'e3e3428de60506a8': [16, 12, 133, 187] };
  function cardInset(c) {
    var m = c.tagName === 'IMG' && /([0-9a-f]{16})\.png/.exec(c.getAttribute('src') || ''), v = m && INSET[m[1]];
    return v ? v.slice() : [0, 0, c.offsetWidth, c.offsetHeight];
  }
  window.COMMA_CARD_INSET = cardInset;
  function bookOpen(card, scr, go) {
    if (busyFx) return; busyFx = true;
    var sc = api().scale(), sr = stage().getBoundingClientRect(), r = card.getBoundingClientRect(), ins = cardInset(card);
    var cx = ((r.left + r.right) / 2 - sr.left) / sc, cy = ((r.top + r.bottom) / 2 - sr.top) / sc;
    var x = cx - card.offsetWidth / 2 + ins[0], y = cy - card.offsetHeight / 2 + ins[1], w = ins[2], h = ins[3];
    var L = fxLayer();
    var dim = div('left:0;top:0;width:393px;height:852px;background:#000;opacity:0'); L.appendChild(dim);
    var ph = div('left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px;outline:1px dashed #71706c;outline-offset:-1px');
    L.appendChild(ph);
    var book = div('left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px;transform-origin:0 0'); L.appendChild(book);
    var inside = div('left:0;top:0;width:100%;height:100%;background:#f7f7f5;box-shadow:0 18px 40px rgba(0,0,0,.45)'); book.appendChild(inside);
    var pages = [];
    for (var i = 0; i < 8; i++) {
      var pg = div('left:0;top:0;width:100%;height:100%;transform-origin:0 50%;background:linear-gradient(90deg,#dcdcd8 0%,#f7f7f5 9%,#f7f7f5 90%,#e4e4e0 100%)');
      book.appendChild(pg); pages.push(pg);
    }
    var front = card.cloneNode(true); front.style.left = -ins[0] + 'px'; front.style.top = -ins[1] + 'px'; front.style.transformOrigin = ins[0] + 'px 50%'; front.style.margin = '0'; [front].concat([].slice.call(front.querySelectorAll('*'))).forEach(function (e) { if (e.style) { e.style.opacity = ''; e.style.translate = ''; e.style.scale = ''; e.style.rotate = ''; } });
    var backC = div('left:0;top:0;width:100%;height:100%;transform-origin:0 50%;background:linear-gradient(90deg,#e6e6e2,#f7f7f5 14%)');
    book.appendChild(backC); book.appendChild(front);
    card.style.visibility = 'hidden';
    // 0~560: 떠올라 가운데로 (책등이 화면 가운데)
    var S1 = 1.06, tx = 196.5 - x, ty = 426 - h * S1 / 2 - y;
    anim(dim, [{ opacity: 0 }, { opacity: .55 }], { duration: 560, easing: EZ, fill: 'forwards' });
    anim(book, [{ transform: 'none' }, { transform: 'translate(' + tx + 'px,' + ty + 'px) scale(' + S1 + ')' }], { duration: 560, easing: EZ, fill: 'forwards' });
    // 560~940: 표지가 왼쪽 등을 축으로 넘어감 (반은 앞면, 반은 흰 안쪽)
    var P = 'perspective(1200px) ';
    anim(front, [{ transform: P + 'rotateY(0deg)' }, { transform: P + 'rotateY(-90deg)' }], { duration: 190, delay: 560, easing: 'ease-in', fill: 'both' });
    anim(backC, [{ transform: P + 'rotateY(-90deg)', visibility: 'hidden' }, { transform: P + 'rotateY(-90deg)', visibility: 'visible', offset: .001 }, { transform: P + 'rotateY(-180deg)', visibility: 'visible' }], { duration: 190, delay: 750, easing: 'ease-out', fill: 'both' });
    // 700~1270: 흰 속지 8장 촤라락
    pages.slice().reverse().forEach(function (pg, j) {
      anim(pg, [{ transform: P + 'rotateY(0deg)' }, { transform: P + 'rotateY(-180deg)' }], { duration: 300, delay: 700 + j * 38, easing: 'cubic-bezier(.4,.1,.3,1)', fill: 'both' });
    });
    // 1270~: 곧바로 닫힘 — 속지는 뒤에서부터, 표지가 덮임
    var C0 = 1290;
    pages.forEach(function (pg, j) {
      anim(pg, [{ transform: P + 'rotateY(-180deg)' }, { transform: P + 'rotateY(0deg)' }], { duration: 240, delay: C0 + j * 26, easing: 'cubic-bezier(.4,.1,.3,1)', fill: 'forwards' });
    });
    var C1 = C0 + 8 * 26 + 60;
    anim(backC, [{ transform: P + 'rotateY(-180deg)' }, { transform: P + 'rotateY(-90deg)' }], { duration: 170, delay: C1, easing: 'ease-in', fill: 'forwards' });
    anim(backC, [{ visibility: 'visible' }, { visibility: 'hidden' }], { duration: 1, delay: C1 + 170, fill: 'forwards' });
    anim(front, [{ transform: P + 'rotateY(-90deg)' }, { transform: P + 'rotateY(0deg)' }], { duration: 190, delay: C1 + 170, easing: 'ease-out', fill: 'forwards' });
    // 상세 화면 표지 자리(24, 196 · 폭 167.8)로 내려앉음
    var DS = window.COMMA_BOOK_SCALE(w, h), M0 = C1 - 40, MD = 560;
    anim(book, [{ transform: 'translate(' + tx + 'px,' + ty + 'px) scale(' + S1 + ')' }, { transform: 'translate(' + (24 - x) + 'px,' + (196 - y) + 'px) scale(' + DS + ')' }], { duration: MD, delay: M0, easing: EZ, fill: 'forwards' });
    anim(inside, [{ boxShadow: '0 18px 40px rgba(0,0,0,.45)' }, { boxShadow: '0 0 0 rgba(0,0,0,0)' }], { duration: MD, delay: M0, fill: 'forwards' });
    var NAV = M0 + MD - 460;
    setTimeout(function () {
      anim(dim, [{ opacity: .55 }, { opacity: 0 }], { duration: 460, fill: 'forwards' });
      ph.style.display = 'none';
      BOOK_NAV = true; go(); BOOK_NAV = false;
    }, NAV);
    setTimeout(function () { anim(L, [{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'forwards' }); setTimeout(function () { L.remove(); busyFx = false; }, 130); }, M0 + MD + 20);
  }
  var BOOK_NAV = false;
  // 홈의 질문책 7권: 어느 책을 눌러도 펼쳐지며 그 책의 상세(B3-1)로
  var BOOK_OF = { 'Frame 2087332315': 'household', 'Frame 2087332316': 'income', 'Frame 2087332318': 'interest', 'Frame 2087332317': 'pref',
    'Frame 2087332314': 'special', 'Frame 2087332313': 'autodebit', 'Group': 'prefcheck' };
  function bookSetup(scr) {
    var A = api(), g = scr.querySelector('[data-name="Group 26"]'); if (!g) return;
    var cards = [].filter.call(g.children, function (c) { var r = A.rel(c, scr); return r.w > 100 && r.h > 100 && (BOOK_OF[c.dataset.name] || c.dataset.mybook !== undefined); });
    cards.forEach(function (c) { c.style.cursor = 'pointer'; });
    scr.addEventListener('click', function (e) {
      // 책 표지 그림(img)은 클릭을 통과시키므로 손가락 위치로 맨 위 책을 찾음
      var t = e.target, fx = t.closest && t.closest('.fixed');
      if (fx && t.parentElement !== fx) return;             // 진짜 버튼(질문 남기기 등)
      var card = cards.filter(function (c) { return c.contains(t); })[0];
      if (!card) card = cards.slice().reverse().filter(function (c) {
        var b = c.getBoundingClientRect(); return e.clientX >= b.left && e.clientX <= b.right && e.clientY >= b.top && e.clientY <= b.bottom;
      })[0];
      if (!card || busyFx) return;
      e.stopPropagation(); e.preventDefault();
      var D = window.COMMA_DATA, id = card.dataset.mybook !== undefined ? 'my:' + card.dataset.mybook : BOOK_OF[card.dataset.name], r = A.rel(card, scr);
      D.book = id;
      var ins = cardInset(card);
      D.bookCard = id === 'household' ? null : { html: card.outerHTML, w: ins[2], h: ins[3], ix: ins[0], iy: ins[1] };
      if (RM) { A.go('B3-1'); return; }
      bookOpen(card, scr, function () { A.go('B3-1'); });
    }, true);
  }
  // 상세 화면 표지 자리(24, 196 · 167.8 × 206)에 맞는 배율
  window.COMMA_BOOK_SCALE = function (w, h) { return Math.min(167.84 / w, 206 / h); };

  /* ---------- C0-6 불러오는 중: 숫자가 올라감 ---------- */
  function loading(scr) {
    var ts = [].filter.call(scr.querySelectorAll('.t'), function (t) { return /^\d+%$/.test(txt(t)); });
    ts.forEach(function (t, i) {
      var sp = t.querySelector('.ln span:last-child') || t.querySelector('span'); if (!sp) return;
      [].forEach.call(t.querySelectorAll('.ln'), function (l) { l.style.textAlign = 'right'; l.style.width = '100%'; });
      var steps = i === 0 ? [[0, 0], [100, 900]] : [[0, 0], [40, 800], [100, 1350]], t0 = performance.now();
      (function tick(now) {
        if (!t.isConnected) return;
        var e = now - t0, v = steps[steps.length - 1][0];
        for (var j = 1; j < steps.length; j++) if (e < steps[j][1]) { var a = steps[j - 1], b = steps[j], p = (e - a[1]) / (b[1] - a[1]); p = 1 - Math.pow(1 - p, 3); v = Math.round(a[0] + (b[0] - a[0]) * p); break; }
        sp.textContent = v + '%';
        if (e < steps[steps.length - 1][1]) requestAnimationFrame(tick);
      })(t0);
    });
  }

  /* ---------- 질문책 카드(홈): 계단처럼 차르르륵 (보이는 것부터, 스크롤하면 이어서) ---------- */
  function homeCards(scr) {
    var A = api(), imgs = [].filter.call(scr.querySelectorAll('img'), function (i) { return /\.png$/.test(i.getAttribute('src') || '') && A.rel(i, scr).w > 100; });
    var blocks = [];
    imgs.forEach(function (im) { var p = im.parentElement, b = p && p.dataset && p.dataset.name && A.rel(p, scr).h < 260 ? p : im; if (b.dataset && b.dataset.mybook !== undefined) return; if (blocks.indexOf(b) < 0) blocks.push(b); });
    // 방금 남긴 내 질문 책: 위에서 떨어져 쌓임
    [].forEach.call(scr.querySelectorAll('[data-drop="1"]'), function (c, i) {
      c.removeAttribute('data-drop');
      anim(c, [{ opacity: 0, translate: '0 -260px', rotate: '-24deg', scale: '1.15' }, { opacity: 1, translate: '0 10px', rotate: '3deg', scale: '1', offset: .7 }, { translate: '0 0', rotate: c.style.rotate || '0deg' }],
        { duration: 900, delay: 500 + i * 120, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'backwards' });
      setTimeout(function () { if (c.isConnected && window.COMMA_TOAST) window.COMMA_TOAST('내 질문이 질문책에 꽂혔어요'); }, 1400);
    });
    if (!blocks.length) return;
    var pos = function (b) { var r = A.rel(b, scr); return Math.round(r.y / 40) * 1000 + r.x; };
    blocks.sort(function (a, b) { return pos(a) - pos(b); });
    blocks.forEach(function (b) { b.style.opacity = '0'; });
    var n = 0, t0 = 0;
    function cascade(list) {
      var now = performance.now(); if (now - t0 > 400) n = 0; t0 = now;
      list.sort(function (a, b) { return pos(a) - pos(b); }).forEach(function (b) {
        var i = n++, a = anim(b, [{ opacity: 0, translate: '0 54px', scale: '.9' }, { opacity: 1, translate: '0 0', scale: '1' }], { duration: 560, delay: 180 + i * 75, easing: POP, fill: 'both' });
        if (a) a.onfinish = function () { b.style.opacity = ''; a.cancel(); }; else b.style.opacity = '';
      });
    }
    if (!window.IntersectionObserver) return cascade(blocks);
    var io = new IntersectionObserver(function (es) {
      var vis = es.filter(function (e) { return e.isIntersecting; }).map(function (e) { return e.target; });
      vis.forEach(function (b) { io.unobserve(b); });
      if (vis.length) cascade(vis);
    }, { root: scr.querySelector('.scroller'), threshold: 0.12 });
    blocks.forEach(function (b) { io.observe(b); });
  }

  /* ---------- A-1 온보딩: 쉼표 동전이 세로축으로 빙글 (앞 · 뒤 · 옆면 두께) ---------- */
  function coinSpin(box) {
    var inn = box.querySelector('.gfxin'), T = 8;
    box.style.perspective = '900px';
    inn.style.transformStyle = 'preserve-3d';
    var BF = 'backface-visibility:hidden;-webkit-backface-visibility:hidden;';
    var face = div('left:0;top:0;width:100%;height:100%;' + BF + 'transform:translateZ(' + T / 2 + 'px)');
    while (inn.firstChild) face.appendChild(inn.firstChild);
    var back = div('left:0;top:0;width:100%;height:100%;' + BF + 'transform:rotateY(180deg) translateZ(' + T / 2 + 'px)');
    back.appendChild(face.querySelector('svg').cloneNode(true));
    var edge = div('left:calc(50% - ' + T / 2 + 'px);top:4%;width:' + T + 'px;height:92%;border-radius:' + T / 2 + 'px;transform:rotateY(90deg);background:repeating-linear-gradient(180deg,#D3FF31 0 2.4px,#8EB500 2.4px 3.6px,#151515 3.6px 4.8px)');
    inn.appendChild(face); inn.appendChild(back); inn.appendChild(edge);
    anim(inn, [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(360deg)' }], { duration: 8000, iterations: Infinity });
    // 옆면은 옆으로 섰을 때만 (정면에선 칸 사이로 비치지 않게)
    anim(edge, [{ opacity: 0 }, { opacity: 0, offset: .19 }, { opacity: 1, offset: .25 }, { opacity: 0, offset: .31 }, { opacity: 0, offset: .69 }, { opacity: 1, offset: .75 }, { opacity: 0, offset: .81 }, { opacity: 0 }], { duration: 8000, iterations: Infinity });
  }

  /* ---------- 화면이 바뀔 때 (app.js show에서 부름) ---------- */
  window.COMMA_MOTION = function (scr, k, info) {
    var prev = info.prev, pk = info.prevKey || '';
    var mode = null;
    if (k === 'C0-6') loading(scr);
    if (k === 'C3-5') planCard(scr, info);
    if (k === 'B1-5') stepResult(scr, info.back);
    if ((k === 'B-0' || k === 'B2-1')) bookSetup(scr);
    if (RM) return null;
    var isModal = !!modalOf(scr), wasModal = !!modalOf(prev);
    if (wasModal && !isModal) {
      modalOut(prev);
      if (info.back) { anim(prev, [{ opacity: 1 }, { opacity: 0 }], { duration: 230, easing: 'ease-out', fill: 'forwards' }); mode = { under: true, instant: true, keep: 240 }; }
    }
    if (isModal && !wasModal) modalIn(scr);
    if (BOOK_NAV) mode = { fade: 460, keep: 470 };

    if (!info.back && !info.replace && !isModal && !BOOK_NAV) enter(scr, prev);
    if (!info.back || /^(S-|F-1′|C1-6-4|E0-1)/.test(k)) gfxEnter(scr, k);
    if (k === 'B-0' || k === 'B2-1') homeCards(scr);
    return mode;
  };
})();
