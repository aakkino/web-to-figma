import { describe, expect, it } from "vitest";

import { freezeCaptureMotion } from "./motion-snapshot";

const ANIMATION_DURATION_MS = 1000;
const ANIMATION_START_TIME_MS = 250;

describe("capture motion snapshot", () => {
  it("pauses running animations at their current time and restores them", async () => {
    document.body.innerHTML = '<div id="target"></div>';
    const target = document.querySelector("#target");
    if (!(target instanceof HTMLElement)) {
      throw new Error("target not found");
    }
    const animation = target.animate([{ opacity: "0" }, { opacity: "1" }], {
      duration: ANIMATION_DURATION_MS,
      fill: "both",
    });
    animation.currentTime = ANIMATION_START_TIME_MS;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const currentTime = animation.currentTime;

    const snapshot = freezeCaptureMotion(target);

    expect(snapshot.diagnostics.paused).toBe(1);
    expect(animation.playState).toBe("paused");
    expect(animation.currentTime).toBe(currentTime);

    const restored = snapshot.restore();

    expect(restored.restored).toBe(1);
    expect(animation.playState).toBe("running");
    animation.cancel();
  });

  it("does not inspect animations in live mode", () => {
    document.body.innerHTML = '<div id="target"></div>';
    const target = document.querySelector("#target");
    if (!(target instanceof HTMLElement)) {
      throw new Error("target not found");
    }
    let calls = 0;
    const originalGetAnimations = target.getAnimations.bind(target);
    target.getAnimations = ((...args) => {
      calls += 1;
      return originalGetAnimations(...args);
    }) as typeof target.getAnimations;

    const snapshot = freezeCaptureMotion(target, "live");

    expect(calls).toBe(0);
    expect(snapshot.diagnostics.paused).toBe(0);
  });

  it("leaves finished and idle animations untouched", () => {
    document.body.innerHTML = '<div id="target"></div>';
    const target = document.querySelector("#target");
    if (!(target instanceof HTMLElement)) {
      throw new Error("target not found");
    }
    const animations = [
      { playState: "finished" },
      { playState: "idle" },
    ] as Array<Pick<Animation, "playState">>;
    target.getAnimations = (() => animations) as typeof target.getAnimations;

    const snapshot = freezeCaptureMotion(target);

    expect(snapshot.diagnostics.paused).toBe(0);
    expect(snapshot.restore().restored).toBe(0);
    expect(snapshot.diagnostics.restoreFailures).toEqual([]);
  });

  it("reports a restore failure without resetting other diagnostics", () => {
    document.body.innerHTML = '<div id="target"></div>';
    const target = document.querySelector("#target");
    if (!(target instanceof HTMLElement)) {
      throw new Error("target not found");
    }
    const animation = {
      currentTime: 100,
      pause: () => undefined,
      playState: "running",
      play: () => {
        throw new Error("playback unavailable");
      },
    } as unknown as Animation;
    target.getAnimations = (() => [animation]) as typeof target.getAnimations;

    const snapshot = freezeCaptureMotion(target);
    const diagnostics = snapshot.restore();

    expect(diagnostics.paused).toBe(1);
    expect(diagnostics.restored).toBe(0);
    expect(diagnostics.restoreFailures).toContain("playback unavailable");
  });
});
