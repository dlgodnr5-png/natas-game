/* =========================================================================
   AWM_AUTH_INTEGRATION — 모두의 게임 구독 게이트 (AI WORLD MAKER hub SSO)
   허브 결정: 구독자/관리자/승인이메일만 사용, 비구독은 게이트.
   동작: ① 토큰 캐시 verify → ② 허브 /auth/silent hidden iframe 자동 SSO →
        ③ 실패 시 paywall(로그인/구독 popup). 구독 확인되면 본문 공개.
   pre-paint(html.awm-gated 본문 숨김)는 각 페이지 <head> 최상단 인라인이 담당.
   game.spatialhealing.co.kr 은 허브 sso-origins 화이트리스트에 등록됨.
   ========================================================================= */
(function () {
  "use strict";
  var HUB = "https://aiworldmaker.happygold.shop";
  var LOGIN = HUB + "/login?embedded=1";
  var SUBSCRIBE_POPUP = HUB + "/subscribe";
  var SILENT = HUB + "/auth/silent";
  var VERIFY = HUB + "/api/auth/verify";
  var ALLOWED = [HUB]; // postMessage 발신 origin 검증 (허브만 신뢰)

  var K = {
    token: "awm_access_token",
    refresh: "awm_refresh_token",
    exp: "awm_expires_at",
    email: "awm_email",
    sub: "awm_subscribed",
    op: "awm_is_operator",
  };

  // 허브 결정(주석 의도 구현): 구독자 + 운영자 + 승인이메일은 구독 없이도 통과.
  // 승인이메일 추가 시 소문자로 기입.
  var APPROVED_EMAILS = ["dlgodnr5@gmail.com"];
  function emailApproved(em) { return !!em && APPROVED_EMAILS.indexOf(String(em).toLowerCase()) >= 0; }
  // 서버 응답(verify/silent) 기준 통과 판정 — subscribed | role==operator | 승인이메일
  function allowedFromData(d) {
    return !!(d && (d.subscribed || d.role === "operator" || emailApproved(d.email)));
  }

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function nowSec() { return Math.floor(Date.now() / 1000); }
  // 네트워크 실패 시 캐시 기준 통과 판정 — 토큰 만료 아니면 구독/운영자/승인이메일 통과
  function cachedOk() {
    var e = get(K.exp);
    if (e && parseInt(e, 10) <= nowSec()) return false;
    return get(K.sub) === "1" || get(K.op) === "1" || emailApproved(get(K.email));
  }
  function setGate(on) { document.documentElement.classList.toggle("awm-gated", !!on); }

  function saveAuth(d) {
    if (d.accessToken) set(K.token, d.accessToken);
    if (d.refreshToken) set(K.refresh, d.refreshToken);
    if (d.expiresAt) set(K.exp, String(d.expiresAt));
    if (d.email) set(K.email, String(d.email).toLowerCase());
    set(K.sub, d.subscribed ? "1" : "0");
    if (typeof d.role !== "undefined") set(K.op, d.role === "operator" ? "1" : "0");
  }

  // ① 토큰 캐시 서버 검증
  function verify(cb) {
    var t = get(K.token);
    if (!t) { cb(false); return; }
    fetch(VERIFY, { headers: { Authorization: "Bearer " + t } })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && d.valid) {
          set(K.sub, d.subscribed ? "1" : "0");
          if (d.email) set(K.email, String(d.email).toLowerCase());
          if (typeof d.role !== "undefined") set(K.op, d.role === "operator" ? "1" : "0");
          cb(allowedFromData(d));
        } else { cb(false); }
      })
      .catch(function () { cb(cachedOk()); });
  }

  // ② 허브 hidden iframe 자동 SSO (허브 쿠키 세션 → postMessage)
  function silent(cb) {
    var done = false, iframe = document.createElement("iframe");
    iframe.style.cssText = "position:absolute;width:0;height:0;border:0;left:-9999px";
    iframe.src = SILENT;
    function onMsg(e) {
      if (ALLOWED.indexOf(e.origin) < 0) return;
      var d = e.data || {};
      if (d.type === "AWM_AUTH_SUCCESS") { saveAuth(d); finish(allowedFromData(d)); }
      else if (d.type === "AWM_AUTH_NONE") { finish(false); }
    }
    function finish(ok) {
      if (done) return; done = true;
      window.removeEventListener("message", onMsg);
      try { iframe.parentNode && iframe.parentNode.removeChild(iframe); } catch (e) {}
      cb(ok);
    }
    window.addEventListener("message", onMsg);
    document.body.appendChild(iframe);
    setTimeout(function () { finish(cachedOk()); }, 4500); // 서드파티 쿠키 차단 등 타임아웃
  }

  // ③ popup 로그인/구독
  function popup(url) {
    var w = 560, h = 780;
    var l = Math.max(0, (screen.width - w) / 2), t = Math.max(0, (screen.height - h) / 2);
    window.open(url, "awm_popup", "width=" + w + ",height=" + h + ",left=" + l + ",top=" + t);
  }
  window.awmLogin = function () { popup(LOGIN); };
  window.awmSubscribe = function () { popup(SUBSCRIBE_POPUP); };

  // popup 결과 수신 (로그인/구독 성공)
  window.addEventListener("message", function (e) {
    if (ALLOWED.indexOf(e.origin) < 0) return;
    var d = e.data || {};
    if (d.type === "AWM_AUTH_SUCCESS" || d.type === "SUBSCRIBE_SUCCESS") {
      saveAuth(d);
      verify(function (ok) { applyGate(ok); });
    }
  });

  // paywall (자족형 — 외부 CSS 의존 0)
  function injectStyle() {
    if (document.getElementById("awm-gate-style")) return;
    var s = document.createElement("style");
    s.id = "awm-gate-style";
    s.textContent =
      "html.awm-gated body{overflow:hidden!important}" +
      "#awm-paywall{position:fixed;inset:0;z-index:2147483600;display:flex;align-items:center;justify-content:center;" +
      "background:rgba(8,12,24,.92);backdrop-filter:blur(6px);font-family:Pretendard,system-ui,sans-serif;padding:20px}" +
      "#awm-paywall .box{max-width:380px;width:100%;background:#111827;border:1px solid #1f2937;border-radius:20px;" +
      "padding:30px 26px;text-align:center;color:#e5e7eb;box-shadow:0 20px 60px rgba(0,0,0,.5)}" +
      "#awm-paywall h2{font-size:19px;font-weight:800;margin:0 0 8px}" +
      "#awm-paywall p{font-size:13px;color:#94a3b8;line-height:1.6;margin:0 0 18px}" +
      "#awm-paywall button{width:100%;padding:12px;border-radius:12px;border:0;font-size:14px;font-weight:700;cursor:pointer;margin-top:8px}" +
      "#awm-paywall .g{background:#fff;color:#1f2937}" +
      "#awm-paywall .s{background:linear-gradient(135deg,#6366f1,#22d3ee);color:#fff}" +
      "#awm-paywall .logo{font-size:30px;margin-bottom:6px}";
    document.head.appendChild(s);
  }

  function paywall() {
    injectStyle();
    var loggedIn = !!get(K.token);
    var ov = document.getElementById("awm-paywall");
    if (!ov) { ov = document.createElement("div"); ov.id = "awm-paywall"; document.body.appendChild(ov); }
    ov.innerHTML =
      '<div class="box">' +
        '<div class="logo">🎮</div>' +
        "<h2>모두의 게임은 멤버십 전용입니다</h2>" +
        "<p>" + (loggedIn
          ? "구독 멤버십을 시작하면 모든 게임을 광고·시간제한 없이 무제한 플레이할 수 있습니다."
          : "AI WORLD MAKER 계정으로 로그인 후 구독하시면 모든 게임을 이용할 수 있습니다.") + "</p>" +
        (loggedIn ? "" : '<button class="g" onclick="window.awmLogin()">🔐 Google 로그인</button>') +
        '<button class="s" onclick="window.awmSubscribe()">👑 구독 시작 — 월 2,000원</button>' +
      "</div>";
  }
  function removePaywall() { var e = document.getElementById("awm-paywall"); if (e && e.parentNode) e.parentNode.removeChild(e); }

  function applyGate(subscribed) {
    setGate(!subscribed);
    if (subscribed) removePaywall(); else paywall();
  }

  // init: verify → silent → paywall
  function init() {
    verify(function (ok) {
      if (ok) { applyGate(true); return; }
      silent(function (ok2) { applyGate(ok2); });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
