# Oracle Harness Guidelines

The Trellis `frontend` directory name is retained for package routing, but
`internal/oracle-harness` is a private Node CLI plus Playwright browser
automation. It measures browser-to-Figma parity and owns the regression
ratchet.

## Guides

| Guide | Focus |
| --- | --- |
| [Architecture](./architecture.md) | CLI orchestration, pure analysis, I/O boundaries |
| [CLI And Artifacts](./cli-and-artifacts.md) | Commands, exit codes, run directories, JSON contracts |
| [Parity And Ratchet](./parity-and-ratchet.md) | Tiers, findings, report, scoreboard, ledger |
| [Figma Automation](./figma-automation.md) | Sessions, clipboard automation, settlement, credentials |
| [Testing](./testing-guidelines.md) | Pure, browser-gated, subprocess, and live tests |

## Pre-Development Checklist

1. Read [Repository Conventions](../../guides/repository-conventions.md).
2. Read Architecture and CLI And Artifacts for every harness change.
3. Read Parity And Ratchet before changing findings, thresholds, reports,
   baselines, history, or known findings.
4. Read Figma Automation before touching `src/figma/`, credentials, clipboard,
   Playwright launch, or live capture.
5. Read `dom-to-figma` and `fig-kiwi` specs when changing their shared trace,
   clipboard, tree, or diff contracts.

