# Rebuild LA1 lazy activation preflight

## Goal

Rebuild a bounded lazy-resource activation preflight against the current
`main` capture contracts so a single page or element capture can discover
resources that the page exposes only after viewport entry or controlled
scrolling, without replaying the historical sync commit.

## Background

- The planning target is `origin/main@1c26bc2a48dbe9a7dd642aeca6b546c3bd52ffec`,
  verified against the remote on 2026-08-29. It must be re-pinned immediately
  before implementation because planning does not freeze a moving branch.
- Historical candidate S49, commit `dfd432b85ad83510efe4a892bc99fbaa03cdd051`,
  is evidence only. Literal cherry-pick, replay, or transplant is prohibited.
- Current `main` contains the BG1/BG2 staged-background pipeline but has no
  `lazy-activation.ts`, activation phase, or `lazyActivation` setting.
- LA1 and CP1 are independent roots approved for parallel planning. They may
  be developed in isolated worktrees, but LA1 is the first planned merge and
  CP1 must rebase/rebuild and revalidate after LA1 containment.

## Requirements

- Implement the generic activation policy in
  `internal/browser-capture-adapter`; the extension owns settings, user-facing
  state, and engine wiring. `packages/dom-to-figma` remains unchanged unless a
  newly discovered generic contract is returned to planning.
- Provide `lazyActivation: "auto" | "off"` through the versioned extension
  advanced settings path. Missing stored values normalize to `auto`.
- Page capture in `auto` mode traverses the document scroll axis and bounded,
  discoverable nested scroll containers. Element capture is limited to the
  selected target, necessary ancestor scroll contexts, and in-scope nested
  containers; it must not broaden to an unrelated whole-page scan.
- Save and restore window and touched-container scroll state on success,
  cancellation, timeout, target loss, and failure. Restoration failure is
  diagnostic and must not silently replace the primary capture outcome.
- Use bounded traversal rather than network-idle or infinite-scroll
  completion: at least two animation frames plus a short quiet window per
  position, a default total budget no greater than 10 seconds, and explicit
  limits for passes, containers, and scroll steps.
- Re-inventory after activation and after restoration. Newly discovered
  canonical resources enter the existing scheduler once; conversion continues
  to consume a frozen inventory and performs no late resource fetch.
- Add an `activating` phase/progress model integrated with the workspace busy
  guard, minimize/restore behavior, and existing Cancel command.
- Diagnostics distinguish off, completed/stable, budget exhausted, timed out,
  canceled, target lost, restoration failure, and post-restoration resource
  change. They may contain counts and stable codes, never page text, raw URLs,
  or third-party script content.
- Preserve existing static-source, lazy-background, image scheduling, font,
  cancellation, placeholder, and composed-DOM behavior when activation is off
  or not applicable.
- Perform implementation in a new isolated branch/worktree from the re-pinned
  target. Do not modify, stage, stash, clean, or normalize the dirty
  `sync/upstream-20260726` root.

## Acceptance Criteria

- [ ] A single page capture discovers representative below-fold lazy images
      without manual pre-scrolling and stages every canonical source at most
      once.
- [ ] Element activation is bounded to the selected target and necessary
      scroll contexts; browser tests prove unrelated page regions are not
      traversed.
- [ ] `off` performs no activation scroll and preserves the current static
      revalidation flow.
- [ ] Window and nested-container positions are restored on success, timeout,
      cancellation, target loss, and failure; restoration diagnostics are
      accurate.
- [ ] Mutation, `src/currentSrc`, computed background, allowlisted lazy source,
      open Shadow DOM, sticky/fixed content, and bounded virtual-list behavior
      have focused tests.
- [ ] Budget, pass, container, and scroll-step limits terminate deterministically
      while retaining resources already discovered.
- [ ] Extension settings normalize old storage to `auto`, persist explicit
      `auto/off`, and pass the selected mode into the adapter; typography-only
      capture forces activation off.
- [ ] The `activating` phase is visible, cancelable, and included in controller
      state-machine tests.
- [ ] Adapter and extension tests, type checks, Chrome MV3 and Firefox MV2
      builds, targeted Biome, workspace gates, and `git diff --check` pass or
      record only independently reproduced pre-existing failures.
- [ ] Live browser smoke covers page, element, off, cancel, restoration, and
      real-image output; implementation remains one independently reversible
      LA1 PR.
- [ ] After merge, refreshed `origin/main` contains the reviewed head and merge
      commit before LA2 planning can be requested.

## Out Of Scope

- LA2 delayed infinite-scroll edge stabilization.
- Calling site-private loader functions, guessing arbitrary `data-*`, network
  interception/proxy expansion, unbounded feeds, hidden UI activation, closed
  Shadow DOM, or cross-origin iframe internals.
- `.figit` artifact/output work owned by CP1.
- Whole-branch integration or literal application of historical commits.

## Key Decisions

- Default mode is bounded `auto`; an explicit `off` path is the operational
  fallback for pages with unacceptable activation side effects.
- LA1 and CP1 planning/development may overlap in separate worktrees. Merge is
  serialized as LA1 first, then CP1 rebased and fully revalidated.
- No blocking product or scope questions remain. Implementation still requires
  a separate final-plan approval.
