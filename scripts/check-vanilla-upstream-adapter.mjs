import {
  readDeltaRegistry,
  runAdapterConsumer,
} from "./upstream-adapter-fixture.mjs";

const stableVersion = readDeltaRegistry().targets?.stable?.version;
if (typeof stableVersion !== "string" || stableVersion.length === 0) {
  throw new Error("Stable upstream version is missing from the delta registry");
}

runAdapterConsumer({
  coreSpec: stableVersion,
  label: `stable@${stableVersion}`,
});
