# Math Rush Multiplication Gauntlet

Date: 2026-04-06

Environment:
- Local Windows dev run at `http://localhost:5000`
- Account used: user id `14`, username `BBGawdBB2`
- Password used: `Olimac_3333`
- Browser tooling: `playwright-cli` in headed Chrome session

## Summary

The first gauntlet run did not reproduce the multiplication loop because user `14` was already in an unlocked free-play state. After module progress was reset and the workflow was rerun, the loop did reproduce consistently:

1. User `14` entered multiplication assessment from a clean login.
2. The assessment completed at `100%`.
3. A fresh backend check immediately returned `testTaken: true` and `masteryLevel: true`.
4. Re-entering `Math Rush: Multiplication` still sent the user back to `/math-rush-assessment?operator=multiplication`.

The strongest current hypothesis is stale React Query cache on the client: the setup page consumes cached `assessment-status` data from before the assessment (`false/false`) and redirects before the forced refetch returns the fresh `true/true` state.

The gauntlet did surface three high-signal issues:

1. The local dev server was not loading `.env`, which broke database-backed auth and progression reads until fixed.
2. The completion page shows a token breakdown that disagrees with the server-awarded total when a "short" run takes more than 60 seconds.
3. The setup page calls `/api/rush/progression`, but that endpoint currently returns the app HTML shell with `200 OK` instead of JSON.

## Repro Flow Executed

1. Opened the app at `/auth`.
2. Logged in with `BBGawdBB2` / `Olimac_3333`.
3. Opened `Math Rush: Multiplication` from `/modules`.
4. Confirmed multiplication setup rendered as unlocked free play.
5. Selected `Mixed 6-12` and started a short run.
6. Completed the full 24-question run with 100% accuracy.
7. Returned to setup through `Try Another Rush`.
8. Re-checked multiplication assessment status after re-entry.

## Findings

### 1. Local dev auth/progression were broken because the server did not load `.env`

Severity: High for local verification and debugging

Observed behavior:
- Before the fix, `/api/login` returned `401 Invalid username or password` for a credential pair that matches the stored password hash.
- Server stderr showed Postgres connection attempts to `127.0.0.1:5432` / `::1:5432` instead of the Neon `DATABASE_URL`.

Root cause:
- The runtime entrypoint did not import `dotenv/config`, so the app process did not reliably load `.env` for `DATABASE_URL` and `SESSION_SECRET`.

Fix applied during this gauntlet:
- Added `import "dotenv/config";` to [server/index.ts](C:/Users/17026/Documents/Code%20stuff/TCRcade/TCRcade-Math/server/index.ts).
- Also guarded `reusePort` on Windows in [server/index.ts](C:/Users/17026/Documents/Code%20stuff/TCRcade/TCRcade-Math/server/index.ts) so the local server can boot on this machine.

Evidence:
- `.codex-artifacts/devserver.err.log`
- `.codex-artifacts/devserver.log`
- `.codex-artifacts/playwright/01-login-page-fixed-env.png`

### 2. Math Rush completion shows inconsistent token math

Severity: High user-facing scoring bug

Observed behavior:
- The run completed with `24/24`, `durationSec: 61`, and server response `tokens: 23`.
- The completion UI showed `100%` and total tokens `23`, but the displayed breakdown was:
  - Base tokens: `12`
  - Perfect score bonus: `+20`
  - Total tokens: `23`

Why this is wrong:
- `12 + 20` does not equal `23`.
- The server and play page both treated a `61` second run as `LONG` mode, which yields `8 + 15 = 23`.
- The completion page recalculates the breakdown from `results.timeOption` (`SHORT`) instead of using `durationSec` or server-provided breakdown data.

Likely touchpoint:
- [client/src/pages/rush/complete-page.tsx](C:/Users/17026/Documents/Code%20stuff/TCRcade/TCRcade-Math/client/src/pages/rush/complete-page.tsx)

Evidence:
- `.codex-artifacts/playwright/06-rush-complete.png`
- `.codex-artifacts/playwright/06-rush-complete.yml`
- `.playwright-cli/console-2026-04-07T00-32-11-363Z.log`
- `.playwright-cli/network-2026-04-07T00-31-17-087Z.log`

### 3. `/api/rush/progression` appears to be missing or miswired

Severity: Medium to High API contract bug

Observed behavior:
- The setup page issues `GET /api/rush/progression?operator=multiplication`.
- The request resolves with `200 OK`, but direct inspection returns the app HTML shell, not JSON.
- The client query still calls `response.json()`, so this contract is invalid even if the failure is currently masked by unused data.

Why this matters:
- The client explicitly expects JSON in [client/src/pages/rush/setup-page.tsx](C:/Users/17026/Documents/Code%20stuff/TCRcade/TCRcade-Math/client/src/pages/rush/setup-page.tsx).
- A `200` HTML fallback can hide missing server routes and make progression debugging misleading.

Likely touchpoints:
- [client/src/pages/rush/setup-page.tsx](C:/Users/17026/Documents/Code%20stuff/TCRcade/TCRcade-Math/client/src/pages/rush/setup-page.tsx)
- [server/routes.ts](C:/Users/17026/Documents/Code%20stuff/TCRcade/TCRcade-Math/server/routes.ts)

Evidence:
- Browser eval against `/api/rush/progression?operator=multiplication` returned HTML with status `200`
- `.playwright-cli/network-2026-04-07T00-30-15-796Z.log`
- `.codex-artifacts/devserver.log`

### 4. Multiplication assessment loop reproduced after resetting module progress

Severity: High user-facing progression bug

Observed behavior:
- On a clean rerun after resetting module progress, the first click into multiplication went to `/math-rush-assessment?operator=multiplication`.
- The assessment completed with `100%`.
- An immediate backend check returned:
  - `testTaken: true`
  - `masteryLevel: true`
- Despite that, clicking `Math Rush: Multiplication` again sent the user back to `/math-rush-assessment?operator=multiplication`.

Critical contradiction captured during repro:
- Browser console on [client/src/pages/rush/setup-page.tsx](C:/Users/17026/Documents/Code%20stuff/TCRcade/TCRcade-Math/client/src/pages/rush/setup-page.tsx) logged:
  - `Assessment data: {testTaken: false, masteryLevel: false, operator: multiplication}`
  - `No test taken - redirecting to assessment`
- In the same session, both server logs and a direct browser `fetch('/api/rush/assessment-status?operator=multiplication')` returned `true/true`.

Most likely root cause:
- The setup page reads cached query data for `['/api/rush/assessment-status', operator]` from the pre-assessment mount.
- Because `assessmentData` is already present and `assessmentLoading` is false, the redirect effect runs immediately on stale `false/false` data.
- The forced refetch completes afterward with `true/true`, but the user has already been redirected back to assessment.
- This also explains why logging out and back in can change the behavior: a full reload clears client-side query state.

Likely touchpoints:
- [client/src/pages/rush/assessment-page.tsx](C:/Users/17026/Documents/Code%20stuff/TCRcade/TCRcade-Math/client/src/pages/rush/assessment-page.tsx)
- [client/src/pages/rush/setup-page.tsx](C:/Users/17026/Documents/Code%20stuff/TCRcade/TCRcade-Math/client/src/pages/rush/setup-page.tsx)
- [client/src/hooks/use-auth.tsx](C:/Users/17026/Documents/Code%20stuff/TCRcade/TCRcade-Math/client/src/hooks/use-auth.tsx)
- [server/modules/mathRush.ts](C:/Users/17026/Documents/Code%20stuff/TCRcade/TCRcade-Math/server/modules/mathRush.ts)

Fix directions:
- Invalidate or refetch the `assessment-status` query after `complete-assessment` succeeds before navigating away from the assessment page.
- In setup, avoid redirecting from cached `assessmentData` until a fresh refetch resolves for the current mount.
- A safer variant is to gate redirect logic on `isFetching === false` after a known fresh read rather than `assessmentLoading` alone.

Evidence:
- `.codex-artifacts/playwright/10-rerun-assessment-start.png`
- `.codex-artifacts/playwright/11-rerun-assessment-complete.png`
- `.codex-artifacts/playwright/12-rerun-looped-back-to-assessment.png`
- `.codex-artifacts/playwright/12-rerun-looped-back-to-assessment.yml`
- `.playwright-cli/console-2026-04-07T00-41-10-510Z.log`
- `.codex-artifacts/devserver-rerun.log`

## Additional Notes

- The run used repeated questions because the backend only found `19` `Mixed 6-12` multiplication questions and repeated them to reach `24`.
- That may be acceptable fallback behavior, but it is worth reviewing for content quality:
  - the server log shows repeated `8 × 12`, `12 × 9`, and `7 × 6` items in the same session.

## Recommended Fix Order

1. Keep the startup fixes in [server/index.ts](C:/Users/17026/Documents/Code%20stuff/TCRcade/TCRcade-Math/server/index.ts) so local verification is reliable on Windows and with `.env`.
2. Fix the completion page to derive the token breakdown from server-returned values or from `durationSec`, not `timeOption`.
3. Either implement `/api/rush/progression` properly or remove the client query until the route exists.
4. Fix the stale post-assessment cache/redirect behavior in setup and assessment flow, then rerun the exact reset-account workflow.
