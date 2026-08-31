import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertReleasePolicy,
  ownedRegistry,
  releasePackages,
  repositoryRoot,
} from "./release-policy.mjs";

const maxTarballBytes = 256 * 1024 * 1024;
const stagingTag = "migration";
const ownedRepository = "aakkino/web-to-figma";

export function compareRegistryArtifact(artifact, registryVersion) {
  if (registryVersion === null) {
    return "absent";
  }
  const { metadata, packageManifest, tarballIntegrity } = registryVersion;
  if (
    metadata?.name === artifact.name &&
    metadata.version === artifact.version &&
    metadata.integrity === artifact.integrity &&
    tarballIntegrity === artifact.integrity &&
    packageManifest?.name === artifact.name &&
    packageManifest.version === artifact.version &&
    packageManifest.repository === artifact.repository &&
    equalMetadata(packageManifest.dependencies, artifact.dependencies) &&
    equalMetadata(
      packageManifest.peerDependencies,
      artifact.peerDependencies
    ) &&
    equalMetadata(packageManifest.exports, artifact.exports)
  ) {
    return "matching";
  }
  return "mismatch";
}

export function inspectDownloadedRegistryArtifact({
  tarballPath,
  registryMetadata,
}) {
  const bytes = readFileSync(tarballPath);
  const tarballIntegrity = `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
  const declaredIntegrity = registryMetadata.dist?.integrity;
  if (declaredIntegrity !== tarballIntegrity) {
    throw new Error(
      `${registryMetadata.name}@${registryMetadata.version} downloaded tarball does not match registry integrity`
    );
  }
  const packageJson = JSON.parse(
    runCapture(
      "tar",
      ["-xOf", tarballPath, "package/package.json"],
      repositoryRoot,
      anonymousRegistryEnvironment()
    )
  );
  return {
    metadata: {
      name: registryMetadata.name,
      version: registryMetadata.version,
      integrity: registryMetadata.dist?.integrity,
    },
    tarballIntegrity,
    packageManifest: {
      name: packageJson.name,
      version: packageJson.version,
      repository: normalizeRepository(packageJson.repository),
      dependencies: packageJson.dependencies ?? {},
      peerDependencies: packageJson.peerDependencies ?? {},
      exports: packageJson.exports ?? packageJson.publishConfig?.exports,
    },
  };
}

export function githubPackageApiPath(name) {
  if (!/^@aakkino\/[a-z0-9-]+$/u.test(name)) {
    throw new Error(`Cannot inspect unowned package ${name}`);
  }
  return `/users/aakkino/packages/npm/${githubPackageLeafName(name)}`;
}

export function githubPackageLeafName(name) {
  if (!/^@aakkino\/[a-z0-9-]+$/u.test(name)) {
    throw new Error(`Cannot inspect unowned package ${name}`);
  }
  return name.slice("@aakkino/".length);
}

export function assertPrivatePackageRecord(value, artifact) {
  if (value.visibility === "public") {
    throw new Error(
      `${artifact.name}@${artifact.version} is public and cannot be changed back to private; use the approved recovery workflow`
    );
  }
  return (
    value.name === githubPackageLeafName(artifact.name) &&
    value.package_type === "npm" &&
    value.visibility === "private"
  );
}

export function isExplicitAccessDenial(result) {
  if (result.status === 0) {
    return false;
  }
  return /(?:E40[134]|40[134] (?:Unauthorized|Forbidden|Not Found))/iu.test(
    `${result.stdout}\n${result.stderr}`
  );
}

export function npmPublishArguments(artifact, tag) {
  return [
    "publish",
    resolve(repositoryRoot, artifact.tarballPath),
    "--tag",
    tag,
    "--access",
    "restricted",
    "--registry",
    ownedRegistry,
  ];
}

export function ownerRegistryEnvironment(baseEnv = process.env) {
  const token = baseEnv.NODE_AUTH_TOKEN;
  if (!token) {
    throw new Error("NODE_AUTH_TOKEN must contain PACKAGE_PUBLISH_TOKEN");
  }
  return isolatedCredentialEnvironment(baseEnv, { NODE_AUTH_TOKEN: token });
}

export function ownerVisibilityEnvironment(baseEnv = process.env) {
  const token = baseEnv.GH_TOKEN;
  if (!token) {
    throw new Error("GH_TOKEN must contain PACKAGE_PUBLISH_TOKEN");
  }
  return isolatedCredentialEnvironment(baseEnv, { GH_TOKEN: token });
}

export function actionsRegistryEnvironment(baseEnv = process.env) {
  const token = baseEnv.ACTIONS_PACKAGE_TOKEN;
  if (!token) {
    throw new Error(
      "ACTIONS_PACKAGE_TOKEN must contain the run-scoped GITHUB_TOKEN"
    );
  }
  return isolatedCredentialEnvironment(baseEnv, { NODE_AUTH_TOKEN: token });
}

export function anonymousRegistryEnvironment(baseEnv = process.env) {
  return {
    ...isolatedCredentialEnvironment(baseEnv),
    NPM_CONFIG_GLOBALCONFIG: undefined,
    NPM_CONFIG_USERCONFIG: undefined,
    npm_config_globalconfig: undefined,
    npm_config_userconfig: undefined,
  };
}

function isolatedCredentialEnvironment(baseEnv, credentials = {}) {
  return {
    ...baseEnv,
    NODE_AUTH_TOKEN: undefined,
    NPM_TOKEN: undefined,
    GH_TOKEN: undefined,
    GITHUB_TOKEN: undefined,
    ACTIONS_PACKAGE_TOKEN: undefined,
    PACKAGE_PUBLISH_TOKEN: undefined,
    ...credentials,
  };
}

export async function publishSerially({ artifacts, registry }) {
  const results = [];
  for (const artifact of artifacts) {
    let remote = await registry.inspect(artifact);
    const initialState = compareRegistryArtifact(artifact, remote);
    if (initialState === "mismatch") {
      throw new Error(
        `${artifact.name}@${artifact.version} conflicts with registry state`
      );
    }
    if (initialState === "absent") {
      await registry.publish(artifact, stagingTag);
      remote = await registry.inspect(artifact);
      if (compareRegistryArtifact(artifact, remote) !== "matching") {
        throw new Error(
          `${artifact.name}@${artifact.version} failed post-publish verification`
        );
      }
    }
    if (!(await registry.verifyPrivate(artifact))) {
      throw new Error(`${artifact.name}@${artifact.version} is not private`);
    }
    if (!(await registry.verifyActionsAccess(artifact))) {
      throw new Error(
        `${artifact.name}@${artifact.version} is private but the owning repository GITHUB_TOKEN cannot install it; grant aakkino/web-to-figma access under Manage Actions access`
      );
    }
    if (!(await registry.verifyAuthorized(artifact))) {
      throw new Error(
        `${artifact.name}@${artifact.version} failed authorized download`
      );
    }
    if (!(await registry.verifyUnauthorizedDenied(artifact))) {
      throw new Error(
        `${artifact.name}@${artifact.version} is available without authorization`
      );
    }
    results.push({
      name: artifact.name,
      version: artifact.version,
      integrity: artifact.integrity,
      state: initialState,
    });
  }

  await registry.smoke(artifacts);
  for (const artifact of artifacts) {
    await registry.promote(artifact, "latest");
  }
  return results;
}

export function buildPublishResult(manifest, artifacts) {
  const result = { sourceSha: manifest.sourceSha, artifacts };
  assertPublishResult({ manifest, result });
  return result;
}

export async function publishAndPersistResult({
  manifest,
  registry,
  persistResult,
}) {
  const artifacts = await publishSerially({
    artifacts: manifest.artifacts,
    registry,
  });
  const result = buildPublishResult(manifest, artifacts);
  await persistResult(result);
  return result;
}

export function assertPublishResult({ manifest, result }) {
  assertSourceSha(result?.sourceSha);
  if (result.sourceSha !== manifest.sourceSha) {
    throw new Error("Publish result source SHA does not match the manifest");
  }
  assertExactKeys(result, ["artifacts", "sourceSha"], "publish result");
  if (!Array.isArray(result.artifacts)) {
    throw new Error("Publish result artifacts must be an array");
  }
  if (result.artifacts.length !== manifest.artifacts.length) {
    throw new Error("Publish result must contain every manifest artifact");
  }
  const coordinates = new Set();
  for (const [index, entry] of result.artifacts.entries()) {
    assertExactKeys(
      entry,
      ["integrity", "name", "state", "version"],
      "publish result artifact"
    );
    const artifact = manifest.artifacts[index];
    const expected = releasePackages[index];
    const coordinate = `${entry.name}@${entry.version}`;
    if (
      !(artifact && expected) ||
      entry.name !== expected.name ||
      entry.name !== artifact.name ||
      entry.version !== artifact.version ||
      entry.integrity !== artifact.integrity
    ) {
      throw new Error(
        `Publish result artifact does not match manifest position ${index}`
      );
    }
    if (entry.state !== "absent" && entry.state !== "matching") {
      throw new Error(`${coordinate} has an invalid initial Registry state`);
    }
    if (coordinates.has(coordinate)) {
      throw new Error(`Publish result contains duplicate ${coordinate}`);
    }
    coordinates.add(coordinate);
  }
  return true;
}

export async function selectMetadataArtifacts({
  manifest,
  result,
  recoverMissingMetadata = false,
  github,
}) {
  assertPublishResult({ manifest, result });
  const selected = result.artifacts.flatMap((entry, index) =>
    entry.state === "absent" ? [manifest.artifacts[index]] : []
  );
  if (!recoverMissingMetadata) {
    return selected;
  }
  if (!github) {
    throw new Error("Recovery selection requires the GitHub boundary");
  }

  for (const [index, entry] of result.artifacts.entries()) {
    if (entry.state !== "matching") {
      continue;
    }
    const artifact = manifest.artifacts[index];
    const tag = `${artifact.name}@${artifact.version}`;
    const existingTag = await github.inspectTag(tag);
    const existingRelease = await github.inspectRelease(tag);
    assertInspectedTag(existingTag, tag);
    assertInspectedRelease(existingRelease, tag);
    if (existingTag && existingRelease) {
      if (
        existingRelease.tag !== tag ||
        existingRelease.sha !== existingTag.sha
      ) {
        throw new Error(`${tag} has conflicting existing metadata`);
      }
      if (existingTag.sha === manifest.sourceSha) {
        selected.push(artifact);
      }
      continue;
    }
    if (existingTag || existingRelease) {
      throw new Error(`${tag} has incomplete existing metadata`);
    }

    const candidateVersion = parseSemVer(artifact.version, tag);
    const ownedTags = await github.listPackageTags(artifact.name);
    if (!Array.isArray(ownedTags) || ownedTags.length > 1000) {
      throw new Error(`${artifact.name} has ambiguous owned tag history`);
    }
    const seenTags = new Set();
    const predecessors = ownedTags.map((ownedTag) => {
      const expectedPrefix = `${artifact.name}@`;
      if (
        typeof ownedTag?.tag !== "string" ||
        !ownedTag.tag.startsWith(expectedPrefix) ||
        typeof ownedTag.sha !== "string" ||
        !/^[0-9a-f]{40}$/u.test(ownedTag.sha) ||
        seenTags.has(ownedTag.tag)
      ) {
        throw new Error(`${artifact.name} has ambiguous owned tag history`);
      }
      seenTags.add(ownedTag.tag);
      const version = parseSemVer(
        ownedTag.tag.slice(expectedPrefix.length),
        ownedTag.tag
      );
      return { ...ownedTag, version };
    });
    if (predecessors.length === 0) {
      throw new Error(`${tag} has no owned predecessor tag`);
    }
    predecessors.sort((left, right) =>
      compareSemVer(right.version, left.version)
    );
    const predecessor = predecessors[0];
    if (
      predecessors[1] &&
      compareSemVer(predecessors[1].version, predecessor.version) === 0
    ) {
      throw new Error(`${tag} has no unique predecessor tag`);
    }
    if (compareSemVer(candidateVersion, predecessor.version) <= 0) {
      throw new Error(`${tag} does not increase the predecessor version`);
    }
    if (!(await github.isAncestor(predecessor.sha, manifest.sourceSha))) {
      throw new Error(`${predecessor.tag} is not an ancestor of source SHA`);
    }
    selected.push(artifact);
  }
  return selected;
}

export async function reconcileMetadata({ artifacts, sourceSha, github }) {
  assertSourceSha(sourceSha);
  const states = [];
  const coordinates = new Set();
  for (const artifact of artifacts) {
    const tag = `${artifact.name}@${artifact.version}`;
    if (coordinates.has(tag)) {
      throw new Error(`Metadata selection contains duplicate ${tag}`);
    }
    coordinates.add(tag);
    const existingTag = await github.inspectTag(tag);
    assertInspectedTag(existingTag, tag);
    if (existingTag && existingTag.sha !== sourceSha) {
      throw new Error(`${tag} already points to ${existingTag.sha}`);
    }
    const release = await github.inspectRelease(tag);
    assertInspectedRelease(release, tag);
    if (release && (release.tag !== tag || release.sha !== sourceSha)) {
      throw new Error(`${tag} Release does not target ${sourceSha}`);
    }
    states.push({ tag, existingTag, release });
  }

  for (const { tag, existingTag, release } of states) {
    if (!existingTag) {
      await github.createTag(tag, sourceSha);
    }
    if (!release) {
      await github.createRelease(tag, sourceSha);
    }
  }
}

export function inspectPackedArtifact({ packagePath, tarballPath, sourceSha }) {
  assertSourceSha(sourceSha);
  const bytes = readFileSync(tarballPath);
  if (bytes.byteLength > maxTarballBytes) {
    throw new Error(
      `${basename(tarballPath)} exceeds the 256 MB package limit`
    );
  }
  const files = runCapture("tar", ["-tf", tarballPath])
    .split(/\r?\n/u)
    .filter(Boolean);
  const packageJson = JSON.parse(
    runCapture("tar", ["-xOf", tarballPath, "package/package.json"])
  );
  const expected = releasePackages.find(({ path }) => path === packagePath);
  if (!expected || packageJson.name !== expected.name) {
    throw new Error(`${packagePath} packed an unapproved coordinate`);
  }
  if (JSON.stringify(packageJson).includes("workspace:")) {
    throw new Error(`${packageJson.name} contains a workspace protocol`);
  }
  if (packageJson.publishConfig?.access !== "restricted") {
    throw new Error(`${packageJson.name} must pack restricted access`);
  }
  const activeEdges = {
    ...(packageJson.dependencies ?? {}),
    ...(packageJson.peerDependencies ?? {}),
    ...(packageJson.optionalDependencies ?? {}),
  };
  for (const name of Object.keys(activeEdges)) {
    if (
      [
        "@figit/fig-kiwi",
        "@figit/composed-dom",
        "@figit/dom-to-figma",
      ].includes(name)
    ) {
      throw new Error(
        `${packageJson.name} contains migrated dependency ${name}`
      );
    }
  }
  const unexpected = files.filter(
    (file) =>
      !/^(package\/(dist\/|README\.md$|CHANGELOG\.md$|LICENSE$|package\.json$)|package\/$)/u.test(
        file
      )
  );
  if (unexpected.length > 0) {
    throw new Error(
      `${packageJson.name} contains unexpected files: ${unexpected.join(", ")}`
    );
  }
  const exportsMap = packageJson.exports ?? packageJson.publishConfig?.exports;
  for (const target of exportTargets(exportsMap)) {
    const normalized = `package/${target.replace(/^\.\//u, "")}`;
    if (!files.includes(normalized)) {
      throw new Error(
        `${packageJson.name} export target is missing: ${target}`
      );
    }
  }
  return {
    name: packageJson.name,
    version: packageJson.version,
    packagePath,
    tarballPath: relative(repositoryRoot, tarballPath).replaceAll("\\", "/"),
    size: bytes.byteLength,
    integrity: `sha512-${createHash("sha512").update(bytes).digest("base64")}`,
    sourceSha,
    files,
    dependencies: packageJson.dependencies ?? {},
    peerDependencies: packageJson.peerDependencies ?? {},
    exports: exportsMap,
    repository: normalizeRepository(packageJson.repository),
  };
}

export function assertManifestOrder(artifacts) {
  const actual = artifacts.map(({ name }) => name);
  const expected = releasePackages.map(({ name }) => name);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Release manifest order must be ${expected.join(" -> ")}`);
  }
}

export function assertStagedArtifact({ artifact, expected, sourceSha, root }) {
  assertArtifactIdentity({ artifact, expected, sourceSha, root });
  const artifactRoot = resolve(root, ".artifacts/private-release");
  const tarballPath = resolve(root, artifact.tarballPath);
  if (
    relative(artifactRoot, tarballPath).startsWith("..") ||
    !existsSync(tarballPath)
  ) {
    throw new Error("Staged tarball is missing or outside the artifact root");
  }
  const bytes = readFileSync(tarballPath);
  const integrity = `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
  if (artifact.size !== bytes.byteLength || artifact.integrity !== integrity) {
    throw new Error(
      `${expected.name} staged tarball bytes do not match manifest`
    );
  }
}

function assertArtifactIdentity({ artifact, expected, sourceSha, root }) {
  if (
    artifact.name !== expected.name ||
    artifact.packagePath !== expected.path ||
    artifact.sourceSha !== sourceSha
  ) {
    throw new Error(`Staged artifact metadata does not match ${expected.name}`);
  }
  const packageJson = JSON.parse(
    readFileSync(resolve(root, expected.path, "package.json"), "utf8")
  );
  if (artifact.version !== packageJson.version) {
    throw new Error(`${expected.name} staged an unexpected version`);
  }
}

function runPreflight(args) {
  assertReleasePolicy();
  const sourceSha = argument(args, "--source-sha") ?? git("rev-parse", "HEAD");
  assertSourceSha(sourceSha);
  const output = resolve(
    repositoryRoot,
    argument(args, "--output") ?? ".artifacts/private-release/manifest.json"
  );
  const stagingRoot = dirname(output);
  rmSync(stagingRoot, { recursive: true, force: true });
  mkdirSync(stagingRoot, { recursive: true });
  const artifacts = [];
  for (const entry of releasePackages) {
    const before = new Set(readdirSync(stagingRoot));
    runPackageManager([
      "--filter",
      entry.name,
      "pack",
      "--pack-destination",
      stagingRoot,
    ]);
    const created = readdirSync(stagingRoot).filter(
      (file) => file.endsWith(".tgz") && !before.has(file)
    );
    if (created.length !== 1) {
      throw new Error(`${entry.name} produced ${created.length} tarballs`);
    }
    artifacts.push(
      inspectPackedArtifact({
        packagePath: entry.path,
        tarballPath: resolve(stagingRoot, created[0]),
        sourceSha,
      })
    );
  }
  assertManifestOrder(artifacts);
  writeFileSync(
    output,
    `${JSON.stringify({ sourceSha, artifacts }, null, 2)}\n`
  );
  smokeLocalArtifacts(artifacts);
  process.stdout.write(
    `Inspected ${artifacts.length} tarballs; manifest: ${output}\n`
  );
}

function smokeLocalArtifacts(artifacts) {
  const consumerRoot = mkdtempSync(join(tmpdir(), "aakkino-local-pack-smoke-"));
  try {
    writeFileSync(
      resolve(consumerRoot, "package.json"),
      `${JSON.stringify({ private: true, type: "module" }, null, 2)}\n`
    );
    runInherited(
      "npm",
      [
        "install",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        ...artifacts.map(({ tarballPath }) =>
          resolve(repositoryRoot, tarballPath)
        ),
      ],
      consumerRoot,
      anonymousRegistryEnvironment()
    );
    runInherited(
      process.execPath,
      [
        "--input-type=module",
        "--eval",
        artifacts
          .map(({ name }) => `await import(${JSON.stringify(name)})`)
          .join(";"),
      ],
      consumerRoot,
      anonymousRegistryEnvironment()
    );
  } finally {
    rmSync(consumerRoot, { recursive: true, force: true });
  }
}

async function runPublish(args) {
  const manifest = readReleaseManifest(args);
  assertManifestOrder(manifest.artifacts);
  if (git("rev-parse", "HEAD") !== manifest.sourceSha) {
    throw new Error(
      "Checked-out source SHA does not match the staged manifest"
    );
  }
  const resultPath = resolve(
    repositoryRoot,
    argument(args, "--result") ?? ".artifacts/private-release/result.json"
  );
  await publishAndPersistResult({
    manifest,
    registry: shellRegistry(),
    persistResult(result) {
      writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);
    },
  });
}

async function runMetadata(args) {
  const manifest = readReleaseManifest(args, { verifyTarballs: false });
  if (git("rev-parse", "HEAD") !== manifest.sourceSha) {
    throw new Error("Checked-out source SHA does not match the manifest");
  }
  const result = readPublishResult(args, manifest);
  const github = shellGitHub();
  const artifacts = await selectMetadataArtifacts({
    manifest,
    result,
    recoverMissingMetadata: booleanArgument(
      args,
      "--recover-missing-metadata",
      false
    ),
    github,
  });
  await reconcileMetadata({
    artifacts,
    sourceSha: manifest.sourceSha,
    github,
  });
}

function shellRegistry() {
  return {
    inspect(artifact) {
      const env = ownerRegistryEnvironment();
      const result = spawnCapture(
        "npm",
        [
          "view",
          `${artifact.name}@${artifact.version}`,
          "--registry",
          ownedRegistry,
          "--json",
        ],
        env
      );
      if (result.status !== 0 && /E404|404 Not Found/u.test(result.stderr)) {
        return null;
      }
      assertCommand(result, "registry inspection");
      const value = JSON.parse(result.stdout);
      // GitHub's npm metadata omits package fields such as exports, so verify
      // immutable contents from the authenticated registry tarball.
      const downloadRoot = mkdtempSync(
        join(tmpdir(), "aakkino-registry-artifact-")
      );
      try {
        const emptyGlobalConfig = resolve(downloadRoot, "global.npmrc");
        writeFileSync(emptyGlobalConfig, "");
        const downloadEnv = {
          ...env,
          NPM_CONFIG_GLOBALCONFIG: emptyGlobalConfig,
          NPM_CONFIG_USERCONFIG: resolve(repositoryRoot, ".npmrc"),
          npm_config_globalconfig: undefined,
          npm_config_userconfig: undefined,
        };
        const download = spawnCapture(
          "npm",
          [
            "pack",
            `${artifact.name}@${artifact.version}`,
            "--ignore-scripts",
            "--pack-destination",
            ".",
            "--registry",
            ownedRegistry,
            "--json",
          ],
          downloadEnv,
          downloadRoot
        );
        assertCommand(download, "registry tarball download");
        const tarballs = readdirSync(downloadRoot).filter((file) =>
          file.endsWith(".tgz")
        );
        if (tarballs.length !== 1) {
          throw new Error(
            `Registry download produced ${tarballs.length} tarballs for ${artifact.name}@${artifact.version}`
          );
        }
        return inspectDownloadedRegistryArtifact({
          tarballPath: resolve(downloadRoot, tarballs[0]),
          registryMetadata: value,
        });
      } finally {
        rmSync(downloadRoot, { recursive: true, force: true });
      }
    },
    publish(artifact, tag) {
      runInherited(
        "npm",
        npmPublishArguments(artifact, tag),
        repositoryRoot,
        ownerRegistryEnvironment()
      );
    },
    verifyPrivate(artifact) {
      const value = JSON.parse(
        runCapture(
          "gh",
          ["api", githubPackageApiPath(artifact.name)],
          repositoryRoot,
          ownerVisibilityEnvironment()
        )
      );
      return assertPrivatePackageRecord(value, artifact);
    },
    verifyAuthorized(artifact) {
      const env = ownerRegistryEnvironment();
      const consumerRoot = mkdtempSync(join(tmpdir(), "aakkino-authorized-"));
      try {
        writeFileSync(
          resolve(consumerRoot, "package.json"),
          `${JSON.stringify({ private: true, type: "module" }, null, 2)}\n`
        );
        writeFileSync(
          resolve(consumerRoot, ".npmrc"),
          `@aakkino:registry=${ownedRegistry}\n//npm.pkg.github.com/:_authToken=\${NODE_AUTH_TOKEN}\n`
        );
        runInherited(
          "npm",
          [
            "install",
            "--ignore-scripts",
            "--no-audit",
            "--no-fund",
            `${artifact.name}@${artifact.version}`,
          ],
          consumerRoot,
          env
        );
        runInherited(
          process.execPath,
          [
            "--input-type=module",
            "--eval",
            `await import(${JSON.stringify(artifact.name)})`,
          ],
          consumerRoot,
          anonymousRegistryEnvironment(env)
        );
        return true;
      } finally {
        rmSync(consumerRoot, { recursive: true, force: true });
      }
    },
    verifyActionsAccess(artifact) {
      const env = actionsRegistryEnvironment();
      const consumerRoot = mkdtempSync(join(tmpdir(), "aakkino-actions-"));
      try {
        writeFileSync(
          resolve(consumerRoot, "package.json"),
          `${JSON.stringify({ private: true, type: "module" }, null, 2)}\n`
        );
        writeFileSync(
          resolve(consumerRoot, ".npmrc"),
          `@aakkino:registry=${ownedRegistry}\n//npm.pkg.github.com/:_authToken=\${NODE_AUTH_TOKEN}\n`
        );
        runInherited(
          "npm",
          [
            "install",
            "--ignore-scripts",
            "--no-audit",
            "--no-fund",
            `${artifact.name}@${artifact.version}`,
          ],
          consumerRoot,
          env
        );
        runInherited(
          process.execPath,
          [
            "--input-type=module",
            "--eval",
            `await import(${JSON.stringify(artifact.name)})`,
          ],
          consumerRoot,
          anonymousRegistryEnvironment(env)
        );
        return true;
      } catch {
        return false;
      } finally {
        rmSync(consumerRoot, { recursive: true, force: true });
      }
    },
    verifyUnauthorizedDenied(artifact) {
      const npmrcRoot = mkdtempSync(join(tmpdir(), "aakkino-npmrc-"));
      try {
        const npmrc = resolve(npmrcRoot, ".npmrc");
        const globalNpmrc = resolve(npmrcRoot, "global.npmrc");
        writeFileSync(npmrc, `@aakkino:registry=${ownedRegistry}\n`);
        writeFileSync(globalNpmrc, "");
        const env = anonymousRegistryEnvironment();
        const result = spawnCapture(
          "npm",
          [
            "view",
            `${artifact.name}@${artifact.version}`,
            "--userconfig",
            npmrc,
            "--globalconfig",
            globalNpmrc,
            "--registry",
            ownedRegistry,
          ],
          env,
          npmrcRoot
        );
        if (isExplicitAccessDenial(result)) {
          return true;
        }
        if (result.status === 0) {
          return false;
        }
        throw new Error(
          `Unauthorized probe failed without an explicit access denial: ${boundedDiagnostic(result)}`
        );
      } finally {
        rmSync(npmrcRoot, { recursive: true, force: true });
      }
    },
    smoke(artifacts) {
      const env = ownerRegistryEnvironment();
      const consumerRoot = mkdtempSync(
        join(tmpdir(), "aakkino-package-smoke-")
      );
      try {
        writeFileSync(
          resolve(consumerRoot, "package.json"),
          `${JSON.stringify({ private: true, type: "module" }, null, 2)}\n`
        );
        writeFileSync(
          resolve(consumerRoot, ".npmrc"),
          `@aakkino:registry=${ownedRegistry}\n//npm.pkg.github.com/:_authToken=\${NODE_AUTH_TOKEN}\n`
        );
        runInherited(
          "npm",
          [
            "install",
            ...artifacts.map(({ name, version }) => `${name}@${version}`),
          ],
          consumerRoot,
          env
        );
        runInherited(
          process.execPath,
          [
            "--input-type=module",
            "--eval",
            artifacts
              .map(({ name }) => `await import(${JSON.stringify(name)})`)
              .join(";"),
          ],
          consumerRoot,
          anonymousRegistryEnvironment(env)
        );
      } finally {
        rmSync(consumerRoot, { recursive: true, force: true });
      }
    },
    promote(artifact, tag) {
      runInherited(
        "npm",
        [
          "dist-tag",
          "add",
          `${artifact.name}@${artifact.version}`,
          tag,
          "--registry",
          ownedRegistry,
        ],
        repositoryRoot,
        ownerRegistryEnvironment()
      );
    },
  };
}

function shellGitHub() {
  return {
    inspectTag(tag) {
      const result = spawnCapture("gh", [
        "api",
        `repos/${ownedRepository}/commits/${encodeURIComponent(tag)}`,
      ]);
      if (result.status !== 0 && /HTTP 404/u.test(result.stderr)) {
        return null;
      }
      assertCommand(result, "tag inspection");
      return { sha: JSON.parse(result.stdout).sha };
    },
    createTag(tag, sha) {
      runInherited("gh", [
        "api",
        "--method",
        "POST",
        `repos/${ownedRepository}/git/refs`,
        "-f",
        `ref=refs/tags/${tag}`,
        "-f",
        `sha=${sha}`,
      ]);
    },
    inspectRelease(tag) {
      const result = spawnCapture("gh", [
        "api",
        `repos/${ownedRepository}/releases/tags/${encodeURIComponent(tag)}`,
      ]);
      if (result.status !== 0 && /HTTP 404/u.test(result.stderr)) {
        return null;
      }
      assertCommand(result, "release inspection");
      const release = JSON.parse(result.stdout);
      return resolveReleaseTarget(release, (targetCommitish) => {
        const target = spawnCapture("gh", [
          "api",
          `repos/${ownedRepository}/commits/${encodeURIComponent(targetCommitish)}`,
        ]);
        assertCommand(target, "release target inspection");
        return JSON.parse(target.stdout).sha;
      });
    },
    createRelease(tag, sha) {
      runInherited("gh", [
        "api",
        "--method",
        "POST",
        `repos/${ownedRepository}/releases`,
        "-f",
        `tag_name=${tag}`,
        "-f",
        `target_commitish=${sha}`,
        "-f",
        `name=${tag}`,
        "-F",
        "generate_release_notes=true",
      ]);
    },
    listPackageTags(name) {
      const result = spawnCapture("gh", [
        "api",
        "--paginate",
        "--slurp",
        `repos/${ownedRepository}/tags?per_page=100`,
      ]);
      assertCommand(result, "owned tag history inspection");
      const prefix = `${name}@`;
      return JSON.parse(result.stdout)
        .flat()
        .filter(({ name: tag }) => tag.startsWith(prefix))
        .map(({ name: tag, commit }) => ({ tag, sha: commit.sha }));
    },
    isAncestor(ancestor, descendant) {
      const result = spawnCapture("git", [
        "merge-base",
        "--is-ancestor",
        ancestor,
        descendant,
      ]);
      if (result.status === 0) {
        return true;
      }
      if (result.status === 1) {
        return false;
      }
      assertCommand(result, "tag ancestry inspection");
    },
  };
}

function readReleaseManifest(args, { verifyTarballs = true } = {}) {
  const path = resolve(
    repositoryRoot,
    argument(args, "--manifest") ?? ".artifacts/private-release/manifest.json"
  );
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  assertSourceSha(manifest.sourceSha);
  assertManifestOrder(manifest.artifacts);
  for (const [index, artifact] of manifest.artifacts.entries()) {
    const assertion = verifyTarballs
      ? assertStagedArtifact
      : assertArtifactIdentity;
    assertion({
      artifact,
      expected: releasePackages[index],
      sourceSha: manifest.sourceSha,
      root: repositoryRoot,
    });
  }
  return manifest;
}

function readPublishResult(args, manifest) {
  const path = resolve(
    repositoryRoot,
    argument(args, "--result") ?? ".artifacts/private-release/result.json"
  );
  const result = JSON.parse(readFileSync(path, "utf8"));
  assertPublishResult({ manifest, result });
  return result;
}

function assertExactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label} has unexpected fields`);
  }
}

export function resolveReleaseTarget(release, resolveCommit) {
  if (
    !release ||
    typeof release !== "object" ||
    typeof release.tag_name !== "string" ||
    release.tag_name.length === 0 ||
    release.tag_name.length > 255 ||
    typeof release.target_commitish !== "string" ||
    release.target_commitish.length === 0 ||
    release.target_commitish.length > 255
  ) {
    throw new Error("Release has an invalid tag or target_commitish");
  }
  const sha = resolveCommit(release.target_commitish);
  if (typeof sha !== "string" || !/^[0-9a-f]{40}$/u.test(sha)) {
    throw new Error("Release target did not resolve to a commit SHA");
  }
  return { tag: release.tag_name, sha };
}

function assertInspectedTag(value, tag) {
  if (
    value !== null &&
    (!value ||
      typeof value !== "object" ||
      typeof value.sha !== "string" ||
      !/^[0-9a-f]{40}$/u.test(value.sha))
  ) {
    throw new Error(`${tag} Tag inspection returned an invalid commit SHA`);
  }
}

function assertInspectedRelease(value, tag) {
  if (
    value !== null &&
    (!value ||
      typeof value !== "object" ||
      typeof value.tag !== "string" ||
      typeof value.sha !== "string" ||
      !/^[0-9a-f]{40}$/u.test(value.sha))
  ) {
    throw new Error(`${tag} Release inspection returned invalid metadata`);
  }
}

function parseSemVer(value, label) {
  const match =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/u.exec(
      value
    );
  if (!match) {
    throw new Error(`${label} is not a valid semantic version`);
  }
  return {
    major: BigInt(match[1]),
    minor: BigInt(match[2]),
    patch: BigInt(match[3]),
    prerelease: match[4]?.split(".") ?? [],
  };
}

function compareSemVer(left, right) {
  for (const key of ["major", "minor", "patch"]) {
    if (left[key] !== right[key]) {
      return left[key] < right[key] ? -1 : 1;
    }
  }
  if (left.prerelease.length === 0 || right.prerelease.length === 0) {
    if (left.prerelease.length === right.prerelease.length) {
      return 0;
    }
    return left.prerelease.length === 0 ? 1 : -1;
  }
  const length = Math.max(left.prerelease.length, right.prerelease.length);
  for (let index = 0; index < length; index += 1) {
    const leftPart = left.prerelease[index];
    const rightPart = right.prerelease[index];
    if (leftPart === undefined || rightPart === undefined) {
      if (leftPart === rightPart) {
        return 0;
      }
      return leftPart === undefined ? -1 : 1;
    }
    if (leftPart === rightPart) {
      continue;
    }
    const leftNumeric = /^\d+$/u.test(leftPart);
    const rightNumeric = /^\d+$/u.test(rightPart);
    if (leftNumeric && rightNumeric) {
      return BigInt(leftPart) < BigInt(rightPart) ? -1 : 1;
    }
    if (leftNumeric !== rightNumeric) {
      return leftNumeric ? -1 : 1;
    }
    return leftPart < rightPart ? -1 : 1;
  }
  return 0;
}

function exportTargets(value) {
  if (typeof value === "string") {
    return [value];
  }
  if (!value || typeof value !== "object") {
    return [];
  }
  return Object.values(value).flatMap(exportTargets);
}

function normalizeRepository(repository) {
  if (typeof repository === "string") {
    return repository.replace(/^git\+/u, "").replace(/\.git$/u, "");
  }
  if (repository && typeof repository === "object") {
    return normalizeRepository(repository.url);
  }
  return;
}

function equalMetadata(left, right) {
  return (
    JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right))
  );
}

function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)])
    );
  }
  return value;
}

function boundedDiagnostic(result) {
  return `${result.stdout}\n${result.stderr}`
    .replace(/(token|authorization|password)(?:=|:)[^\s]+/giu, "$1=[redacted]")
    .trim()
    .slice(0, 500);
}

function assertSourceSha(value) {
  if (typeof value !== "string" || !/^[0-9a-f]{40}$/u.test(value)) {
    throw new Error(
      "source SHA must be exactly 40 lowercase hexadecimal characters"
    );
  }
}

function argument(args, name) {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

function booleanArgument(args, name, fallback) {
  const value = argument(args, name);
  if (value === undefined) {
    return fallback;
  }
  if (value !== "true" && value !== "false") {
    throw new Error(`${name} must be true or false`);
  }
  return value === "true";
}

function git(...args) {
  return runCapture("git", args).trim();
}

function runPackageManager(args) {
  if (process.platform === "win32") {
    runInherited(process.env.ComSpec ?? "cmd.exe", [
      "/d",
      "/s",
      "/c",
      `pnpm ${args.join(" ")}`,
    ]);
    return;
  }
  runInherited("pnpm", args);
}

function runCapture(command, args, cwd = repositoryRoot, env = process.env) {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 50,
    env,
  });
}

function spawnCapture(command, args, env = process.env, cwd = repositoryRoot) {
  if (process.platform === "win32" && command === "npm") {
    return spawnSync(
      process.env.ComSpec ?? "cmd.exe",
      ["/d", "/s", "/c", windowsCommand(command, args)],
      { cwd, encoding: "utf8", env }
    );
  }
  return spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env,
  });
}

function assertCommand(result, label) {
  if (result.status !== 0) {
    throw new Error(`${label} failed: ${result.stderr.trim()}`);
  }
}

function runInherited(command, args, cwd = repositoryRoot, env = process.env) {
  if (process.platform === "win32" && command === "npm") {
    execFileSync(
      process.env.ComSpec ?? "cmd.exe",
      ["/d", "/s", "/c", windowsCommand(command, args)],
      { cwd, stdio: "inherit", env }
    );
    return;
  }
  execFileSync(command, args, { cwd, stdio: "inherit", env });
}

function windowsCommand(command, args) {
  if (args.some((value) => /[\s&|<>^]/u.test(value))) {
    throw new Error(
      "Windows command arguments must not contain shell metacharacters"
    );
  }
  return [command, ...args].join(" ");
}

const command = process.argv[2];
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (command === "preflight") {
    runPreflight(process.argv.slice(3));
  } else if (command === "publish") {
    await runPublish(process.argv.slice(3));
  } else if (command === "reconcile-metadata") {
    await runMetadata(process.argv.slice(3));
  } else {
    throw new Error(
      "Usage: private-release.mjs <preflight|publish|reconcile-metadata>"
    );
  }
}
