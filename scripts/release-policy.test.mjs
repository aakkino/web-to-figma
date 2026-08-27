import assert from "node:assert/strict";
import test from "node:test";
import {
  ownedRegistry,
  releasePackages,
  validateReleaseSurfaces,
  validateWorkspaceManifests,
} from "./release-policy.mjs";

function workflowSecret(variable, secret) {
  return [variable, ": $", "{{ secrets.", secret, " }}"].join("");
}

function validEntries() {
  return [
    ...releasePackages.map(({ name, path }) => ({
      path,
      manifest: {
        name,
        homepage: "https://github.com/aakkino/web-to-figma#readme",
        repository: {
          url: "git+https://github.com/aakkino/web-to-figma.git",
          directory: path,
        },
        bugs: { url: "https://github.com/aakkino/web-to-figma/issues" },
        publishConfig: { registry: ownedRegistry, access: "restricted" },
      },
    })),
    {
      path: "internal/private-tool",
      manifest: { name: "@figit/private-tool", private: true },
    },
  ];
}

test("accepts the explicit private-registry release graph", () => {
  assert.deepEqual(validateWorkspaceManifests(validEntries()), []);
});

test("rejects public, old-scope, and unallowlisted publication", () => {
  const entries = validEntries();
  entries[0].manifest.name = "@figit/fig-kiwi";
  entries[0].manifest.publishConfig.access = "public";
  entries.push({ path: "packages/extra", manifest: { name: "extra" } });

  const errors = validateWorkspaceManifests(entries).join("\n");
  assert.ok(errors.includes("must be named @aakkino/fig-kiwi"));
  assert.ok(errors.includes("must explicitly request restricted access"));
  assert.ok(errors.includes("upstream @figit scope"));
  assert.ok(errors.includes("absent from the release allowlist"));
});

test("requires explicit restricted access on every publishable package", () => {
  const entries = validEntries();
  entries[1].manifest.publishConfig.access = undefined;
  assert.match(
    validateWorkspaceManifests(entries).join("\n"),
    /must explicitly request restricted access/u
  );
});

test("rejects package metadata that does not link to the fork", () => {
  const entries = validEntries();
  entries[0].manifest.repository.url =
    "git+https://github.com/figitdesign/web-to-figma.git";
  entries[0].manifest.homepage =
    "https://github.com/figitdesign/web-to-figma#readme";
  const errors = validateWorkspaceManifests(entries).join("\n");
  assert.match(errors, /must link to its directory/u);
  assert.match(errors, /must use the fork homepage/u);
});

test("rejects active edges to a migrated upstream coordinate", () => {
  const entries = validEntries();
  entries.at(-1).manifest.dependencies = {
    "@figit/dom-to-figma": "0.3.0",
  };
  assert.ok(
    validateWorkspaceManifests(entries)
      .join("\n")
      .includes("active dependency on migrated @figit/dom-to-figma")
  );
});

function validReleaseSurfaces() {
  return {
    "package.json": JSON.stringify({
      scripts: {
        "release:publish": "node scripts/private-release.mjs publish",
        "release:recover-public-fig-kiwi":
          "node scripts/recover-public-fig-kiwi.mjs",
      },
      devDependencies: {},
    }),
    ".changeset/config.json": JSON.stringify({
      access: "restricted",
      changelog: [
        "@changesets/changelog-github",
        { repo: "aakkino/web-to-figma" },
      ],
    }),
    "scripts/recover-public-fig-kiwi.mjs": [
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
    ].join("\n"),
    "scripts/private-release.mjs": [
      "const token = baseEnv.ACTIONS_PACKAGE_TOKEN;",
      "isolatedCredentialEnvironment(baseEnv, { NODE_AUTH_TOKEN: token })",
      "GH_TOKEN: undefined",
      "ACTIONS_PACKAGE_TOKEN: undefined",
      "Manage Actions access",
    ].join("\n"),
    ".github/workflows/release.yml": [
      "run: pnpm release:publish",
      "packages: read",
      workflowSecret("NODE_AUTH_TOKEN", "PACKAGE_PUBLISH_TOKEN"),
      workflowSecret("GH_TOKEN", "PACKAGE_PUBLISH_TOKEN"),
      workflowSecret("ACTIONS_PACKAGE_TOKEN", "GITHUB_TOKEN"),
      workflowSecret("GH_TOKEN", "GITHUB_TOKEN"),
    ].join("\n"),
    ".github/workflows/pkg-pr-new.yml": "run: pnpm release:preflight",
    ".github/workflows/recover-public-fig-kiwi.yml": [
      "group: recover-public-fig-kiwi",
      "environment: package-publish",
      "contents: read",
      "packages: write",
      "uses: actions/checkout@v6",
      'test "$(git rev-parse origin/main)" = "$(git rev-parse HEAD)"',
      [
        'run: pnpm release:recover-public-fig-kiwi --source-sha "$',
        '{{ inputs.source_sha }}"',
      ].join(""),
      ["RECOVERY_CONFIRM: $", "{{ inputs.recovery_confirm }}"].join(""),
    ].join("\n"),
  };
}

test("accepts only the guarded private release surfaces", () => {
  assert.deepEqual(validateReleaseSurfaces(validReleaseSurfaces()), []);
});

test("rejects public preview, npm, provenance, and Changesets publish paths", () => {
  const surfaces = validReleaseSurfaces();
  surfaces[".github/workflows/release.yml"] = [
    "run: pnpm changeset publish --registry https://registry.npmjs.org",
    "id-token: write",
    "run: pnpm exec pkg-pr-new publish",
  ].join("\n");
  const errors = validateReleaseSurfaces(surfaces).join("\n");
  assert.match(errors, /public package preview/u);
  assert.match(errors, /Changesets publication/u);
  assert.match(errors, /public npm registry/u);
  assert.match(errors, /unsupported provenance/u);
});

test("rejects a weakened or generic recovery surface", () => {
  const surfaces = validReleaseSurfaces();
  surfaces[".github/workflows/recover-public-fig-kiwi.yml"] =
    "run: node generic-delete.mjs";
  surfaces["scripts/recover-public-fig-kiwi.mjs"] =
    "export function deleteAnyPackage() {}";
  const errors = validateReleaseSurfaces(surfaces).join("\n");
  assert.match(errors, /protected environment/u);
  assert.match(errors, /packages write permission/u);
  assert.match(errors, /fixed recovery command/u);
  assert.match(errors, /recovery script must retain/u);
});

test("rejects GITHUB_TOKEN publication or missing PAT isolation", () => {
  const surfaces = validReleaseSurfaces();
  surfaces[".github/workflows/release.yml"] = [
    "run: pnpm release:publish",
    "packages: write",
    workflowSecret("NODE_AUTH_TOKEN", "GITHUB_TOKEN"),
    workflowSecret("GH_TOKEN", "GITHUB_TOKEN"),
  ].join("\n");
  const errors = validateReleaseSurfaces(surfaces).join("\n");
  assert.match(errors, /classic PAT package authentication/u);
  assert.match(errors, /classic PAT visibility authentication/u);
  assert.match(errors, /independent repository Actions authentication/u);
  assert.match(errors, /never publish with GITHUB_TOKEN/u);
});

test("rejects an Actions-access token fallback in the release script", () => {
  const surfaces = validReleaseSurfaces();
  surfaces["scripts/private-release.mjs"] = [
    "const token = baseEnv.ACTIONS_PACKAGE_TOKEN ?? baseEnv.NODE_AUTH_TOKEN;",
    "isolatedCredentialEnvironment(baseEnv, { NODE_AUTH_TOKEN: token })",
    "GH_TOKEN: undefined",
    "ACTIONS_PACKAGE_TOKEN: undefined",
    "Manage Actions access",
  ].join("\n");
  assert.match(
    validateReleaseSurfaces(surfaces).join("\n"),
    /must not fall back/u
  );
});

test("rejects elevated package permission or PAT reuse", () => {
  const surfaces = validReleaseSurfaces();
  surfaces[".github/workflows/release.yml"] += [
    "\npackages: write",
    "\nEXTRA_TOKEN: $",
    "{{ secrets.PACKAGE_PUBLISH_TOKEN }}",
  ].join("");
  const errors = validateReleaseSurfaces(surfaces).join("\n");
  assert.match(errors, /must remain packages: read/u);
  assert.match(errors, /only for npm and visibility/u);
});

test("rejects duplicate credential mappings", () => {
  const surfaces = validReleaseSurfaces();
  surfaces[".github/workflows/release.yml"] += `\n${workflowSecret(
    "GH_TOKEN",
    "GITHUB_TOKEN"
  )}`;
  assert.match(
    validateReleaseSurfaces(surfaces).join("\n"),
    /map GH_TOKEN exactly 2 time/u
  );
});

test("rejects using the incident SHA as recovery code", () => {
  const surfaces = validReleaseSurfaces();
  surfaces[".github/workflows/recover-public-fig-kiwi.yml"] += [
    "\nref: $",
    "{{ inputs.source_sha }}",
  ].join("");
  assert.match(
    validateReleaseSurfaces(surfaces).join("\n"),
    /only as incident evidence/u
  );
});
