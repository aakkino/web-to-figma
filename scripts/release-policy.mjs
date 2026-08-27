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

const releaseSurfacePaths = ["package.json", ".changeset/config.json"];

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
  if (manifest.publishConfig?.access === "public") {
    errors.push(`${path} must not request public access`);
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
