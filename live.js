/* 콤마 — 실제 앱처럼: 고르기 · 숫자 입력 · 글자 입력 · 값 반영 · 계산 */
(function () {
  'use strict';
  var D = window.COMMA_DATA = {
    age: 24, spare: 200000, house: '혼자 살아요', head: '아니요', count: 1, income: 2400,
    monthly: 200000, months: 12, prefs: { '자동이체': false, '급여이체': false, '카드 실적': false },
    baseRate: 3.0, question: '', topic: '', when: '', pick: '청년미래적금',
    action: '우대조건 서류 챙기기', day: 30, likes: {},
    boxed: {}, compare: {}, pickSel: null, steps: {}, posted: [], blocked: {}, passed: {}, infoDone: false, c1Visited: false, c1Done: false, docs: {}, seenTerm: false, search: ''
  };
  var PRODUCTS = {
    '첫걸음적금': { bank: '△△은행', rate: 3.1 },
    '청년미래적금': { bank: '○○은행', rate: 3.0 },
    '꾸준히적금': { bank: '□□은행', rate: 2.7 }
  };
  window.COMMA_PRODUCTS = PRODUCTS;
  var TODAY = 22; // 앱 속 오늘: 2026. 10. 22 (PLAN 001 날짜)
  var ACTION = { '가족 정보 확인하기': ['가족 정보를 확인한다', '가족 정보를 확인하는 날이에요'], '우대조건 서류 챙기기': ['우대조건 서류를 챙긴다', '우대조건 서류를 챙기는 날이에요'], '은행에 언제 갈지 정하기': ['은행에 갈 날을 정한다', '은행에 갈 날을 정하는 날이에요'] };
  var DOW_KO = ['일', '월', '화', '수', '목', '금', '토'], DOW_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  var dow = function (d) { return (d + 3) % 7; }; // 2026년 10월 1일 = 목요일
  var PREF_RATE = { '자동이체': 0.2, '급여이체': 0.3, '카드 실적': 0.5 };
  var base = null; // 조건 바꾸기 들어가기 전 계산

  /* ---------- 계산 (수현 화면 숫자와 같은 공식: 단리 · 세금 15.4%) ---------- */
  function calc(p) {
    p = p || D;
    var rate = (PRODUCTS[p.pick] ? PRODUCTS[p.pick].rate : p.baseRate); for (var k in p.prefs) if (p.prefs[k]) rate += PREF_RATE[k];
    var n = p.months, principal = p.monthly * n;
    var interest = Math.round(p.monthly * rate / 100 * (n * (n + 1) / 2) / 12);
    var tax = Math.round(interest * 0.154);
    return { rate: rate, principal: principal, interest: interest, tax: tax, total: principal + interest - tax };
  }
  window.COMMA_CALC = calc;
  var fmt = function (n) { return Math.round(n).toLocaleString('ko-KR'); };
  var man = function (won) { return won % 10000 === 0 ? (won / 10000) + '만' : fmt(won); };
  var prefsText = function () { var a = []; for (var k in D.prefs) if (D.prefs[k]) a.push(k); return a.length ? a.join(' · ') : '없음'; };
  var headText = function () { return D.head === '예' ? '집의 대표예요' : D.head === '아니요' ? '집의 대표가 아니에요' : '집의 대표인지는 잘 몰라요'; };
  // 가구원이 있으면(2명 이상) 「혼자 살지 않아요」
  var houseText = function () {
    if (D.count >= 2) return D.house === '혼자 살아요' ? '혼자 살지 않아요' : D.house;
    return D.house === '가족과 살아요' ? '혼자 살아요' : D.house;
  };

  /* ---------- 글자 바꾸기 + 오토 레이아웃처럼 다시 맞추기 ---------- */
  function lines(t) { return [].slice.call(t.querySelectorAll('.ln')); }
  function textOf(t) { return lines(t).map(function (l) { return l.textContent.replace(/​/g, ''); }).join('\n'); }
  function lineW(l) { var w = 0; [].forEach.call(l.querySelectorAll('span'), function (s) { w += s.offsetWidth; }); return w; }
  function textW(t) { return Math.max.apply(null, lines(t).map(lineW).concat([0])); }
  function al(el) { var a = el && el.dataset && el.dataset.al; if (!a) return null; var p = a.split(','); return { m: p[0], main: p[1], cross: p[2], gap: +p[3] }; }
  function px(el, prop) { return parseFloat(el.style[prop]) || 0; }
  function shift(el, d) { el.style.left = (px(el, 'left') + d).toFixed(2) + 'px'; }
  function named(el) { return [].filter.call(el.children, function (c) { return c.dataset && c.dataset.name; }); }
  // 요소 폭이 d 만큼 변했을 때 부모의 정렬 규칙대로 위치 조정
  function grow(el, d) {
    if (Math.abs(d) < .3) return;
    var par = el.parentElement, a = al(par);
    if (!a) return;
    if (a.m === 'H') {
      var sib = named(par), i = sib.indexOf(el);
      var sz = (par.dataset.sz || '').split(',')[0];
      var hug = sz === 'HUG';
      if (hug) { sib.slice(i + 1).forEach(function (s) { shift(s, d); }); par.style.width = (px(par, 'width') + d).toFixed(2) + 'px'; return grow(par, d); }
      if (a.main === 'MIN') { sib.slice(i + 1).forEach(function (s) { shift(s, d); }); }
      else if (a.main === 'MAX') { sib.slice(0, i + 1).forEach(function (s) { shift(s, -d); }); }
      else if (a.main === 'CENTER') { sib.forEach(function (s, j) { shift(s, j < i ? -d / 2 : (j === i ? -d / 2 : d / 2)); }); }
      else if (a.main === 'SPACE_BETWEEN') { if (i === sib.length - 1 && sib.length > 1) shift(el, -d); else if (i > 0) shift(el, -d / 2); }
    } else if (a.m === 'V') {
      if (a.cross === 'CENTER') shift(el, -d / 2); else if (a.cross === 'MAX') shift(el, -d);
      var sz2 = (par.dataset.sz || '').split(',')[0];
      if (sz2 === 'HUG') {
        var others = named(par).filter(function (c) { return c !== el; }).map(function (c) { return px(c, 'width'); });
        var before = Math.max.apply(null, others.concat([px(el, 'width') - d])), after = Math.max.apply(null, others.concat([px(el, 'width')]));
        var dd = after - before; if (Math.abs(dd) > .3) { par.style.width = (px(par, 'width') + dd).toFixed(2) + 'px'; grow(par, dd); }
      }
    }
  }
  function setText(t, str) {
    var cur = textOf(t); if (cur === str) return;
    var ls = lines(t), parts = str.split('\n'), oldW = textW(t);
    var L = ls.length ? parseFloat(ls[0].style.height) : 0;
    parts.forEach(function (p, i) {
      var ln = ls[i];
      if (!ln) { ln = ls[ls.length - 1].cloneNode(true); ln.style.top = (L * i).toFixed(3) + 'px'; delete ln.dataset.fixed; t.appendChild(ln); ls.push(ln); }
      var sp = ln.querySelectorAll('span'); if (!sp.length) return;
      // 첫 번째 글자 스타일로 통째로 (색이 다른 조각이 있으면 숫자만 바꿈)
      if (sp.length > 1) {
        var digits = p.match(/[\d,.]+/); var done = false;
        [].forEach.call(sp, function (s) { if (!done && /[\d]/.test(s.textContent) && digits) { s.textContent = s.textContent.replace(/[\d,.]+/, digits[0]); done = true; } });
        if (done && ln.textContent === p) return;
        sp[0].textContent = p; for (var j = 1; j < sp.length; j++) sp[j].textContent = '';
      } else sp[0].textContent = p;
    });
    ls.slice(parts.length).forEach(function (l) { l.remove(); });
    if (ls.length !== parts.length) t.style.height = (L * parts.length).toFixed(2) + 'px';
    var newW = textW(t), d = newW - oldW;
    var sz = (t.dataset.sz || 'HUG').split(',')[0];
    if (sz !== 'FIXED' && sz !== 'FILL' && t.style.whiteSpace === 'pre') {
      var align = t.style.textAlign;
      t.style.width = (px(t, 'width') + d).toFixed(2) + 'px';
      if (align === 'right') shift(t, -d); else if (align === 'center') shift(t, -d / 2);
      grow(t, d);
    }
    if (window.COMMA_FIXB) window.COMMA_FIXB(t);
  }
  window.COMMA_SETTEXT = setText;
  // 글자 조각(색이 다른 부분 포함)을 살린 채 일부 단어만 바꿈
  function spanReplace(t, fn) {
    var oldW = textW(t);
    [].forEach.call(t.querySelectorAll('.ln span'), function (sp) { var n = fn(sp.textContent); if (n !== sp.textContent) sp.textContent = n; });
    var d = textW(t) - oldW, sz = (t.dataset.sz || 'HUG').split(',')[0];
    if (Math.abs(d) > .3 && sz !== 'FIXED' && sz !== 'FILL' && t.style.whiteSpace === 'pre') { t.style.width = (px(t, 'width') + d).toFixed(2) + 'px'; if (t.style.textAlign === 'right') shift(t, -d); else if (t.style.textAlign === 'center') shift(t, -d / 2); grow(t, d); }
    if (window.COMMA_FIXB) window.COMMA_FIXB(t);
  }

  /* ---------- 값 반영 규칙 (피그마 예시 값 → 지금 값) ---------- */
  var PROFILE = /^(C0-(8|1[4-8])|E0-[3-8]|C1-6(-3)?|D2-1)$/; // E0-2는 아래에서 따로
  var PLAN = /^(C2-[1-6]|C3-[56]|D2-1|E1-1)$/;
  var INPUT = {
    'C0-9': 'age', 'C0-10': 'age', 'C0-15': 'age', 'E0-5': 'age',
    'C0-7': 'spare', 'C0-11': 'spare', 'C0-16': 'spare', 'E0-6': 'spare',
    'C0-17': 'count', 'E0-7': 'count',
    'C0-13': 'income', 'C0-18': 'income', 'E0-8': 'income',
    'C2-3': 'monthly'
  };
  var VIEW = { age: function () { return String(D.age); }, spare: function () { return fmt(D.spare); }, count: function () { return String(D.count); }, income: function () { return fmt(D.income); }, monthly: function () { return fmt(D.monthly); } };
  function rules(k) {
    var r = [];
    if (PROFILE.test(k)) r.push(
      ['age', /^만 \d+세$/, function () { return '만 ' + D.age + '세'; }],
      ['spareRow', /^매달 [\d,만]+ 원씩 저축 가능해요$/, function () { return '매달 ' + man(D.spare) + ' 원씩 저축 가능해요'; }],
      ['house', /^(혼자 살아요|혼자 살지 않아요|가족과 살아요|그 외 \(친구, 기숙사 등\))\n집의 대표.*$/, function () { return houseText() + '\n' + headText(); }],
      ['incomeRow', /^작년에 [\d,]+만 원을 벌었어요$/, function () { return '작년에 ' + fmt(D.income) + '만 원을 벌었어요'; }],
      ['incomeY', /^연 [\d,]+만 원$/, function () { return '연 ' + fmt(D.income) + '만 원'; }],
      ['income', /^2,400만 원$/, function () { return fmt(D.income) + '만 원'; }],
      ['count', /^1인 · 세대주 아님$/, function () { return D.count + '인 · ' + (D.head === '예' ? '세대주' : '세대주 아님'); }]
    );
    if (k === 'E0-3') r.push(['spare', /^20만 원$/, function () { return man(D.spare) + ' 원'; }]);
    if (k === 'E0-2') r.push(
      ['myAge', /^24세$/, function () { return D.age + '세'; }],
      ['myCount', /^1인$/, function () { return D.count + '인'; }],
      ['myIncome', /^2,400만 원$/, function () { return fmt(D.income) + '만 원'; }],
      ['mySpare', /^20만 원$/, function () { return man(D.spare) + ' 원'; }]
    );
    if (/^(C3-[3-6]|E1-1|F-1)$/.test(k)) r.push(
      ['dayEul', /^10월 \d+일에$/, function () { return '10월 ' + D.day + '일에'; }],
      ['act', /^(우대조건 서류를 챙긴다|가족 정보를 확인한다|은행에 갈 날을 정한다)$/, function () { return ACTION[D.action][0]; }],
      ['actDay', /^우대조건 서류를 챙기는 날이에요$/, function () { return ACTION[D.action][1]; }],
      ['dayEn', /^10\. \d+ [A-Z]{3}$/, function () { return '10. ' + D.day + ' ' + DOW_EN[dow(D.day)]; }],
      ['dday', /^D-8$/, function () { var n = D.day - TODAY; return n > 0 ? 'D-' + n : 'D-DAY'; }],
      ['alarm', /^알림 · 10월 30일 \(금\) 오전 9시$/, function () { return '알림 · 10월 ' + D.day + '일 (' + DOW_KO[dow(D.day)] + ') 오전 9시'; }],
      ['picked', /^10월 \d+일 \(.\)$/, function () { return '10월 ' + D.day + '일 (' + DOW_KO[dow(D.day)] + ')'; }],
      ['pickOpt', /^10월 30일$/, function () { return '10월 ' + D.day + '일'; }]
    );
    if (/^(C1-(2|3|4|6|6-[1-4]|7|8|8-1|9)|D2-[12]|C2-[1-6]|C3-[56])$/.test(k) && D.pick !== '청년미래적금') {
      r.push(['pname', /청년미래적금|○○은행/, function (t) { return t.replace(/청년미래적금/g, D.pick).replace(/○○은행/g, PRODUCTS[D.pick].bank); }, false, true]);
    }
    if (PLAN.test(k)) {
      r.push(
        ['total', /^(2,432,994|3,041,242|4,926,900|2,435,194)$/, function () { return fmt(calc().total); }],
        ['principal', /^(2,400,000|3,000,000)원$/, function () { return fmt(calc().principal) + '원'; }],
        ['interest', /^(39,000|48,750)원$/, function () { return fmt(calc().interest) + '원'; }],
        ['tax', /^−[\d,]+원$/, function () { return '−' + fmt(calc().tax) + '원'; }],
        ['monthlyMan', /^(20|25)만 원$/, function () { return man(D.monthly) + ' 원'; }],
        ['monthlyWon', /^200,000원$/, function () { return fmt(D.monthly) + '원'; }],
        ['months', /^12개월$/, function () { return D.months + '개월'; }, true],
        ['prefs', /^없음$/, function () { return prefsText(); }],
        ['diff', /^\+[\d,]+ 원$/, function () { var c = calc(), dlt = c.total - (base ? calc(base).total : c.total); return (dlt >= 0 ? '+' : '−') + fmt(Math.abs(dlt)) + ' 원'; }],
        ['summary', /^매달 20만 원 · 1년 · 연 3\.0% · 세금 뺀 금액 기준$/, function () { var c = calc(); return '매달 ' + man(D.monthly) + ' 원 · ' + (D.months % 12 ? D.months + '개월' : (D.months / 12) + '년') + ' · 연 ' + c.rate.toFixed(1) + '% · 세금 뺀 금액 기준'; }]
      );
    }
    return r;
  }
  function apply(scr, k) {
    var R = rules(k); if (!R.length) return;
    var byName = {}; R.forEach(function (x) { byName[x[0]] = x; });
    // E0-3: 두 번째 카드(도토리)는 예전에 저장한 정보라 그대로 둠
    var stopY = 1e9; if (k === 'E0-3') { var dt = [].filter.call(scr.querySelectorAll('.t'), function (t) { return textOf(t) === '도토리'; })[0]; if (dt) stopY = dt.getBoundingClientRect().top; }
    [].forEach.call(scr.querySelectorAll('.t'), function (t) {
      if (t.closest('.under')) return;
      if (t.getBoundingClientRect().top >= stopY) return;
      if (t.dataset.bind) { if (byName[t.dataset.bind]) setText(t, byName[t.dataset.bind][2]()); return; }
      var s = textOf(t); if (t.closest('[data-pslot]')) return;
      for (var i = 0; i < R.length; i++) {
        if (R[i][1].test(s)) {
          if (R[i][3] && t.closest('[data-comp^="Option"]')) continue; // 고르는 칸의 '12개월'은 그대로
          if (R[i][4]) { spanReplace(t, R[i][2]); continue; }
          t.dataset.bind = R[i][0]; setText(t, R[i][2]()); break;
        }
      }
    });
  }
  window.COMMA_REFRESH = function () { var scr = document.getElementById('stage').lastChild; if (scr) apply(scr, window.COMMA.key); };

  /* ---------- 고르기: 칩 · 옵션 · 탭 · 체크 · 토글 ---------- */
  var SAMPLE = {};
  function sample(comp) {
    if (SAMPLE[comp] !== undefined) return SAMPLE[comp];
    SAMPLE[comp] = null;
    var key = 'data-comp="' + comp + '"';
    for (var k in window.SCREENS) {
      if (window.SCREENS[k].indexOf(key) < 0) continue;
      var tpl = document.createElement('template'); tpl.innerHTML = window.SCREENS[k];
      var el = tpl.content.querySelector('[' + key + ']'); if (el) { SAMPLE[comp] = el; break; }
    }
    return SAMPLE[comp];
  }
  function look(el) {
    var sp = el.querySelector('span');
    return { bg: el.style.background, sh: el.style.boxShadow, col: sp ? sp.style.color : '', fw: sp ? sp.style.fontWeight : '', imgs: [].map.call(el.querySelectorAll('img'), function (i) { return i.getAttribute('src'); }) };
  }
  function wear(el, lk) {
    el.style.background = lk.bg; el.style.boxShadow = lk.sh;
    [].forEach.call(el.querySelectorAll('span'), function (s) { if (lk.col) s.style.color = lk.col; if (lk.fw) s.style.fontWeight = lk.fw; });
    var im = el.querySelectorAll('img'); [].forEach.call(im, function (i, j) { if (lk.imgs[j]) i.src = lk.imgs[j]; });
  }
  // 같은 컴포넌트의 다른 상태(Selected ↔ Default) 모양을 입힘
  function wearVariant(el, comp) { var s = sample(comp); if (!s) return; copyDeep(el, s); el.dataset.comp = comp; }
  function copyDeep(a, b) {
    a.style.background = b.style.background; a.style.boxShadow = b.style.boxShadow; a.style.opacity = b.style.opacity;
    if (a.tagName === 'IMG' && b.tagName === 'IMG') a.src = b.getAttribute('src');
    if (a.tagName === 'SPAN' && b.tagName === 'SPAN') { a.style.color = b.style.color; a.style.fontWeight = b.style.fontWeight; }
    var ak = a.children, bk = b.children;
    for (var i = 0; i < Math.min(ak.length, bk.length); i++) if (ak[i].tagName === bk[i].tagName) copyDeep(ak[i], bk[i]);
  }
  function compGroup(scr, family, onPick) {
    var items = [].slice.call(scr.querySelectorAll('[data-comp^="' + family + '/"]')).filter(function (i) { return !i.closest('.under'); });
    var groups = new Map();
    items.forEach(function (it) { var p = it.parentElement; if (!groups.has(p)) groups.set(p, []); groups.get(p).push(it); });
    groups.forEach(function (list) {
      list.forEach(function (it) {
        if (it.classList.contains('hot')) return;
        it.classList.add('hot');
        it.addEventListener('click', function (e) {
          e.stopPropagation();
          // 홈 · 찾기의 청약 · 자동이체는 준비 중: 눌러도 고르지 않음
          if (/^(B-0|B2-1|B3-4|B3-5|D1-1|D1-2|S-6)$/.test(window.COMMA.key) && /^(청약|자동이체)$/.test(txtOf(it))) { toast('준비 중이에요. 지금은 적금만 볼 수 있어요'); if (window.COMMA_SHAKE) window.COMMA_SHAKE(it, 4); return; }
          var on = family + '/State=Selected', off = family + '/State=Default';
          list.forEach(function (o) { if (o !== it && /Selected/.test(o.dataset.comp)) wearVariant(o, off); });
          wearVariant(it, on);
          it.animate([{ transform: 'scale(.97)' }, { transform: 'none' }], { duration: 160 });
          if (onPick) onPick(txtOf(it), it, list);
        });
      });
    });
    return groups;
  }
  function txtOf(el) { var t = el.classList.contains('t') ? el : el.querySelector('.t'); return t ? textOf(t).replace(/\n/g, ' ') : ''; }
  // 컴포넌트가 아닌 탭 줄(전체 · 적금 · 청약 · 자동이체 등): 형제 박스 중 하나만 모양이 다르면 그게 '선택'
  function tabRows(scr, onPick) {
    [].forEach.call(scr.querySelectorAll('[data-al]'), function (row) {
      if (row.closest('.under') || row.closest('.hot')) return;
      var all = named(row), kids = all.filter(function (c) { var n = c.querySelectorAll('.t').length; return c.tagName === 'DIV' && n >= 1 && n <= 2 && !c.dataset.comp && !c.querySelector('.hot') && !c.classList.contains('hot'); });
      var hotKids = all.filter(function (c) { return c.classList.contains('hot'); }).length;
      if (kids.length < 2 || kids.length + hotKids !== all.length || hotKids > 1) return;
      var h0 = px(kids[0], 'height'); if (h0 < 24 || h0 > 80) return;
      if (!kids.every(function (k) { return Math.abs(px(k, 'height') - h0) < 3 && (k.style.boxShadow || k.style.background); })) return;
      var lks = kids.map(look), sig = lks.map(function (l) { return l.sh + '|' + l.col + '|' + l.bg; });
      var counts = {}; sig.forEach(function (s) { counts[s] = (counts[s] || 0) + 1; });
      var selI = sig.findIndex(function (s) { return counts[s] === 1; });
      var onL, offL;
      if (Object.keys(counts).length === 1 && al(row).m === 'H' && h0 <= 44) {
        // 모두 같은 모양(아무것도 안 골라진 칩 줄): 라임 테두리로 고름 표시
        offL = lks[0]; onL = { bg: offL.bg, sh: 'inset 0 0 0 0.8px rgb(211,255,49)', col: 'rgb(211,255,49)', fw: offL.fw, imgs: [] }; selI = -1;
      } else {
        if (selI < 0 || Object.keys(counts).length !== 2) return;
        onL = lks[selI]; offL = lks[selI === 0 ? 1 : 0];
      }
      kids.forEach(function (k) {
        if (k.classList.contains('hot')) return;
        k.classList.add('hot');
        k.addEventListener('click', function (e) {
          e.stopPropagation();
          if (onPick && onPick(txtOf(k), k, true) === false) return;
          kids.forEach(function (o) { wear(o, offL); }); wear(k, onL);
          k.animate([{ transform: 'scale(.97)' }, { transform: 'none' }], { duration: 160 });
          if (onPick) onPick(txtOf(k), k, false);
        });
      });
    });
  }
  // 체크 이미지(24~28px) 줄: 같은 크기의 서로 다른 그림 두 종류 = 켜짐/꺼짐
  function checks(scr, rowsSel, single, onChange) {
    var rows = [].slice.call(scr.querySelectorAll(rowsSel)); if (!rows.length) return;
    var imgs = rows.map(function (r) { return [].filter.call(r.querySelectorAll('img'), function (i) { var w = px(i, 'width'); return w >= 22 && w <= 30 && Math.abs(px(i, 'height') - w) < 2; })[0]; });
    var srcs = []; imgs.forEach(function (i) { if (i && srcs.indexOf(i.getAttribute('src')) < 0) srcs.push(i.getAttribute('src')); });
    if (srcs.length < 2) return;
    return { rows: rows, imgs: imgs, srcs: srcs };
  }

  /* ---------- 숫자 키패드 + 컴퓨터 키보드 ---------- */
  var MAXLEN = { age: 2, spare: 6, count: 2, income: 6, monthly: 6 };
  var LIMIT = { age: [1, 99], spare: [0, 500000], count: [1, 20], income: [0, 999999], monthly: [10000, 500000] };
  function keypad(scr, k, api) {
    var pad = scr.querySelector('[data-comp="Step Item/State=Keypad"]'), field = INPUT[k];
    if (!pad || !field) return;
    // 입력 칸: 키패드 위쪽에서 가장 큰 숫자 글자
    var pr = api.rel(pad, scr), best = null, bz = 0;
    [].forEach.call(scr.querySelectorAll('.t'), function (t) {
      if (t.closest('.under') || pad.contains(t)) return;
      var s = textOf(t); if (!/^[\d,]+$/.test(s)) return;
      var r = api.rel(t, scr); if (r.y > pr.y) return;
      var z = parseFloat((t.querySelector('span') || {}).style ? t.querySelector('span').style.fontSize : 0);
      if (z > bz) { bz = z; best = t; }
    });
    if (!best) return;
    var fresh = true, digits = String(D[field]);
    setText(best, VIEW[field]());
    var caret = document.createElement('div');
    caret.className = 'caret'; best.appendChild(caret);
    function render() {
      var v = digits === '' ? 0 : parseInt(digits, 10);
      var was = D[field]; D[field] = v;
      if (field === 'count' && was !== v) setTimeout(function () { apply(scr, k); }, 0);
      setText(best, digits === '' ? '0' : (field === 'age' || field === 'count' ? String(v) : fmt(v)));
      best.querySelectorAll('span').forEach(function (s) { s.style.opacity = digits === '' ? '.35' : ''; });
      if (best.contains(caret) === false) best.appendChild(caret);
      caret.style.left = textW(best) + 2 + 'px';
    }
    var cont = window.COMMA_KEYCONT; window.COMMA_KEYCONT = null;
    if (cont && cont.field === field) { digits = cont.digits; fresh = false; }
    function press(key) {
      if (key === '⌫') { digits = fresh ? '' : digits.slice(0, -1); fresh = false; }
      else if (/^\d$/.test(key)) {
        if (fresh) { digits = ''; fresh = false; }
        if (digits === '0') digits = '';
        if (digits.length < MAXLEN[field]) { digits += key; var lim = LIMIT[field][1]; if (parseInt(digits, 10) > lim) { digits = String(lim); toast(field === 'spare' || field === 'monthly' ? '한 달에 50만 원까지 넣을 수 있어요' : '더 큰 숫자는 넣을 수 없어요'); if (window.COMMA_SHAKE) setTimeout(function () { window.COMMA_SHAKE(best); }, 0); } }
      } else return;
      if (k === 'C0-9' && digits !== '') { D[field] = parseInt(digits, 10); window.COMMA_KEYCONT = { field: field, digits: digits }; api.go('C0-10', { replace: true }); return; }
      render();
    }
    // 각 숫자 위치를 칸으로 삼아 누르기
    var keys = [].map.call(pad.querySelectorAll('.t'), function (t) { return { t: t, key: textOf(t).trim() }; });
    var hasBack = keys.some(function (x) { return x.key === '⌫'; });
    pad.classList.add('hot');
    pad.addEventListener('click', function (e) {
      e.stopPropagation();
      var r = pad.getBoundingClientRect(), x = e.clientX, y = e.clientY, near = null, nd = 1e9;
      keys.forEach(function (o) { var q = o.t.getBoundingClientRect(), cx = q.left + q.width / 2, cy = q.top + q.height / 2, d = Math.pow(cx - x, 2) + Math.pow(cy - y, 2); if (d < nd) { nd = d; near = o; } });
      // 오른쪽 아래 빈 칸 = 지우기 (그림으로 된 ⌫)
      if (!hasBack && x > r.left + r.width * 2 / 3 && y > r.top + r.height * 3 / 4) near = { key: '⌫' };
      if (!near) return;
      if (near.t) near.t.animate([{ opacity: .35 }, { opacity: 1 }], { duration: 180 });
      press(near.key);
    });
    function onKey(e) {
      if (window.COMMA.key !== k) { document.removeEventListener('keydown', onKey); return; }
      if (/^\d$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('⌫');
    }
    document.addEventListener('keydown', onKey);
    render(); if (!cont) fresh = true;
  }

  /* ---------- 글자 입력 칸 (질문 · 검색 · 답변) ---------- */
  function textInput(scr, api, placeholderRe, opts) {
    var t = api.findText(scr, placeholderRe); if (!t) return null;
    var host = t.parentElement, r = { left: px(t, 'left'), top: px(t, 'top') };
    var ta = document.createElement(opts.multi ? 'textarea' : 'input');
    ta.className = 'field'; ta.setAttribute('aria-label', textOf(t));
    var sp = t.querySelector('span');
    ta.style.cssText = 'position:absolute;left:' + r.left + 'px;top:' + (r.top - 2) + 'px;width:' + (opts.w || (px(host, 'width') - r.left - 8)) + 'px;height:' + (opts.h || (parseFloat(t.querySelector('.ln').style.height) + 4)) + 'px;' +
      'background:transparent;border:0;outline:0;resize:none;padding:0;margin:0;color:#f7f7f5;caret-color:#d3ff31;font-family:\'Pretendard Variable\',sans-serif;' +
      'font-size:' + sp.style.fontSize + ';line-height:' + t.querySelector('.ln').style.height + ';letter-spacing:' + sp.style.letterSpacing + ';font-weight:' + sp.style.fontWeight + ';z-index:2;pointer-events:auto';
    if (opts.max) ta.maxLength = opts.max;
    if (opts.value) ta.value = opts.value;
    host.appendChild(ta);
    var sync = function () { t.style.visibility = ta.value ? 'hidden' : ''; if (opts.onInput) opts.onInput(ta.value); };
    ta.addEventListener('input', sync); ta.addEventListener('click', function (e) { e.stopPropagation(); });
    host.classList.add('hot'); host.addEventListener('click', function () { ta.focus(); });
    sync();
    return ta;
  }

  /* ---------- 화면별 연결 ---------- */
  var HOUSE = { '혼자 살아요': 1, '가족과 살아요': 3, '그 외 (친구, 기숙사 등)': 1 };
  function preselect(scr, family, want) {
    var items = [].slice.call(scr.querySelectorAll('[data-comp^="' + family + '/"]'));
    var hit = items.filter(function (i) { return txtOf(i) === want; })[0]; if (!hit) return;
    var sibs = items.filter(function (i) { return i.parentElement === hit.parentElement; });
    sibs.forEach(function (o) { if (o !== hit && /Selected/.test(o.dataset.comp)) wearVariant(o, family + '/State=Default'); });
    if (!/Selected/.test(hit.dataset.comp)) wearVariant(hit, family + '/State=Selected');
  }
  window.LIVE = function (scr, k, api) {
    // 화면 진입 시 값 반영
    if (k === 'C2-2') base = JSON.parse(JSON.stringify(D));
    apply(scr, k);
    // E0-5~8: 피그마에서 키패드가 '완료' 버튼을 가림 → C0-15와 같은 키패드(높이 546~818)로 바꿔 끼움
    if (/^E0-[5-8]$/.test(k)) {
      var kp = scr.querySelector('[data-comp="Step Item/State=Keypad"]');
      if (kp) {
        var g = kp; while (g.parentElement && !g.parentElement.classList.contains('content')) g = g.parentElement;
        var tpl = document.createElement('template'); tpl.innerHTML = window.SCREENS['C0-15'];
        var kp2 = tpl.content.querySelector('[data-comp="Step Item/State=Keypad"]'), g2 = kp2;
        while (g2.parentElement && !g2.parentElement.classList.contains('content')) g2 = g2.parentElement;
        g.replaceWith(g2); if (window.COMMA_FIXB) window.COMMA_FIXB(g2);
      }
    }
    keypad(scr, k, api);
    // 칩 · 옵션 (공통)
    compGroup(scr, 'Chip', function (txt) {
      if (/^(예|아니요|잘 모르겠어요)$/.test(txt)) D.head = txt;
      if (/^(적금|청약|자동이체)$/.test(txt)) D.topic = txt;
      if (/^(가입 전|금액 정하기|가입 후)$/.test(txt)) D.when = txt;
      if (k === 'B3-4' || k === 'B3-5') qReady(scr);
    });
    compGroup(scr, 'Option', function (txt) {
      if (k === 'C1-6-1') D.ans1 = txt; if (k === 'C1-6-2') D.ans2 = txt;
      if (HOUSE[txt] !== undefined) { D.house = txt; if (txt === '가족과 살아요' && D.count < 2) D.count = 3; if (txt === '혼자 살아요') D.count = 1; }
      var m = txt.match(/^(\d+)개월$/); if (m && /^C2-/.test(k)) { D.months = +m[1]; apply(scr, k); }
    });
    compGroup(scr, 'Bottom Bar');
    var NOSEL = /^(C1-6-2|C1-6-3|C3-5|C3-6|D1-4|E5-1|C2-1|C2-6|B1-5|E0-3|E0-2|C1-1)$/;
    if (!NOSEL.test(k)) tabRows(scr, function (txt, el, before) {
      if (before) { if (/^(B-0|B2-1|D1-1|D1-2|S-6)$/.test(k) && /^(청약|자동이체)$/.test(txt)) { toast('준비 중이에요. 지금은 적금만 볼 수 있어요'); return false; } return; }
      if (k === 'E3-1') { if (/^내 답변/.test(txt) && window.COMMA_QNA) window.COMMA_QNA('a'); if (/^내 질문/.test(txt) && window.COMMA_QNA) window.COMMA_QNA('q'); }
      if (ACTION[txt]) D.action = txt;
      if (txt === '오늘') D.day = TODAY; else if (txt === '내일') D.day = TODAY + 1; else if (/^이번 주말/.test(txt)) D.day = 24;
      var m = txt.match(/^10월 (\d+)일$/); if (m) D.day = +m[1];
    });
    extras(scr, k, api);
    // 지금 값으로 미리 골라 두기
    if (/^(C0-12|C0-17|E0-7|C0-19)$/.test(k)) { preselect(scr, 'Option', D.house); preselect(scr, 'Chip', D.head); }
    if (k === 'C2-4') preselect(scr, 'Option', D.months + '개월');
    // 토글 (설정 알림): 켜면 동그라미가 오른쪽으로, 끄면 왼쪽으로 미끄러짐
    [].forEach.call(scr.querySelectorAll('[data-comp^="Toggle/"]'), function (tg) {
      if (tg.classList.contains('hot') || tg.closest('.under')) return; tg.classList.add('hot');
      var key = 'tg' + Math.round(api.rel(tg, scr).y);
      if (D[key] !== undefined) setToggle(tg, D[key], false);
      tg.addEventListener('click', function (e) { e.stopPropagation(); var on = !/On$/.test(tg.dataset.comp); D[key] = on; setToggle(tg, on, true); });
    });
    // C2-5 우대조건 켜고 끄기
    if (k === 'C2-5') {
      var names = ['자동이체', '급여이체', '카드 실적'];
      var rows = names.map(function (n) { var t = api.findText(scr, new RegExp('^' + n + '$')); return t && t.parentElement && t.parentElement.parentElement; });
      if (rows[0] && rows[1]) {
        var onS = rows[0].cloneNode(true), offS = rows[1].cloneNode(true); // 피그마: 자동이체 = 켜진 모양
        rows.forEach(function (r, i) {
          if (!r) return; var name = names[i];
          copyDeep(r, D.prefs[name] ? onS : offS);
          api.hot(r, function () { D.prefs[name] = !D.prefs[name]; copyDeep(r, D.prefs[name] ? onS : offS); r.animate([{ transform: 'scale(.98)' }, { transform: 'none' }], { duration: 180 }); apply(scr, k); });
        });
      }
    }
    // C2-3 납입액: 눈금을 좌우로 끌어서 바꾸기
    if (k === 'C2-3') ruler(scr, api, 'monthly', 10000, 500000);
    if (k === 'C0-11' || k === 'C0-7' || k === 'B1-3') ruler(scr, api, 'spare', 0, 500000);
    // 상품 목록: 보관함 담기 → 체크박스, 고르기, 비교, 검색
    if (/^(C1-5|C1-5-1|D1-1|D1-2)$/.test(k)) products(scr, k, api);
    if (/^(C1-5|C1-5-1|D1-1|D1-2|D1-3)$/.test(k)) statusRows(scr, api);
    if (k === 'C0-20') D.infoDone = true;
    if (k === 'D1-1') search(scr, k, api);
    if (k === 'D2-1') {
      var bt = api.findText(scr, /^보관함에 담기/);
      var cnt0 = Object.keys(D.boxed).length;
      if (bt) { setText(bt, D.boxed[D.pick] ? '보관함에 담겼어요 (' + cnt0 + ')' : '보관함에 담기 (' + cnt0 + ')'); }
    }
    // C1-2: 형광펜 단어가 있는 화면에 처음 들어오면 용어 풀이 모달
    if (k === 'C1-2' && !D.seenTerm) { D.seenTerm = true; setTimeout(function () { if (window.COMMA.key === 'C1-2') api.go('C1-3'); }, 650); }
    if (k === 'C0-1-1' || k === 'C0-1-1@in') {
      if (D.c1Done) { var sub = api.findText(scr, /^6단계로 적금을 쉽게$/); if (sub) setText(sub, '6단계를 모두 마쳤어요'); var rec = api.findText(scr, /^추천$/); if (rec) setText(rec, '완료'); }
    }
    if (k === 'C0-3' || k === 'C0-4') docs(scr, k, api);
    if (k === 'C1-1') stepsToc(scr, api);
    if (k === 'B0' || k === 'B0-2') menuCoins(scr, api);
    if (k === 'E5-1') settings(scr, api);
    if (k === 'E0-2') stepsMy(scr, api);
    if (k === 'E3-1') myQna(scr, api);
    // 질문 남기기 시트: 실제 글자 입력
    if (k === 'B3-4' || k === 'B3-5') {
      var cnt = api.findText(scr, /^\d+ \/ 100$/);
      var ta = textInput(scr, api, /^(예\) 가구원은|따로 사는데)/, { multi: true, max: 100, h: 44, value: D.question, onInput: function (v) { D.question = v; if (cnt) setText(cnt, v.length + ' / 100'); qReady(scr); } });
      if (k === 'B3-5' && ta && !D.question) { ta.value = ''; }
      qReady(scr);
    }
    if (k === 'B3-2') textInput(scr, api, /^답변$/, { max: 100, w: 190 });
    if (k === 'E3-1' && D.question) { var q = api.findText(scr, /^가구원은 누구까지일까/); }
  };
  /* ---------- 상품 목록 ---------- */
  var PSAMPLE = null;
  function psample() {
    if (PSAMPLE) return PSAMPLE;
    var t1 = document.createElement('template'); t1.innerHTML = window.SCREENS['C1-5'];
    var on = t1.content.querySelector('[data-name="Pick · 청년미래적금"] [data-name="Frame 2087332265"]'), off = t1.content.querySelector('[data-name="Pick · 첫걸음적금"] [data-name="Frame 2087332265"]');
    var t2 = document.createElement('template'); t2.innerHTML = window.SCREENS['D1-1'];
    var bl = [].filter.call(t2.content.querySelectorAll('.t'), function (t) { return t.textContent.trim() === '보관함에 담기'; })[0];
    var btn = bl && bl.parentElement;
    var no = [].filter.call(t2.content.querySelectorAll('.t'), function (t) { return t.textContent.trim() === '가입 불가능'; })[0];
    PSAMPLE = { on: on && on.getAttribute('src'), off: off && off.getAttribute('src'), btn: btn, noColor: no ? no.querySelector('span').style.color : 'rgb(239,166,163)' };
    return PSAMPLE;
  }
  function productRows(scr, api) {
    var out = [];
    Object.keys(PRODUCTS).forEach(function (name) {
      var t = [].filter.call(scr.querySelectorAll('.t'), function (x) { return !x.closest('.under') && textOf(x) === name && parseFloat(x.querySelector('span').style.fontSize) >= 17; })[0];
      if (!t) return;
      var row = t; while (row.parentElement && !(px(row, 'height') >= 100 && px(row, 'height') <= 170 && px(row, 'width') >= 300)) row = row.parentElement;
      if (!row.parentElement) return;
      out.push({ name: name, t: t, row: row });
    });
    return out;
  }
  /* 가입 가능 여부: 내 정보가 없으면(비회원 · 정보 입력 전) 모두 '확인 필요'
     첫걸음적금 만 19~34세 · 청년미래적금 만 19~34세 + 연 소득 7,500만 원 이하 + 가구소득(02 자격 확인에서 답)
     꾸준히적금 세대주만 */
  function hasInfo() { return window.COMMA_INFO_IN ? !!(window.COMMA_INFO_IN() || D.infoDone) : !!(window.COMMA.loggedIn || D.infoDone); }
  function status(name) {
    if (!hasInfo()) return 'check';
    if (D.blocked[name]) return 'no';
    var young = D.age >= 19 && D.age <= 34;
    if (name === '첫걸음적금') return young ? 'ok' : 'no';
    if (name === '청년미래적금') return (!young || D.income > 7500) ? 'no' : (D.passed[name] ? 'ok' : 'check');
    if (name === '꾸준히적금') return D.head === '예' ? 'ok' : D.head === '아니요' ? 'no' : 'check';
    return 'check';
  }
  window.COMMA_STATUS = status;
  var CAP = { ok: ['가입 가능', 'rgb(125,247,253)'], check: ['확인 필요', 'rgb(247,247,245)'], no: ['가입 불가능', 'rgb(239,166,163)'] };
  function statusRows(scr, api) {
    productRows(scr, api).forEach(function (r) {
      var st = status(r.name), ts = [].slice.call(r.row.querySelectorAll('.t'));
      var cap = ts.filter(function (x) { return /^(가입 가능|확인 필요|가입 불가능)$/.test(textOf(x)); })[0];
      if (cap) { if (textOf(cap) !== CAP[st][0]) setText(cap, CAP[st][0]); cap.querySelectorAll('span').forEach(function (sp) { sp.style.color = CAP[st][1]; }); }
      var amt = ts.filter(function (x) { return /^[\d,]+$/.test(textOf(x)) && parseFloat(x.querySelector('span').style.fontSize) >= 20; })[0];
      if (amt) {
        var col = st === 'no' ? 'rgb(113,112,108)' : 'rgb(240,240,237)';
        amt.querySelectorAll('span').forEach(function (sp) { sp.style.color = col; });
        var unit = ts.filter(function (x) { return textOf(x) === '원' && Math.abs(api.rel(x, scr).y - api.rel(amt, scr).y) < 30; })[0];
        if (unit) unit.querySelectorAll('span').forEach(function (sp) { sp.style.color = col; });
      }
    });
  }
  function refreshNext(scr, k) {
    if (!/^C1-5/.test(k)) return;
    var b = scr.querySelector('[data-comp^="Button/Next/"]'); if (!b) return;
    var ok = !!D.pickSel && status(D.pickSel) !== 'no';
    var want = 'Button/Next/State=' + (ok ? 'Active' : 'Disabled');
    if (b.dataset.comp !== want) { wearVariant(b, want); b.animate([{ transform: 'scale(.96)' }, { transform: 'none' }], { duration: 200 }); }
    var bt = b.querySelector('.t'); if (bt) setText(bt, ok ? '01 완료하기' : '하나를 골라 주세요');
  }
  function products(scr, k, api) {
    var S0 = psample(), rows = productRows(scr, api), c1 = /^C1-5/.test(k);
    rows.forEach(function (r) {
      var row = r.row;
      // 기존 슬롯(체크 그림 · 보관함 버튼) 지우고 새로 놓기
      [].slice.call(row.querySelectorAll('img')).forEach(function (im) { if (Math.abs(px(im, 'width') - 28) < 3 && api.rel(im, scr).x > 300) im.remove(); });
      [].slice.call(row.querySelectorAll('.t')).forEach(function (x) { if (textOf(x) === '보관함에 담기') x.parentElement.remove(); });
      var amt = [].filter.call(row.querySelectorAll('.t'), function (x) { return /^[\d,]+$/.test(textOf(x)); })[0];
      var rr = api.rel(row, scr), ar = amt ? api.rel(amt, scr) : { y: rr.y + rr.h - 40, h: 34 };
      var bottom = ar.y + ar.h - rr.y - 4;
      var slot = document.createElement('div'); slot.dataset.pslot = r.name;
      slot.style.cssText = 'right:0;top:' + (bottom - 28) + 'px;height:28px;width:120px;';
      var cb = document.createElement('img'); cb.style.cssText = 'right:0;left:auto;top:0;width:28px;height:28px;position:absolute';
      var btn = S0.btn ? S0.btn.cloneNode(true) : document.createElement('div');
      btn.style.left = 'auto'; btn.style.right = '0px'; btn.style.top = (28 - px(btn, 'height')) / 2 + 'px'; btn.removeAttribute('data-id');
      slot.appendChild(cb); slot.appendChild(btn); row.appendChild(slot);
      if (window.COMMA_FIXB) window.COMMA_FIXB(btn);
      function render() {
        var boxed = c1 ? true : !!D.boxed[r.name]; // 적금 가입 01 고르기는 보관함 없이 체크박스만
        btn.style.display = boxed ? 'none' : ''; cb.style.display = boxed ? '' : 'none';
        var on = c1 ? D.pickSel === r.name : !!D.compare[r.name];
        cb.src = on ? S0.on : S0.off;
      }
      btn.classList.add('hot');
      btn.addEventListener('click', function (e) {
        e.stopPropagation(); D.boxed[r.name] = true; if (!c1) D.compare[r.name] = true;
        render(); cb.animate([{ transform: 'scale(.5)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' });
        toast('보관함에 담았어요'); counts(scr, k, api);
      });
      cb.classList.add('hot'); cb.style.pointerEvents = 'auto';
      cb.addEventListener('click', function (e) {
        e.stopPropagation();
        if (c1) {
          if (status(r.name) === 'no') { toast('이 적금은 가입이 어려워요'); if (window.COMMA_SHAKE) window.COMMA_SHAKE(cb, 4); return; }
          D.pickSel = D.pickSel === r.name ? null : r.name;
          rows.forEach(function (o) { var s2 = scr.querySelector('[data-pslot="' + o.name + '"] img'); if (s2) s2.src = D.pickSel === o.name ? S0.on : S0.off; });
          if (D.pickSel) D.pick = D.pickSel;
          refreshNext(scr, k);
        } else {
          // 찾기: 체크를 풀면 보관함에서 빠지고 '보관함에 담기' 버튼으로 돌아감
          delete D.boxed[r.name]; delete D.compare[r.name]; render(); counts(scr, k, api);
          btn.animate([{ opacity: 0, transform: 'scale(.9)' }, { opacity: 1, transform: 'none' }], { duration: 220 }); toast('보관함에서 뺐어요');
        }
        cb.animate([{ transform: 'scale(.8)' }, { transform: 'none' }], { duration: 200 });
      });
      render();
    });
    // C1-5-1: 이미 담은 게 있으면 '보관함에 담은 적금이 없어요' 안내를 빼고 목록을 올림
    if (k === 'C1-5-1') { // 01 고르기에는 보관함이 없으니 '보관함에 담은 적금이 없어요' 안내를 빼고 목록을 올림
      var note = scr.querySelector('[data-name="Note"]'), lst = scr.querySelector('[data-name="List"]');
      if (note && lst) { var dy = px(lst, 'top') - px(note, 'top'); note.style.display = 'none'; lst.style.top = (px(lst, 'top') - dy) + 'px'; }
    }
    // C1-5: 보관함에 담긴 것만 보여 줌
    if (k === 'C1-5') filterRows(scr, rows, function (r) { return !!D.boxed[r.name]; }, api);
    counts(scr, k, api); refreshNext(scr, k);
  }
  function counts(scr, k, api) {
    var nb = Object.keys(D.boxed).length, nc = Object.keys(D.compare).filter(function (x) { return D.compare[x]; }).length;
    [].forEach.call(scr.querySelectorAll('.t'), function (t) {
      if (t.closest('.under') || t.closest('[data-pslot]')) return;
      var s2 = textOf(t);
      if (/^보관함( \(\d+\))?$/.test(s2) && api.rel(t, scr).y > 700) setText(t, nb ? '보관함 (' + nb + ')' : '보관함');
      if (/^비교하기 \(\d+\)$/.test(s2)) setText(t, '비교하기 (' + nc + ')');
    });
  }
  // 줄 숨기기 + 아래 줄 끌어올리기
  function filterRows(scr, rows, keep, api) {
    var shown = 0;
    rows.forEach(function (r) { if (r.orig === undefined) r.orig = px(r.row, 'top'); });
    var sorted = rows.slice().sort(function (a, b) { return a.orig - b.orig; }), shift = 0;
    sorted.forEach(function (r) {
      var ok = keep(r), h = px(r.row, 'height');
      var newTop = r.orig - shift;
      if (ok) { shown++; if (Math.abs(px(r.row, 'top') - newTop) > .5 || r.row.style.display === 'none') { var from = px(r.row, 'top') - newTop; r.row.style.display = ''; r.row.style.top = newTop + 'px'; if (r.row.isConnected && Math.abs(from) > .5) r.row.animate([{ transform: 'translateY(' + from + 'px)' }, { transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.2,.8,.2,1)' }); } }
      else { r.row.style.display = 'none'; shift += h; }
    });
    var ct = [].filter.call(scr.querySelectorAll('.t'), function (t) { return /^\d+개$/.test(textOf(t)) && !t.closest('.under'); })[0];
    if (ct) setText(ct, shown + '개');
    return shown;
  }
  /* ---------- 찾기: 쓰는 대로 바로 걸러짐 (한글 조합 중에도 안 끊김) ---------- */
  var jamo = function (x) { return (x || '').replace(/\s/g, '').normalize('NFD'); };
  function hitP(name, q) { var p = PRODUCTS[name]; return jamo(name + p.bank + '적금').indexOf(jamo(q)) >= 0; }
  function search(scr, k, api) {
    var rows = productRows(scr, api), empty = null;
    function showEmpty(on, q) {
      if (on && !empty) {
        var tpl = document.createElement('template'); tpl.innerHTML = window.SCREENS['S-6'];
        empty = tpl.content.querySelector('[data-name="Frame 2087332444"]').cloneNode(true);
        (scr.querySelector('.content') || scr).appendChild(empty); if (window.COMMA_FIXB) window.COMMA_FIXB(empty);
        var ts = empty.querySelectorAll('.t'); if (ts[0]) setText(ts[0], '검색어와 맞는 상품이 없어요'); if (ts[1]) setText(ts[1], '상품 이름이나 은행 이름으로 찾아보세요');
        if (window.COMMA_GFX) window.COMMA_GFX(empty, 'S-6');
      }
      if (empty) { var was = empty.style.display !== 'none' && empty.dataset.shown; empty.style.display = on ? '' : 'none'; empty.dataset.shown = on ? '1' : ''; if (on && !was) { empty.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 260 }); if (window.COMMA_GFX_ENTER) window.COMMA_GFX_ENTER(empty, 'S-6'); } }
      var head = [].filter.call(scr.querySelectorAll('.t'), function (t) { return textOf(t) === '상품'; })[0];
      if (head) { var hr = head.parentElement.parentElement; hr.style.visibility = on ? 'hidden' : ''; }
    }
    var last = null;
    function run(q) {
      q = (q || '').trim(); if (q === last) return; last = q;
      var n = filterRows(scr, rows, function (r) { return !q || hitP(r.name, q); }, api);
      showEmpty(q && n === 0, q);
    }
    var composing = false;
    var inp = textInput(scr, api, /^(적금 상품 검색|청년주택)$/, { max: 30, w: 240, value: D.search || '', onInput: function (v) { D.search = v; run(v); } });
    if (inp) {
      inp.placeholder = '';
      inp.setAttribute('autocomplete', 'off'); inp.setAttribute('autocorrect', 'off'); inp.setAttribute('spellcheck', 'false'); inp.setAttribute('enterkeyhint', 'search');
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') inp.blur(); });
    }
    run(D.search);
  }
  /* ---------- 내 정보 불러오기: 등본 · 소득금액증명 여러 개 고르기 ---------- */
  var DOC_RE = { '주민등록등본': /^주민등록등본$/, '소득금액증명': /^소득금액증명$/ };
  function docRow(scr, api, name) { var t = api.findText(scr, DOC_RE[name]); if (!t) return null; var r = t; while (r.parentElement && !(px(r, 'height') > 60 && px(r, 'width') >= 340)) r = r.parentElement; return r; }
  function docs(scr, k, api) {
    var tplOn = document.createElement('template'); tplOn.innerHTML = window.SCREENS['C0-4'];
    var tplOff = document.createElement('template'); tplOff.innerHTML = window.SCREENS['C0-3'];
    var fakeOn = { querySelectorAll: function (q) { return tplOn.content.querySelectorAll(q); } };
    function sampleRow(tpl, name) { var t = [].filter.call(tpl.content.querySelectorAll('.t'), function (x) { return x.textContent.trim() === name; })[0]; var r = t; while (r && r.parentElement && !(px(r, 'height') > 60 && px(r, 'width') >= 340)) r = r.parentElement; return r; }
    ['주민등록등본', '소득금액증명'].forEach(function (name) {
      var row = docRow(scr, api, name); if (!row) return;
      var selected = !!D.docs[name];
      if (k === 'C0-4' && !selected) { var nr = sampleRow(tplOff, name).cloneNode(true); swapRow(scr, row, nr, false); row = nr; }
      bindDoc(row, name);
    });
    function bindDoc(row, name) {
      row.classList.add('hot');
      row.addEventListener('click', function (e) {
        e.stopPropagation();
        D.docs[name] = !D.docs[name];
        var any = D.docs['주민등록등본'] || D.docs['소득금액증명'];
        if (k === 'C0-3') { if (D.docs[name]) api.go('C0-4', { replace: true }); return; }
        if (!any) { api.go('C0-3', { replace: true }); return; }
        var nr = sampleRow(D.docs[name] ? tplOn : tplOff, name).cloneNode(true);
        swapRow(scr, row, nr, true); bindDoc(nr, name);
      });
    }
    var other = api.findText(scr, /^(이미 가입한 금융상품|가입한 금융상품)$/);
    if (other) { var orow = other; while (orow.parentElement && !(px(orow, 'height') > 60 && px(orow, 'width') >= 340)) orow = orow.parentElement; api.hot(orow, function () { toast('마이데이터 연결은 준비 중이에요'); }); }
  }
  // 줄 바꿔 끼우기: 높이가 달라지면 아래 것들이 따라 움직임 (글이 줄어드는 모션)
  function swapRow(scr, oldRow, newRow, animate) {
    newRow.style.left = oldRow.style.left; newRow.style.top = oldRow.style.top; newRow.removeAttribute('data-id');
    var dh = px(newRow, 'height') - px(oldRow, 'height'), oldBottom = px(oldRow, 'top') + px(oldRow, 'height');
    oldRow.parentElement.insertBefore(newRow, oldRow);
    if (window.COMMA_FIXB) window.COMMA_FIXB(newRow);
    // 같은 부모 안 아래 형제 + 조상들의 아래 형제를 dh 만큼 이동
    var movers = [];
    named(oldRow.parentElement).forEach(function (sib) { if (sib !== oldRow && sib !== newRow && px(sib, 'top') >= oldBottom - .5) movers.push(sib); });
    var a = oldRow.parentElement;
    while (a && a.parentElement && !a.classList.contains('content')) {
      var p = a.parentElement, ab = px(a, 'top');
      named(p).forEach(function (sib) { if (sib !== a && px(sib, 'top') > ab + .5) movers.push(sib); });
      if (a.dataset.sz && a.dataset.sz.split(',')[1] === 'HUG') a.style.height = (px(a, 'height') + dh) + 'px';
      a = p;
    }
    movers.forEach(function (m) { m.style.top = (px(m, 'top') + dh) + 'px'; if (animate) m.animate([{ transform: 'translateY(' + (-dh) + 'px)' }, { transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' }); });
    if (animate) {
      var oldClone = oldRow.cloneNode(true); oldClone.style.zIndex = 2; oldClone.style.pointerEvents = 'none'; newRow.parentElement.appendChild(oldClone);
      oldClone.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.97)' }], { duration: 220, fill: 'forwards' });
      newRow.animate([{ opacity: 0, clipPath: 'inset(0 0 ' + Math.max(0, -dh) + 'px 0)' }, { opacity: 1, clipPath: 'inset(0 0 0 0)' }], { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' });
      [].forEach.call(newRow.querySelectorAll('.t'), function (t, i) { t.animate([{ transform: 'scale(1.04)', opacity: .4 }, { transform: 'none', opacity: 1 }], { duration: 360, delay: 40 * i, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }); });
      setTimeout(function () { oldClone.remove(); }, 240);
    }
    oldRow.remove();
  }

  function setToggle(tg, on, anim) {
    var comp = 'Toggle/Property 1=' + (on ? 'On' : 'Off'), smp = sample(comp); if (!smp) return;
    var knob = named(tg)[0], sk = named(smp)[0];
    var from = knob ? px(knob, 'left') : 0, fromBg = tg.style.background, fromKb = knob ? knob.style.background : '';
    copyDeep(tg, smp); tg.dataset.comp = comp;
    if (knob && sk) {
      knob.style.left = sk.style.left;
      if (anim) {
        var d = from - px(knob, 'left');
        knob.animate([{ transform: 'translateX(' + d + 'px)', background: fromKb }, { transform: 'none', background: knob.style.background }], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' });
        tg.animate([{ background: fromBg }, { background: tg.style.background }], { duration: 260 });
      }
    }
  }

  // 메뉴: 지금 보던 곳(홈 · 계획 · 찾기 · 마이)의 동전만 라임색
  function menuCoins(scr, api) {
    var h = window.COMMA.history, from = h.length ? h[h.length - 1] : 'B-0';
    var cur = /^D/.test(from) ? '찾기' : /^[EF]/.test(from) ? '마이' : /^(C|S-5)/.test(from) ? '계획' : '홈';
    var items = [].slice.call(scr.querySelectorAll('[data-comp^="Icon/Menu/State="]')).filter(function (i) { return /State=(Active|Default)$/.test(i.dataset.comp); });
    function set(name, anim) {
      items.forEach(function (ic) {
        var row = ic.parentElement, t = row && row.querySelector('.t'); if (!t) return;
        var on = textOf(t) === name, want = 'Icon/Menu/State=' + (on ? 'Active' : 'Default');
        if (ic.dataset.comp !== want) { wearVariant(ic, want); if (anim && on) ic.animate([{ transform: 'rotateY(90deg) scale(.8)' }, { transform: 'none' }], { duration: 280, easing: 'cubic-bezier(.2,.8,.2,1)' }); }
      });
    }
    set(cur, false);
    items.forEach(function (ic) { var row = ic.parentElement, t = row && row.querySelector('.t'); if (t) row.addEventListener('click', function () { set(textOf(t), true); }, true); });
  }
  function settings(scr, api) {
    var out = scr.querySelector('[data-name="Frame 2087332442"]');
    var lo = api.findText(scr, /^로그아웃$/), wd = api.findText(scr, /^탈퇴하기$/);
    if (lo && wd) lo.querySelector('span').style.color = wd.querySelector('span').style.color; // 로그아웃도 탈퇴하기와 같은 색
    if (window.COMMA.loggedIn) return;
    // 로그인 전: 알림 · 계정 · 로그아웃/탈퇴는 숨기고 '기타'만
    ['Frame 2087332439', 'Frame 2087332441'].forEach(function (n) { var e = scr.querySelector('[data-name="' + n + '"]'); if (e) e.style.display = 'none'; });
    if (out) out.style.display = 'none';
    var etc = scr.querySelector('[data-name="Frame 2087332440"]'); if (etc) etc.style.top = '0px';
  }

  /* ---------- 적금 6단계 진행 표시 (목차 · 마이) ---------- */
  var STEP_NAMES = ['상품 고르기', '자격 확인', '가입 직후 설정', '납입', '중도 해지', '만기'];
  window.COMMA_STEP = function (n) { D.steps[n] = true; };
  function stepCur() { for (var i = 1; i <= 6; i++) if (!D.steps[i]) return i; return 7; }
  function stepsToc(scr, api) {
    var rows = [];
    for (var i = 1; i <= 6; i++) { var t = api.findText(scr, new RegExp('^0' + i + '$')); if (t) rows.push(t.parentElement.parentElement); }
    if (rows.length !== 6) return;
    var doneT = [].filter.call(rows[0].children, function (c) { return c.classList.contains('t'); })[0];
    var curR = rows[2].querySelector('[data-name="Rectangle 745"]'), curA = [].filter.call(rows[2].children, function (c) { return c.tagName === 'IMG'; })[0];
    var todoA = [].filter.call(rows[3].children, function (c) { return c.tagName === 'IMG'; })[0];
    if (!doneT || !curR || !curA || !todoA) return;
    var S1 = { doneT: doneT.cloneNode(true), curR: curR.cloneNode(true), curA: curA.cloneNode(true), todoA: todoA.cloneNode(true) };
    var cur = stepCur();
    rows.forEach(function (row, i) {
      [].slice.call(row.children).forEach(function (c) { if ((c.classList.contains('t') && /확인 완료/.test(c.textContent)) || c.dataset.name === 'Rectangle 745' || c.tagName === 'IMG') c.remove(); });
      var n = i + 1, add = n < cur || D.steps[n] ? [S1.doneT] : n === cur ? [S1.curR, S1.curA] : [S1.todoA];
      add.forEach(function (x) { row.appendChild(x.cloneNode(true)); });
    });
    if (window.COMMA_FIXB) window.COMMA_FIXB(scr);
  }
  function stepsMy(scr, api) {
    var done = Object.keys(D.steps).length, cur = stepCur();
    var a = api.findText(scr, /^적금 \d\/6$/); if (a) setText(a, '적금 ' + done + '/6');
    var b = api.findText(scr, /^지금은 .* 단계예요$/); if (b) setText(b, cur > 6 ? '적금 6단계를 모두 마쳤어요' : '지금은 0' + cur + ' ' + STEP_NAMES[cur - 1] + ' 단계예요');
    var imgs = []; for (var i = 30; i <= 35; i++) imgs.push(scr.querySelector('[data-name="Frame ' + i + '"]'));
    if (imgs.some(function (x) { return !x; })) return;
    var src = { done: imgs[0].getAttribute('src'), cur: imgs[3].getAttribute('src'), todo: imgs[4].getAttribute('src') };
    imgs.forEach(function (im, i) { var n = i + 1; im.src = (D.steps[n] || n < cur) && D.steps[n] ? src.done : n === cur ? src.cur : src.todo; });
  }

  /* ---------- 내 질문 · 내 답변 ---------- */
  var MY_ANSWERS = [
    ['가구원은 누구까지일까?', '“등본에 같이 올라 있으면 가구원이에요”', 14],
    ['청년 소득 기준은 세전일까?', '“세금 떼기 전 금액으로 봐요”', 9],
    ['자동이체 날짜를 바꿔도 될까요?', '“가입한 달 안에만 걸면 괜찮았어요”', 6],
    ['특별중도해지는 언제 될까요?', '“퇴직 증빙 내고 바로 됐어요”', 4],
    ['우대금리 조건은 언제 확인할까?', '“가입하고 앱에서 바로 확인했어요”', 3]
  ];
  function myQna(scr, api) {
    var box = scr.querySelector('[data-name="Frame 2087332415"]'), card = scr.querySelector('[data-name="Frame 2087332238"]'), list = scr.querySelector('[data-name="Frame 2087332416"]');
    if (!box || !card || !list) return;
    var rowModel = list.querySelector('[data-name="Frame 2087332284"]'), RH = 78.8;
    var qTab = api.findText(scr, /^내 질문 \d+$/);
    // 내가 남긴 질문을 맨 위에
    D.posted.slice().reverse().forEach(function (q) {
      var r = rowModel.cloneNode(true); var ts = r.querySelectorAll('.t');
      setText(ts[0], q.length > 16 ? q.slice(0, 16) + '…' : q); setText(ts[1], '답변 0 · 공감 0');
      [].forEach.call(named(list), function (c) { c.style.top = (px(c, 'top') + RH) + 'px'; });
      r.style.top = '0px'; list.insertBefore(r, list.firstChild); list.style.height = (px(list, 'height') + RH) + 'px';
    });
    if (qTab) setText(qTab, '내 질문 ' + (2 + D.posted.length));
    var qRows = named(list);
    // 내 답변 목록 (같은 줄 모양으로 만듦)
    var ans = document.createElement('div'); ans.dataset.name = 'answers';
    ans.style.cssText = 'left:0;top:0;width:345px;height:' + (RH * MY_ANSWERS.length) + 'px;display:none';
    MY_ANSWERS.forEach(function (a, i) {
      var r = rowModel.cloneNode(true), ts = r.querySelectorAll('.t'); r.style.top = (RH * i) + 'px';
      setText(ts[0], a[0]); setText(ts[1], a[1] + ' · 공감 ' + a[2]); ans.appendChild(r);
    });
    box.appendChild(ans);
    window.COMMA_QNA = function (which) {
      var showA = which === 'a';
      card.style.display = showA ? 'none' : ''; list.style.display = showA ? 'none' : ''; ans.style.display = showA ? '' : 'none';
      var target = showA ? ans : list;
      [].forEach.call(named(target), function (r, i) { r.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 320, delay: i * 45, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }); });
      if (showA) card.animate([{ opacity: 1 }], { duration: 1 });
    };
    // 답변 탭: 카드 자리부터 시작
    ans.style.top = '0px';
    if (window.COMMA_FIXB) window.COMMA_FIXB(box);
  }

  /* ---------- 작은 알림(토스트) ---------- */
  function toast(msg) {
    var st = document.getElementById('stage').lastChild, t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:absolute;left:50%;top:auto;bottom:120px;transform:translateX(-50%);background:#2d2d2b;color:#f7f7f5;font:500 14px/1.5 "Pretendard Variable",sans-serif;letter-spacing:-0.28px;padding:10px 16px;white-space:nowrap;z-index:50;pointer-events:none;box-shadow:inset 0 0 0 0.8px #71706c';
    st.appendChild(t);
    t.animate([{ opacity: 0, transform: 'translate(-50%,10px)' }, { opacity: 1, transform: 'translate(-50%,0)' }], { duration: 220, easing: 'ease-out' });
    // 오류 알림은 좌우로 살짝 흔들림
    if (/(없어요|어려워요|까지 넣을 수 있어요)$/.test(msg) && window.COMMA_SHAKE) setTimeout(function () { window.COMMA_SHAKE(t, 5); }, 200);
    setTimeout(function () { t.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' }); setTimeout(function () { t.remove(); }, 210); }, 1500);
  }
  window.COMMA_TOAST = toast;
  function hotText(scr, api, re, fn, maxH) { [].forEach.call(scr.querySelectorAll('.t'), function (t) { if (t.closest('.under') || t.closest('.hot')) return; if (re.test(textOf(t).replace(/\n/g, ' '))) { var el = api.pick(t, scr, { maxH: maxH || 60 }); if (!el.classList.contains('hot')) api.hot(el, function () { fn(el, t); }); } }); }
  function extras(scr, k, api) {
    // 달력: 아무 날이나 고르기
    if (k === 'C3-3') {
      var cells = [].filter.call(scr.querySelectorAll('.t'), function (t) { return /^\d{1,2}$/.test(textOf(t)) && api.rel(t, scr).y > 280 && api.rel(t, scr).y < 470; });
      var cellOf = function (t) { var p = t.parentElement; return (p && p.dataset && p.dataset.name && px(p, 'width') < 48) ? p : t; };
      var sel = cells.filter(function (t) { var c = cellOf(t); return c !== t && (c.style.background || c.style.boxShadow); })[0];
      var onC = sel && look(cellOf(sel)), offC = null;
      cells.forEach(function (t) { var c = cellOf(t); if (!offC && c !== cellOf(sel || t) && c !== t) offC = look(c); });
      cells.forEach(function (t) {
        var d = +textOf(t), c = cellOf(t);
        api.hot(c, function () {
          if (d < TODAY) { toast('지난 날은 고를 수 없어요'); if (window.COMMA_SHAKE) window.COMMA_SHAKE(c, 4); return; }
          D.day = d; if (onC) { cells.forEach(function (o) { var oc = cellOf(o); if (oc !== o && offC) wear(oc, offC); }); if (c !== t) wear(c, onC); }
          apply(scr, k);
        });
      });
    }
    if (k === 'B3-2') hotText(scr, api, /^공감 \d+$/, function (el, t) {
      var key = 'L' + api.rel(el, scr).y, n = parseInt(textOf(t).replace(/\D/g, ''), 10);
      if (!el.dataset.orig) el.dataset.orig = JSON.stringify({ bg: el.style.background, sh: el.style.boxShadow, col: t.querySelector('span').style.color });
      var o = JSON.parse(el.dataset.orig);
      D.likes[key] = !D.likes[key]; setText(t, '공감 ' + (n + (D.likes[key] ? 1 : -1)));
      el.style.background = o.bg; el.style.boxShadow = D.likes[key] ? 'inset 0 0 0 0.8px rgb(211,255,49)' : o.sh; t.querySelector('span').style.color = D.likes[key] ? 'rgb(211,255,49)' : o.col;
      el.animate([{ transform: 'scale(.9)' }, { transform: 'none' }], { duration: 200 });
    }, 40);
    if (k === 'E0-3') { hotText(scr, api, /^수정$/, function () { api.go('E0-4'); }, 40); hotText(scr, api, /^삭제$/, function (el) { toast('직접 입력한 정보는 지울 수 없어요'); if (window.COMMA_SHAKE) window.COMMA_SHAKE(el, 4); }, 40); }
    if (k === 'D1-1' || k === 'D1-2') hotText(scr, api, /^보관함에 담기$/, function (el, t) { D.boxed = true; window.COMMA.boxed = true; setText(t, '담았어요'); toast('보관함에 담았어요'); }, 40);
    // B1-5: 「…부터 보기 →」 버튼을 라임으로 채움
    if (k === 'B1-5') [].forEach.call(scr.querySelectorAll('.t'), function (t) {
      if (!/부터 보기$/.test(textOf(t))) return;
      var b = t.parentElement; b.style.background = 'rgb(211,255,49)'; b.style.boxShadow = 'none';
      t.querySelectorAll('span').forEach(function (sp) { sp.style.color = 'rgb(21,21,21)'; });
      [].forEach.call(b.querySelectorAll('img'), function (im) { im.style.filter = 'brightness(0)'; });
    });
    if (k === 'B1-1') hotText(scr, api, /^준비 중$/, function () { toast('준비 중이에요. 지금은 적금만 볼 수 있어요'); }, 80);
    if (k === 'E5-4') hotText(scr, api, /^(이용약관|개인정보 처리방침|오픈소스 라이선스|문의하기) ›$/, function () { toast('전시용 앱이라 준비 중이에요'); }, 60);
    if (k === 'E5-1') hotText(scr, api, /^(닉네임 도토리|연결된 계정 카카오)$/, function () { toast('전시용 앱이라 준비 중이에요'); }, 60);
  }
  // 질문 남기기: 글을 쓰면 버튼이 켜짐
  function qReady(scr) {
    var btn = scr.querySelector('[data-comp^="Button/Primary/"]'); if (!btn) return;
    var ready = D.question.trim().length > 0;
    var want = 'Button/Primary/State=' + (ready ? 'Active' : 'Default');
    if (btn.dataset.comp !== want) wearVariant(btn, want);
    btn.style.pointerEvents = ready ? '' : 'none';
  }
  // 눈금자: 손가락 · 마우스로 끌기, 트랙패드 · 마우스 휠로 밀기, 놓으면 미끄러지다 칸에 맞춰 멈춤
  function ruler(scr, api, field, lo, hi) {
    var frame = scr.querySelector('[data-name="Frame 2087332252"]'); if (!frame) return;
    var inp = [].filter.call(scr.querySelectorAll('.t'), function (x) { return /^[\d,]+$/.test(textOf(x)) && parseFloat(x.querySelector('span').style.fontSize) >= 36; })[0];
    var top = api.rel(frame, scr).y, fr = api.rel(frame, scr);
    // 가운데 라임 눈금(제일 긴 것)은 그대로, 나머지 눈금만 움직임
    var kids = [].slice.call(frame.children), center = kids.reduce(function (a, c) { return api.rel(c, scr).h > (a ? api.rel(a, scr).h : 0) ? c : a; }, null);
    var ticks = kids.filter(function (c) { return c !== center; });
    var GAP = 16, STEP = 10000, pos = (D[field] - lo) / STEP * GAP, maxPos = (hi - lo) / STEP * GAP, vel = 0, raf = null;
    var area = document.createElement('div');
    area.style.cssText = 'position:absolute;left:0;top:' + (top - 90) + 'px;width:393px;height:230px;z-index:3;touch-action:none;cursor:ew-resize';
    (scr.querySelector('.content') || scr).appendChild(area);
    function show() { if (inp) setText(inp, fmt(D[field])); apply(scr, window.COMMA.key); }
    function draw() {
      var off = -(pos % GAP);
      ticks.forEach(function (t) { t.style.transform = 'translateX(' + off.toFixed(2) + 'px)'; });
      var v = Math.max(lo, Math.min(hi, lo + Math.round(pos / GAP) * STEP));
      if (v !== D[field]) { D[field] = v; show(); }
    }
    function setPos(p) {
      if (p < 0) p = p * .3; if (p > maxPos) p = maxPos + (p - maxPos) * .3; // 끝에서 살짝 버팀
      pos = p; draw();
    }
    function settle() {
      cancelAnimationFrame(raf);
      var target = Math.max(0, Math.min(maxPos, Math.round(pos / GAP) * GAP)), from = pos, t0 = performance.now();
      (function step(now) { var p = Math.min(1, (now - t0) / 220), e = 1 - Math.pow(1 - p, 3); pos = from + (target - from) * e; draw(); if (p < 1) raf = requestAnimationFrame(step); })(t0);
    }
    function glide() {
      cancelAnimationFrame(raf);
      (function step() { vel *= .92; pos += vel; if (pos < 0 || pos > maxPos) vel *= .5; draw(); if (Math.abs(vel) > .4 && area.isConnected) raf = requestAnimationFrame(step); else settle(); })();
    }
    var sx = null, sPos = 0, lx = 0, lt = 0, sc = 1;
    area.addEventListener('pointerdown', function (e) { cancelAnimationFrame(raf); sc = area.getBoundingClientRect().width / 393 || 1; sx = lx = e.clientX; lt = performance.now(); sPos = pos; vel = 0; try { area.setPointerCapture(e.pointerId); } catch (x) {} });
    area.addEventListener('pointermove', function (e) {
      if (sx === null) return;
      var now = performance.now(), dt = Math.max(1, now - lt);
      vel = vel * .4 + ((lx - e.clientX) / sc) / dt * 16 * .6; lx = e.clientX; lt = now;
      setPos(sPos + (sx - e.clientX) / sc);
    });
    var end = function () { if (sx === null) return; sx = null; if (performance.now() - lt > 80) vel = 0; glide(); };
    area.addEventListener('pointerup', end); area.addEventListener('pointercancel', end);
    // 트랙패드 두 손가락 · 마우스 휠
    var wt = null;
    area.addEventListener('wheel', function (e) {
      e.preventDefault(); cancelAnimationFrame(raf);
      var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (e.deltaMode === 1) d *= 16;
      setPos(Math.max(0, Math.min(maxPos, pos + d)));
      clearTimeout(wt); wt = setTimeout(settle, 120);
    }, { passive: false });
    // 컴퓨터: ← → 키로도 조절
    function onKey(e) { if (!area.isConnected) { document.removeEventListener('keydown', onKey); return; } if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { pos = Math.max(0, Math.min(maxPos, Math.round(pos / GAP) * GAP + (e.key === 'ArrowRight' ? GAP : -GAP))); draw(); } }
    document.addEventListener('keydown', onKey);
    show();
  }
  function pickOne(scr, api) {
    var rows = [].slice.call(scr.querySelectorAll('[data-name^="Pick · "]'));
    var imgs = rows.map(function (r) { return [].filter.call(r.querySelectorAll('img'), function (i) { return Math.abs(px(i, 'width') - 28) < 3; })[0]; });
    var srcs = {}; imgs.forEach(function (i) { if (i) srcs[i.getAttribute('src')] = (srcs[i.getAttribute('src')] || 0) + 1; });
    var on = null, off = null; for (var s in srcs) { if (srcs[s] === 1) on = s; else off = s; }
    if (!on || !off) return;
    rows.forEach(function (r, i) {
      var name = r.dataset.name.replace('Pick · ', ''), im = imgs[i]; if (!im) return;
      im.src = D.pick === name ? on : off;
      api.hot(r, function () { D.pick = name; rows.forEach(function (o, j) { if (imgs[j]) imgs[j].src = off; }); im.src = on; im.animate([{ transform: 'scale(.8)' }, { transform: 'none' }], { duration: 200 }); });
    });
  }
})();
