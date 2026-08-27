import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const sourceRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(sourceRoot, "..", "..", "..");
const extensionRoot = join(repositoryRoot, "apps", "extension");
const converterImport = ["@aakkino", "dom-to-figma"].join("/");
const bridgePath = join(sourceRoot, "bridges", "dom-to-figma.ts");
const SOURCE_FILE_PATTERN = /\.(ts|tsx)$/;

describe("converter import boundary", () => {
  it("keeps the adapter's converter dependency inside the bridge", () => {
    const adapterFiles = collectSourceFiles(sourceRoot);
    const adapterImports = adapterFiles.filter((file) =>
      readFileSync(file, "utf8").includes(converterImport)
    );

    expect(adapterImports).toEqual([bridgePath]);
  });

  it("keeps extension product modules converter-independent", () => {
    const extensionImports = collectSourceFiles(extensionRoot).filter((file) =>
      readFileSync(file, "utf8").includes(converterImport)
    );

    expect(extensionImports).toEqual([]);
  });
});

function collectSourceFiles(root: string): Array<string> {
  const files: Array<string> = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".wxt") {
        continue;
      }
      files.push(...collectSourceFiles(path));
      continue;
    }
    if (SOURCE_FILE_PATTERN.test(entry.name)) {
      files.push(path);
    }
  }
  return files.sort((left, right) =>
    relative(root, left).localeCompare(relative(root, right))
  );
}
