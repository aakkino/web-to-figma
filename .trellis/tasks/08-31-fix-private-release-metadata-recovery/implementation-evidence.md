# Implementation Evidence: Private Release Metadata Recovery

## Scope And Safety

- Baseline source: `adc52aea87e1f6f25f53d43028527e5dd8489892`.
- No workflow was dispatched and no Registry package, Git Tag, GitHub Release,
  or branch was mutated.
- The local preflight created only ignored `.artifacts/private-release/`
  staging files. Candidate tarballs remain local and are not workflow
  artifacts.

## Requirement Traceability

| Requirement | Implementation | Proof |
| --- | --- | --- |
| R1, AC1 | `publishSerially()` preserves `name`, `version`, `integrity`, and initial `absent|matching`; `publishAndPersistResult()` writes the source-bound result only after smoke and every promotion return. | A persistence-boundary regression proves success writes after all promotions and failures never call the writer. Local preflight proves no result exists before publication. |
| R2, AC5 | `assertPublishResult()` enforces exact top-level/entry fields, source SHA, fixed allowlist order, full cardinality, identity/integrity equality, unique coordinates, and closed states before selection. | Result source, cardinality, state, and integrity mismatch regressions pass. |
| R3, R7, AC2 | Normal selection includes only initial `absent` entries; empty selection does not invoke metadata APIs. | The original full-manifest historical Tag failure is reproduced, then the result selector proves only dom is inspected and created; empty-selection regression asserts zero calls. |
| R4, R5, AC3 | Default-off recovery examines only `matching` entries and requires an absent exact Tag/Release pair, valid increasing SemVer over a unique highest owned predecessor, and predecessor ancestry. Existing paired metadata must also be internally consistent. | Known dom `0.4.0` selects only dom; incomplete/conflicting metadata, no predecessor, regression, malformed history, equal-precedence ambiguity, malformed Tag SHA, and non-ancestor cases reject before writes. |
| R6, AC4 | `reconcileMetadata()` preflights every selected Tag and Release before writes. `inspectTag()` dereferences through the commits API; `inspectRelease()` resolves `target_commitish` to a validated commit SHA. | Multi-candidate Tag conflict, inconsistent Tag/Release pair, malformed inspection, and wrong Release target regressions assert zero writes; correct recovery rerun is idempotent. |
| R8 | Existing staged-byte, private visibility, Actions/PAT/anonymous isolation, and serial promotion code is unchanged. | Existing release tests and full release policy pass. |
| R10 | Workflow uploads only `manifest.json` and `result.json`, downloads both, uses full history, and passes a default-false boolean only to metadata selection. | Job-scoped release-policy checks reject a missing result, tarball glob, enabled default, missing metadata history/download, misplaced selector wiring, or extra recovery-input use. A YAML parser verified the typed input and job structure. |
| R11, AC7 | Implementation performs no operational recovery and introduces no destructive path. | No remote mutation command or workflow dispatch was run. |

## Validation

| Command | Result |
| --- | --- |
| `pnpm test:release` | PASS, 56 tests. |
| `pnpm release:policy` | PASS for the three fixed `@aakkino` packages. |
| `pnpm exec biome check scripts/private-release.mjs scripts/private-release.test.mjs scripts/release-policy.mjs scripts/release-policy.test.mjs --diagnostic-level=error --max-diagnostics=none` | PASS, exit 0. The broader owned-file run reports only informational diagnostics and three complexity warnings. |
| `pnpm lint -- --max-diagnostics=50` | BLOCKED before file linting by pre-existing nested root configs under `.tmp/governance-ci-upstream-fetch-repro` and `.tmp/lint-validation-20260726`; no task-owned lint error. |
| Structural parse of `.github/workflows/release.yml` with the installed `yaml` parser | PASS; boolean default `false`, result handoff, metadata `fetch-depth: 0`, and selector command verified. |
| `pnpm check-types` | PASS, exit 0 across all eight participating workspaces. |
| `pnpm build` | PASS, exit 0. Playground emitted its existing large-chunk warning. |
| `pnpm test` | PASS, exit 0. Oracle tests retained the expected gated skips (3 files / 5 tests). |
| `pnpm oracle:parity` | PASS, 47 scenes. |
| `pnpm upstream-adapter:stable` | PASS, `stable@0.2.4`. |
| `pnpm upstream-adapter:main` | PASS, `859efea8d7f8330783c6c4e3e520fd673e877336`. |
| `pnpm upstream-core-delta:check` | PASS, governance target with zero unmapped runtime paths. |
| `pnpm release:preflight --source-sha adc52aea87e1f6f25f53d43028527e5dd8489892` | PASS, exactly three allowlisted local tarballs inspected and smoke-tested; no remote writes. |
| `git diff --check` | PASS. |

The preflight manifest was parsed through PowerShell's JSON decoder and
contained source SHA `adc52aea87e1f6f25f53d43028527e5dd8489892` plus exactly
`@aakkino/fig-kiwi@0.2.0`, `@aakkino/composed-dom@0.1.1`, and
`@aakkino/dom-to-figma@0.4.0`. `result.json` was absent, as required before a
successful publish transaction.

## Hard-Check Self-Fixes

- Recovery formerly ignored a Tag/Release pair when both existed but resolved
  inconsistently. It now rejects the pair before history resolution or writes,
  while a consistent historical pair remains outside the selected set.
- Release inspection formerly resolved `tag_name`, which could mask a wrong
  `target_commitish`. It now resolves and validates `target_commitish`; Tag
  inspection continues to dereference lightweight and annotated refs through
  the commits API.
- Publish-result persistence ordering is now an injectable boundary with a
  regression proving that failure before complete promotion never writes a
  result.
- Workflow policy formerly counted whole-file strings for full history. It now
  validates publish handoff and metadata checkout/download/selection inside
  their owning jobs and confines the recovery input to its declaration and the
  metadata command.

## Remaining Operational Gate

This implementation does not authorize the live recovery. After protected PR
merge and independent review, the parent task must record the new current
`origin/main` SHA, reconfirm the immutable private Registry state, obtain fresh
environment approval, and only then dispatch the ordinary Release workflow
with explicit recovery enabled.

## Live Recovery Debug Follow-Up

The subsequently authorized run `33364693324` exposed a bounded adapter defect
before metadata writes: the commits API returns HTTP 422, rather than 404, when
asked to resolve the absent `@aakkino/dom-to-figma@0.4.0` tag directly.
`inspectGitHubTag()` now establishes absence through the exact Git-ref endpoint
before using the commits endpoint only to dereference an existing validated
ref. Hard-checking further restricts ref objects to `commit|tag`, requires a
lightweight ref's object SHA to match its resolved commit, and preserves
annotated-tag dereferencing. Regression tests distinguish exact-ref 404 from
non-404 and commit failures, and reject malformed or inconsistent states while
preserving fail-closed behavior. `pnpm test:release` passes 59 tests; release
policy and type checks also pass. Full reproduction and remote state evidence
is recorded in
`research/release-run-33364693324-absent-tag-debug.md`. The failed workflow was
not retried and no remote state was mutated during debugging.
