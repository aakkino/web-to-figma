# Effects Evolution Implementation

1. Adopt exact upstream parser semantics where byte-equivalent.
2. Integrate effects behind current composed-leaf and stroke rules.
3. Run blur, shadow, filter, and Shadow DOM tests before I1.

Dependency: B3 is independent; I1 depends on B1, B2, B3, and B4; G1 depends on I1.
