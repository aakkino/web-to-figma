import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  assertStagedArtifact,
  compareRegistryArtifact,
  githubPackageApiPath,
  isExplicitAccessDenial,
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

test("encodes the complete scoped npm name for the GitHub package API", () => {
  assert.equal(
    githubPackageApiPath("@aakkino/fig-kiwi"),
    "/user/packages/npm/%40aakkino%2Ffig-kiwi"
  );
  assert.throws(
    () => githubPackageApiPath("@figit/fig-kiwi"),
    /unowned package/u
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
      return options.private !== false;
    },
    verifyAuthorized() {
      return options.authorized !== false;
    },
    verifyUnauthorizedDenied() {
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
