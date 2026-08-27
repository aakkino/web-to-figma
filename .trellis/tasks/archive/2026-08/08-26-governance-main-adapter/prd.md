# Governance And Main Adapter

## Goal

Register the final integration paths and execute the adapter against pinned upstream main.

## Dependency

This is G1 in `(B1 || B2 || B3 || B4) -> I1 -> G1`. It starts only after I1 fixes the final runtime and test path set.

## Requirements

- List byte-equivalent final upstream files only under `absorbedUpstreamPaths`.
- Capability-own and fingerprint every locally adapted shared runtime path.
- Keep the 15-file runtime budget and all six fork capability removal conditions unchanged.
- Add a cross-platform upstream-main source/build/pack/consumer adapter and CI gate.

## Acceptance Criteria

- [ ] Governance unit/check, stable/main reports, and stable/main adapters pass.
- [ ] Ref drift, absorbed-content drift, and temporary cleanup remain executable failures/contracts.
