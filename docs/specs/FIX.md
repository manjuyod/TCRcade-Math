# Proposed Fix: Math Rush Multiplication Assessment Loop

## Problem

After a clean multiplication assessment run finishes at `100%`, the next click on `Math Rush: Multiplication` can still send the user back to:

- `/math-rush-assessment?operator=multiplication`

This happens even when a fresh backend read already returns:

- `testTaken: true`
- `masteryLevel: true`

## Root Cause Hypothesis

The most likely issue is stale React Query cache in the setup flow.

Current behavior:
- [client/src/pages/rush/assessment-page.tsx](C:/Users/17026/Documents/Code%20stuff/TCRcade/TCRcade-Math/client/src/pages/rush/assessment-page.tsx) completes the assessment and navigates away.
- [client/src/pages/rush/setup-page.tsx](C:/Users/17026/Documents/Code%20stuff/TCRcade/TCRcade-Math/client/src/pages/rush/setup-page.tsx) reads `assessment-status` from query cache.
- On re-entry, setup can immediately act on cached pre-assessment data (`false/false`) before the forced refetch finishes.
- The redirect effect runs early and sends the user back to assessment.

That explains why logout/login changes behavior: the full reload clears the client-side cache.

## Proposed Fix

### 1. Refresh assessment state immediately after assessment success

In [client/src/pages/rush/assessment-page.tsx](C:/Users/17026/Documents/Code%20stuff/TCRcade/TCRcade-Math/client/src/pages/rush/assessment-page.tsx):

- Import `queryClient` from the existing query client module.
- In `completeAssessmentMutation.onSuccess`, invalidate the assessment-status query for the current operator.
- Force a fresh refetch before navigating back to modules.

Target query key:
- `['/api/rush/assessment-status', operator]`

Implementation intent:
- `await queryClient.invalidateQueries(...)`
- `await queryClient.fetchQuery(...)`
- then navigate

This ensures the next mount sees fresh `true/true` data in cache instead of stale `false/false`.

### 2. Prevent setup from redirecting off stale cached data

In [client/src/pages/rush/setup-page.tsx](C:/Users/17026/Documents/Code%20stuff/TCRcade/TCRcade-Math/client/src/pages/rush/setup-page.tsx):

- Read `isFetching` from the assessment-status query.
- Do not run the redirect effect until the query has completed a fresh read for the current mount.
- Do not treat cached `assessmentData` alone as authoritative.

Recommended guard:
- only evaluate redirect logic when:
  - `assessmentData` exists
  - `assessmentLoading` is false
  - `isFetching` is false

That keeps the setup page from redirecting while a fresh refetch is still resolving.

### 3. Optional hardening

If the cache-only fix is not enough:
- clear any Math Rush assessment-related local state when assessment completes
- explicitly reset transient module state before redirecting to `/modules`

The current rerun evidence suggests `localStorage` is not the main cause here, but this is a reasonable defense-in-depth measure if the loop persists.

## Suggested Code Touchpoints

- [client/src/pages/rush/assessment-page.tsx](C:/Users/17026/Documents/Code%20stuff/TCRcade/TCRcade-Math/client/src/pages/rush/assessment-page.tsx)
- [client/src/pages/rush/setup-page.tsx](C:/Users/17026/Documents/Code%20stuff/TCRcade/TCRcade-Math/client/src/pages/rush/setup-page.tsx)
- [client/src/lib/queryClient.ts](C:/Users/17026/Documents/Code%20stuff/TCRcade/TCRcade-Math/client/src/lib/queryClient.ts)

## Rerun Checklist

Use this exact flow after the fix:

1. Reset multiplication module progress for user `14`.
2. Log in as `<test_username>` with password `<test_password>` from the project credential store or local secure configuration.
3. Open `Math Rush: Multiplication`.
4. Confirm the user is sent to assessment.
5. Complete the assessment at `100%`.
6. Confirm a fresh `assessment-status` read returns `true/true`.
7. Click `Math Rush: Multiplication` again from modules.
8. Verify the user lands on `/rush/setup`, not `/math-rush-assessment`.
9. Verify setup renders unlocked free play.

## Success Criteria

The fix is successful when all of the following are true:

- assessment completes at `100%`
- backend returns `testTaken: true` and `masteryLevel: true`
- re-entering multiplication does not loop back to assessment
- setup shows free-play unlock immediately on the next entry
