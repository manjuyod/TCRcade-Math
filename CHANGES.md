# CHANGES.md (2025-11-19)

## Granular changes
- server/auth.ts
  - Lines 18-93: Added pending-login session typing, TTL, and helpers to store multi-account selections securely in-session.
  - Lines 124-199: Updated LocalStrategy to treat the identifier as username or email, validate password across matching email accounts, and emit `multiUserSelection` when multiple matches share the provided password.
  - Lines 314-391: Added login handler that returns `status: "select_user"` for multi-account cases, plus `/api/login/pending` and `/api/login/select` endpoints; preserves generic error responses and clears pending sessions after completion.
- server/storage.ts
  - Line 33 and 215-219: Extended storage interface and in-memory implementation with `getUsersByEmail` to support multi-account lookups.
- server/database-storage.ts
  - Lines 107-117: Added persisted `getUsersByEmail` query returning all accounts for a given email.
- client/src/hooks/use-auth.tsx
  - Lines 12-49: Introduced `LoginSelectionResponse/LoginResult` typing and updated login mutation to route to the select-user step on `status: "select_user"`, keeping existing success/error flows intact.
- client/src/pages/auth-page.tsx
  - Lines 67-86: Relaxed login schema to accept username or email (basic email shape + trimmed identifier).
  - Lines 320-329: Relabeled login field to “Username or Email” and updated placeholder.
  - Lines 147-151: Trim identifier before submit to avoid whitespace mismatches.
- client/src/pages/select-user-page.tsx
  - Lines 1-199: New themed selection page that fetches pending options, lists username/displayName only, posts selection to finalize login, and handles expired sessions or errors.
- client/src/App.tsx
  - Lines 9-147: Imported and routed `/auth/select-user` to the new selection page.
- README.md
  - Lines 28-36: Documented multi-account login selection behavior and quick test paths.
