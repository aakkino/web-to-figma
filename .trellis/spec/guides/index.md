# Project Development Guides

These guides hold repository-wide rules and cross-package thinking checks. Read
the package/layer index for the files being changed as well as this index.

## Required

| Guide | Use |
| --- | --- |
| [Repository Conventions](./repository-conventions.md) | Read before every code or configuration change |

## Conditional Thinking Guides

| Guide | Read when |
| --- | --- |
| [Code Reuse Thinking Guide](./code-reuse-thinking-guide.md) | Adding a helper, constant, config value, or a pattern already present elsewhere |
| [Cross-Layer Thinking Guide](./cross-layer-thinking-guide.md) | Changing a payload, event, artifact, package export, or flow with multiple consumers |

## Pre-Development Checklist

1. Identify every affected workspace package and its runtime environment.
2. Read each affected package/layer `index.md` and the guides it selects.
3. Search for the symbol, string, config value, and consumer paths before editing.
4. Decide which verification tier is required: pure unit, browser, package build,
   workspace check, or the parity ratchet.

