/* 콤마 화면 연결 — [텍스트 정규식, 목적지(화면 키 · 'BACK' · 함수), 옵션{idx, maxH, self}] */
(function () {
  var st = function () { return window.COMMA; };
  // 로그인했어도 내 정보가 저장돼 있을 수도(계획 만들기) 없을 수도(내 정보 등록) 있음 — 로그인할 때마다 무작위
  var infoIn = function () { return st().loggedIn && (st().hasInfo !== false || window.COMMA_DATA.infoDone); };
  window.COMMA_INFO_IN = infoIn;
  var plan = function () { return infoIn() ? 'C0-1@in' : 'C0-1'; };
  var planOpen = function () { return infoIn() ? 'C0-1-1@in' : 'C0-1-1'; };
  var home = function () { return st().diagnosed ? 'B2-1' : 'B-0'; };
  window.HOME = home;
  var my = function () { return st().loggedIn ? 'E0-2' : 'E0-1'; };
  var login = function (api) { st().loggedIn = true; st().hasInfo = Math.random() < .5; var a = st().afterLogin; if (/^C0-1(-1)?(@in)?$/.test(a || '')) a = /-1-1/.test(a) ? planOpen() : plan(); st().afterLogin = null; st().history = []; api.go(a || home()); };
  var editRow = function (from, to) { return function () { st().editFrom = from; return to; }; };
  var editBack = function () { return st().editFrom || 'C0-14'; };
  var list01 = function () { return 'C1-5-1'; }; // 01 고르기는 보관함 없이 전체 목록에서 체크로 고름
  var start6 = function () { var D = window.COMMA_DATA; if (!D.c1Visited) { D.c1Visited = true; return list01(); } return 'C1-1'; };
  var done01 = function () { var D = window.COMMA_DATA; if (D.pickSel && window.COMMA_STATUS(D.pickSel) !== 'no') { D.pick = D.pickSel; D.steps[1] = true; return 'C1-6'; } window.COMMA_TOAST(D.pickSel ? '이 적금은 가입이 어려워요' : '보관함에 담고 하나를 골라 주세요'); };
  var result02 = function () {
    var D = window.COMMA_DATA, risky = D.ans1 === '기준을 넘어요' || D.ans2 === '있어요';
    var fail = Math.random() < (risky ? 0.6 : 0.15);
    if (fail) { D.blocked[D.pick] = true; if (D.pickSel === D.pick) D.pickSel = null; return 'C1-6-4'; }
    D.passed[D.pick] = true; return 'C1-6-3';
  };
  var finish6 = function () { var D = window.COMMA_DATA; D.c1Done = true; D.steps[6] = true; st().history = []; return planOpen(); };
  var toLogin = function (after) { return function () { st().afterLogin = typeof after === 'function' ? after() : after; return 'A-1'; }; };
  var pickD = function (n) { return function () { window.COMMA_DATA.pick = n; return 'D2-1'; }; };
  var step = function (n, to) { return function () { window.COMMA_DATA.steps[n] = true; return to; }; };
  // 질문 등록: 내 질문 목록 + 홈 질문책에 내 책 한 권 (언제 궁금한지에 따라 서브 색)
  var postQ = function (api, scr) {
    var D = window.COMMA_DATA; // 질문 남기기는 로그인 없이 바로 (로그인 모달은 계획에서만)
    var q = D.question.trim();
    // 등록 버튼: 유튜브 구독처럼 색만 바뀜(서브색이 차오름), 잠깐 보여 주고 완료 모달로
    if (q && window.COMMA_FILL && api && scr && !postQ.busy) {
      var bs = [].filter.call(scr.querySelectorAll('.hot'), function (e) { return /^질문 남기기$/.test((e.textContent || '').trim()); });
      if (bs.length) { postQ.busy = true; (window.COMMA_FILL || window.COMMA_CHEER)(bs[bs.length - 1]); setTimeout(function () { postQ.busy = false; var to = postQ(); if (to) api.go(to); }, 560); return; }
    }
    if (q) {
      D.posted.push(q);
      var cat = D.when === '금액 정하기' ? '금액 설계' : D.when === '가입 후' ? '가입 후' : '가입 판단';
      (D.myBooks = D.myBooks || []).push({ q: q, cat: cat, dropped: false });
      D.question = '';
    }
    return 'B3-7';
  };
  // 로그인해야 볼 수 있는 화면
  window.LOGIN_ONLY = /^(E0-[2-8]|E1-1|F-1|F-1′|S-5)$/; // E3-1 내 질문은 로그인 없이도 (질문 남긴 뒤 「내 질문 보기」)
  // 비교하기 (0): 보관함에 담은 게 없으면 넘어가지 않고 알려 줌
  var compareGo = function (api, scr) {
    var D = window.COMMA_DATA, n = Object.keys(D.compare).filter(function (x) { return D.compare[x]; }).length;
    if (n >= 2) return 'D1-4';
    window.COMMA_TOAST(n === 1 ? '1개만 담겨 있어서 비교할 수 없어요' : '보관함에 담은 적금이 없어서 비교할 수 없어요');
    var t = api.findText(scr, /^비교하기/); if (t && window.COMMA_SHAKE) window.COMMA_SHAKE(api.pick(t, scr), 5);
  };
  var savePlan = function (api) {
    if (!st().loggedIn) st().loggedIn = true; // 다음 행동까지 정했으면 로그인 모달 없이 바로 저장 (전시용)
    var fin = function () { st().savedPlan = true; st().e1x = true; api.go('E1-1'); setTimeout(function () { if (window.COMMA_TOAST) window.COMMA_TOAST('계획을 저장했어요'); }, 250); };
    if (window.COMMA_CARD_OUT) window.COMMA_CARD_OUT(fin); else fin();
  };
  var menu = [[/^홈$/, home, {maxH: 52}], [/^계획$/, plan, {maxH: 52}], [/^찾기$/, 'D1-1', {maxH: 52}], [/^마이$/, my, {maxH: 52}]];
  var homeL = [[/^시작하기$/, 'B1-1'], [/^질문 남기기$/, 'B3-4'], [/^가구원은 누구까지일까/, 'B3-1', {maxH: 220}]];
  var c0top = function (logged) {
    return [
      [logged ? /^계획 만들기$/ : /^내 정보 등록$/, logged ? 'C0-3' : function () { return st().loggedIn ? 'C0-3' : 'C0-2'; }],
      [/직접 ?입력할게요/, 'C0-9']
    ];
  };
  var L = window.LINKS = {
    'A-1': [[/비회원으로 시작하기/, function (api) { st().loggedIn = false; return home(); }]],
    'B-0': homeL, 'B2-1': homeL,
    'B0': menu, 'B0-2': menu.concat([[/^알림$/, function () { return st().savedPlan ? 'F-1' : 'F-1′'; }, {maxH: 52}]]),
    'B1-1': [[/^다음$/, 'B1-2']], 'B1-2': [[/^다음$/, 'B1-3']], 'B1-3': [[/^다음$/, 'B1-4']], 'B1-4': [[/결과 ?보기/, 'B1-5']],
    'B1-5': [[/자격 확인부터/, 'C1-6']],
    'B3-1': [[/^사람들의 경험/, 'B3-2', {maxH: 60}], [/^비슷한 질문/, 'B3-3', {maxH: 60}]],
    'B3-2': [[/^사람들의 경험/, 'B3-1', {maxH: 60}], [/^비슷한 질문/, 'B3-3', {maxH: 60}]],
    'B3-3': [[/^사람들의 경험/, 'B3-2', {maxH: 60}], [/^비슷한 질문/, 'B3-1', {maxH: 60}]],
    'B3-4': [[/^질문 남기기$/, postQ, {idx: 1}]],
    'B3-5': [[/^질문 남기기$/, postQ, {idx: 1}]],
    'B3-6': [[/^돌아가기$/, 'BACK'], [/^로그인하기$/, toLogin('B3-4')]],
    'B3-7': [[/^닫기$/, home], [/^내 질문 보기$/, home]], // 둘 다 홈으로 → 내 질문책이 떨어져 꽂히는 걸 보여 줌
    // ---- C0 ----
    'C0-1': c0top(false).concat([[/^적금$/, planOpen, {maxH: 90}]]),
    'C0-1@in': c0top(true).concat([[/^적금$/, planOpen, {maxH: 90}]]),
    'C0-1-1': c0top(false).concat([[/^적금$/, plan, {maxH: 90}], [/^적금 6단계 알아보기$/, start6, {maxH: 80}], [/^내 조건으로 계산하기$/, 'C2-1', {maxH: 80}],
      [/^다음 행동 정하기$/, function (api) { if (st().calculated) api.go('C3-1'); }, {maxH: 80}]]),
    'C0-1-1@in': c0top(true).concat([[/^적금$/, plan, {maxH: 90}], [/^적금 6단계 알아보기$/, start6, {maxH: 80}], [/^내 조건으로 계산하기$/, 'C2-1', {maxH: 80}],
      [/^다음 행동 정하기$/, function (api) { if (st().calculated) api.go('C3-1'); }, {maxH: 80}]]),
    'C0-2': [[/^돌아가기$/, 'BACK'], [/^로그인하기$/, toLogin('C0-1@in')]],
    'C0-3': [[/직접 ?입력할게요/, 'C0-9']],
    'C0-4': [[/^다음$/, 'C0-6'], [/^직접 입력$/, 'C0-9']],
    'C0-7': [[/^다음$/, 'C0-8']],
    'C0-8': [[/^완료/, 'C0-20'], [/^만 \d+세/, editRow('C0-8', 'C0-15')], [/^매달/, editRow('C0-8', 'C0-16')], [/^(혼자|가족과|그 외)/, editRow('C0-8', 'C0-17')], [/^작년/, editRow('C0-8', 'C0-18')]],
    'C0-20': [[/^저장하기$/, 'C1-1'], [/^이번만 쓰기$/, 'C1-1']],
    'C0-9': [[/^다음$/, 'C0-11']], 'C0-10': [[/^다음$/, 'C0-11']], 'C0-11': [[/^다음$/, 'C0-12']], 'C0-12': [[/^다음$/, 'C0-13']], 'C0-13': [[/^다음$/, 'C0-14']],
    'C0-19': [[/^나가기$/, plan], [/^계속 적기$/, 'BACK']],
    'C0-14': [[/^완료/, 'C0-20'], [/^만 \d+세/, editRow('C0-14', 'C0-15')], [/^매달/, editRow('C0-14', 'C0-16')], [/^(혼자|가족과|그 외)/, editRow('C0-14', 'C0-17')], [/^작년/, editRow('C0-14', 'C0-18')]],
    'C0-15': [[/^완료/, editBack], [/^매달/, 'C0-16'], [/^(혼자|가족과|그 외)/, 'C0-17'], [/^작년/, 'C0-18']],
    'C0-16': [[/^완료/, editBack], [/^(혼자|가족과|그 외)/, 'C0-17'], [/^작년/, 'C0-18']],
    'C0-17': [[/^완료/, editBack], [/^작년/, 'C0-18']], 'C0-18': [[/^완료/, editBack]],
    // ---- C1 ----
    'C1-1': [[/^상품 고르기$/, list01, {maxH: 56}], [/^자격 ?확인$/, 'C1-6', {maxH: 56}], [/^가입 직후 설정$/, 'C1-2', {maxH: 56}], [/^납입$/, 'C1-7', {maxH: 56}], [/^중도 해지$/, 'C1-8', {maxH: 56}], [/^만기$/, 'C1-9', {maxH: 56}]],
    'C1-5': [[/^(01 완료하기|하나를 골라 주세요)$/, done01], [/^찾기/, 'D1-1']], 'C1-5-1': [[/^(01 완료하기|하나를 골라 주세요)$/, done01]],
    'C1-6': [[/^가구소득$/, 'C1-6-1', {maxH: 76}], [/^같은 상품 계좌$/, 'C1-6-2', {maxH: 76}], [/^다음$/, 'C1-6-1']],
    'C1-6-1': [[/^다음$/, 'C1-6-2']],
    'C1-6-2': [[/^다음$/, result02]], 'C1-6-3': [[/02 완료/, step(2, 'C1-2')]], 'C1-6-4': [[/다른 적금 보기/, 'C1-5-1'], [/^01로 돌아가/, 'C1-5-1'], [/^가구소득 기준이 없는 적금 보기/, 'D1-1'], [/^등본 정보가 틀렸다면/, 'E0-4']],
    'C1-2': [[/03 완료/, step(3, 'C1-7')]],
    'C1-3': [[/^확인했어요$/, 'BACK'], [/03 완료/, step(3, 'C1-7')]],
    'C1-4': [[/^그만두기$/, 'C1-1'], [/^저장하고 나가기$/, 'C1-1']],
    'C1-7': [[/04 완료/, step(4, 'C1-8')]],
    'C1-8': [[/특별중도해지에 해당/, 'C1-8-1', {maxH: 70}], [/05 완료/, step(5, 'C1-9')]], 'C1-8-1': [[/^확인했어요$/, 'BACK']],
    'C1-9': [[/06 완료|계획 끝내기/, finish6]],
    // ---- C2 · C3 ----
    'C2-1': [[/^조건 바꾸기$/, 'C2-2'], [/^다음$/, 'C3-1']],
    'C2-2': [[/^월 납입액$/, 'C2-3', {maxH: 80}], [/^넣는 기간$/, 'C2-4', {maxH: 80}], [/^우대조건$/, 'C2-5', {maxH: 80}]],
    'C2-3': [[/^완료/, 'C2-6']], 'C2-4': [[/^완료/, 'C2-6']], 'C2-5': [[/^완료/, 'C2-6']],
    'C2-6': [[/^조건 변경$/, 'C2-2'], [/^완료$/, 'C3-1']],
    'C3-1': [[/^다음$/, 'C3-2']], 'C3-2': [[/^날짜 고르기$/, 'C3-3'], [/^다음$/, 'C3-5']], 'C3-4': [[/^다음$/, 'C3-5']],
    'C3-3': [[/^다음$/, 'C3-4']], 'C3-4': [[/^다음$/, 'C3-5']],
    'C3-5': [[/계획 저장하기/, savePlan]], // 카드는 motion.js에서 3D로 뒤집힘(앞 C3-5 · 뒤 C3-6)
    'C3-6': [[/^우대조건 서류를 챙긴다$/, function (api) { api.go('C3-5', {replace: true}); }, {maxH: 500}], [/계획 저장하기/, savePlan]],
    // ---- D ----
    'D1-1': [[/^보관함$/, 'D1-3'], [/^비교하기/, compareGo], [/^청년미래적금$/, pickD('청년미래적금'), {maxH: 120}], [/^첫걸음적금$/, pickD('첫걸음적금'), {maxH: 120}], [/^꾸준히적금$/, pickD('꾸준히적금'), {maxH: 120}]],
    'D1-2': [[/^완료$/, 'BACK']],
    'D1-3': [[/^비교하기/, compareGo], [/^청년미래적금$/, pickD('청년미래적금'), {maxH: 120}]],
    'D1-4': [[/^보관함$/, 'D1-3', {idx: 0}], [/^계획 세우기$/, function () { var D = window.COMMA_DATA; if (window.COMMA_STATUS(D.pick) !== 'no') D.pickSel = D.pick; D.c1Visited = true; return 'C1-5-1'; }]],
    'D2-1': [[/약관 원문을 보고 싶어요/, 'D2-2'], [/^계획 세우기$/, function () { var D = window.COMMA_DATA; if (window.COMMA_STATUS(D.pick) !== 'no') D.pickSel = D.pick; D.c1Visited = true; return 'C1-5-1'; }], [/^보관함에 담/, function (api, scr) {
      var D = window.COMMA_DATA, was = !!D.boxed[D.pick]; D.boxed[D.pick] = true; D.compare[D.pick] = true;
      if (was || !window.COMMA_CHEER) { if (!was) window.COMMA_TOAST('보관함에 담았어요'); return 'D1-3'; }
      var t = api.findText(scr, /^보관함에 담/); if (t) window.COMMA_CHEER(api.pick(t, scr), { n: 18 });
      window.COMMA_TOAST('보관함에 담았어요'); setTimeout(function () { api.go('D1-3'); }, 620);
    }]],
    // ---- E ----
    'E0-1': [[/^간편 로그인$/, toLogin('E0-2')], [/^설정$/, 'E5-1', {maxH: 56}], [/^서비스 소개$/, 'E5-4', {maxH: 56}]],
    'E0-2': [[/^내 정보$/, function () { if (infoIn()) return 'E0-3'; window.COMMA_TOAST('아직 저장한 내 정보가 없어요'); return plan(); }, {maxH: 56}], [/^저장한 계획$/, function () { st().e1x = false; return st().savedPlan ? 'E1-1' : 'S-5'; }, {maxH: 56}], [/^내 질문 및 답변$/, 'E3-1', {maxH: 56}], [/^설정$/, 'E5-1', {maxH: 56}], [/^서비스 소개$/, 'E5-4', {maxH: 56}], [/^로그아웃$/, 'E5-2', {maxH: 56}]],
    'E0-3': [[/^수정$/, 'E0-4'], [/^내 정보 추가$/, 'C0-3']],
    'E0-4': [[/^만 \d+세/, 'E0-5'], [/^매달/, 'E0-6'], [/^(혼자|가족과|그 외)/, 'E0-7'], [/^작년/, 'E0-8'], [/^완료$/, 'E0-3']],
    'E0-5': [[/^완료$/, 'E0-4'], [/^매달/, 'E0-6'], [/^(혼자|가족과|그 외)/, 'E0-7'], [/^작년/, 'E0-8']],
    'E0-6': [[/^완료$/, 'E0-4'], [/^(혼자|가족과|그 외)/, 'E0-7'], [/^작년/, 'E0-8']],
    'E0-7': [[/^완료$/, 'E0-4'], [/^작년/, 'E0-8']], 'E0-8': [[/^완료$/, 'E0-4']],
    'E1-1': [[/^다시 정하기$/, 'C3-2']],
    'E3-1': [[/^가구원은 누구까지일까/, 'B3-1', {maxH: 120}]],
    'E5-1': [[/^서비스 소개 · 약관$/, 'E5-4', {maxH: 56}], [/^로그아웃$/, 'E5-2', {maxH: 56}], [/^탈퇴하기$/, 'E5-3', {maxH: 56}], [/^내 정보$/, 'E0-3', {maxH: 56}]],
    'E5-2': [[/^취소$/, 'BACK']],
    'E5-3': [[/^취소$/, 'BACK']],
    // ---- F · S ----
    'F-1': [[/우대조건 서류를 챙기는 날/, function () { st().e1x = false; return 'E1-1'; }, {maxH: 130}], [/^확인하기$/, 'D2-1']],
    'S-4': [[/인증 없이 직접 적을게요/, 'C0-9'], [/^다시 인증하기$/, 'C0-4']],
    'S-6': [[/^보관함$/, 'D1-3'], [/^비교하기/, compareGo]],
    'S-7': [[/^다시 시도$/, 'BACK']]
  };
  // 같은 화면 안에서 접히고 펼쳐지는 바 (페이지 이동 대신 모션) — '출발>도착': 기준 바 글자
  var M = window.MORPH = {};
  var pair = function (a, b, re) { M[a + '>' + b] = re; M[b + '>' + a] = re; };
  pair('B3-1', 'B3-2', /^사람들의 경험/); pair('B3-1', 'B3-3', /^비슷한 질문/); M['B3-2>B3-3'] = /^비슷한 질문/; M['B3-3>B3-2'] = /^사람들의 경험/;
  pair('C0-1', 'C0-1-1', /^적금$/); pair('C0-1@in', 'C0-1-1@in', /^적금$/);
  // 줄을 눌러 그 자리에서 고치기 (FLIP): 출발 화면의 줄(a) ↔ 도착 화면의 줄(b)
  var edit = function (list, rows) {
    rows.forEach(function (r) {
      M[list + '>' + r[0]] = {a: r[1], b: r[2]};
      M[r[0] + '>' + list] = {a: r[2], b: r[1]};
    });
  };
  var ROWS = [[/^만 \d+세/, /^만 나이$/], [/^매달/, /^한 달 여유금$/], [/^(혼자|가족과|그 외)/, /^가구$/], [/^작년/, /^연 소득$/]];
  var C0E = ['C0-15', 'C0-16', 'C0-17', 'C0-18'], E0E = ['E0-5', 'E0-6', 'E0-7', 'E0-8'];
  [['C0-14', C0E], ['C0-8', C0E], ['E0-4', E0E]].forEach(function (p) { edit(p[0], p[1].map(function (x, i) { return [x, ROWS[i][0], ROWS[i][1]]; })); });
  // 펼친 상태에서 아래 다른 줄의 + 를 누르면 그 줄로 바로 바뀜
  [C0E, E0E].forEach(function (set) {
    set.forEach(function (x, i) { set.forEach(function (y, j) { if (j > i) M[x + '>' + y] = {a: ROWS[j][0], b: ROWS[j][1]}; }); });
  });
  // 조건 바꾸기: 위 금액 카드는 그대로, 고르는 줄만 바뀜
  ['C2-3', 'C2-4', 'C2-5'].forEach(function (x) { M['C2-2>' + x] = {}; });
  // 찾기: 검색칸 옆 조건 아이콘 → 지금 목록 위로 '조건으로 찾기' 시트
  M['D1-1>D1-2'] = {sheet: 'Frame 2087332311', keep: true, hide: ['Frame 2087332423', 'Frame 2087332240']};
  M['D1-2>D1-1'] = {unsheet: 'Frame 2087332311'};
  // 질문 남기기 시트: 홈 위로 올라오는 시트
  ['B-0', 'B2-1'].forEach(function (h) { M[h + '>B3-4'] = {sheet: 'Frame 2087332311'}; });
  ['B3-4', 'B3-5'].forEach(function (x) { ['B-0', 'B2-1'].forEach(function (h) { M[x + '>' + h] = {unsheet: 'Frame 2087332311'}; }); });
  // 위쪽 ← 를 특별한 곳으로 보내는 화면 (C0-12: 나가기 확인)
  window.TOP_BACK = {'C0-12': 'C0-19', 'B1-5': function () { st().history = []; return home(); }};
  window.BOT_BACK = {'C0-12': 'C0-19'};
  // 그 자리에서 펼친 화면의 ← 는 다시 접기
  ['C0-15', 'C0-16', 'C0-17', 'C0-18'].forEach(function (x) { window.TOP_BACK[x] = window.BOT_BACK[x] = editBack; });
  ['E0-5', 'E0-6', 'E0-7', 'E0-8'].forEach(function (x) { window.TOP_BACK[x] = window.BOT_BACK[x] = 'E0-4'; });
  ['C2-3', 'C2-4', 'C2-5'].forEach(function (x) { window.TOP_BACK[x] = window.BOT_BACK[x] = 'C2-2'; M[x + '>C2-2'] = {}; });
  function modalBtn(scr, api, re, msg) {
    var m = scr.querySelector('[data-comp="Step Item/State=Modal"]'); if (!m) return;
    var t = [].filter.call(m.querySelectorAll('.t'), function (x) { return re.test(x.textContent.trim()); })[0]; if (!t) return;
    var b = api.pick(t, scr, {maxH: 60});
    api.hot(b, function () { var s = st(), D = window.COMMA_DATA; s.loggedIn = false; s.history = []; s.afterLogin = null; D.myBooks = []; D.posted = []; D.bookAns = {}; D.myAnswers = []; D.answerDraft = ''; api.go('A-1'); setTimeout(function () { if (window.COMMA_TOAST) window.COMMA_TOAST(msg); }, 300); });
  }
  // 시트 화면: 뒤에는 지금 홈 화면을 그대로 깔고, 시트 위쪽 빈 곳을 누르면 닫힘
  function sheetUnder(scr, api) {
    var h = document.createElement('div'); h.innerHTML = window.SCREENS[home()];
    var under = h.firstChild; under.classList.add('under'); under.style.cssText = 'position:absolute;left:0;top:0;opacity:1;pointer-events:none';
    ['Frame 2087332432', 'Frame 2087332320'].forEach(function (n) { [].forEach.call(scr.querySelectorAll('[data-name="' + n + '"]'), function (e) { if (e.parentElement && e.parentElement.classList.contains('content')) e.style.visibility = 'hidden'; }); });
    var root = scr.querySelector('.content') || scr; root.insertBefore(under, root.firstChild);
    var sh = scr.querySelector('[data-name="Frame 2087332311"]');
    if (sh && !scr.querySelector('[data-name="Rectangle 744"]')) {
      var top = api.rel(sh, scr).y, close = document.createElement('div');
      close.style.cssText = 'position:absolute;left:0;top:59px;width:393px;height:' + (top - 59) + 'px;z-index:3';
      root.appendChild(close); api.hot(close, function () { api.back(); });
    }
    if (window.COMMA_FIXB) window.COMMA_FIXB(under);
    if (sh && !scr.querySelector('[data-name="Rectangle 744"]')) api.grabber(scr, sh);
  }
  // D2-1: 피그마에 접힌 상태만 있는 '우대조건' '중도해지하면'의 펼친 내용 — 위 '가입할 수 있나요?' 줄 모양을 그대로 복제해 수현이 앱 데이터로 채움
  function setText(t, str) { var ln = t.querySelector('.ln'); if (!ln) return; var sp = ln.querySelectorAll('span'); sp[0].textContent = str; for (var i = 1; i < sp.length; i++) sp[i].remove(); [].slice.call(t.querySelectorAll('.ln')).slice(1).forEach(function (x) { x.remove(); }); }
  function rowsFrom(model, rows) {
    return function (scr, head) {
      var b = model.cloneNode(true), kids = [].filter.call(b.children, function (x) { return x.dataset && x.dataset.name; });
      var rowH = kids.length > 1 ? parseFloat(kids[1].style.top) - parseFloat(kids[0].style.top) : 38;
      var vals = [];
      kids.forEach(function (row, i) {
        if (i >= rows.length) { row.remove(); return; }
        var lab = row.querySelector('[data-name="Frame 2087332365"]'), icon = lab && lab.firstElementChild;
        var ts = [].filter.call(row.querySelectorAll('.t'), function (t) { return !(icon && icon.contains(t)); });
        if (icon && !rows[i][2]) icon.style.visibility = 'hidden';
        setText(ts[0], rows[i][0]);
        var valT = ts[ts.length - 1], right = parseFloat(valT.style.left) + parseFloat(valT.style.width);
        setText(valT, rows[i][1]); vals.push([valT, right]);
        if (lab) lab.style.width = 'auto';
      });
      b.style.height = (parseFloat(b.style.height) - (kids.length - rows.length) * rowH) + 'px';
      b.style.top = (parseFloat(head.style.top) + parseFloat(head.style.height)) + 'px';
      b.removeAttribute('data-id');
      head.parentNode.insertBefore(b, head.nextSibling);
      // 값은 오른쪽 끝 맞춤 (글자 폭을 재서 다시 배치)
      vals.forEach(function (v) { var sp = v[0].querySelector('.ln span'), w = sp ? sp.offsetWidth : 0; v[0].style.width = w + 'px'; v[0].style.left = (v[1] - w) + 'px'; });
      if (window.COMMA_FIXB) window.COMMA_FIXB(b);
      return b;
    };
  }
  var accD21 = function (scr, api) {
    var t = api.findText(scr, /^가입할 수 있나요\?$/), head = t && api.pick(t, scr, {maxH: 60});
    var model = head && head.nextElementSibling;
    if (!model) return;
    api.accordion(scr, [
      {head: /^가입할 수 있나요\?$/},
      {head: /^우대조건$/, make: rowsFrom(model, [['자동이체', '+0.2%'], ['급여이체', '+0.3%'], ['카드 실적', '+0.5%']])},
      {head: /^중도해지하면$/, make: rowsFrom(model, [['만기까지 넣으면', '연 3.0%'], ['만기 전에 해지하면', '연 0.5%']])}
    ]);
  };
  var accMistake = function (scr, api) { api.accordion(scr, [{head: /^이런 실수가 있었어요$/, closed: true}]); };
  // 추가 동작
  window.EXTRA = {
    // 계획을 저장하고 온 저장한 계획: ← 대신 X, 누르면 계획 홈으로
    'E1-1': function (scr, api) {
      if (!st().e1x) return;
      var a = scr.querySelector('[data-comp="Icon/Menu/State=Icon, Property 2=Arrow Left"]'); if (!a) return;
      var x = a.cloneNode(true);
      x.dataset.comp = 'Icon/Menu/State=Icon, Property 2=Close'; x.src = 'assets/245008c2bb8f91ec.svg';
      a.parentNode.replaceChild(x, a);
      api.hot(x, function () { st().e1x = false; st().history = []; api.show(plan(), {back: true}); });
    },
    'A-1': function (scr, api) {
      var box = scr.querySelector('[data-name="Frame 2087332445"]');
      if (box) [].forEach.call(box.children, function (c) { if (!/비회원/.test(c.textContent)) api.hot(c, function () { login(api); }); });
    },
    'B3-4': sheetUnder, 'B3-5': sheetUnder, 'B3-6': sheetUnder, 'B3-7': sheetUnder,
    'D2-1': accD21,
    // 로그아웃 · 탈퇴 확인: 모달 안 버튼만 (뒤 화면의 같은 글자 말고)
    'E5-2': function (scr, api) { modalBtn(scr, api, /^로그아웃$/, '로그아웃했어요'); var t = api.findText(scr, /^저장한 계획과 내 정보는/); if (t && window.COMMA_SETTEXT) window.COMMA_SETTEXT(t, '저장한 계획과 내 정보는 그대로 남아요.\n다시 로그인하면 이어서 볼 수 있어요.'); },
    'E5-3': function (scr, api) { modalBtn(scr, api, /^탈퇴하기$/, '탈퇴했어요'); },
    'D1-1': function (scr, api) {
      // 검색칸 옆 조건 아이콘: 손가락으로 누르기 쉽게 44px 영역
      var hit = document.createElement('div');
      hit.style.cssText = 'position:absolute;left:331px;top:113px;width:44px;height:44px;z-index:5';
      (scr.querySelector('.content') || scr).appendChild(hit); api.hot(hit, function () { api.go('D1-2'); });
    },
    'D1-2': function (scr, api) {
      var sh = scr.querySelector('[data-name="Frame 2087332311"]'); if (!sh) return;
      var top = api.rel(sh, scr).y, close = document.createElement('div');
      close.style.cssText = 'position:absolute;left:0;top:0;width:393px;height:' + top + 'px;z-index:3';
      (scr.querySelector('.content') || scr).appendChild(close); api.hot(close, function () { api.back(); });
      api.grabber(scr, sh);
      // 조건을 고르면 완료 버튼이 라임으로 켜짐 (B3-5 Button/Primary Active 색)
      var done = api.findText(scr, /^완료$/), btn = done && done.parentElement;
      if (btn) sh.addEventListener('click', function (e) {
        var n = e.target.closest && e.target.closest('[data-name]'); if (!n || btn.contains(n)) return;
        if (!/^(전체|6개월|12개월|24개월|10만 이하|10-30만|30만~|소득 무관|세대주만|청년)$/.test((n.textContent || '').trim())) return;
        if (btn.dataset.on) return; btn.dataset.on = '1';
        btn.style.transition = 'background .25s'; btn.style.background = 'linear-gradient(rgb(211,255,49),rgb(211,255,49))';
        done.querySelectorAll('span').forEach(function (sp) { sp.style.transition = 'color .25s'; sp.style.color = 'rgb(21,21,21)'; });
        btn.animate([{ transform: 'scale(.97)' }, { transform: 'none' }], { duration: 220 });
      }, true);
    }, 'C1-2': accMistake, 'C1-3': accMistake,
    'C0-6': function (scr, api) { setTimeout(function () { if (st().key === 'C0-6') api.go('C0-7', {replace: true}); }, 1400); },
    'C2-1': function () { st().calculated = true; },
    'B1-5': function () { st().diagnosed = true; }
  };
})();
