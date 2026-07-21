# Testing Guidelines

## Default Unit Suite

`pnpm --filter @figit/oracle-harness test` runs Node Vitest tests and skips
gated browser/live cases by default.

Pure modules should cover:

- exact finding and severity output;
- affine geometry composition and missing/extra nodes;
- pixel downsample/diff/cluster/attribution;
- report schema, stable ids, ranking, HTML escaping;
- scoreboard regression/improvement and tier preservation;
- ledger parse/serialize/transitions and narrative preservation;
- environment/session classification;
- deterministic file ordering and newline-terminated serialization.

Filesystem tests use temporary directories and clean them in `afterAll`. Prefer
injectable base directories over writing repository artifacts.

## Browser-Gated Tests

`ORACLE_BROWSER=1` enables Chromium integration:

~~~sh
pnpm --filter @figit/oracle-harness test:browser
~~~

This covers snapshot artifacts/determinism and the real `tsx` subprocess path.
The subprocess test is important because esbuild `keepNames` can inject
`__name` wrappers that Vitest's transform does not.

## Live Figma Test

`FIGMA_ORACLE_LIVE=1` enables the credentialed paste canary only:

~~~sh
FIGMA_ORACLE_LIVE=1 pnpm --filter @figit/oracle-harness exec vitest run src/figma/paste.live.test.ts
~~~

Never report this test as run unless the gate was enabled and a real session
succeeded. Failure may mean expired credentials or Figma UI drift, not a
converter regression.

## Package Gates

~~~sh
pnpm --filter @figit/oracle-harness check-types
pnpm --filter @figit/oracle-harness test
pnpm oracle:parity
pnpm lint
~~~

The harness is private and needs no changeset. Published converter/codec changes
made to satisfy a finding follow their own package release rules.

