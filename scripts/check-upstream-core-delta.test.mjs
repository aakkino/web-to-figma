import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  computePatchFingerprint,
  runCoreDeltaCheck,
  validateRegistry,
} from "./check-upstream-core-delta.mjs";

const EXPECTED_ERROR_PATTERN = /expected/u;
const GLOB_ERROR_PATTERN = /glob syntax/u;

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function createFixture() {
  const cwd = mkdtempSync(join(tmpdir(), "upstream-core-delta-"));
  const sourceRoot = join(cwd, "packages", "dom-to-figma", "src");
  mkdirSync(sourceRoot, { recursive: true });
  writeFileSync(join(sourceRoot, "runtime.ts"), "export const value = 1;\n");
  git(cwd, "init", "--quiet");
  git(cwd, "config", "core.autocrlf", "false");
  git(cwd, "add", ".");
  git(
    cwd,
    "-c",
    "user.name=Test",
    "-c",
    "user.email=test@example.com",
    "commit",
    "--quiet",
    "-m",
    "baseline"
  );
  const baseline = git(cwd, "rev-parse", "HEAD");
  writeFileSync(join(sourceRoot, "runtime.ts"), "export const value = 2;\n");
  writeFileSync(
    join(sourceRoot, "runtime.test.ts"),
    "export const tested = true;\n"
  );

  const registry = {
    schemaVersion: 1,
    coreRoot: "packages/dom-to-figma/src",
    targets: {
      governance: { ref: baseline, commit: baseline },
      stable: {
        package: "@figit/dom-to-figma",
        version: "1.0.0",
        ref: baseline,
        commit: baseline,
      },
      upstreamMain: { ref: baseline, commit: baseline },
    },
    budget: {
      baselineSourceFiles: 2,
      baselineRuntimeFiles: 1,
      runtimeFileLimit: 1,
      runtimeMilestones: [1, 0],
    },
    sharedPaths: [],
    capabilities: [
      {
        id: "fixture-capability",
        capability: "Fixture capability",
        classification: "generic-temporary-patch",
        originCommits: [baseline],
        paths: ["packages/dom-to-figma/src/runtime.ts"],
        tests: ["packages/dom-to-figma/src/runtime.test.ts"],
        owner: "test-owner",
        reviewBy: "2099-01-01",
        upstreamState: "test-only",
        removeWhen: "fixture is retired",
        patchFingerprint: computePatchFingerprint(cwd, baseline, [
          "packages/dom-to-figma/src/runtime.ts",
        ]),
      },
    ],
  };
  const registryPath = join(cwd, "registry.json");
  writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
  return { baseline, cwd, registry, registryPath, sourceRoot };
}

test("accepts registered runtime changes and reports test-only changes", () => {
  const fixture = createFixture();
  const report = runCoreDeltaCheck({
    cwd: fixture.cwd,
    registryPath: fixture.registryPath,
  });
  assert.deepEqual(report.errors, []);
  assert.equal(report.summary.runtimeFiles, 1);
  assert.equal(report.summary.testFiles, 1);
  assert.equal(report.summary.unmappedTestFiles, 0);
  assert.deepEqual(report.capabilities[0].runtimePaths, [
    "packages/dom-to-figma/src/runtime.ts",
  ]);
  assert.deepEqual(report.capabilities[0].testPaths, [
    "packages/dom-to-figma/src/runtime.test.ts",
  ]);
});

test("rejects a new unregistered runtime file but not an unmapped test file", () => {
  const fixture = createFixture();
  writeFileSync(
    join(fixture.sourceRoot, "unauthorized.ts"),
    "export const nope = true;\n"
  );
  writeFileSync(
    join(fixture.sourceRoot, "extra.test.ts"),
    "export const extra = true;\n"
  );
  const report = runCoreDeltaCheck({
    cwd: fixture.cwd,
    registryPath: fixture.registryPath,
  });
  assert(
    report.errors.some((error) => error.includes("Unregistered runtime delta"))
  );
  assert.equal(report.summary.unmappedTestFiles, 1);
});

test("rejects a silently modified registered patch", () => {
  const fixture = createFixture();
  writeFileSync(
    join(fixture.sourceRoot, "runtime.ts"),
    "export const value = 3;\n"
  );
  const report = runCoreDeltaCheck({
    cwd: fixture.cwd,
    registryPath: fixture.registryPath,
  });
  assert(
    report.errors.some((error) => error.includes("Stale patch fingerprint"))
  );
});

test("rejects broad registry paths", () => {
  const fixture = createFixture();
  fixture.registry.capabilities[0].paths = [
    "packages/dom-to-figma/src/**/*.ts",
  ];
  assert.throws(() => validateRegistry(fixture.registry), GLOB_ERROR_PATTERN);
});

test("rejects a moving ref that no longer matches the reviewed commit", () => {
  const fixture = createFixture();
  fixture.registry.targets.upstreamMain.ref = "HEAD";
  const registryPath = join(fixture.cwd, "stale-registry.json");
  writeFileSync(registryPath, `${JSON.stringify(fixture.registry, null, 2)}\n`);
  git(fixture.cwd, "add", ".");
  git(
    fixture.cwd,
    "-c",
    "user.name=Test",
    "-c",
    "user.email=test@example.com",
    "commit",
    "--quiet",
    "-m",
    "move ref"
  );
  assert.throws(
    () =>
      runCoreDeltaCheck({
        cwd: fixture.cwd,
        registryPath,
        targetName: "upstreamMain",
      }),
    EXPECTED_ERROR_PATTERN
  );
});
