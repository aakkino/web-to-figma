# Parity And Ratchet

## Measurement Tiers

- Tier 0 compares traced payload geometry with browser ground truth locally.
- Tier 1 compares the sent Kiwi tree with Figma's copied-back Kiwi tree.
- Tier 2 compares the browser PNG with Figma's rendered PNG, clusters changed
  pixels, and attributes each cluster to the deepest covering DOM element.

Each tier returns flat `Finding` values. I/O wrappers write them; report code
assigns stable ids and aggregates them.

## Finding Contract

`findings.ts` owns the closed Tier 0/2 class vocabulary. Tier 1 additionally
uses the open `kiwi.<field>` family. Finding ids hash scene, source identity,
class, and field but intentionally exclude severity/delta so a logical finding
is stable across runs.

Add a closed class deliberately and test ranking/ledger behavior. Do not emit
ad-hoc synonyms for an existing discrepancy.

## Tolerances

`tolerances.ts` is the single source for geometry tolerance, severity scales,
noise floor, and ratchet epsilons. These values are calibration policy.

Never change a tolerance, pixel threshold, cluster floor, or baseline merely to
make a converter fix green. A tolerance change requires calibration evidence
and its own review.

## Report And Ranking

`buildReport` stamps schema metadata, assigns ids, and ranks classes by summed
severity. The exemplar comes from the scene with the fewest total findings,
with a stable id tie-break. Keep ledger eligibility out of raw ranking.

`assembleReport` uses the existing run manifest and per-tier artifacts.
`renderReportHtml` and `renderStepSummary` are projections of the same Report.

## Scoreboard

The committed `baseline/scoreboard.json` is a monotonic ratchet:

- findings may not increase;
- max geometry delta may not grow beyond its epsilon;
- Tier 2 diff ratio may not grow beyond its epsilon;
- adding/removing a scene requires an explicit baseline update.

`updateBaseline` preserves Tier 1/2 values when a Tier-0-only run did not
measure them. Use `cli check --update` and review the sorted JSON diff; never
edit the file to disguise a regression.

## Findings Ledger

Ledger frontmatter is machine-managed, stable-order metadata. The Markdown body
is human analysis, attempts, and verdict. Reconciliation:

- creates new report classes as `open`;
- refreshes recurring metrics without overwriting status/body;
- removes resolved non-parked classes;
- preserves human-parked entries;
- selects by report severity while skipping parked, attempting, or cooling
  classes.

Use `ledger-io.ts` for filesystem operations and `ledger.ts` for transitions.
Do not overwrite narrative bodies when updating metrics.

