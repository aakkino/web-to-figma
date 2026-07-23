import type { MotionDiagnostics, MotionMode } from "./types";

type AnimationSnapshot = {
  animation: Animation;
  currentTime: CSSNumberish | null;
  playState: AnimationPlayState;
};

export type MotionSnapshot = {
  diagnostics: MotionDiagnostics;
  restore(): MotionDiagnostics;
};

export function freezeCaptureMotion(
  root: Element,
  mode: MotionMode = "freeze"
): MotionSnapshot {
  if (mode === "live") {
    return createNoopSnapshot(mode);
  }

  const snapshots: Array<AnimationSnapshot> = [];
  const failures: Array<string> = [];
  try {
    const animations = root.getAnimations({ subtree: true });
    for (const animation of animations) {
      if (animation.playState !== "running") {
        continue;
      }
      const snapshot: AnimationSnapshot = {
        animation,
        currentTime: animation.currentTime,
        playState: animation.playState,
      };
      try {
        animation.pause();
        snapshots.push(snapshot);
      } catch (error) {
        failures.push(toErrorMessage(error));
      }
    }
  } catch (error) {
    failures.push(`enumeration: ${toErrorMessage(error)}`);
  }

  const diagnostics: MotionDiagnostics = {
    mode,
    paused: snapshots.length,
    restored: 0,
    restoreFailures: failures,
  };
  let restored = false;

  return {
    diagnostics,
    restore() {
      if (restored) {
        return diagnostics;
      }
      restored = true;
      for (const snapshot of snapshots) {
        try {
          if (snapshot.currentTime !== null) {
            snapshot.animation.currentTime = snapshot.currentTime;
          }
          if (snapshot.playState === "running") {
            snapshot.animation.play();
          }
          diagnostics.restored += 1;
        } catch (error) {
          failures.push(toErrorMessage(error));
        }
      }
      diagnostics.restoreFailures = [...failures];
      return diagnostics;
    },
  };
}

function createNoopSnapshot(mode: MotionMode): MotionSnapshot {
  const diagnostics: MotionDiagnostics = {
    mode,
    paused: 0,
    restored: 0,
    restoreFailures: [],
  };
  return {
    diagnostics,
    restore: () => diagnostics,
  };
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
