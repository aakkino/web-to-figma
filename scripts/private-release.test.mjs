import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  actionsRegistryEnvironment,
  anonymousRegistryEnvironment,
  assertPrivatePackageRecord,
  assertPublishResult,
  assertStagedArtifact,
  buildPublishResult,
  compareRegistryArtifact,
  githubPackageApiPath,
  githubPackageLeafName,
  inspectDownloadedRegistryArtifact,
  inspectGitHubTag,
  isExplicitAccessDenial,
  npmPublishArguments,
  ownerRegistryEnvironment,
  ownerVisibilityEnvironment,
  publishAndPersistResult,
  publishSerially,
  reconcileMetadata,
  resolveReleaseTarget,
  selectMetadataArtifacts,
} from "./private-release.mjs";

const artifact = {
  name: "@aakkino/fig-kiwi",
  version: "0.2.0",
  integrity: "sha512-reviewed",
  repository: "https://github.com/aakkino/web-to-figma",
  dependencies: { fflate: "^0.8.2" },
  peerDependencies: {},
  exports: { ".": "./dist/index.js" },
};

const matching = {
  metadata: {
    name: artifact.name,
    version: artifact.version,
    integrity: artifact.integrity,
  },
  tarballIntegrity: artifact.integrity,
  packageManifest: {
    name: artifact.name,
    version: artifact.version,
    repository: artifact.repository,
    dependencies: artifact.dependencies,
    peerDependencies: artifact.peerDependencies,
    exports: artifact.exports,
  },
};

function matchingRegistryArtifact(current) {
  return {
    metadata: {
      name: current.name,
      version: current.version,
      integrity: current.integrity,
    },
    tarballIntegrity: current.integrity,
    packageManifest: {
      name: current.name,
      version: current.version,
      repository: current.repository,
      dependencies: current.dependencies,
      peerDependencies: current.peerDependencies,
      exports: current.exports,
    },
  };
}
const registryConflict = /conflicts with registry state/u;
const unauthorizedAccess = /available without authorization/u;
const actionsAccess = /Manage Actions access/u;
const tagConflict = /already points/u;
const downloadedIntegrityMismatch = /does not match registry integrity/u;

test("classifies absent, matching, and mismatched registry state", () => {
  assert.equal(compareRegistryArtifact(artifact, null), "absent");
  assert.equal(compareRegistryArtifact(artifact, matching), "matching");
  assert.equal(
    compareRegistryArtifact(artifact, {
      ...matching,
      tarballIntegrity: "sha512-other",
    }),
    "mismatch"
  );
  assert.equal(
    compareRegistryArtifact(artifact, {
      ...matching,
      metadata: { ...matching.metadata, integrity: "sha512-other" },
    }),
    "mismatch"
  );
  assert.equal(
    compareRegistryArtifact(artifact, {
      ...matching,
      packageManifest: {
        ...matching.packageManifest,
        dependencies: { fflate: "^0.8.3" },
      },
    }),
    "mismatch"
  );
});

test("uses the downloaded manifest when GitHub npm view omits exports", () => {
  const githubRegistryVersion = {
    ...matching,
    metadata: {
      name: artifact.name,
      version: artifact.version,
      integrity: artifact.integrity,
      repository: { url: "git+https://github.com/aakkino/web-to-figma.git" },
      dependencies: artifact.dependencies,
    },
  };

  assert.equal("exports" in githubRegistryVersion.metadata, false);
  assert.equal("publishConfig" in githubRegistryVersion.metadata, false);
  assert.equal(
    compareRegistryArtifact(artifact, githubRegistryVersion),
    "matching"
  );
});

test("reads immutable metadata and integrity from a downloaded tarball", (t) => {
  const root = mkdtempSync(join(tmpdir(), "private-release-download-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const packageRoot = join(root, "package");
  mkdirSync(packageRoot);
  writeFileSync(
    join(packageRoot, "package.json"),
    JSON.stringify({
      name: artifact.name,
      version: artifact.version,
      repository: { url: `git+${artifact.repository}.git` },
      dependencies: artifact.dependencies,
      peerDependencies: artifact.peerDependencies,
      publishConfig: { exports: artifact.exports },
    })
  );
  const tarballPath = join(root, "package.tgz");
  execFileSync("tar", ["-czf", tarballPath, "package"], { cwd: root });
  const bytes = readFileSync(tarballPath);
  const integrity = `sha512-${createHash("sha512").update(bytes).digest("base64")}`;

  assert.deepEqual(
    inspectDownloadedRegistryArtifact({
      tarballPath,
      registryMetadata: {
        name: artifact.name,
        version: artifact.version,
        dist: { integrity },
      },
    }),
    {
      metadata: {
        name: artifact.name,
        version: artifact.version,
        integrity,
      },
      tarballIntegrity: integrity,
      packageManifest: {
        name: artifact.name,
        version: artifact.version,
        repository: artifact.repository,
        dependencies: artifact.dependencies,
        peerDependencies: artifact.peerDependencies,
        exports: artifact.exports,
      },
    }
  );
});

test("rejects downloaded bytes before parsing an untrusted tarball", (t) => {
  const root = mkdtempSync(join(tmpdir(), "private-release-corrupt-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const tarballPath = join(root, "package.tgz");
  writeFileSync(tarballPath, "not a tarball");

  assert.throws(
    () =>
      inspectDownloadedRegistryArtifact({
        tarballPath,
        registryMetadata: {
          name: artifact.name,
          version: artifact.version,
          dist: { integrity: "sha512-declared" },
        },
      }),
    downloadedIntegrityMismatch
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
  const boundary = registry([
    { ...matching, tarballIntegrity: "sha512-other" },
  ]);
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
    {
      ...matching,
      metadata: {
        ...matching.metadata,
        name: second.name,
        version: second.version,
      },
      tarballIntegrity: "sha512-other",
      packageManifest: {
        ...matching.packageManifest,
        name: second.name,
        version: second.version,
      },
    },
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

const sourceSha = "a".repeat(40);
const manifestArtifacts = [
  artifact,
  { ...artifact, name: "@aakkino/composed-dom", version: "0.1.1" },
  { ...artifact, name: "@aakkino/dom-to-figma", version: "0.4.0" },
];

function publishResult(states = ["matching", "matching", "absent"]) {
  return buildPublishResult(
    { sourceSha, artifacts: manifestArtifacts },
    manifestArtifacts.map(({ name, version, integrity }, index) => ({
      name,
      version,
      integrity,
      state: states[index],
    }))
  );
}

test("validates a source-bound complete publish result", () => {
  const manifest = { sourceSha, artifacts: manifestArtifacts };
  const result = publishResult();
  assert.equal(assertPublishResult({ manifest, result }), true);
  assert.throws(
    () =>
      assertPublishResult({
        manifest,
        result: { ...result, sourceSha: "b".repeat(40) },
      }),
    /source SHA does not match/u
  );
  assert.throws(
    () =>
      assertPublishResult({
        manifest,
        result: {
          ...result,
          artifacts: result.artifacts.slice(1),
        },
      }),
    /every manifest artifact/u
  );
  assert.throws(
    () =>
      assertPublishResult({
        manifest,
        result: {
          ...result,
          artifacts: result.artifacts.map((entry, index) =>
            index === 1 ? { ...entry, state: "unknown" } : entry
          ),
        },
      }),
    /invalid initial Registry state/u
  );
  assert.throws(
    () =>
      assertPublishResult({
        manifest,
        result: {
          ...result,
          artifacts: result.artifacts.map((entry, index) =>
            index === 1 ? { ...entry, integrity: "sha512-other" } : entry
          ),
        },
      }),
    /does not match manifest position/u
  );
  for (const artifacts of [
    [result.artifacts[1], result.artifacts[0], result.artifacts[2]],
    [result.artifacts[0], result.artifacts[0], result.artifacts[2]],
    [
      result.artifacts[0],
      { ...result.artifacts[1], name: "@aakkino/unknown" },
      result.artifacts[2],
    ],
    [result.artifacts[0], null, result.artifacts[2]],
  ]) {
    assert.throws(
      () =>
        assertPublishResult({
          manifest,
          result: { ...result, artifacts },
        }),
      /[Pp]ublish result artifact/u
    );
  }
  assert.throws(
    () =>
      assertPublishResult({
        manifest,
        result: { ...result, unexpected: true },
      }),
    /unexpected fields/u
  );
});

test("persists publish results only after every promotion succeeds", async () => {
  const manifest = { sourceSha, artifacts: manifestArtifacts };
  const states = manifestArtifacts.flatMap((current) => [
    null,
    matchingRegistryArtifact(current),
  ]);
  const boundary = registry(states);
  const persisted = [];
  const result = await publishAndPersistResult({
    manifest,
    registry: boundary,
    persistResult(value) {
      boundary.calls.push("persist-result");
      persisted.push(value);
    },
  });
  assert.deepEqual(
    result.artifacts.map(({ state }) => state),
    ["absent", "absent", "absent"]
  );
  assert.deepEqual(persisted, [result]);
  assert.deepEqual(boundary.calls.slice(-4), [
    "promote:@aakkino/fig-kiwi",
    "promote:@aakkino/composed-dom",
    "promote:@aakkino/dom-to-figma",
    "persist-result",
  ]);

  const failing = registry([
    matchingRegistryArtifact(manifestArtifacts[0]),
    {
      ...matchingRegistryArtifact(manifestArtifacts[1]),
      tarballIntegrity: "sha512-conflict",
    },
  ]);
  let wroteFailure = false;
  await assert.rejects(
    publishAndPersistResult({
      manifest,
      registry: failing,
      persistResult() {
        wroteFailure = true;
      },
    }),
    registryConflict
  );
  assert.equal(wroteFailure, false);
});

test("publish-result selection prevents the historical-tag failure", async () => {
  const calls = [];
  const manifest = { sourceSha, artifacts: manifestArtifacts };
  const historicalSha = "dd91f18346d7326ab71c1a77769bfe7aed310af3";
  const unfilteredCalls = [];
  await assert.rejects(
    reconcileMetadata({
      artifacts: manifestArtifacts,
      sourceSha,
      github: {
        inspectTag(tag) {
          unfilteredCalls.push(`inspect-tag:${tag}`);
          return tag.endsWith("dom-to-figma@0.4.0")
            ? null
            : { sha: historicalSha };
        },
        inspectRelease(tag) {
          unfilteredCalls.push(`inspect-release:${tag}`);
          return { tag, sha: historicalSha };
        },
      },
    }),
    tagConflict
  );
  assert.deepEqual(unfilteredCalls, ["inspect-tag:@aakkino/fig-kiwi@0.2.0"]);

  const selected = await selectMetadataArtifacts({
    manifest,
    result: publishResult(),
  });
  assert.deepEqual(selected, [manifestArtifacts[2]]);
  await reconcileMetadata({
    artifacts: selected,
    sourceSha,
    github: {
      inspectTag(tag) {
        calls.push(`inspect-tag:${tag}`);
        return tag.endsWith("dom-to-figma@0.4.0")
          ? null
          : { sha: historicalSha };
      },
      inspectRelease(tag) {
        calls.push(`inspect-release:${tag}`);
        return tag.endsWith("dom-to-figma@0.4.0")
          ? null
          : { tag, sha: historicalSha };
      },
      createTag(tag) {
        calls.push(`create-tag:${tag}`);
      },
      createRelease(tag) {
        calls.push(`create-release:${tag}`);
      },
    },
  });
  assert.deepEqual(calls, [
    "inspect-tag:@aakkino/dom-to-figma@0.4.0",
    "inspect-release:@aakkino/dom-to-figma@0.4.0",
    "create-tag:@aakkino/dom-to-figma@0.4.0",
    "create-release:@aakkino/dom-to-figma@0.4.0",
  ]);
});

test("an empty normal selection performs no metadata reads", async () => {
  const calls = [];
  const manifest = { sourceSha, artifacts: manifestArtifacts };
  const selected = await selectMetadataArtifacts({
    manifest,
    result: publishResult(["matching", "matching", "matching"]),
    github: {
      inspectTag(tag) {
        calls.push(tag);
      },
    },
  });
  await reconcileMetadata({
    artifacts: selected,
    sourceSha,
    github: {
      inspectTag(tag) {
        calls.push(tag);
      },
    },
  });
  assert.deepEqual(calls, []);
});

test("GitHub tag inspection treats only an exact-ref 404 as missing", () => {
  const tag = "@aakkino/dom-to-figma@0.4.0";
  const calls = [];
  const inspected = inspectGitHubTag(tag, (endpoint) => {
    calls.push(endpoint);
    return {
      status: 1,
      stdout: "",
      stderr: "gh: Not Found (HTTP 404)",
    };
  });
  assert.equal(inspected, null);
  assert.deepEqual(calls, [
    "repos/aakkino/web-to-figma/git/ref/tags/%40aakkino%2Fdom-to-figma%400.4.0",
  ]);
  assert.throws(
    () =>
      inspectGitHubTag(tag, () => ({
        status: 1,
        stdout: "",
        stderr: "gh: Conflict (HTTP 409)",
      })),
    /tag reference inspection failed.*HTTP 409/u
  );
});

test("GitHub tag inspection dereferences lightweight and annotated refs", () => {
  const tag = "@aakkino/dom-to-figma@0.4.0";
  for (const [type, referenceSha, commitSha] of [
    ["commit", "a".repeat(40), "a".repeat(40)],
    ["tag", "b".repeat(40), "c".repeat(40)],
  ]) {
    const calls = [];
    const inspected = inspectGitHubTag(tag, (endpoint) => {
      calls.push(endpoint);
      if (endpoint.includes("/git/ref/tags/")) {
        return {
          status: 0,
          stdout: JSON.stringify({
            ref: `refs/tags/${tag}`,
            object: { type, sha: referenceSha },
          }),
          stderr: "",
        };
      }
      return {
        status: 0,
        stdout: JSON.stringify({ sha: commitSha }),
        stderr: "",
      };
    });
    assert.deepEqual(inspected, { sha: commitSha });
    assert.deepEqual(calls, [
      "repos/aakkino/web-to-figma/git/ref/tags/%40aakkino%2Fdom-to-figma%400.4.0",
      "repos/aakkino/web-to-figma/commits/%40aakkino%2Fdom-to-figma%400.4.0",
    ]);
  }
});

test("GitHub tag inspection rejects malformed refs and commit failures", async () => {
  const tag = "@aakkino/dom-to-figma@0.4.0";
  const validReference = {
    status: 0,
    stdout: JSON.stringify({
      ref: `refs/tags/${tag}`,
      object: { type: "commit", sha: "a".repeat(40) },
    }),
    stderr: "",
  };
  for (const object of [
    { type: "commit", sha: "not-a-ref" },
    { type: "tree", sha: "a".repeat(40) },
  ]) {
    assert.throws(
      () =>
        inspectGitHubTag(tag, () => ({
          ...validReference,
          stdout: JSON.stringify({ ref: `refs/tags/${tag}`, object }),
        })),
      /invalid tag reference/u
    );
  }
  assert.throws(
    () =>
      inspectGitHubTag(tag, () => ({
        ...validReference,
        stdout: JSON.stringify({
          ref: "refs/tags/unowned@0.4.0",
          object: { type: "commit", sha: "a".repeat(40) },
        }),
      })),
    /invalid tag reference/u
  );
  assert.throws(
    () =>
      inspectGitHubTag(tag, (endpoint) =>
        endpoint.includes("/git/ref/tags/")
          ? validReference
          : {
              status: 0,
              stdout: JSON.stringify({ sha: "not-a-commit" }),
              stderr: "",
            }
      ),
    /Tag inspection returned an invalid commit SHA/u
  );
  assert.throws(
    () =>
      inspectGitHubTag(tag, (endpoint) =>
        endpoint.includes("/git/ref/tags/")
          ? validReference
          : {
              status: 1,
              stdout: "",
              stderr: "gh: No commit found (HTTP 422)",
            }
      ),
    /tag inspection failed.*HTTP 422/u
  );
  assert.throws(
    () =>
      inspectGitHubTag(tag, (endpoint) =>
        endpoint.includes("/git/ref/tags/")
          ? validReference
          : {
              status: 0,
              stdout: JSON.stringify({ sha: "b".repeat(40) }),
              stderr: "",
            }
      ),
    /changed during tag inspection/u
  );

  const downstreamCalls = [];
  await assert.rejects(
    reconcileMetadata({
      artifacts: [manifestArtifacts[2]],
      sourceSha,
      github: {
        inspectTag() {
          return inspectGitHubTag(tag, (endpoint) =>
            endpoint.includes("/git/ref/tags/")
              ? validReference
              : {
                  status: 1,
                  stdout: "",
                  stderr: "gh: No commit found (HTTP 422)",
                }
          );
        },
        inspectRelease() {
          downstreamCalls.push("inspect-release");
          return null;
        },
        createTag() {
          downstreamCalls.push("create-tag");
        },
        createRelease() {
          downstreamCalls.push("create-release");
        },
      },
    }),
    /tag inspection failed.*HTTP 422/u
  );
  assert.deepEqual(downstreamCalls, []);
});

function recoveryGitHub(overrides = {}) {
  const calls = [];
  const boundary = {
    calls,
    inspectTag(tag) {
      calls.push(`tag:${tag}`);
      return tag.endsWith("dom-to-figma@0.4.0")
        ? null
        : { sha: "1".repeat(40) };
    },
    inspectRelease(tag) {
      calls.push(`release:${tag}`);
      return tag.endsWith("dom-to-figma@0.4.0")
        ? null
        : { tag, sha: "1".repeat(40) };
    },
    listPackageTags(name) {
      calls.push(`history:${name}`);
      return [{ tag: `${name}@0.3.0`, sha: "2".repeat(40) }];
    },
    isAncestor() {
      calls.push("ancestor");
      return true;
    },
    ...overrides,
  };
  return boundary;
}

test("explicit recovery selects only matching untagged dom 0.4.0", async () => {
  const github = recoveryGitHub();
  const selected = await selectMetadataArtifacts({
    manifest: { sourceSha, artifacts: manifestArtifacts },
    result: publishResult(["matching", "matching", "matching"]),
    recoverMissingMetadata: true,
    github,
  });
  assert.deepEqual(selected, [manifestArtifacts[2]]);
  assert.deepEqual(
    github.calls.filter((call) => call.startsWith("history:")),
    ["history:@aakkino/dom-to-figma"]
  );
});

test("recovery rejects an internally conflicting Tag and Release pair", async () => {
  const github = recoveryGitHub({
    inspectTag(tag) {
      return tag.endsWith("dom-to-figma@0.4.0")
        ? { sha: sourceSha }
        : { sha: "1".repeat(40) };
    },
    inspectRelease(tag) {
      return tag.endsWith("dom-to-figma@0.4.0")
        ? { tag, sha: "b".repeat(40) }
        : { tag, sha: "1".repeat(40) };
    },
  });
  await assert.rejects(
    selectMetadataArtifacts({
      manifest: { sourceSha, artifacts: manifestArtifacts },
      result: publishResult(["matching", "matching", "matching"]),
      recoverMissingMetadata: true,
      github,
    }),
    /conflicting existing metadata/u
  );
  assert.equal(
    github.calls.some((call) => call.startsWith("history:")),
    false
  );
});

test("recovery rejects incomplete, regressed, malformed, and non-ancestor history", async (t) => {
  const manifest = { sourceSha, artifacts: manifestArtifacts };
  const result = publishResult(["matching", "matching", "matching"]);
  await t.test("incomplete exact metadata", async () => {
    const github = recoveryGitHub({
      inspectRelease(tag) {
        return tag.endsWith("dom-to-figma@0.4.0")
          ? { tag, sha: sourceSha }
          : { tag, sha: "1".repeat(40) };
      },
    });
    await assert.rejects(
      selectMetadataArtifacts({
        manifest,
        result,
        recoverMissingMetadata: true,
        github,
      }),
      /incomplete existing metadata/u
    );
  });
  for (const [name, tags, error] of [
    ["no predecessor", [], /no owned predecessor/u],
    [
      "version regression",
      [{ tag: "@aakkino/dom-to-figma@0.5.0", sha: "2".repeat(40) }],
      /does not increase/u,
    ],
    [
      "malformed predecessor",
      [{ tag: "@aakkino/dom-to-figma@latest", sha: "2".repeat(40) }],
      /valid semantic version/u,
    ],
    [
      "ambiguous predecessor",
      [
        {
          tag: "@aakkino/dom-to-figma@0.3.0+first",
          sha: "2".repeat(40),
        },
        {
          tag: "@aakkino/dom-to-figma@0.3.0+second",
          sha: "3".repeat(40),
        },
      ],
      /no unique predecessor/u,
    ],
  ]) {
    await t.test(name, async () => {
      const github = recoveryGitHub({ listPackageTags: () => tags });
      await assert.rejects(
        selectMetadataArtifacts({
          manifest,
          result,
          recoverMissingMetadata: true,
          github,
        }),
        error
      );
    });
  }
  await t.test("non-ancestor predecessor", async () => {
    const github = recoveryGitHub({ isAncestor: () => false });
    await assert.rejects(
      selectMetadataArtifacts({
        manifest,
        result,
        recoverMissingMetadata: true,
        github,
      }),
      /not an ancestor/u
    );
  });
  await t.test("malformed Tag inspection", async () => {
    const github = recoveryGitHub({
      inspectTag(tag) {
        return tag.endsWith("dom-to-figma@0.4.0")
          ? { sha: "main" }
          : { sha: "1".repeat(40) };
      },
    });
    await assert.rejects(
      selectMetadataArtifacts({
        manifest,
        result,
        recoverMissingMetadata: true,
        github,
      }),
      /invalid commit SHA/u
    );
  });
});

test("Release targets resolve target_commitish instead of tag_name", () => {
  const tag = "@aakkino/dom-to-figma@0.4.0";
  const targetCommitish = "recovery-source";
  let resolved;
  assert.deepEqual(
    resolveReleaseTarget(
      { tag_name: tag, target_commitish: targetCommitish },
      (value) => {
        resolved = value;
        return sourceSha;
      }
    ),
    { tag, sha: sourceSha }
  );
  assert.equal(resolved, targetCommitish);
  assert.throws(
    () =>
      resolveReleaseTarget(
        { tag_name: tag, target_commitish: targetCommitish },
        () => "main"
      ),
    /did not resolve to a commit SHA/u
  );
  assert.throws(
    () => resolveReleaseTarget({ tag_name: tag }, () => sourceSha),
    /invalid tag or target_commitish/u
  );
});

test("metadata preflight rejects a wrong Release target before writes", async () => {
  const created = [];
  await assert.rejects(
    reconcileMetadata({
      artifacts: [manifestArtifacts[0], manifestArtifacts[2]],
      sourceSha,
      github: {
        inspectTag() {
          return { sha: sourceSha };
        },
        inspectRelease(tag) {
          return tag.endsWith("dom-to-figma@0.4.0")
            ? { tag, sha: "b".repeat(40) }
            : { tag, sha: sourceSha };
        },
        createTag(tag) {
          created.push(tag);
        },
        createRelease(tag) {
          created.push(tag);
        },
      },
    }),
    /Release does not target/u
  );
  assert.deepEqual(created, []);
});

test("recovery rerun validates correct selected metadata without writes", async () => {
  const created = [];
  const github = recoveryGitHub({
    inspectTag(tag) {
      return tag.endsWith("dom-to-figma@0.4.0")
        ? { sha: sourceSha }
        : { sha: "1".repeat(40) };
    },
    inspectRelease(tag) {
      return tag.endsWith("dom-to-figma@0.4.0")
        ? { tag, sha: sourceSha }
        : { tag, sha: "1".repeat(40) };
    },
    createTag(tag) {
      created.push(tag);
    },
    createRelease(tag) {
      created.push(tag);
    },
  });
  const selected = await selectMetadataArtifacts({
    manifest: { sourceSha, artifacts: manifestArtifacts },
    result: publishResult(["matching", "matching", "matching"]),
    recoverMissingMetadata: true,
    github,
  });
  assert.deepEqual(selected, [manifestArtifacts[2]]);
  await reconcileMetadata({ artifacts: selected, sourceSha, github });
  assert.deepEqual(created, []);
});
