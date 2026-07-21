# CLI And Artifacts

## Testable Command Boundary

`run(argv)` in `src/cli.ts` returns:

~~~ts
type CliResult = { code: number; out: string; err: string };
~~~

Subcommands use Node `parseArgs` and return output instead of directly exiting.
Only the main-process wrapper writes streams and sets the process exit. Keep new
commands in this shape so `cli.test.ts` can exercise dispatch without spawning.

Use `EXIT` from `exit-codes.ts` for workflow-significant failures:
`SESSION_EXPIRED`, `PASTE_FAILED`, `EXPORT_FAILED`, and `REGRESSION`. Do not
collapse these into a generic exit when the local loop needs to distinguish
credentials from product regression.

## Run Directory Contract

`createRunDir(runId)` creates:

~~~text
oracle/runs/<runId>/
  ground-truth/
  payloads/
  figma/
  diff/
  run.json
  report.json
  report.html
~~~

The tree is gitignored and disposable. Tests pass a temporary base root where
the API supports it. Committed baseline and ledger data must stay outside
`oracle/`.

Scene ids containing `/` use `__` only for artifact filenames; reports and
scoreboards retain the canonical slash id.

## Serialization

- JSON artifacts are pretty-printed with a final newline.
- `run.json` is the manifest that report assembly reads; do not rediscover the
  corpus when assembling an existing run.
- Tier artifacts are optional by file presence. Report assembly includes a tier
  only when that scene's artifact exists.
- `assertReport` validates schema version and required external fields before a
  loaded report reaches scoreboard/ledger commands.
- `report.html` is self-contained, escapes untrusted strings, and uses no
  external assets.
- History is one compact NDJSON record per run, not a database.

When a contract changes, bump/handle its schema version and add a compatibility
or rejection test. Do not silently reinterpret old committed artifacts.

## Configuration

`loadEnv` overlays repository-root `.env` only for keys absent from the real
environment; process environment wins. Session resolution is pure and returns a
discriminated success/error result.

Never print `FIGMA_TOKEN`, inline/base64 storage state, cookies, or raw session
JSON. `FIGMA_STORAGE_STATE` is a credential even when it is a path.

