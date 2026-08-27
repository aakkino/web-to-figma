# Testing And Quality

The script directory is included by `packages/fig-kiwi/tsconfig.json`, so
`check-types` is the primary static gate. Runtime modules used by scripts are
covered by the package's Vitest suite.

Before handing off a tooling change:

~~~sh
pnpm --filter @aakkino/fig-kiwi check-types
pnpm --filter @aakkino/fig-kiwi test
pnpm --filter @aakkino/fig-kiwi build
~~~

For an oracle workflow change, use a disposable or already-authorized capture
batch and inspect:

- raw HTML preservation on decode failure;
- deterministic scene ordering;
- non-zero exit status on mismatches;
- path containment for user-provided capture names;
- stable, newline-terminated JSON output.

Do not regenerate `schema.json` or distilled oracle fixtures as a side effect of
an unrelated test. Those writes are deliberate review artifacts.

