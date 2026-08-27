import assert from "node:assert/strict";
import test from "node:test";
import {
  recoverPublicFigKiwi,
  recoveryTarget,
} from "./recover-public-fig-kiwi.mjs";

function validBoundary(overrides = {}) {
  const calls = [];
  return {
    calls,
    inspectPackage() {
      return {
        id: recoveryTarget.packageId,
        name: recoveryTarget.leafName,
        package_type: "npm",
        visibility: "public",
        repository: { full_name: recoveryTarget.repository },
        ...overrides.packageRecord,
      };
    },
    listVersions() {
      return (
        overrides.versions ?? [
          { id: recoveryTarget.versionId, name: recoveryTarget.version },
        ]
      );
    },
    inspectRegistryVersion() {
      return {
        name: recoveryTarget.name,
        version: recoveryTarget.version,
        dist: { integrity: recoveryTarget.integrity },
        repository: `git+https://github.com/${recoveryTarget.repository}.git`,
        ...overrides.registryVersion,
      };
    },
    deletePackage() {
      calls.push(recoveryTarget.deletePath);
    },
    inspectDeletedPackage() {
      return overrides.deletedPackage ?? null;
    },
  };
}

test("pins every incident coordinate and destructive endpoint", () => {
  assert.deepEqual(recoveryTarget, {
    confirmation: "DELETE_PUBLIC_FIG_KIWI_0.2.0",
    sourceSha: "7b5bc37d8b79d6afa26e17f7f10fb19be3d02b45",
    packageId: 14_681_422,
    versionId: 1_177_442_350,
    leafName: "fig-kiwi",
    name: "@aakkino/fig-kiwi",
    version: "0.2.0",
    repository: "aakkino/web-to-figma",
    integrity:
      "sha512-rkliZpAkJyWtVB0QYhmwcglrOijRPecC9nndIjjDAnFKiZJ80jK7qhpyR/FzdA2+XCMeERE7Sp33IPsJbcE4Zg==",
    packagePath: "/users/aakkino/packages/npm/fig-kiwi",
    deletePath: "/users/aakkino/packages/npm/fig-kiwi",
  });
});

function recover(boundary, overrides = {}) {
  return recoverPublicFigKiwi({
    confirmation: overrides.confirmation ?? recoveryTarget.confirmation,
    sourceSha: overrides.sourceSha ?? recoveryTarget.sourceSha,
    boundary,
  });
}

test("deletes only the exact public fig-kiwi incident package", async () => {
  const boundary = validBoundary();
  await recover(boundary);
  assert.deepEqual(boundary.calls, [recoveryTarget.deletePath]);
});

test("requires the fixed confirmation and incident source SHA", async () => {
  const boundary = validBoundary();
  await assert.rejects(
    recover(boundary, { confirmation: "DELETE" }),
    /RECOVERY_CONFIRM/u
  );
  await assert.rejects(
    recover(boundary, { sourceSha: "a".repeat(40) }),
    /source SHA/u
  );
  assert.deepEqual(boundary.calls, []);
});

test("refuses private, unrelated, or multi-version package state", async () => {
  await assert.rejects(
    recover(validBoundary({ packageRecord: { visibility: "private" } })),
    /package state/u
  );
  await assert.rejects(
    recover(
      validBoundary({
        versions: [
          { id: recoveryTarget.versionId, name: recoveryTarget.version },
          { id: 2, name: "0.2.1" },
        ],
      })
    ),
    /single incident version/u
  );
});

test("refuses changed integrity or conflicting source metadata", async () => {
  await assert.rejects(
    recover(
      validBoundary({
        registryVersion: { dist: { integrity: "sha512-other" } },
      })
    ),
    /incident evidence/u
  );
  await assert.rejects(
    recover(validBoundary({ registryVersion: { gitHead: "a".repeat(40) } })),
    /gitHead/u
  );
});

test("requires an explicit post-delete 404", async () => {
  const boundary = validBoundary({
    deletedPackage: { id: recoveryTarget.packageId },
  });
  await assert.rejects(recover(boundary), /still exists/u);
  assert.deepEqual(boundary.calls, [recoveryTarget.deletePath]);
});
