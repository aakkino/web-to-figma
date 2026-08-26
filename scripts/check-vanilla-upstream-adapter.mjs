import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const registry = JSON.parse(
  readFileSync(resolve(repositoryRoot, "docs/upstream-core-delta.json"), "utf8")
);
const stableVersion = registry.targets?.stable?.version;
if (typeof stableVersion !== "string" || stableVersion.length === 0) {
  throw new Error("Stable upstream version is missing from the delta registry");
}

const adapterDist = resolve(
  repositoryRoot,
  "internal/browser-capture-adapter/dist"
);
const composedDomDist = resolve(repositoryRoot, "packages/composed-dom/dist");
for (const dist of [adapterDist, composedDomDist]) {
  if (!existsSync(resolve(dist, "index.mjs"))) {
    throw new Error(
      `Build compatibility artifacts before running this check: ${dist}`
    );
  }
}

const consumerRoot = mkdtempSync(join(tmpdir(), "figit-vanilla-upstream-"));
try {
  writeJson(resolve(consumerRoot, "package.json"), {
    private: true,
    type: "module",
    dependencies: {
      "@figit/dom-to-figma": stableVersion,
      "happy-dom": "20.9.0",
    },
  });
  installDependencies();

  installBuiltPackage("@figit/browser-capture-adapter", adapterDist, {
    "@figit/composed-dom": "0.1.0",
    "@figit/dom-to-figma": stableVersion,
  });
  installBuiltPackage("@figit/composed-dom", composedDomDist);

  writeFileSync(
    resolve(consumerRoot, "consumer.ts"),
    `import { createDomToFigmaBridge } from "@figit/browser-capture-adapter";
import type { DomToFigmaBridgeOptions } from "@figit/browser-capture-adapter";
import { createFigmaConverter } from "@figit/dom-to-figma";

const options: DomToFigmaBridgeOptions = { layout: "absolute" };
const bridge = createDomToFigmaBridge(options);
void bridge;
void createFigmaConverter;
`
  );
  writeJson(resolve(consumerRoot, "tsconfig.json"), {
    compilerOptions: {
      lib: ["ES2022", "DOM", "DOM.Iterable"],
      module: "NodeNext",
      moduleResolution: "NodeNext",
      noEmit: true,
      strict: true,
      target: "ES2022",
    },
    include: ["consumer.ts"],
  });
  run(process.execPath, [
    resolve(
      repositoryRoot,
      "internal/browser-capture-adapter/node_modules/typescript/lib/tsc.js"
    ),
    "--project",
    "tsconfig.json",
  ]);

  writeFileSync(
    resolve(consumerRoot, "runtime.mjs"),
    `import { createDomToFigmaBridge } from "@figit/browser-capture-adapter";
import * as core from "@figit/dom-to-figma";
import { Window } from "happy-dom";

if (typeof core.createImagePreparation !== "undefined") {
  throw new Error("Expected vanilla stable core without createImagePreparation");
}
const window = new Window();
globalThis.window = window;
globalThis.document = window.document;
globalThis.Element = window.Element;
globalThis.HTMLElement = window.HTMLElement;
globalThis.HTMLImageElement = window.HTMLImageElement;
globalThis.Node = window.Node;
globalThis.Text = window.Text;
const bytes = new Uint8Array([137, 80, 78, 71]).buffer;
const bridge = createDomToFigmaBridge({
  classify: () => "skip",
  imageLoader: async () => ({ bytes, mimeType: "image/png" }),
});
const src = "https://example.test/stable.png";
const element = { src, currentSrc: src };
const result = await bridge.imagePreparation.prepare({ src, element });
if (result.byteLength !== bytes.byteLength) {
  throw new Error("Vanilla fallback did not consume the prepared image bytes");
}
bridge.imagePreparation.setPlaceholder({ src, element }, "user-skipped");
const root = document.createElement("div");
document.body.append(root);
const capture = await bridge.convert({ element: root, width: 10, height: 10 });
if (!capture.clipboardHtml.includes("figmeta")) {
  throw new Error("Vanilla fallback did not complete a basic conversion");
}
bridge.clearCache();
console.log("vanilla upstream adapter compatibility passed");
`
  );
  run(process.execPath, ["runtime.mjs"]);
} finally {
  rmSync(consumerRoot, { recursive: true, force: true });
}

function installBuiltPackage(name, dist, dependencies = {}) {
  const packageRoot = resolve(consumerRoot, "node_modules", ...name.split("/"));
  mkdirSync(packageRoot, { recursive: true });
  cpSync(dist, resolve(packageRoot, "dist"), { recursive: true });
  writeJson(resolve(packageRoot, "package.json"), {
    name,
    version: "0.0.0-compat",
    type: "module",
    exports: {
      ".": {
        types: "./dist/index.d.mts",
        import: "./dist/index.mjs",
      },
    },
    dependencies,
  });
}

function run(command, args) {
  execFileSync(command, args, {
    cwd: consumerRoot,
    stdio: "inherit",
  });
}

function installDependencies() {
  const args = ["install", "--ignore-scripts", "--no-audit", "--no-fund"];
  if (process.platform === "win32") {
    run(process.env.ComSpec ?? "cmd.exe", [
      "/d",
      "/s",
      "/c",
      `npm ${args.join(" ")}`,
    ]);
    return;
  }
  run("npm", args);
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}
