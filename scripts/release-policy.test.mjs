import assert from "node:assert/strict";
import test from "node:test";
import {
  ownedRegistry,
  releasePackages,
  validateReleaseSurfaces,
  validateWorkspaceManifests,
} from "./release-policy.mjs";

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
        publishConfig: { registry: ownedRegistry },
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
  assert.ok(errors.includes("must not request public access"));
  assert.ok(errors.includes("upstream @figit scope"));
  assert.ok(errors.includes("absent from the release allowlist"));
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
    ".github/workflows/release.yml": "run: pnpm release:publish",
    ".github/workflows/pkg-pr-new.yml": "run: pnpm release:preflight",
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
