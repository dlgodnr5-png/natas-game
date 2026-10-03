# 🔴 보안 지시문 SEC-001 — 키·비밀번호 암호화 저장 의무 (전 사령부·전 군단·전 하위앱)

> 발령: 박사님 (2026-09-27) · 전파: 브라우저 어사이드 · 정본: `program-main/APP-STANDARDS.md` §8
> **이 지시는 다른 모든 지시(편의·속도·비용 0원)보다 우선한다. 이 파일을 읽은 에이전트는 작업 전에 아래를 지킨다.**

## 왜
> "개인앱이라 개인정보 유출되면 큰일난다. 아는 사람이 앱을 팔았는데 비번과 API 값을 그대로 노출시켜 돈을 물어줬다. 소송 들어오면 안 된다." — 박사님
- 개인정보보호위원회 고시 「개인정보의 안전성 확보조치 기준」 제7조: 비밀번호 등 인증정보는 안전한 암호 알고리즘으로 암호화해 저장·송수신해야 한다.
- 약관규제법 제7조: 사업자의 고의·중대한 과실 책임을 빼는 면책 조항은 무효. **약관으로는 못 막는다. 암호화가 곧 방어다.**

## 절대 금지 (발견 즉시 작업 중단·보고)
1. 사용자 **API 키·토큰·비밀번호를 평문**으로 저장 — JSON·txt·.env 사본·SQLite 평문 칼럼·`localStorage`·`sessionStorage`·쿠키 모두 금지.
2. **외부 서비스(네이버·티스토리·쿠팡·인스타·구글 등) 로그인 아이디·비밀번호**를 앱이 받아 저장. → 공식 OAuth/API, 또는 사용자가 직접 로그인한 브라우저 프로필 세션만.
3. 사용자 키·비밀번호를 **우리 서버로 전송·저장·로그**.
4. 비밀값을 코드·GitHub·노션·보고서·커밋 메시지·오류 화면·콘솔 로그·print에 기록.
5. 비밀값 파일을 **클라우드 동기화 폴더(네이버 MYBOX·OneDrive)**에 둠. `.gitignore`는 클라우드 업로드를 못 막는다.
6. Supabase 등 DB에서 **비로그인(anon) 키로 회원·관리 데이터가 읽히는 상태**(RLS 누락, 뷰 권한 누락).

## 허브 구독 키도 똑같다 (박사님 2026-09-27 추가: "우리 구독 허브키도 마찬가지이다")
AI WORLD MAKER 허브가 발급하는 **라이선스 키·구독 자격 토큰·로그인 access/refresh 토큰·기기 토큰·관리 토큰·관리자 세션**도 사용자 비밀값과 같은 등급이다.
| 위치 | 의무 |
|---|---|
| **허브 DB** | 라이선스 키·토큰은 **원문 저장 금지** → `HMAC-SHA256(키, 서버 비밀)` 해시만 저장·비교. 원문은 발급 화면에서 1회만 표시. 이벤트·감사 로그에는 끝 4자리만 |
| **허브 관리자** | 비밀번호 PBKDF2/bcrypt(현행 유지), 세션 토큰은 해시 저장 |
| **사용자 앱** | 허브 로그인 토큰·라이선스 키는 OS 보안 저장소만(모범: NatasAiPlayList `safeStorage.encryptString`). **localStorage 금지** |
| **자격 검증** | Ed25519 서명 토큰(앱은 공개키만) 방식 유지 |

## 브라우저 프로필도 비밀값이다
- 자동화·시험용 크롬/엣지 프로필(`Cookies`·`Login Data`·`Web Data`)은 로그인 세션 그 자체다. **클라우드 동기화 폴더 안에 만들지 않는다** → `%LOCALAPPDATA%\<앱이름>\profiles\` 등 동기화 밖에.
- 시험이 끝난 임시 프로필은 즉시 삭제.

## 의무 방식
| 앱 종류 | 키·토큰 저장 |
|---|---|
| Electron | `safeStorage.encryptString` → 암호문만 파일에 저장 |
| Tauri | OS keyring(stronghold/keyring 플러그인) |
| Python(PC) | `keyring` 라이브러리(Windows 자격 증명 관리자) 또는 DPAPI(`win32crypt.CryptProtectData`) |
| 웹앱(Next.js 등) | **저장 금지** — 입력한 창의 메모리에만. 저장이 필요하면 PC 앱 기능으로 이관 |
| 우리 서버 비밀 | Vercel/서버 환경변수만(service_role, SMTP 앱 비밀번호 등) |
| 우리 회원 비밀번호 | 직접 보관 금지(Supabase Auth 등 위임). 불가피하면 bcrypt/argon2 일방향 |

- 설정 파일에는 "연결됨" 표시와 **키 지문(SHA-256 앞 8자리)**만 남긴다.
- **기존 사용자 이관 필수**: 새 버전 첫 실행 때 옛 평문(localStorage·JSON)을 읽어 보안 저장소로 옮긴 뒤 **평문을 즉시 삭제**.
- 공개 클라이언트 키(Supabase anon, Firebase web, Kakao JS, Toss/PortOne client·channel)는 노출 허용. 단 Supabase는 전 테이블 RLS + 뷰 `security_invoker=true`.

## 공통 키 금고 = D + A (Windows Hello 우선) — 박사님 확정 2026-09-27
- PC 앱 비밀값은 OS 보안 저장소 암호문만(D) + 앱 시작 시 **Windows Hello(PIN·지문·얼굴) 1회 해제**, 불가 PC만 앱 비밀번호 폴백(A).
- 폴백은 PBKDF2-SHA256(앱별 소금·21만 회 이상) 또는 동급 이상 KDF를 쓴다. 비밀번호·해제 상태를 디스크에 저장하지 않는다.
- 해제 상태는 실행 중 메모리에만 두고 앱 종료·Windows 잠금(Win+L)·절전 복귀 시 재잠금한다. 기존 평문/구 암호문은 첫 성공 해제 때 금고로 이관 후 원본 삭제한다.
- 웹앱은 비밀값을 저장하지 않고 메모리 전용 또는 서버 프록시만 허용한다.
- 관문 5(Jev privacy ≤ 0.05) 기준은 유지한다. 시범: 나타스픽 Python판 → 통과 후 Electron 공통 패키지 1개.

- Hello는 단순 확인창으로 대체하지 않고, KeyCredential/WebAuthn/TPM 보호 키로 데이터 키를 암호학적으로 unwrap해야 한다. DPAPI만으로 Hello 준수라고 판정하지 않는다.
## 푸시 전 관문 (하나라도 실패하면 푸시 금지)
1. 비밀값 패턴 검사 0건 (AIza·sk-·ghp_·텔레그램 봇 토큰·EAA/IGAA·PRIVATE KEY·password/secret 리터럴).
2. `localStorage`/`sessionStorage`/평문 파일에 key·token·password 저장 코드 0건.
3. 외부 서비스 비밀번호 입력·저장 코드 0건.
4. Supabase 앱: anon 키로 전 테이블·뷰 조회 → 0행.
5. Jev `privacy` **0.05 이하** (approve와 별개 조건).
6. 오류 화면에 키·토큰·원문 오류 0건.

## 사고 대응
- 평문 비밀값 발견 → 즉시 커뮤니티 방 보고(값 기재 금지, 계정 아이디·파일 경로만) → **비밀번호·키 교체는 박사님 직접** → 평문 삭제(사본 백업 금지) → 기록.

## 현재 점검 결과 (2026-09-27, 어사이드)
- 🔴 blogauto-naver-main: 네이버 비밀번호 평문 저장 설계 → 비밀번호 교체·평문 삭제 완료. **앱은 safeStorage/브라우저 세션 방식으로 재작성 전 사용 금지.**
- 🟠 허브 Supabase `admin_app_overview` 뷰 비로그인 조회 가능(집계만) → 권한 회수 필요.
- 🟡 약 20개 운영 앱이 사용자 API 키를 localStorage 평문 저장 → 공통 "키 금고" 모듈로 순차 전환(허브·쇼츠·롱폼·sns-write·NatasPick 우선).
- 🟢 코드 하드코딩 비밀값 0건.
- 🔴 허브 키(추가 점검): 허브 DB `license_key` 평문 저장(playlist·central_control·nap_license_events·npk 등, 이벤트 로그 포함) / NatasPick 허브 access·refresh 토큰·이메일 localStorage / ReCreator 상업 라이선스 키·네이버 client secret·유튜브 refresh·인스타·틱톡 토큰 localStorage / natasaigroup 관리자 비밀번호 sessionStorage.
- 🟠 동기화 폴더 안 브라우저 프로필 23개: blogauto 2(v0020 네이버·티스토리 세션), jungsunhwa `_temp/verification` 21(5~6월 시험 프로필).
- 🟢 모범: NatasAiPlayList 라이선스 safeStorage 암호화, 허브 관리자 비밀번호 PBKDF2, 자격 토큰 Ed25519.
