# Architecture

## Package Role

The harness is private measurement tooling. It consumes:

- `@aakkino/dom-to-figma` for conversion and `ConvertTrace`;
- `@aakkino/fig-kiwi` for clipboard decode and copy-back structural diff;
- Playwright for deterministic browser capture and live Figma;
- pixelmatch/pngjs for Tier 2.

The normative product design is `docs/visual-parity-pipeline.prd.md` and the
operator procedure is `docs/oracle-operations.md`. Source and tests remain the
authority for implemented behavior when the PRD status tracker describes older
milestones.

## Layering

Keep orchestration, I/O, and analysis separated:

~~~text
src/cli.ts
  -> run-dir / env / filesystem adapters
  -> snapshot or figma runner
  -> pure tier0 / tier1 / tier2 analysis
  -> report / scoreboard / ledger projections
~~~

- `cli.ts` parses commands and combines modules.
- `snapshot.ts` owns browser capture and per-scene artifact writes.
- `tier0.ts`, `tier1.ts`, and `tier2/*` are deterministic diff logic.
- `report*.ts` projects findings into machine and human output.
- `scoreboard.ts` implements the monotonic baseline check.
- `ledger.ts` implements cross-run class state; `ledger-io.ts` owns files.
- `figma/` owns all live Figma session and clipboard automation.

Do not hide filesystem or browser I/O inside a pure differ. Pure modules should
accept data and return typed results so unit tests need no browser, credentials,
or repository writes.

## Scene Sources

`scenes.ts` recursively discovers committed HTML under
`packages/dom-to-figma/scripts/oracle-scenes`, derives stable slash-separated
ids, reads optional size hints, and sorts by id. Scene ids connect source HTML,
run artifact stems, report findings, scoreboard entries, and ledger exemplars.
Renaming an id is therefore a data migration, not cosmetic cleanup.

## Determinism

`snapshot.ts` disables animation, transition, caret, and scrollbars; fixes DPR
to 1; waits for fonts, images, two animation frames; bundles the converter from
current source; and validates the clipboard payload before writing results.
Preserve these gates when extending captured ground truth.

