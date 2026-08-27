import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  readDeltaRegistry,
  repositoryRoot,
  runAdapterConsumer,
  runPackageManager,
  upstreamArchiveArgs,
} from "./upstream-adapter-fixture.mjs";

const target = readDeltaRegistry().targets?.upstreamMain;
if (
  typeof target?.ref !== "string" ||
  typeof target?.commit !== "string" ||
  !/^[0-9a-f]{40}$/u.test(target.commit)
) {
  throw new Error(
    "Reviewed upstream-main ref and commit are missing from the delta registry"
  );
}

const resolvedCommit = execFileSync("git", ["rev-parse", target.ref], {
  cwd: repositoryRoot,
  encoding: "utf8",
}).trim();
if (resolvedCommit !== target.commit) {
  throw new Error(
    `Reviewed upstream-main ref drifted: ${target.ref} resolves to ${resolvedCommit}, expected ${target.commit}`
  );
}

const fixtureRoot = mkdtempSync(join(tmpdir(), "figit-upstream-main-"));
try {
  const checkoutRoot = resolve(fixtureRoot, "checkout");
  const packRoot = resolve(fixtureRoot, "pack");
  mkdirSync(checkoutRoot, { recursive: true });
  mkdirSync(packRoot, { recursive: true });

  const archive = execFileSync("git", upstreamArchiveArgs(target.commit), {
    cwd: repositoryRoot,
    maxBuffer: 1024 * 1024 * 100,
  });
  execFileSync("tar", ["-xf", "-", "-C", checkoutRoot], {
    input: archive,
    maxBuffer: 1024 * 1024 * 100,
  });

  runPackageManager(
    ["install", "--frozen-lockfile", "--ignore-scripts"],
    checkoutRoot
  );
  runPackageManager(["--filter", "@figit/dom-to-figma", "build"], checkoutRoot);
  runPackageManager(
    ["--filter", "@figit/dom-to-figma", "pack", "--pack-destination", packRoot],
    checkoutRoot
  );

  const archives = readdirSync(packRoot).filter((name) =>
    name.endsWith(".tgz")
  );
  if (archives.length !== 1) {
    throw new Error(
      `Expected one upstream-main package archive, found ${archives.length}`
    );
  }
  const packagePath = resolve(packRoot, archives[0]);
  runAdapterConsumer({
    coreSpec: `file:${packagePath.replaceAll("\\", "/")}`,
    label: `upstream-main@${target.commit}`,
  });
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}
