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
    confirmation: "DELETE_PUBLIC_FIG_KIWI_0.2.0_FF5410E6",
    sourceSha: "ff5410e61de4e9243d8f46967fb5de6199e5ee12",
    packageId: 14_684_516,
    versionId: 1_178_055_708,
    leafName: "fig-kiwi",
    name: "@aakkino/fig-kiwi",
    version: "0.2.0",
    repository: "aakkino/web-to-figma",
    integrity:
      "sha512-5oEQUbje4kv1eSKPVkeFHXs11wEK/ujPeKFWLS00wb/YzZR1Ow8SruI7nma5xpUXQkCFa4EZp1yuzcG+qUMEhQ==",
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
