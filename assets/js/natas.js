/* =========================================================================
   모두의 게임 — NATAS 팀 공용 헤더/푸터 주입기 (no-build)
   각 페이지: <div id="natas-header"></div> ... <div id="natas-footer"></div>
              <script src="/assets/js/natas.js" defer></script>
   절대경로(/assets, /arcade ...)를 써서 하위 폴더 어디서든 동작한다.
   구독은 aiworldmaker 사이트에서 총괄 관리 → 버튼은 링크아웃만 한다.
   ========================================================================= */
(function () {
  "use strict";
  var HOME = "/";
  var SUBSCRIBE = "https://aiworldmaker.happygold.shop/subscribe";
  var AIWM = "https://aiworldmaker.happygold.shop";
  var YEAR = new Date().getFullYear();

  var THEMES = [
    { id: "arcade",         href: "/arcade/",          label: "아케이드" },
    { id: "puzzle",         href: "/puzzle/",          label: "퍼즐" },
    { id: "board-card",     href: "/board-card/",      label: "보드·카드" },
    { id: "action-shooter", href: "/action-shooter/",  label: "액션·슈팅" },
    { id: "strategy-sim",   href: "/strategy-sim/",     label: "전략·시뮬" },
    { id: "casual",         href: "/casual/",          label: "캐주얼" }
  ];

  var path = location.pathname;
  function isActive(href) {
    if (href === "/") return path === "/" || path === "/index.html";
    return path.indexOf(href) === 0;
  }

  var nav = THEMES.map(function (t) {
    return '<a href="' + t.href + '"' + (isActive(t.href) ? ' class="active"' : "") + ">" + t.label + "</a>";
  }).join("");

  var header =
    '<div class="inner">' +
      '<a class="natas-brand" href="' + HOME + '">' +
        '<span class="logo">🎮</span>' +
        '<span>모두의 게임<br><small>by NATAS 팀</small></span>' +
      "</a>" +
      '<button class="natas-burger" aria-label="메뉴">☰</button>' +
      '<nav class="natas-nav">' + nav + "</nav>" +
      '<a class="natas-sub" href="' + SUBSCRIBE + '" target="_blank" rel="noopener">👑 구독 / 멤버십</a>' +
    "</div>";

  var footer =
    '<div class="inner">' +
      "<div>" +
        '<div style="font-weight:800;color:var(--ink);font-size:15px;margin-bottom:6px">🎮 모두의 게임 · NATAS 팀</div>' +
        '<div class="biz">GitHub 오픈소스 게임을 테마별로 모은 구독 멤버십 게임 포털입니다. ' +
        '로그인 + 구독 멤버십(<a href="' + AIWM + '" target="_blank" rel="noopener">AI WORLD MAKER</a> 총괄 관리)으로 모든 게임을 광고·시간제한 없이 이용합니다.</div>' +
      "</div>" +
      '<div style="display:flex;gap:22px;flex-wrap:wrap">' +
        "<div>" +
          '<div style="color:var(--muted2);font-size:11px;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">바로가기</div>' +
          '<div style="display:flex;flex-direction:column;gap:5px">' +
            '<a href="/">포털 홈</a>' +
            '<a href="/LICENSES/">출처 · 라이선스</a>' +
            '<a href="' + AIWM + '/games" target="_blank" rel="noopener">AI WORLD MAKER 게임</a>' +
          "</div>" +
        "</div>" +
        "<div>" +
          '<div style="color:var(--muted2);font-size:11px;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">멤버십</div>' +
          '<a class="natas-sub" style="margin-top:2px" href="' + SUBSCRIBE + '" target="_blank" rel="noopener">멤버십 안내 →</a>' +
        "</div>" +
      "</div>" +
      '<div class="copy">© ' + YEAR + " NATAS 팀 · 모두의 게임 — 각 게임의 저작권/라이선스는 원저작자에게 있습니다. " +
        '내장 게임은 MIT·CC0 등 자유 라이선스 오픈소스이며, 외부 명작은 공식 사이트로 링크됩니다.</div>' +
    "</div>";

  function mount() {
    var h = document.getElementById("natas-header");
    var f = document.getElementById("natas-footer");
    if (h) { h.className = "natas-header"; h.innerHTML = header; }
    if (f) { f.className = "natas-footer"; f.innerHTML = footer; }
    var burger = h && h.querySelector(".natas-burger");
    if (burger) burger.addEventListener("click", function () { h.classList.toggle("open"); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
