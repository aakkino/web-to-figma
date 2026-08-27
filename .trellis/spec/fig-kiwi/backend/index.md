# @aakkino/fig-kiwi Node Tooling Guidelines

This directory covers `packages/fig-kiwi/scripts`: schema extraction and the
human-assisted oracle capture/diff/distill tools. There is no database or
server logging layer in this package.

## Guides

| Guide | Focus |
| --- | --- |
| [Schema Tooling](./schema-tooling.md) | Clipboard input, binary schema extraction, generated JSON |
| [Oracle Tooling](./oracle-tooling.md) | Capture, diff, distill, filesystem safety |
| [Testing And Quality](./testing-and-quality.md) | Script checks and artifact review |

## Pre-Development Checklist

1. Read [Repository Conventions](../../guides/repository-conventions.md).
2. Read the runtime Codec Guidelines because scripts reuse the same wire format.
3. Read Schema Tooling before touching `extract-schema.ts`,
   `read-clipboard-html.ts`, or `src/schema.json`.
4. Read Oracle Tooling before changing files under `oracle/inbox`,
   `oracle/outbox`, or distilled fixtures.

