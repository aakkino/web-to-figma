# FD1 Reconciled Head Independent Review

Reviewed on 2026-08-30. This review made no product-code change and performed
no remote mutation.

## Result

The committed reconciled implementation and its bounded evidence closure are
independently review-clean. The task is **eligible to request separate
ordinary-push authorization**. This conclusion supersedes the earlier review
of the first smoke fixture, which did not observe a fallback state.

## Identity And Scope

- Reviewed head: `d3459aa954ef1b6035c1f370d628ac50b8263329`.
- Parent 1: immutable FD1 commit
  `62eef8de9ff01b4d58c905a8f8e2949da00703b8`.
- Parent 2: refreshed target
  `decde39a60a220d6ea853f04c3893a0446fa76bf`.
- Both parents are ancestors of the reviewed head.
- The FD1 worktree was clean and had no staged paths after review.
- Live `ls-remote` still resolved remote `main` to `decde39a`; no remote FD1
  source branch was returned, and the open source-PR query returned `[]`.
- The base-to-head payload is exactly the approved four files, with 461
  insertions and five deletions.

The diagnostics module and its test have the same Git blob identities at
`62eef8d` and `d3459aa`. Relative to refreshed main, `app.tsx` adds only the
diagnostics import and replaces the request-count paragraph with the reviewed
diagnostics component. `vitest.config.ts` retains all current projects and
includes and adds only the FD1 test registration. No fifth product file,
adapter/converter behavior, storage, messaging, permission, dependency,
lockfile, release, baseline, or CI change is present.

## Contract Review

- Exact diagnostics remain summary-only; fallback and unavailable diagnostics
  render separately.
- Command order remains `Retry fonts`, `Use compatible fonts`, then
  `Cancel capture`.
- Technical details use collapsed `details` elements.
- Raw attempts are projected to a fixed source/outcome vocabulary.
- URLs, code-point-like text, source text, raw errors, and any Unicode `Cc` or
  `Cf` control/format character are rejected before display.
- Focused tests cover exact/fallback/unavailable counts, collapsed details,
  absent resolved metadata, URL/raw-error/code-point suppression, and C1,
  bidi, and zero-width control filtering.

No unresolved code, privacy, current-main preservation, test-registration, or
browser-build finding was found. Existing specs already express the relevant
privacy and real-extension requirements; no spec update is needed.

## Independent Verification

All commands below ran in the clean FD1 worktree at `d3459aa`:

| Check | Result |
| --- | --- |
| Directed four-file Biome | pass; 4 files, no fixes |
| Focused FD1 test | pass; 6/6 |
| Extension tests | pass; 61/61 across 10 files |
| Extension type-check | pass |
| Repository type-check | pass; all 8 projects |
| Chrome MV3 build | pass; 20.58 MB |
| Firefox MV2 build | pass; 20.58 MB; existing WXT advisory only |
| Repository tests | pass; upstream 7/7, fig-kiwi 41/41, composed-dom 5/5, core 281/281, adapter 87/87, extension 61/61, Oracle 102 passed/5 gated skips |
| `git diff --check decde39a...HEAD` | pass |
| Repository lint | expected baseline failure; 396 unrelated CRLF errors |

The repository lint result matches the execution evidence's reproduction on
the exact refreshed base. The touched-file Biome gate passes, and no unrelated
file was normalized.

## Real-Extension Closure

The superseding screenshot was inspected independently and mechanically
confirmed as a 360 by 800 PNG (44,244 bytes, SHA-256
`dbc4a6c108234145a007c73b112ed8fec924c779d28b961cd5df9b3d20f93134`).
It visibly demonstrates the required single-run matrix:

- summary: `3 font requests: 1 exact, 1 fallback, 1 unavailable.`;
- fallback: requested `Noto Sans TC Thin / 500 / normal`, resolved
  `Noto Sans TC Thin / 400 / normal`;
- unavailable requested family replaced by `family unavailable`;
- `Retry fonts`, `Use compatible fonts`, and `Cancel capture` in order;
- both mismatch technical-detail disclosures collapsed;
- panel bounds `x=16`, `right=344`, `width=328` within the narrow viewport;
- no malicious host or `private.woff2` text in the recovery UI.

The first fixture's `1 exact, 0 fallback, 2 unavailable` result remains useful
negative evidence but no longer blocks the task. The bounded closure satisfies
the approved real loaded-extension smoke requirement.

## Preservation Evidence

At review completion, the dirty root remained
`sync/upstream-20260726@9c949a4a7a7560b460562014232d982c1f21533c`
with no staged paths, the FD1 worktree remained clean at `d3459aa`, and the
registered worktree branch/head list matched the local execution record.

The recovered 17-row pre-execution SHA-256 table was parsed mechanically. Its
path set exactly equals the current `git diff --name-only HEAD` content-dirty
set: 17 rows, no missing paths, no extra paths, and zero hash mismatches. The
index remains unstaged.

`git status` also displays the two converter classifier files as modified due
to checkout CRLF/stat presentation. They are not content differences: each
filtered worktree blob equals its index blob and `git diff --quiet` returns 0.
They therefore do not make the persisted 17-path content snapshot incomplete.

At final review, the FD1 worktree remained clean at `d3459aa`, local and live
remote `main` remained `decde39a`, the remote source branch remained absent,
and the open source-PR query remained `[]`. No remaining local review or smoke
blocker prevents requesting the separately required ordinary-push
authorization. No push, PR creation, or merge was performed by this review.
