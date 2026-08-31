# Final Alignment Baseline

Checked at `2026-08-26T21:14:38+08:00`. This phase performed no local-head
branch, checkout, index, worktree, main, backup, push, merge, reset, stash, or
cleanup operation. The only network refresh was the explicitly requested
`git -c safe.directory=D:/desktop_directory/web-to-figma fetch --prune origin`.

## Final Main Refresh

The GitHub API resolved live `main` to
`13948d88e3ec6a0939f39d8f69ce3ef637976a68` before the fetch. Local
`refs/remotes/origin/main` had the same value before the fetch and remained at
that value afterward. The fetch ran from `2026-08-26T21:14:34+08:00` through
`2026-08-26T21:14:38+08:00` and returned exit `0`.

The fetch was **not** a no-ref-change/fast-forward-only observation. One
unrelated remote-tracking ref changed by forced update:

```text
refs/remotes/origin/changeset-release/main
fcf627acdf6b2011905da8348b68e2fe6dd4f2b7
  -> 2d56170822a51f0496f84591d91e6de4293a8c1c
```

No other fetched ref changed, and `origin/main` did not move. This unrelated
remote state was recorded as observed and was not reverted or otherwise
modified.

## Exact Local Refs

| Ref | SHA |
| --- | --- |
| current branch | `sync/upstream-20260726` |
| `HEAD` | `07bbcd751c34a378caeb91b10681842f37c64b7d` |
| `refs/heads/sync/upstream-20260726` | `07bbcd751c34a378caeb91b10681842f37c64b7d` |
| `refs/heads/main` | `bac116ad8a7ac18812cfa6af72b140c45c6dbf83` |
| `refs/remotes/origin/main` | `13948d88e3ec6a0939f39d8f69ce3ef637976a68` |
| live remote `main` | `13948d88e3ec6a0939f39d8f69ce3ef637976a68` |

Both the old local-main object and final origin-main object resolve as commit
objects. Their merge base is the approved initial base
`606ee8aa9ca4915ec28dd7853fd5b42283ff54ea`; `git rev-list --left-right
--count bac116ad...13948d88...` returned `20 11`. Neither tip is an ancestor
of the other. This matches the final full-scope report: four reviewed units
were reconstructed and merged sequentially from the approved base rather than
fast-forwarding the unpublished old local-main history.

The final main first-parent path is exactly:

```text
13948d88 (C5 merge) -> 9839c7e8 (C4 merge) ->
8291c6b1 (C3 merge) -> c9e4e391 (C1+C2 merge) -> 606ee8aa
```

The old-main recovery target is
`bac116ad8a7ac18812cfa6af72b140c45c6dbf83`. No recovery command was run.

## Index And Worktree Baseline

The staged set is empty. Exactly these six tracked paths retain `.M` worktree
status, matching the prior audited baseline:

```text
.gitignore
.trellis/spec/dom-to-figma/frontend/index.md
.trellis/workspace/kino/index.md
packages/dom-to-figma/src/converter/classify.test.ts
packages/dom-to-figma/src/converter/classify.ts
packages/fig-kiwi/src/clipboard.test.ts
```

Four paths have content diffs with the same recorded numstat: `.gitignore`
`+1/-0`, the frontend spec index `+1/-0`, the workspace index `+4/-3`, and
the clipboard test `+11/-1`. The two classifier paths retain status-only
line-ending/stat dirtiness and do not appear in `git diff --name-status`.
Nothing was staged, restored, normalized, or edited by this phase.

## Backup Authorization Gate

`git show-ref --verify --quiet
refs/heads/backup/local-main-before-reconcile-20260826` proved the target ref
does not exist. A complete ref-name search found no refs under
`refs/heads/backup` and no ref containing `backup` or
`local-main-before-reconcile`.

All critical stop-condition refs and checkout state match the approved
baseline. Phase 1 is complete and the task may enter a separate authorization
gate to atomically create
`refs/heads/backup/local-main-before-reconcile-20260826` at old main using a
zero-SHA expected-old compare-and-swap. That ref has not been created, and
local `main` has not been reanchored.

## Independent Phase 1 Review

At `2026-08-26T21:18:51+08:00`, an independent read-only review reproduced the
entire baseline without fetching or writing any ref, index, checkout, worktree,
or remote state.

Live/local `origin/main` remained `13948d88...`; local `main` remained
`bac116ad...`; current branch, HEAD, and the sync ref remained
`sync/upstream-20260726@07bbcd75`. The staged set remained empty and the exact
six tracked dirty statuses matched. Four paths retain the recorded content
numstat, while both classifier paths remain status-only line-ending/stat
dirtiness.

The old and final main tips and their common base all resolve as commit
objects. Their merge base is `606ee8aa...`, the left/right count is `20/11`,
and neither tip is an ancestor of the other. The final-main first-parent range
contains exactly `13948d88`, `9839c7e8`, `8291c6b1`, and `c9e4e391` in order.

The exact backup ref is absent, and a complete ref-name scan found zero refs
containing `backup` or `local-main-before-reconcile`. The changeset reflog
independently confirms the disclosed fetch-time forced update from
`fcf627ac...` to `2d561708...`. This is an unrelated remote-tracking sync
observation: it did not move `origin/main`, was not a task target, was not
initiated as a separate ref operation by this task, and must not be summarized
as "no other ref change."

No critical stop condition is triggered. Phase 1 is independently verified
and may enter only the separately authorized zero-expected-old CAS creation of
the backup ref. Main reanchoring remains a later, independent authorization
gate.

## Authorized Backup CAS

The user separately authorized only creation of the backup ref. Immediately
before the write, a no-fetch precheck reconfirmed live/local `origin/main` at
`13948d88e3ec6a0939f39d8f69ce3ef637976a68`, local `main` at
`bac116ad8a7ac18812cfa6af72b140c45c6dbf83`, HEAD and the sync branch at
`07bbcd751c34a378caeb91b10681842f37c64b7d`, an absent target backup ref,
empty staged state, and the exact six tracked dirty paths.

At `2026-08-26T21:22:12+08:00`, exactly one compare-and-swap ref write ran:

```text
git -c safe.directory=D:/desktop_directory/web-to-figma update-ref \
  -m "backup old local main before final origin alignment" \
  refs/heads/backup/local-main-before-reconcile-20260826 \
  bac116ad8a7ac18812cfa6af72b140c45c6dbf83 \
  0000000000000000000000000000000000000000
```

The command returned exit `0`. A complete before/after local-ref comparison
showed exactly one addition and no update or deletion:

```text
refs/heads/backup/local-main-before-reconcile-20260826
  -> bac116ad8a7ac18812cfa6af72b140c45c6dbf83
```

The backup resolves to that exact SHA and its object type is `commit`. Its
single reflog record is:

```text
bac116ad8a7ac18812cfa6af72b140c45c6dbf83
refs/heads/backup/local-main-before-reconcile-20260826@{2026-08-26T21:22:12+08:00}
backup old local main before final origin alignment
```

Post-write verification again used `ls-remote`, not fetch. Live/local
`origin/main`, local `main`, HEAD, and the sync branch retained their exact
pre-write values. Staged remained empty and all six tracked dirty statuses
remained exact. No second `update-ref`, main write, branch force, checkout,
reset, stash, push, merge, ref deletion, code/index/worktree edit, fetch, or
temporary-directory deletion occurred.

Backup creation is complete and may enter an independent backup check. Local
main reanchoring remains unauthorized and has not occurred.

## Independent Backup CAS Review

At `2026-08-26T21:25:55+08:00`, an independent read-only review confirmed
`refs/heads/backup/local-main-before-reconcile-20260826` resolves exactly to
`bac116ad8a7ac18812cfa6af72b140c45c6dbf83` and has object type `commit`.

Its reflog contains exactly one entry, at
`2026-08-26T21:22:12+08:00`, with message
`backup old local main before final origin alignment`. The all-ref reflog for
the operation window likewise contains only this backup creation. This matches
the recorded single zero-expected-old `update-ref` CAS and exit `0`, and the
complete before/after ref comparison records only the backup addition.

Live/local `origin/main` remained `13948d88...`; local `main` remained
`bac116ad...`; HEAD and sync remained `07bbcd75...`; the unrelated changeset
remote-tracking ref remained `2d561708...`. Staged remained empty and the
exact six tracked dirty paths were unchanged. No fetch, second `update-ref`,
main write, other ref change, checkout, reset, stash, push, code/index/worktree
edit, or temporary-directory deletion occurred.

No stop condition is triggered. Phase 2 is complete and the task may enter
only a separately authorized CAS reanchor of local `main` from `bac116ad...`
to `13948d88...`. The backup must remain unchanged; reanchoring has not been
authorized or performed by this review.

## Authorized Local Main Reanchor

The user separately authorized only the local-main compare-and-swap. A
no-fetch precheck reconfirmed live/local `origin/main` at
`13948d88e3ec6a0939f39d8f69ce3ef637976a68`, local `main` and the backup at
`bac116ad8a7ac18812cfa6af72b140c45c6dbf83`, backup object type `commit`,
HEAD and sync at `07bbcd751c34a378caeb91b10681842f37c64b7d`, empty staged state, and
the exact six tracked dirty paths.

At `2026-08-26T21:28:58+08:00`, exactly one CAS command ran:

```text
git -c safe.directory=D:/desktop_directory/web-to-figma update-ref \
  -m "align local main to verified origin main" \
  refs/heads/main \
  13948d88e3ec6a0939f39d8f69ce3ef637976a68 \
  bac116ad8a7ac18812cfa6af72b140c45c6dbf83
```

The command returned exit `0`. A complete before/after ref comparison showed
only the expected main update, with no addition or deletion:

```text
refs/heads/main
  bac116ad8a7ac18812cfa6af72b140c45c6dbf83
  -> 13948d88e3ec6a0939f39d8f69ce3ef637976a68
```

The main reflog count advanced from 64 to 65, and the only new entry is:

```text
13948d88e3ec6a0939f39d8f69ce3ef637976a68
refs/heads/main@{2026-08-26T21:28:58+08:00}
align local main to verified origin main
```

Post-write verification established
`local main == local origin/main == live main == 13948d88...`. The backup
remains `bac116ad...`, resolves through `^{commit}`, and preserves the old-main
tree `adf9afda5833a927f342fdfd434b96c58db69954`. Current branch, HEAD, and the
sync ref remain `sync/upstream-20260726@07bbcd75`; staged remains empty and the
exact six tracked dirty paths remain unchanged.

The protected recovery command is recorded but was not run:

```text
git -c safe.directory=D:/desktop_directory/web-to-figma update-ref \
  refs/heads/main \
  bac116ad8a7ac18812cfa6af72b140c45c6dbf83 \
  13948d88e3ec6a0939f39d8f69ce3ef637976a68
```

No fetch, second `update-ref`, backup/sync write, checkout, reset, stash,
branch force, push, merge, ref deletion, code/index/worktree edit, or temporary
directory deletion occurred. The CAS execution is complete and ready for an
independent final alignment check; that check remains pending.

## Independent Final Alignment Check

At `2026-08-26T21:33:55+08:00`, an independent read-only full-scope check
confirmed local `main`, local `origin/main`, and live `main` all resolve exactly
to `13948d88e3ec6a0939f39d8f69ce3ef637976a68`.

The main reflog has exactly one new operation entry at
`2026-08-26T21:28:58+08:00`, with message
`align local main to verified origin main`. The recorded command is a single
CAS from expected old `bac116ad...` to new `13948d88...`, returned exit `0`,
and the complete before/after ref record contains only the main update. The
all-ref reflog after the independent backup check likewise contains only this
main event.

The backup remains the commit `bac116ad...`; its sole creation reflog entry and
old-main tree remain unchanged. The protected recovery command has the correct
reverse CAS direction: new `bac116ad...`, expected old `13948d88...`. It was
recorded but not executed, as confirmed by the single new main reflog entry and
the current aligned main value.

Current branch, HEAD, and sync remain
`sync/upstream-20260726@07bbcd751c34a378caeb91b10681842f37c64b7d`.
Staged remains empty; all six tracked dirty statuses and the four recorded
content numstats remain exact, with both classifier paths still status-only.
No checkout, reset, stash, push, fetch, second ref write, other ref change,
code/index/worktree edit, or temporary-directory deletion occurred.

No product lint or test command was rerun because both authorized operations
changed only local ref metadata. The checked-out code tree and dirty worktree
were never changed, and the target final commit is the same already reviewed
`origin/main` commit whose promotion PRs passed repository, Tier-0,
governance, stable, and upstream-main gates.

All PRD acceptance criteria pass. No spec update is required because this task
changes no code behavior, interface, workflow contract, or repository
convention; its durable CAS and recovery evidence is task-local. No stop
condition is active, and the task is ready for the normal finish/archive
workflow. This check did not archive the task.
