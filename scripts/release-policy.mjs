import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  ".."
);

export const releasePackages = [
  { name: "@aakkino/fig-kiwi", path: "packages/fig-kiwi" },
  { name: "@aakkino/composed-dom", path: "packages/composed-dom" },
  { name: "@aakkino/dom-to-figma", path: "packages/dom-to-figma" },
];

export const ownedRegistry = "https://npm.pkg.github.com";

const releaseSurfacePaths = [
  "package.json",
  ".changeset/config.json",
  "scripts/private-release.mjs",
  "scripts/recover-public-fig-kiwi.mjs",
];

const migratedUpstreamNames = new Set([
  "@figit/fig-kiwi",
  "@figit/composed-dom",
  "@figit/dom-to-figma",
]);

export function readWorkspaceManifests(root = repositoryRoot) {
  const entries = [];
  for (const workspaceRoot of ["packages", "apps", "internal"]) {
    const absoluteRoot = resolve(root, workspaceRoot);
    for (const directory of readdirSync(absoluteRoot, {
      withFileTypes: true,
    })) {
      if (!directory.isDirectory()) {
        continue;
      }
      const path = `${workspaceRoot}/${directory.name}`;
      entries.push({
        path,
        manifest: JSON.parse(
          readFileSync(resolve(root, path, "package.json"), "utf8")
        ),
      });
    }
  }
  return entries;
}

export function validateWorkspaceManifests(entries) {
  const errors = [];
  const allowlistByPath = new Map(
    releasePackages.map((entry) => [entry.path, entry.name])
  );
  const seen = new Set();

  for (const { path, manifest } of entries) {
    const expectedName = allowlistByPath.get(path);
    const publishable = manifest.private !== true;

    if (expectedName) {
      seen.add(path);
      errors.push(...validateAllowedPackage(path, manifest, expectedName));
    } else if (publishable) {
      errors.push(
        `${path} is publishable but absent from the release allowlist`
      );
    }

    if (publishable && manifest.name?.startsWith("@figit/")) {
      errors.push(`${path} is publishable under the upstream @figit scope`);
    }

    errors.push(...validateDependencyNames(path, manifest));
  }

  for (const { path } of releasePackages) {
    if (!seen.has(path)) {
      errors.push(`release package is missing: ${path}`);
    }
  }

  return errors;
}

export function readReleaseSurfaces(root = repositoryRoot) {
  const workflowRoot = resolve(root, ".github/workflows");
  const workflowPaths = readdirSync(workflowRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.ya?ml$/u.test(entry.name))
    .map((entry) => `.github/workflows/${entry.name}`);
  return Object.fromEntries(
    [...releaseSurfacePaths, ...workflowPaths].map((path) => [
      path,
      readFileSync(resolve(root, path), "utf8"),
    ])
  );
}

export function validateReleaseSurfaces(surfaces) {
  const errors = [];
  const combined = Object.values(surfaces).join("\n");
  const forbidden = [
    [/pkg(?:-pr-new|\.pr\.new)/iu, "public package preview"],
    [/changeset publish/iu, "Changesets publication"],
    [/\bnpm\s+(?:--\S+\s+)*publish\b/iu, "direct npm publication"],
    [/registry\.npmjs\.(?:org|com)|npmjs\.org/iu, "public npm registry"],
    [/NPM_CONFIG_PROVENANCE|id-token:\s*write/iu, "unsupported provenance"],
  ];
  for (const [pattern, label] of forbidden) {
    if (pattern.test(combined)) {
      errors.push(`active release surfaces contain ${label}`);
    }
  }

  const rootManifest = JSON.parse(surfaces["package.json"] ?? "{}");
  if ("release" in (rootManifest.scripts ?? {})) {
    errors.push("root package must not expose an ambiguous release script");
  }
  if ("pkg-pr-new" in (rootManifest.devDependencies ?? {})) {
    errors.push("root package must not depend on pkg-pr-new");
  }
  if (
    rootManifest.scripts?.["release:recover-public-fig-kiwi"] !==
    "node scripts/recover-public-fig-kiwi.mjs"
  ) {
    errors.push(
      "root package must expose only the fixed fig-kiwi recovery command"
    );
  }

  const recoveryWorkflow =
    surfaces[".github/workflows/recover-public-fig-kiwi.yml"] ?? "";
  for (const [pattern, label] of [
    [/group:\s*recover-public-fig-kiwi/u, "fixed recovery concurrency"],
    [/environment:\s*package-publish/u, "protected environment"],
    [/contents:\s*read/u, "contents read permission"],
    [/packages:\s*write/u, "packages write permission"],
    [/actions\/checkout@v6/u, "reviewed checkout action"],
    [
      /test "\$\(git rev-parse origin\/main\)" = "\$\(git rev-parse HEAD\)"/u,
      "current remote main check",
    ],
    [
      /RECOVERY_CONFIRM:\s*\$\{\{ inputs\.recovery_confirm \}\}/u,
      "explicit confirmation",
    ],
    [
      /pnpm release:recover-public-fig-kiwi --source-sha "\$\{\{ inputs\.source_sha \}\}"/u,
      "fixed recovery command",
    ],
  ]) {
    if (!pattern.test(recoveryWorkflow)) {
      errors.push(`fig-kiwi recovery workflow must retain ${label}`);
    }
  }

  const releaseWorkflow = surfaces[".github/workflows/release.yml"] ?? "";
  for (const [pattern, label] of [
    [
      /NODE_AUTH_TOKEN:\s*\$\{\{ secrets\.PACKAGE_PUBLISH_TOKEN \}\}/u,
      "classic PAT package authentication",
    ],
    [
      /GH_TOKEN:\s*\$\{\{ secrets\.PACKAGE_PUBLISH_TOKEN \}\}/u,
      "classic PAT visibility authentication",
    ],
    [
      /ACTIONS_PACKAGE_TOKEN:\s*\$\{\{ secrets\.GITHUB_TOKEN \}\}/u,
      "independent repository Actions authentication",
    ],
    [
      /GH_TOKEN:\s*\$\{\{ secrets\.GITHUB_TOKEN \}\}/u,
      "repository metadata authentication",
    ],
    [/packages:\s*read/u, "repository package read permission"],
  ]) {
    if (!pattern.test(releaseWorkflow)) {
      errors.push(`release workflow must retain ${label}`);
    }
  }
  if (
    /NODE_AUTH_TOKEN:\s*\$\{\{ secrets\.GITHUB_TOKEN \}\}/u.test(
      releaseWorkflow
    )
  ) {
    errors.push("release workflow must never publish with GITHUB_TOKEN");
  }
  if (/packages:\s*write/u.test(releaseWorkflow)) {
    errors.push("release workflow GITHUB_TOKEN must remain packages: read");
  }
  if (
    (releaseWorkflow.match(/secrets\.PACKAGE_PUBLISH_TOKEN/gu) ?? []).length !==
    2
  ) {
    errors.push(
      "release workflow must use PACKAGE_PUBLISH_TOKEN only for npm and visibility authentication"
    );
  }
  for (const [variable, expectedCount] of [
    ["NODE_AUTH_TOKEN", 1],
    ["ACTIONS_PACKAGE_TOKEN", 1],
    ["GH_TOKEN", 2],
  ]) {
    const count = (
      releaseWorkflow.match(new RegExp(`^\\s*${variable}:`, "gmu")) ?? []
    ).length;
    if (count !== expectedCount) {
      errors.push(
        `release workflow must map ${variable} exactly ${expectedCount} time(s)`
      );
    }
  }
  const privateReleaseScript = surfaces["scripts/private-release.mjs"] ?? "";
  for (const literal of [
    "const token = baseEnv.ACTIONS_PACKAGE_TOKEN;",
    "isolatedCredentialEnvironment(baseEnv, { NODE_AUTH_TOKEN: token })",
    "GH_TOKEN: undefined",
    "ACTIONS_PACKAGE_TOKEN: undefined",
    "Manage Actions access",
  ]) {
    if (!privateReleaseScript.includes(literal)) {
      errors.push(`private release script must retain ${literal}`);
    }
  }
  if (/ACTIONS_PACKAGE_TOKEN\s*(?:\?\?|\|\|)/u.test(privateReleaseScript)) {
    errors.push(
      "Actions access verification must not fall back to another token"
    );
  }
  if (/ref:\s*\$\{\{\s*inputs\.source_sha\s*\}\}/u.test(recoveryWorkflow)) {
    errors.push(
      "fig-kiwi recovery workflow must use source_sha only as incident evidence"
    );
  }
  const recoveryScript = surfaces["scripts/recover-public-fig-kiwi.mjs"] ?? "";
  for (const literal of [
    'confirmation: "DELETE_PUBLIC_FIG_KIWI_0.2.0_FF5410E6"',
    'sourceSha: "ff5410e61de4e9243d8f46967fb5de6199e5ee12"',
    "packageId: 14_684_516",
    "versionId: 1_178_055_708",
    'leafName: "fig-kiwi"',
    'name: "@aakkino/fig-kiwi"',
    'version: "0.2.0"',
    'repository: "aakkino/web-to-figma"',
    '"sha512-5oEQUbje4kv1eSKPVkeFHXs11wEK/ujPeKFWLS00wb/YzZR1Ow8SruI7nma5xpUXQkCFa4EZp1yuzcG+qUMEhQ=="',
    'packagePath: "/users/aakkino/packages/npm/fig-kiwi"',
    'deletePath: "/users/aakkino/packages/npm/fig-kiwi"',
    "await boundary.inspectDeletedPackage()",
    "Post-delete package inspection failed without an explicit 404",
  ]) {
    if (!recoveryScript.includes(literal)) {
      errors.push(`fig-kiwi recovery script must retain ${literal}`);
    }
  }

  const changesets = JSON.parse(surfaces[".changeset/config.json"] ?? "{}");
  if (changesets.access !== "restricted") {
    errors.push("Changesets access must remain restricted");
  }
  const changelogOptions = Array.isArray(changesets.changelog)
    ? changesets.changelog[1]
    : undefined;
  if (changelogOptions?.repo !== "aakkino/web-to-figma") {
    errors.push("Changesets must target aakkino/web-to-figma");
  }
  return errors;
}

function validateAllowedPackage(path, manifest, expectedName) {
  const errors = [];
  const expectedRepository = "git+https://github.com/aakkino/web-to-figma.git";
  if (manifest.private === true) {
    errors.push(`${path} is allowlisted but private`);
  }
  if (manifest.name !== expectedName) {
    errors.push(`${path} must be named ${expectedName}`);
  }
  if (manifest.publishConfig?.registry !== ownedRegistry) {
    errors.push(`${path} must publish only to ${ownedRegistry}`);
  }
  if (
    manifest.repository?.url !== expectedRepository ||
    manifest.repository?.directory !== path
  ) {
    errors.push(`${path} must link to its directory in ${expectedRepository}`);
  }
  if (manifest.homepage !== "https://github.com/aakkino/web-to-figma#readme") {
    errors.push(`${path} must use the fork homepage`);
  }
  if (manifest.bugs?.url !== "https://github.com/aakkino/web-to-figma/issues") {
    errors.push(`${path} must use the fork issue tracker`);
  }
  if (manifest.publishConfig?.access !== "restricted") {
    errors.push(`${path} must explicitly request restricted access`);
  }
  if ("provenance" in (manifest.publishConfig ?? {})) {
    errors.push(`${path} must not claim unsupported npm provenance`);
  }
  return errors;
}

function validateDependencyNames(path, manifest) {
  const errors = [];
  for (const dependencyGroup of [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
  ]) {
    for (const dependency of Object.keys(manifest[dependencyGroup] ?? {})) {
      if (migratedUpstreamNames.has(dependency)) {
        errors.push(
          `${path} has an active dependency on migrated ${dependency}`
        );
      }
    }
  }
  return errors;
}

export function assertReleasePolicy(
  entries = readWorkspaceManifests(),
  surfaces = readReleaseSurfaces()
) {
  const errors = [
    ...validateWorkspaceManifests(entries),
    ...validateReleaseSurfaces(surfaces),
  ];
  if (errors.length > 0) {
    throw new Error(`Release policy failed:\n- ${errors.join("\n- ")}`);
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  assertReleasePolicy();
  process.stdout.write(
    `Release policy passed for ${releasePackages.map(({ name }) => name).join(", ")}\n`
  );
}
