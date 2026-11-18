// 형광펜(라임 밑줄) 낱말을 누르면 뜻 풀이 말풍선 — 수현 피그마 C1-2 「금리 / 우대금리」 상자 모양 (11/18)
(function () {
  var DEF = {
    '금리': '적금에 돈을 넣었을 때 은행이 돈을 얼마나 더 얹어주는지 보여주는 비율',
    '우대금리': '급여이체·자동이체처럼 은행이 정한 조건을 채우면 기본 금리에 더 얹어주는 금리',
    '가구원': '주민등록등본에 나와 함께 올라 있는 사람. 같이 살아도 등본이 다르면 가구원이 아니에요',
    '가구소득': '가구원 모두가 1년 동안 번 돈을 합친 금액',
    '세전': '세금을 떼기 전 금액. 월급 명세서의 「지급 총액」이에요',
    '이자': '맡긴 돈에 은행이 금리만큼 더 붙여 주는 돈',
    '특별중도해지': '퇴직·폐업, 해외 이주처럼 정해진 사정으로 만기 전에 해지해도 약속한 이자를 받는 것',
    '자동이체': '정한 날짜에 내 통장에서 적금으로 돈이 저절로 옮겨지게 하는 것',
    '기본금리': '조건 없이 누구나 받는 금리',
    '우대조건': '우대금리를 받으려고 채워야 하는 조건. 급여이체, 카드 실적, 자동이체 같은 것이에요',
    '만기': '적금을 넣기로 약속한 기간이 끝나는 날. 이날 넣은 돈과 이자를 함께 받아요',
    '납입': '적금에 돈을 넣는 것. 매달 넣는 돈을 납입액이라고 해요',
    '중도해지': '만기 전에 적금을 깨고 돈을 찾는 것. 약속한 이자보다 적게 받아요',
    '해지': '적금 계약을 끝내고 넣은 돈을 찾는 것',
    '세대주': '주민등록등본에서 그 집의 대표로 올라 있는 사람',
    '세금': '이자에서 떼는 돈. 적금 이자에서는 보통 15.4%를 떼요'
  };
  // 형광펜이 없는 본문에도 화면마다 처음 나오는 용어 하나씩 자동으로 칠함 (긴 낱말부터)
  var AUTO = Object.keys(DEF).sort(function (a, b) { return b.length - a.length; });
  // 버튼 · 칩 · 선택지 · 바 · 누르는 줄 안 글자는 빼기
  var NOAUTO = '.hot,[data-comp^="Chip"],[data-comp^="Button"],[data-comp^="Bottom Bar"],[data-comp^="Top Bar"],[data-comp^="Option"],[data-comp^="Toggle"],[data-comp^="Info Row"],[data-comp^="Step Item"],[data-comp^="Icon/Menu"],[data-name="Chip"],[data-name="Options"],[data-name="Bottom Nav"],[data-name^="Button"],input,textarea,.termtip';
  // 한 낱말을 누르면 함께 보여 줄 낱말 (피그마: 우대금리 → 금리 + 우대금리)
  var SHOW = { '우대금리': ['금리', '우대금리'], '우대금리 조건': ['우대금리'] };
  var SKIP = /^(C1-3)$/;   // 「모르는 금융 용어가 있나요?」 안내 그림 속 낱말은 빼기
  var W = 220, RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var css = document.createElement('style');
  css.textContent = '#stage .term{cursor:pointer;-webkit-tap-highlight-color:transparent}' +
    '#stage .termtip{position:absolute;z-index:80;width:' + W + 'px;box-sizing:border-box;padding:8px 10px 10px;background:#2d2d2b;box-shadow:inset 0 0 0 1px #71706c;' +
    "font-family:'Pretendard Variable',Pretendard,sans-serif;letter-spacing:-0.02em;word-break:keep-all;overflow-wrap:break-word;pointer-events:auto;transform-origin:20px 0;" +
    (RM ? '' : 'animation:termIn .16s ease-out') + '}' +
    '#stage .termtip b{display:block;font-weight:500;font-size:15px;line-height:22px;color:#f7f7f5}' +
    '#stage .termtip p{margin:0;font-weight:400;font-size:14px;line-height:20px;color:#c5c5c1}' +
    '#stage .termtip p+b{margin-top:6px}' +
    '@keyframes termIn{from{opacity:0;transform:translateY(-4px) scale(.98)}to{opacity:1;transform:none}}';
  document.head.appendChild(css);

  var key = function (t) { return (t.textContent || '').replace(/\s+/g, ' ').trim(); };
  function isMark(sp) {
    var st = sp.getAttribute('style') || '';
    return /text-decoration:\s*underline/.test(st) || /underline/.test(getComputedStyle(sp).textDecorationLine || '');
  }
  // 칩 · 탭처럼 테두리나 면이 있는 작은 칸 안 글자 (홈 「전체 · 적금 · 청약 · 자동이체」 등)
  function chipLike(sp) {
    var e = sp.closest('.t'); if (!e) return true;
    if (e.closest('[data-name="Group 26"]')) return true;           // 홈 질문책 카드 더미
    for (var i = 0; i < 3 && e && !e.classList.contains('screen'); i++) {
      e = e.parentElement; if (!e) break;
      var st = e.getAttribute('style') || '';
      if (/box-shadow:\s*inset|background/.test(st) && px(e, 'height') <= 48 && px(e, 'width') <= 160) return true;
    }
    return false;
  }
  function px(e, k) { return parseFloat(e.style[k]) || 0; }
  // 「03 가입 직후 설정」 같은 라임 단계 이름 · 링크 글자
  function limeLabel(sp) { var c = getComputedStyle(sp).color; return /^rgb\((211, 255, 49|142, 181, 0|201, 239, 73)\)/.test(c); }
  // 목록 줄이 통째로 버튼인 화면(알림 · 저장한 계획 · 내 질문 · 계획 첫 화면 메뉴)은 자동 형광펜 없음
  var NOAUTO_SCR = /^(A-1|B0|B0-2|C0-1|C0-1@in|C0-2|E1-1|E3-1|F-1|F-1′)$/;
  function autoMark(scr) {
    if (NOAUTO_SCR.test(scr.dataset.key || '')) return;
    var done = {};
    [].forEach.call(scr.querySelectorAll('.term'), function (t) { done[t.dataset.term] = 1; if (SHOW[t.dataset.term]) SHOW[t.dataset.term].forEach(function (x) { done[x] = 1; }); });
    // 읽는 순서(위 → 아래, 왼 → 오른)
    var spans = [].slice.call(scr.querySelectorAll('.t .ln span')).filter(function (sp) {
      return !sp.dataset.term && !sp.dataset.termAuto && sp.textContent.trim() && !sp.closest(NOAUTO) && sp.getClientRects().length && !chipLike(sp) && !limeLabel(sp);
    }).map(function (sp) { var r = sp.getBoundingClientRect(); return { sp: sp, y: Math.round(r.top), x: r.left }; })
      .sort(function (a, b) { return a.y - b.y || a.x - b.x; });
    spans.forEach(function (o) {
      var sp = o.sp, txt = sp.textContent, hit = null;
      for (var i = 0; i < AUTO.length; i++) {
        var w = AUTO[i]; if (done[w]) continue;
        var at = txt.indexOf(w); if (at < 0) continue;
        // 더 긴 낱말의 일부면 건너뛰기 (금리 ⊂ 우대금리)
        var inLonger = AUTO.some(function (L) { if (L.length <= w.length || L.indexOf(w) < 0) return false; var j = txt.indexOf(L); return j >= 0 && j <= at && at < j + L.length; });
        if (inLonger) continue;
        hit = { w: w, at: at }; break;
      }
      if (!hit) return;
      var st = sp.getAttribute('style') || '', fs = parseFloat(getComputedStyle(sp).fontSize) || 15;
      var mk = function (t, mark) { var e = document.createElement('span'); e.setAttribute('style', st + (mark ? ';text-decoration:underline;text-decoration-color:rgb(211,255,49);text-decoration-thickness:' + Math.max(2, Math.round(fs * .2)) + 'px;text-decoration-skip-ink:none' : '')); e.textContent = t; e.dataset.termAuto = '1'; return e; };
      var a = txt.slice(0, hit.at), m = txt.slice(hit.at, hit.at + hit.w.length), b = txt.slice(hit.at + hit.w.length), par = sp.parentNode;
      if (a) par.insertBefore(mk(a), sp);
      var ms = mk(m, true); ms.dataset.term = hit.w; ms.classList.add('term'); par.insertBefore(ms, sp);
      if (b) par.insertBefore(mk(b), sp);
      par.removeChild(sp);
      done[hit.w] = 1; if (SHOW[hit.w]) SHOW[hit.w].forEach(function (x) { done[x] = 1; });
    });
  }
  function scan() {
    var scr = document.querySelector('#stage .screen.in') || document.querySelector('#stage .screen');
    if (!scr || SKIP.test(scr.dataset.key || '')) return;
    [].forEach.call(scr.querySelectorAll('span'), function (sp) {
      if (sp.dataset.term) return;
      var k = key(sp);
      if ((DEF[k] || SHOW[k]) && isMark(sp)) { sp.dataset.term = k; sp.classList.add('term'); }
    });
    autoMark(scr);
  }
  var tid = 0;
  new MutationObserver(function () { clearTimeout(tid); tid = setTimeout(scan, 40); })
    .observe(document.getElementById('stage') || document.body, { childList: true, subtree: true });

  var open = null;
  function close() { if (open) { open.tip.remove(); open = null; } }
  function show(sp) {
    close();
    var host = sp.closest('.content') || sp.closest('.screen'); if (!host) return;
    var hr = host.getBoundingClientRect(), sc = hr.width / 393 || 1, r = sp.getBoundingClientRect();
    var tip = document.createElement('div'); tip.className = 'termtip';
    (SHOW[sp.dataset.term] || [sp.dataset.term]).forEach(function (t) {
      if (!DEF[t]) return;
      var b = document.createElement('b'); b.textContent = t; tip.appendChild(b);
      var p = document.createElement('p'); p.textContent = DEF[t]; tip.appendChild(p);
    });
    var x = (r.left - hr.left) / sc - 6, y = (r.bottom - hr.top) / sc + 7;
    x = Math.max(12, Math.min(x, 393 - 12 - W));
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
    host.appendChild(tip);
    // 화면 아래로 넘치면 낱말 위로
    var scr = sp.closest('.screen'), sr = scr.getBoundingClientRect(), tr = tip.getBoundingClientRect();
    if (tr.bottom > sr.bottom - 8) tip.style.top = ((r.top - hr.top) / sc - 7 - tr.height / sc) + 'px';
    open = { tip: tip, sp: sp };
  }
  function hit(e) {
    var x = e.clientX, y = e.clientY, found = null;
    [].forEach.call(document.querySelectorAll('#stage .screen .term'), function (sp) {
      if (found) return;
      [].forEach.call(sp.getClientRects(), function (q) { if (x >= q.left - 4 && x <= q.right + 4 && y >= q.top - 6 && y <= q.bottom + 6) found = sp; });
    });
    return found;
  }
  document.addEventListener('click', function (e) {
    if (open && open.tip.contains(e.target)) { e.stopPropagation(); e.preventDefault(); close(); return; }
    var sp = hit(e);
    if (sp) { e.stopPropagation(); e.preventDefault(); if (open && open.sp === sp) close(); else show(sp); return; }
    if (open) { e.stopPropagation(); e.preventDefault(); close(); }
  }, true);
  // 화면이 바뀌거나 스크롤하면 닫기
  new MutationObserver(function () { if (open && !document.body.contains(open.sp)) close(); })
    .observe(document.getElementById('stage') || document.body, { childList: true, subtree: true });
  window.addEventListener('popstate', close);
  // 펼치기 · 접기처럼 글이 새로 보이게 되는 동작 뒤에도 다시 찾기
  document.addEventListener('click', function () { setTimeout(scan, 450); });
  window.COMMA_TERMS = { DEF: DEF, scan: scan, close: close };
})();
