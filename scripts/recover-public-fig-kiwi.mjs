import { execFileSync, spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ownedRegistry, repositoryRoot } from "./release-policy.mjs";

export const recoveryTarget = Object.freeze({
  confirmation: "DELETE_PUBLIC_FIG_KIWI_0.2.0",
  sourceSha: "7b5bc37d8b79d6afa26e17f7f10fb19be3d02b45",
  packageId: 14_681_422,
  versionId: 1_177_442_350,
  leafName: "fig-kiwi",
  name: "@aakkino/fig-kiwi",
  version: "0.2.0",
  repository: "aakkino/web-to-figma",
  integrity:
    "sha512-rkliZpAkJyWtVB0QYhmwcglrOijRPecC9nndIjjDAnFKiZJ80jK7qhpyR/FzdA2+XCMeERE7Sp33IPsJbcE4Zg==",
  packagePath: "/users/aakkino/packages/npm/fig-kiwi",
  deletePath: "/users/aakkino/packages/npm/fig-kiwi",
});

export async function recoverPublicFigKiwi({
  confirmation,
  sourceSha,
  boundary,
}) {
  if (confirmation !== recoveryTarget.confirmation) {
    throw new Error(
      "RECOVERY_CONFIRM does not match the fixed recovery target"
    );
  }
  if (sourceSha !== recoveryTarget.sourceSha) {
    throw new Error("source SHA does not match the public-package incident");
  }

  const packageRecord = await boundary.inspectPackage();
  if (
    packageRecord.id !== recoveryTarget.packageId ||
    packageRecord.name !== recoveryTarget.leafName ||
    packageRecord.package_type !== "npm" ||
    packageRecord.visibility !== "public" ||
    packageRecord.repository?.full_name !== recoveryTarget.repository
  ) {
    throw new Error(
      "GitHub package state does not match the fixed recovery target"
    );
  }

  const versions = await boundary.listVersions();
  if (
    versions.length !== 1 ||
    versions[0]?.id !== recoveryTarget.versionId ||
    versions[0]?.name !== recoveryTarget.version
  ) {
    throw new Error(
      "GitHub package versions do not match the single incident version"
    );
  }

  const registryVersion = await boundary.inspectRegistryVersion();
  if (
    registryVersion.name !== recoveryTarget.name ||
    registryVersion.version !== recoveryTarget.version ||
    registryVersion.dist?.integrity !== recoveryTarget.integrity ||
    normalizeRepository(registryVersion.repository) !==
      recoveryTarget.repository
  ) {
    throw new Error(
      "Registry metadata does not match the preserved incident evidence"
    );
  }
  if (
    registryVersion.gitHead !== undefined &&
    registryVersion.gitHead !== recoveryTarget.sourceSha
  ) {
    throw new Error("Registry gitHead conflicts with the incident source SHA");
  }

  await boundary.deletePackage();
  if ((await boundary.inspectDeletedPackage()) !== null) {
    throw new Error("GitHub package still exists after the recovery DELETE");
  }
}

function shellBoundary() {
  return {
    inspectPackage() {
      return ghJson(recoveryTarget.packagePath);
    },
    listVersions() {
      return ghJson(
        "/users/aakkino/packages/npm/fig-kiwi/versions?per_page=100"
      );
    },
    inspectRegistryVersion() {
      return JSON.parse(
        runCapture(npmExecutable(), [
          "view",
          `${recoveryTarget.name}@${recoveryTarget.version}`,
          "--registry",
          ownedRegistry,
          "--json",
        ])
      );
    },
    deletePackage() {
      execFileSync(
        "gh",
        ["api", "--method", "DELETE", recoveryTarget.deletePath],
        { cwd: repositoryRoot, stdio: "inherit" }
      );
    },
    inspectDeletedPackage() {
      return ghOptionalJson(recoveryTarget.packagePath);
    },
  };
}

function ghJson(path) {
  return JSON.parse(runCapture("gh", ["api", path]));
}

function ghOptionalJson(path) {
  const result = spawnSync("gh", ["api", path], {
    cwd: repositoryRoot,
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });
  if (result.status === 0) {
    return JSON.parse(result.stdout);
  }
  const diagnostic = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (/\b(?:HTTP 404|404 Not Found)\b/iu.test(diagnostic)) {
    return null;
  }
  throw new Error(
    `Post-delete package inspection failed without an explicit 404: ${diagnostic.slice(0, 2000)}`
  );
}

function runCapture(command, args) {
  return execFileSync(command, args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });
}

function npmExecutable() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function normalizeRepository(repository) {
  const value =
    typeof repository === "string" ? repository : (repository?.url ?? "");
  return value
    .replace(/^git\+/u, "")
    .replace(/^https:\/\/github\.com\//u, "")
    .replace(/\.git$/u, "");
}

function argument(args, name) {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await recoverPublicFigKiwi({
    confirmation: process.env.RECOVERY_CONFIRM,
    sourceSha: argument(process.argv.slice(2), "--source-sha"),
    boundary: shellBoundary(),
  });
}
