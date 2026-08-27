import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_REGISTRY = "docs/upstream-core-delta.json";
const GLOB_PATTERN = /[?*[\]]/u;
const FINGERPRINT_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const LINE_BREAK_PATTERN = /\r?\n/u;
const NUMSTAT_COLUMN_LIMIT = 3;
const TEST_PATH_PATTERN =
  /(?:^|\/)(?:__fixtures__|__snapshots__)(?:\/|$)|\.(?:browser\.)?(?:test|spec)\.[^/]+$/u;
const COMMIT_PATTERN = /^[0-9a-f]{40}$/u;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

const scriptPath = fileURLToPath(import.meta.url);
const repositoryRoot = resolve(dirname(scriptPath), "..");

function runCommand(command, args, cwd) {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function runGit(args, cwd) {
  return runCommand("git", args, cwd);
}

function invariant(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value, field) {
  invariant(
    typeof value === "string" && value.length > 0,
    `${field} must be a non-empty string`
  );
  return value;
}

function requireStringArray(value, field) {
  invariant(
    Array.isArray(value) && value.length > 0,
    `${field} must be a non-empty array`
  );
  for (const item of value) {
    requireString(item, `${field}[]`);
  }
  return value;
}

function normalizePath(value) {
  return value.replaceAll("\\", "/");
}

export function classifySourcePath(filePath) {
  return TEST_PATH_PATTERN.test(normalizePath(filePath)) ? "test" : "runtime";
}

function validateTarget(target, field, { requirePackage = false } = {}) {
  invariant(isRecord(target), `${field} must be an object`);
  requireString(target.ref, `${field}.ref`);
  invariant(
    COMMIT_PATTERN.test(target.commit),
    `${field}.commit must be a full lowercase commit SHA`
  );
  if (requirePackage) {
    requireString(target.package, `${field}.package`);
    requireString(target.version, `${field}.version`);
  }
}

function validateAbsorbedUpstreamPaths(registry) {
  const paths = registry.absorbedUpstreamPaths ?? [];
  invariant(Array.isArray(paths), "absorbedUpstreamPaths must be an array");
  const pathSet = new Set();
  for (const rawPath of paths) {
    const filePath = requireString(rawPath, "absorbedUpstreamPaths[]");
    invariant(
      filePath === normalizePath(filePath) &&
        filePath.startsWith(`${registry.coreRoot}/`) &&
        !GLOB_PATTERN.test(filePath) &&
        classifySourcePath(filePath) === "runtime",
      `absorbedUpstreamPaths must contain exact runtime paths: ${filePath}`
    );
    invariant(
      !pathSet.has(filePath),
      `duplicate absorbedUpstreamPaths entry: ${filePath}`
    );
    pathSet.add(filePath);
  }
  return pathSet;
}

export function validateRegistry(
  registry,
  { allowPendingFingerprints = false } = {}
) {
  invariant(isRecord(registry), "registry must be an object");
  invariant(registry.schemaVersion === 1, "schemaVersion must be 1");
  requireString(registry.coreRoot, "coreRoot");
  invariant(
    !GLOB_PATTERN.test(registry.coreRoot),
    "coreRoot must not contain glob syntax"
  );
  invariant(isRecord(registry.targets), "targets must be an object");
  validateTarget(registry.targets.governance, "targets.governance");
  validateTarget(registry.targets.stable, "targets.stable", {
    requirePackage: true,
  });
  validateTarget(registry.targets.upstreamMain, "targets.upstreamMain");
  invariant(isRecord(registry.budget), "budget must be an object");
  invariant(
    Number.isInteger(registry.budget.runtimeFileLimit) &&
      registry.budget.runtimeFileLimit >= 0,
    "budget.runtimeFileLimit must be a non-negative integer"
  );
  invariant(
    Array.isArray(registry.budget.runtimeMilestones) &&
      registry.budget.runtimeMilestones.every(
        (value) => Number.isInteger(value) && value >= 0
      ),
    "budget.runtimeMilestones must contain non-negative integers"
  );
  invariant(
    Array.isArray(registry.capabilities) && registry.capabilities.length > 0,
    "capabilities must be non-empty"
  );
  invariant(
    Array.isArray(registry.sharedPaths),
    "sharedPaths must be an array"
  );
  const absorbedPathSet = validateAbsorbedUpstreamPaths(registry);

  const ids = new Set();
  const pathOwners = new Map();
  for (const entry of registry.capabilities) {
    invariant(isRecord(entry), "each capability must be an object");
    const id = requireString(entry.id, "capabilities[].id");
    invariant(!ids.has(id), `duplicate capability id: ${id}`);
    ids.add(id);
    requireString(entry.capability, `${id}.capability`);
    requireString(entry.classification, `${id}.classification`);
    const originCommits = requireStringArray(
      entry.originCommits,
      `${id}.originCommits`
    );
    requireStringArray(entry.paths, `${id}.paths`);
    const tests = requireStringArray(entry.tests, `${id}.tests`);
    requireString(entry.owner, `${id}.owner`);
    invariant(
      DATE_PATTERN.test(entry.reviewBy),
      `${id}.reviewBy must use YYYY-MM-DD`
    );
    requireString(entry.upstreamState, `${id}.upstreamState`);
    requireString(entry.removeWhen, `${id}.removeWhen`);
    requireString(entry.patchFingerprint, `${id}.patchFingerprint`);
    invariant(
      allowPendingFingerprints
        ? entry.patchFingerprint === "sha256:pending" ||
            FINGERPRINT_PATTERN.test(entry.patchFingerprint)
        : FINGERPRINT_PATTERN.test(entry.patchFingerprint),
      `${id}.patchFingerprint must be a sha256 fingerprint`
    );

    for (const commit of originCommits) {
      invariant(
        COMMIT_PATTERN.test(commit),
        `${id}.originCommits must contain full lowercase commit SHAs`
      );
    }
    for (const rawTestPath of tests) {
      const testPath = normalizePath(rawTestPath);
      invariant(
        testPath === rawTestPath &&
          testPath.startsWith(`${registry.coreRoot}/`) &&
          !GLOB_PATTERN.test(testPath) &&
          classifySourcePath(testPath) === "test",
        `${id}.tests must contain exact test, fixture, or snapshot paths: ${rawTestPath}`
      );
    }

    const entryPaths = new Set();
    for (const rawPath of entry.paths) {
      const filePath = normalizePath(rawPath);
      invariant(
        filePath === rawPath,
        `${id}.paths must use forward slashes: ${rawPath}`
      );
      invariant(
        filePath.startsWith(`${registry.coreRoot}/`),
        `${id}.path is outside coreRoot: ${filePath}`
      );
      invariant(
        !GLOB_PATTERN.test(filePath),
        `${id}.path must not contain glob syntax: ${filePath}`
      );
      invariant(
        classifySourcePath(filePath) === "runtime",
        `${id}.path must be runtime source: ${filePath}`
      );
      invariant(
        !entryPaths.has(filePath),
        `${id}.paths contains a duplicate: ${filePath}`
      );
      entryPaths.add(filePath);
      const owners = pathOwners.get(filePath) ?? [];
      owners.push(id);
      pathOwners.set(filePath, owners);
    }
  }

  const declaredSharedPaths = new Set();
  for (const shared of registry.sharedPaths) {
    invariant(isRecord(shared), "each sharedPaths entry must be an object");
    const sharedPath = requireString(shared.path, "sharedPaths[].path");
    const entries = requireStringArray(
      shared.capabilities,
      `${sharedPath}.capabilities`
    );
    invariant(
      !declaredSharedPaths.has(sharedPath),
      `duplicate sharedPaths entry: ${sharedPath}`
    );
    declaredSharedPaths.add(sharedPath);
    const owners = pathOwners.get(sharedPath) ?? [];
    invariant(
      owners.length > 1,
      `shared path is not owned by multiple capabilities: ${sharedPath}`
    );
    invariant(
      [...owners].sort().join("\n") === [...entries].sort().join("\n"),
      `shared path owners do not match declaration: ${sharedPath}`
    );
  }

  for (const [filePath, owners] of pathOwners) {
    invariant(
      owners.length === 1 || declaredSharedPaths.has(filePath),
      `overlapping path is not declared: ${filePath}`
    );
    invariant(
      !absorbedPathSet.has(filePath),
      `absorbed upstream path cannot also be capability-owned: ${filePath}`
    );
  }

  return registry;
}

function resolveCommit(ref, cwd) {
  const commit = runGit(["rev-parse", "--verify", `${ref}^{commit}`], cwd);
  invariant(
    COMMIT_PATTERN.test(commit),
    `could not resolve ${ref} to a commit`
  );
  return commit;
}

function listChangedPaths(baselineCommit, coreRoot, cwd) {
  const tracked = runGit(
    [
      "diff",
      "--no-ext-diff",
      "--no-renames",
      "--name-only",
      baselineCommit,
      "--",
      coreRoot,
    ],
    cwd
  )
    .split(LINE_BREAK_PATTERN)
    .filter(Boolean)
    .map(normalizePath);
  const untracked = runGit(
    ["ls-files", "--others", "--exclude-standard", "--", coreRoot],
    cwd
  )
    .split(LINE_BREAK_PATTERN)
    .filter(Boolean)
    .map(normalizePath);
  return [...new Set([...tracked, ...untracked])].sort();
}

function readDiffStats(baselineCommit, coreRoot, cwd) {
  const output = runGit(
    [
      "diff",
      "--no-ext-diff",
      "--no-renames",
      "--numstat",
      baselineCommit,
      "--",
      coreRoot,
    ],
    cwd
  );
  let insertions = 0;
  let deletions = 0;
  for (const line of output.split(LINE_BREAK_PATTERN).filter(Boolean)) {
    const [added, removed] = line.split("\t", NUMSTAT_COLUMN_LIMIT);
    if (added !== "-") {
      insertions += Number.parseInt(added, 10);
    }
    if (removed !== "-") {
      deletions += Number.parseInt(removed, 10);
    }
  }
  return { insertions, deletions };
}

export function computePatchFingerprint(cwd, baselineCommit, paths) {
  const normalizedPaths = [...paths].map(normalizePath).sort();
  const diff = runGit(
    [
      "diff",
      "--no-ext-diff",
      "--no-color",
      "--no-renames",
      "--full-index",
      "--binary",
      baselineCommit,
      "--",
      ...normalizedPaths,
    ],
    cwd
  ).replaceAll("\r\n", "\n");
  return `sha256:${createHash("sha256").update(diff).digest("hex")}`;
}

function buildPathRecords(paths, registry, { markAbsorbed = false } = {}) {
  const absorbedUpstreamPaths = new Set(
    markAbsorbed ? (registry.absorbedUpstreamPaths ?? []) : []
  );
  return paths.map((filePath) => ({
    path: filePath,
    category: classifySourcePath(filePath),
    upstreamOwned: absorbedUpstreamPaths.has(filePath),
    capabilities: registry.capabilities
      .filter((entry) =>
        classifySourcePath(filePath) === "runtime"
          ? entry.paths.includes(filePath)
          : entry.tests.includes(filePath)
      )
      .map((entry) => entry.id),
  }));
}

function verifyAbsorbedUpstreamPaths(registry, cwd) {
  const errors = [];
  for (const filePath of registry.absorbedUpstreamPaths ?? []) {
    const current = readFileSync(resolve(cwd, filePath), "utf8").replaceAll(
      "\r\n",
      "\n"
    );
    const upstream = execFileSync(
      "git",
      ["show", `${registry.targets.upstreamMain.commit}:${filePath}`],
      { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    ).replaceAll("\r\n", "\n");
    const currentHash = createHash("sha256").update(current).digest("hex");
    const upstreamHash = createHash("sha256").update(upstream).digest("hex");
    if (currentHash !== upstreamHash) {
      errors.push(
        `Absorbed upstream path drifted from ${registry.targets.upstreamMain.commit}: ${filePath}`
      );
    }
  }
  return errors;
}

function evaluateGovernance(registry, records, fingerprints, today, cwd) {
  const errors = verifyAbsorbedUpstreamPaths(registry, cwd);
  const runtimeRecords = records.filter(
    (record) => record.category === "runtime" && !record.upstreamOwned
  );
  const changedRuntime = new Set(runtimeRecords.map((record) => record.path));

  for (const record of runtimeRecords) {
    if (record.capabilities.length === 0) {
      errors.push(`Unregistered runtime delta: ${record.path}`);
    }
  }
  for (const entry of registry.capabilities) {
    for (const filePath of entry.paths) {
      if (!changedRuntime.has(filePath)) {
        errors.push(
          `Registered path is no longer a runtime delta: ${entry.id} -> ${filePath}`
        );
      }
    }
    if (entry.reviewBy < today) {
      errors.push(`Expired capability review: ${entry.id} (${entry.reviewBy})`);
    }
    const actual = fingerprints.get(entry.id);
    if (entry.patchFingerprint !== actual) {
      errors.push(
        `Stale patch fingerprint: ${entry.id}; run pnpm upstream-core-delta:update after review`
      );
    }
  }
  if (runtimeRecords.length > registry.budget.runtimeFileLimit) {
    errors.push(
      `Runtime delta budget exceeded: ${runtimeRecords.length} > ${registry.budget.runtimeFileLimit}; do not remove behavior to satisfy the budget`
    );
  }
  return errors;
}

function verifyLatestStable(stableTarget, cwd) {
  const registryProbe = [
    "const name = process.argv[1];",
    "const response = await fetch('https://registry.npmjs.org/' + encodeURIComponent(name));",
    "if (!response.ok) throw new Error('npm registry returned ' + response.status);",
    "const metadata = await response.json();",
    "process.stdout.write(JSON.stringify(metadata['dist-tags']?.latest));",
  ].join("\n");
  const latestVersion = JSON.parse(
    runCommand(
      process.execPath,
      ["--input-type=module", "--eval", registryProbe, stableTarget.package],
      cwd
    )
  );
  invariant(
    latestVersion === stableTarget.version,
    `latest ${stableTarget.package} is ${latestVersion}, but registry pins ${stableTarget.version}`
  );
  return latestVersion;
}

export function runCoreDeltaCheck({
  cwd = repositoryRoot,
  registryPath = DEFAULT_REGISTRY,
  targetName = "governance",
  reportPath,
  today = new Date().toISOString().slice(0, 10),
  updateFingerprints = false,
  verifyLatest = false,
} = {}) {
  const absoluteRegistryPath = isAbsolute(registryPath)
    ? registryPath
    : resolve(cwd, registryPath);
  const registryText = readFileSync(absoluteRegistryPath, "utf8");
  const registry = validateRegistry(JSON.parse(registryText), {
    allowPendingFingerprints: updateFingerprints,
  });
  const target = registry.targets[targetName];
  invariant(target, `unknown target: ${targetName}`);
  invariant(
    !updateFingerprints || targetName === "governance",
    "fingerprints can only be updated for governance"
  );
  invariant(
    !verifyLatest || targetName === "stable",
    "--verify-latest requires --target stable"
  );

  const resolvedBaseline = resolveCommit(target.ref, cwd);
  invariant(
    resolvedBaseline === target.commit,
    `${target.ref} resolved to ${resolvedBaseline}, expected ${target.commit}; update the reviewed target explicitly`
  );
  const records = buildPathRecords(
    listChangedPaths(resolvedBaseline, registry.coreRoot, cwd),
    registry,
    { markAbsorbed: targetName === "governance" }
  );
  const stats = readDiffStats(resolvedBaseline, registry.coreRoot, cwd);
  const fingerprints = new Map(
    registry.capabilities.map((entry) => [
      entry.id,
      computePatchFingerprint(cwd, resolvedBaseline, entry.paths),
    ])
  );

  if (updateFingerprints) {
    let updatedRegistryText = registryText;
    for (const entry of registry.capabilities) {
      const nextFingerprint = fingerprints.get(entry.id);
      const previousField = `"patchFingerprint": "${entry.patchFingerprint}"`;
      const nextField = `"patchFingerprint": "${nextFingerprint}"`;
      invariant(
        updatedRegistryText.includes(previousField),
        `could not locate fingerprint field for ${entry.id}`
      );
      updatedRegistryText = updatedRegistryText.replace(
        previousField,
        nextField
      );
      entry.patchFingerprint = nextFingerprint;
    }
    writeFileSync(absoluteRegistryPath, updatedRegistryText);
  }

  const latestVersion = verifyLatest
    ? verifyLatestStable(target, cwd)
    : undefined;
  const errors =
    targetName === "governance"
      ? evaluateGovernance(registry, records, fingerprints, today, cwd)
      : [];
  const runtimeRecords = records.filter(
    (record) => record.category === "runtime"
  );
  const governedRuntimeRecords = runtimeRecords.filter(
    (record) => !record.upstreamOwned
  );
  const testRecords = records.filter((record) => record.category === "test");
  const capabilities = registry.capabilities.map((entry) => ({
    id: entry.id,
    capability: entry.capability,
    classification: entry.classification,
    owner: entry.owner,
    reviewBy: entry.reviewBy,
    upstreamState: entry.upstreamState,
    runtimePaths: runtimeRecords
      .filter((record) => record.capabilities.includes(entry.id))
      .map((record) => record.path),
    testPaths: testRecords
      .filter((record) => record.capabilities.includes(entry.id))
      .map((record) => record.path),
  }));
  const report = {
    target: targetName,
    resolved: {
      ref: target.ref,
      commit: resolvedBaseline,
      head: resolveCommit("HEAD", cwd),
      ...(target.package
        ? { package: target.package, version: target.version, latestVersion }
        : {}),
    },
    summary: {
      sourceFiles: records.length,
      runtimeFiles: runtimeRecords.length,
      governedRuntimeFiles: governedRuntimeRecords.length,
      absorbedUpstreamRuntimeFiles:
        runtimeRecords.length - governedRuntimeRecords.length,
      testFiles: testRecords.length,
      insertions: stats.insertions,
      deletions: stats.deletions,
      capabilityCount: registry.capabilities.length,
      unmappedRuntimeFiles: governedRuntimeRecords.filter(
        (record) => record.capabilities.length === 0
      ).length,
      unmappedTestFiles: testRecords.filter(
        (record) => record.capabilities.length === 0
      ).length,
    },
    budget: registry.budget,
    capabilities,
    paths: records,
    errors,
  };

  if (reportPath) {
    const absoluteReportPath = isAbsolute(reportPath)
      ? reportPath
      : resolve(cwd, reportPath);
    mkdirSync(dirname(absoluteReportPath), { recursive: true });
    writeFileSync(absoluteReportPath, `${JSON.stringify(report, null, 2)}\n`);
  }
  return report;
}

function parseArguments(argv) {
  const options = {};
  const remaining = [...argv];
  const readValue = (argument) => {
    const value = remaining.shift();
    invariant(value, `${argument} requires a value`);
    return value;
  };
  while (remaining.length > 0) {
    const argument = remaining.shift();
    if (argument === "--registry") {
      options.registryPath = readValue(argument);
    } else if (argument === "--target") {
      const target = readValue(argument);
      options.targetName = target === "upstream-main" ? "upstreamMain" : target;
    } else if (argument === "--report") {
      options.reportPath = readValue(argument);
    } else if (argument === "--today") {
      options.today = readValue(argument);
    } else if (argument === "--update-fingerprints") {
      options.updateFingerprints = true;
    } else if (argument === "--verify-latest") {
      options.verifyLatest = true;
    } else {
      throw new Error(`unknown argument: ${argument}`);
    }
  }
  return options;
}

function printReport(report) {
  const { summary } = report;
  process.stdout.write(
    `${[
      `Upstream core delta target: ${report.target}`,
      `Resolved ref: ${report.resolved.ref} -> ${report.resolved.commit}`,
      report.resolved.package
        ? `Stable package: ${report.resolved.package}@${report.resolved.version}`
        : undefined,
      `Changed source: ${summary.sourceFiles} (${summary.runtimeFiles} runtime, ${summary.testFiles} test/fixture)`,
      summary.absorbedUpstreamRuntimeFiles
        ? `Governed fork runtime: ${summary.governedRuntimeFiles}; absorbed upstream runtime: ${summary.absorbedUpstreamRuntimeFiles}`
        : undefined,
      `Diff size: +${summary.insertions} -${summary.deletions}`,
      `Capabilities: ${summary.capabilityCount}; runtime paths without registry mapping: ${summary.unmappedRuntimeFiles}`,
      ...report.errors.map((error) => `ERROR: ${error}`),
    ]
      .filter(Boolean)
      .join("\n")}\n`
  );
}

function main() {
  try {
    const report = runCoreDeltaCheck(parseArguments(process.argv.slice(2)));
    printReport(report);
    if (report.errors.length > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`
    );
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  main();
}
