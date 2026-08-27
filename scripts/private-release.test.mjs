import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  actionsRegistryEnvironment,
  anonymousRegistryEnvironment,
  assertPrivatePackageRecord,
  assertStagedArtifact,
  compareRegistryArtifact,
  githubPackageApiPath,
  githubPackageLeafName,
  isExplicitAccessDenial,
  npmPublishArguments,
  ownerRegistryEnvironment,
  ownerVisibilityEnvironment,
  publishSerially,
  reconcileMetadata,
} from "./private-release.mjs";

const artifact = {
  name: "@aakkino/fig-kiwi",
  version: "0.2.0",
  integrity: "sha512-reviewed",
  repository: "https://github.com/aakkino/web-to-figma",
};

const matching = { ...artifact };
const registryConflict = /conflicts with registry state/u;
const unauthorizedAccess = /available without authorization/u;
const actionsAccess = /Manage Actions access/u;
const tagConflict = /already points/u;

test("classifies absent, matching, and mismatched registry state", () => {
  assert.equal(compareRegistryArtifact(artifact, null), "absent");
  assert.equal(compareRegistryArtifact(artifact, matching), "matching");
  assert.equal(
    compareRegistryArtifact(artifact, { ...matching, integrity: "other" }),
    "mismatch"
  );
  assert.equal(
    compareRegistryArtifact(
      { ...artifact, dependencies: { fflate: "^0.8.2" } },
      { ...matching, dependencies: { fflate: "^0.8.3" } }
    ),
    "mismatch"
  );
});

test("uses the unscoped leaf name for the GitHub npm package API", () => {
  assert.equal(
    githubPackageApiPath("@aakkino/fig-kiwi"),
    "/users/aakkino/packages/npm/fig-kiwi"
  );
  assert.equal(githubPackageLeafName("@aakkino/dom-to-figma"), "dom-to-figma");
  assert.throws(
    () => githubPackageApiPath("@figit/fig-kiwi"),
    /unowned package/u
  );
});

test("hard-fails public visibility because it cannot be patched private", () => {
  assert.throws(
    () =>
      assertPrivatePackageRecord(
        { name: "fig-kiwi", package_type: "npm", visibility: "public" },
        artifact
      ),
    /cannot be changed back to private/u
  );
  assert.equal(
    assertPrivatePackageRecord(
      { name: "fig-kiwi", package_type: "npm", visibility: "private" },
      artifact
    ),
    true
  );
});

test("accepts only explicit authentication and authorization denials", () => {
  assert.equal(
    isExplicitAccessDenial({ status: 1, stdout: "", stderr: "npm error E404" }),
    true
  );
  assert.equal(
    isExplicitAccessDenial({
      status: 1,
      stdout: "",
      stderr: "npm error ECONNRESET",
    }),
    false
  );
  assert.equal(
    isExplicitAccessDenial({ status: 0, stdout: "package", stderr: "" }),
    false
  );
});

test("publishes with explicit restricted access", () => {
  assert.deepEqual(
    npmPublishArguments({ tarballPath: "package.tgz" }, "migration").slice(2),
    [
      "--tag",
      "migration",
      "--access",
      "restricted",
      "--registry",
      "https://npm.pkg.github.com",
    ]
  );
});

test("isolates PAT, Actions, and anonymous credential environments", () => {
  const base = {
    NODE_AUTH_TOKEN: "pat",
    NPM_TOKEN: "npm-fallback",
    GH_TOKEN: "pat",
    GITHUB_TOKEN: "actions-default",
    ACTIONS_PACKAGE_TOKEN: "actions-read",
    PACKAGE_PUBLISH_TOKEN: "raw-secret",
    KEEP_ME: "yes",
  };
  assert.deepEqual(
    {
      ...ownerRegistryEnvironment(base),
      KEEP_ME: undefined,
    },
    {
      ...base,
      NODE_AUTH_TOKEN: "pat",
      NPM_TOKEN: undefined,
      GH_TOKEN: undefined,
      GITHUB_TOKEN: undefined,
      ACTIONS_PACKAGE_TOKEN: undefined,
      PACKAGE_PUBLISH_TOKEN: undefined,
      KEEP_ME: undefined,
    }
  );
  const visibility = ownerVisibilityEnvironment(base);
  assert.equal(visibility.GH_TOKEN, "pat");
  assert.equal(visibility.NODE_AUTH_TOKEN, undefined);
  assert.equal(visibility.ACTIONS_PACKAGE_TOKEN, undefined);

  const actions = actionsRegistryEnvironment(base);
  assert.equal(actions.NODE_AUTH_TOKEN, "actions-read");
  assert.equal(actions.GH_TOKEN, undefined);
  assert.equal(actions.ACTIONS_PACKAGE_TOKEN, undefined);

  const anonymous = anonymousRegistryEnvironment(base);
  for (const name of [
    "NODE_AUTH_TOKEN",
    "NPM_TOKEN",
    "GH_TOKEN",
    "GITHUB_TOKEN",
    "ACTIONS_PACKAGE_TOKEN",
    "PACKAGE_PUBLISH_TOKEN",
  ]) {
    assert.equal(anonymous[name], undefined);
  }
});

test("credential environments never fall back to another identity", () => {
  assert.throws(
    () => ownerRegistryEnvironment({ ACTIONS_PACKAGE_TOKEN: "actions" }),
    /PACKAGE_PUBLISH_TOKEN/u
  );
  assert.throws(
    () => ownerVisibilityEnvironment({ NODE_AUTH_TOKEN: "pat" }),
    /PACKAGE_PUBLISH_TOKEN/u
  );
  assert.throws(
    () => actionsRegistryEnvironment({ NODE_AUTH_TOKEN: "pat" }),
    /run-scoped GITHUB_TOKEN/u
  );
});

test("rejects staged tarballs whose bytes changed after preflight", (t) => {
  const root = mkdtempSync(join(tmpdir(), "private-release-bytes-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const expected = {
    name: "@aakkino/fig-kiwi",
    path: "packages/fig-kiwi",
  };
  mkdirSync(join(root, expected.path), { recursive: true });
  mkdirSync(join(root, ".artifacts/private-release"), { recursive: true });
  writeFileSync(
    join(root, expected.path, "package.json"),
    JSON.stringify({ version: "0.2.0" })
  );
  const tarballPath = ".artifacts/private-release/package.tgz";
  const original = Buffer.from("reviewed bytes");
  writeFileSync(join(root, tarballPath), original);
  const staged = {
    ...artifact,
    packagePath: expected.path,
    tarballPath,
    size: original.byteLength,
    sourceSha: "a".repeat(40),
    integrity: `sha512-${createHash("sha512").update(original).digest("base64")}`,
  };
  assert.doesNotThrow(() =>
    assertStagedArtifact({
      artifact: staged,
      expected,
      sourceSha: staged.sourceSha,
      root,
    })
  );
  writeFileSync(join(root, tarballPath), "tampered bytes");
  assert.throws(
    () =>
      assertStagedArtifact({
        artifact: staged,
        expected,
        sourceSha: staged.sourceSha,
        root,
      }),
    /bytes do not match manifest/u
  );
});

function registry(states, options = {}) {
  const calls = [];
  return {
    calls,
    inspect(current) {
      calls.push(`inspect:${current.name}`);
      return states.shift() ?? null;
    },
    publish(current) {
      calls.push(`publish:${current.name}`);
    },
    verifyPrivate() {
      calls.push("verify-private");
      return options.private !== false;
    },
    verifyActionsAccess() {
      calls.push("verify-actions-access");
      return options.actions !== false;
    },
    verifyAuthorized() {
      calls.push("verify-pat-access");
      return options.authorized !== false;
    },
    verifyUnauthorizedDenied() {
      calls.push("verify-anonymous-denial");
      return options.denied !== false;
    },
    smoke() {
      calls.push("smoke");
    },
    promote(current) {
      calls.push(`promote:${current.name}`);
    },
  };
}

test("publishes an absent version and verifies before promotion", async () => {
  const boundary = registry([null, matching]);
  await publishSerially({ artifacts: [artifact], registry: boundary });
  assert.deepEqual(boundary.calls, [
    "inspect:@aakkino/fig-kiwi",
    "publish:@aakkino/fig-kiwi",
    "inspect:@aakkino/fig-kiwi",
    "verify-private",
    "verify-actions-access",
    "verify-pat-access",
    "verify-anonymous-denial",
    "smoke",
    "promote:@aakkino/fig-kiwi",
  ]);
});

test("accepts an already matching version without publishing", async () => {
  const boundary = registry([matching]);
  const result = await publishSerially({
    artifacts: [artifact],
    registry: boundary,
  });
  assert.equal(result[0].state, "matching");
  assert.equal(boundary.calls.includes("publish:@aakkino/fig-kiwi"), false);
});

test("stops on mismatched bytes", async () => {
  const boundary = registry([{ ...matching, integrity: "sha512-other" }]);
  await assert.rejects(
    publishSerially({ artifacts: [artifact], registry: boundary }),
    registryConflict
  );
  assert.equal(boundary.calls.includes("smoke"), false);
});

test("partial success never promotes when a later package fails", async () => {
  const second = {
    ...artifact,
    name: "@aakkino/composed-dom",
    version: "0.1.1",
  };
  const boundary = registry([
    matching,
    { ...second, integrity: "sha512-other" },
  ]);
  await assert.rejects(
    publishSerially({ artifacts: [artifact, second], registry: boundary }),
    registryConflict
  );
  assert.equal(
    boundary.calls.some((call) => call.startsWith("promote:")),
    false
  );
});

test("fails when an unauthorized identity can read a package", async () => {
  const boundary = registry([matching], { denied: false });
  await assert.rejects(
    publishSerially({ artifacts: [artifact], registry: boundary }),
    unauthorizedAccess
  );
});

test("fails after privacy verification when the repository token lacks access", async () => {
  const boundary = registry([matching], { actions: false });
  await assert.rejects(
    publishSerially({ artifacts: [artifact], registry: boundary }),
    actionsAccess
  );
  assert.deepEqual(boundary.calls.slice(-2), [
    "verify-private",
    "verify-actions-access",
  ]);
  assert.equal(boundary.calls.includes("smoke"), false);
});

test("metadata reconciliation accepts correct tags and rejects conflicts", async () => {
  const created = [];
  const github = {
    inspectTag() {
      return null;
    },
    createTag(tag) {
      created.push(`tag:${tag}`);
    },
    inspectRelease() {
      return null;
    },
    createRelease(tag) {
      created.push(`release:${tag}`);
    },
  };
  const sourceSha = "a".repeat(40);
  await reconcileMetadata({ artifacts: [artifact], sourceSha, github });
  assert.deepEqual(created, [
    "tag:@aakkino/fig-kiwi@0.2.0",
    "release:@aakkino/fig-kiwi@0.2.0",
  ]);

  await assert.rejects(
    reconcileMetadata({
      artifacts: [artifact],
      sourceSha,
      github: {
        ...github,
        inspectTag() {
          return { sha: "b".repeat(40) };
        },
      },
    }),
    tagConflict
  );
});

test("metadata reconciliation checks every tag before creating any refs", async () => {
  const second = {
    ...artifact,
    name: "@aakkino/composed-dom",
    version: "0.1.1",
  };
  const created = [];
  const sourceSha = "a".repeat(40);
  await assert.rejects(
    reconcileMetadata({
      artifacts: [artifact, second],
      sourceSha,
      github: {
        inspectTag(tag) {
          return tag.includes("composed-dom") ? { sha: "b".repeat(40) } : null;
        },
        createTag(tag) {
          created.push(tag);
        },
        inspectRelease() {
          return null;
        },
        createRelease(tag) {
          created.push(tag);
        },
      },
    }),
    tagConflict
  );
  assert.deepEqual(created, []);
});
