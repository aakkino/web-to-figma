import { Button } from "@figit/ui/components/button";
import {
  ArrowClockwiseIcon,
  ArrowsOutIcon,
  CheckCircleIcon,
  CircleNotchIcon,
  CopyIcon,
  CursorClickIcon,
  FloppyDiskIcon,
  FolderOpenIcon,
  MinusIcon,
  PlayIcon,
  SlidersHorizontalIcon,
  TextTIcon,
  WarningCircleIcon,
  XIcon,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { Toaster, toast } from "sonner";
import type { ContentScriptContext } from "#imports";

import type {
  CaptureFontMode,
  CaptureImageMode,
  CaptureLayout,
  CaptureLazyActivation,
  CaptureLineBreaks,
  CaptureMotion,
  CaptureOutput,
} from "../../shared/capture-settings";
import {
  detectPageTheme,
  subscribePageTheme,
  useResolvedTheme,
} from "../../shared/theme";
import { createElementCaptureTarget, createPageCaptureTarget } from "./convert";
import { Picker } from "./picker";
import type {
  OutputRunState,
  OutputSinkResult,
  WorkspaceController,
  WorkspaceState,
  WorkspaceView,
} from "./workspace-controller";

const MILLISECONDS_PER_SECOND = 1000;
// biome-ignore lint/style/noMagicNumbers: Binary unit conversion is explicit here.
const BYTES_PER_MEBIBYTE = 1024 * 1024;

type AppProps = {
  ctx: ContentScriptContext;
  controller: WorkspaceController;
  outputCapabilities: Readonly<Record<CaptureOutput, boolean>>;
  shadowHost: HTMLElement;
};

export function App({
  ctx,
  controller,
  outputCapabilities,
  shadowHost,
}: AppProps) {
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot
  );
  const theme = useResolvedTheme(detectPageTheme, subscribePageTheme);
  const restorePickedBackground = useRef<(() => void) | null>(null);

  useEffect(() => {
    ignorePromise(controller.init());
    return () => {
      restorePickedBackground.current?.();
      restorePickedBackground.current = null;
      controller.dispose();
    };
  }, [controller]);

  useEffect(() => {
    if (
      state.capture.phase === "completed" ||
      state.capture.phase === "failed" ||
      state.capture.phase === "canceled"
    ) {
      restorePickedBackground.current?.();
      restorePickedBackground.current = null;
    }
  }, [state.capture.phase]);

  const handlePageCapture = useCallback(() => {
    ignorePromise(controller.analyzeTarget(createPageCaptureTarget()));
  }, [controller]);

  const handlePickerStart = useCallback(() => {
    controller.startPicker();
  }, [controller]);

  const handlePickerConfirm = useCallback(
    (element: HTMLElement) => {
      try {
        const target = createElementCaptureTarget(element);
        restorePickedBackground.current?.();
        restorePickedBackground.current = target.restore;
        ignorePromise(controller.analyzeTarget(target.input));
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Selected element cannot be captured."
        );
        controller.cancelPicker();
      }
    },
    [controller]
  );

  const showPanel = state.surface === "visible";
  const showMinimizedButton =
    state.surface === "minimized" &&
    state.view !== "picking" &&
    isActiveCapture(state.view);

  return (
    <div className={theme}>
      <Picker
        active={state.view === "picking"}
        ctx={ctx}
        onCancel={controller.cancelPicker}
        onConfirm={handlePickerConfirm}
        shadowHost={shadowHost}
      />
      {showPanel ? (
        <WorkspacePanel
          capabilities={outputCapabilities}
          controller={controller}
          onClose={controller.close}
          onMinimize={controller.minimize}
          onPageCapture={handlePageCapture}
          onPickerStart={handlePickerStart}
          state={state}
        />
      ) : null}
      {showMinimizedButton ? (
        <button
          aria-label="Restore capture workspace"
          className="pointer-events-auto fixed right-4 bottom-4 z-[2147483647] flex size-11 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          onClick={controller.restore}
          type="button"
        >
          <CircleNotchIcon className="size-5 animate-spin text-primary" />
          <span className="sr-only">Restore capture workspace</span>
        </button>
      ) : null}
      <Toaster position="bottom-right" richColors theme={theme} />
    </div>
  );
}

type WorkspacePanelProps = {
  capabilities: Readonly<Record<CaptureOutput, boolean>>;
  controller: WorkspaceController;
  onClose: () => void;
  onMinimize: () => void;
  onPageCapture: () => void;
  onPickerStart: () => void;
  state: WorkspaceState;
};

function WorkspacePanel({
  capabilities,
  controller,
  onClose,
  onMinimize,
  onPageCapture,
  onPickerStart,
  state,
}: WorkspacePanelProps) {
  const locked =
    isCaptureBusy(state.capture.phase) || state.fontSpec.status === "running";
  return (
    <section
      aria-labelledby="figit-workspace-title"
      className="pointer-events-auto fixed top-4 right-4 z-[2147483647] flex max-h-[calc(100vh-2rem)] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border border-border bg-background/95 text-foreground shadow-2xl backdrop-blur-sm"
      role="dialog"
    >
      <header className="flex shrink-0 items-start justify-between gap-3 border-border border-b px-4 py-3">
        <div className="min-w-0">
          <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-[0.12em]">
            Figit capture
          </p>
          <h1
            className="truncate font-heading font-semibold text-base"
            id="figit-workspace-title"
          >
            Capture workspace
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            aria-label="Minimize workspace"
            onClick={onMinimize}
            size="icon"
            variant="ghost"
          >
            <MinusIcon />
          </Button>
          <Button
            aria-label="Close workspace"
            onClick={onClose}
            size="icon"
            variant="ghost"
          >
            <XIcon />
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {state.view === "idle" || state.view === "canceled" ? (
          <IdleView
            capabilities={capabilities}
            controller={controller}
            locked={false}
            onPageCapture={onPageCapture}
            onPickerStart={onPickerStart}
            state={state}
          />
        ) : null}
        {state.view === "review" ? (
          <ReviewView controller={controller} state={state} />
        ) : null}
        {isProgressView(state.view) ? (
          <ProgressView controller={controller} state={state} />
        ) : null}
        {state.view === "image-recovery" ||
        state.view === "image-budget-review" ? (
          <ImageRecoveryView controller={controller} state={state} />
        ) : null}
        {state.view === "font-recovery" ? (
          <FontRecoveryView controller={controller} state={state} />
        ) : null}
        {state.view === "ready-to-output" ||
        state.view === "output" ||
        state.view === "output-partial" ? (
          <ReadyView controller={controller} state={state} />
        ) : null}
        {state.view === "error" ? (
          <ErrorView onPageCapture={onPageCapture} state={state} />
        ) : null}
        {state.view === "opening" ? <OpeningView /> : null}

        {state.view !== "picking" && state.view !== "opening" ? (
          <SettingsSection
            capabilities={capabilities}
            controller={controller}
            disabled={locked || state.view === "ready-to-output"}
            state={state}
          />
        ) : null}
      </div>
    </section>
  );
}

type IdleViewProps = {
  capabilities: Readonly<Record<CaptureOutput, boolean>>;
  controller: WorkspaceController;
  locked: boolean;
  onPageCapture: () => void;
  onPickerStart: () => void;
  state: WorkspaceState;
};

function IdleView({
  capabilities,
  controller,
  locked,
  onPageCapture,
  onPickerStart,
  state,
}: IdleViewProps) {
  return (
    <div className="space-y-4">
      {state.view === "canceled" ? (
        <StatusLine icon={<WarningCircleIcon />} text="Capture canceled." />
      ) : null}
      <div className="space-y-2">
        <Button
          className="w-full justify-start"
          disabled={locked}
          onClick={onPageCapture}
        >
          <CopyIcon />
          Capture full page
        </Button>
        <Button
          className="w-full justify-start"
          disabled={locked}
          onClick={onPickerStart}
          variant="outline"
        >
          <CursorClickIcon />
          Pick an element
        </Button>
        <Button
          className="w-full justify-start"
          disabled={locked}
          onClick={() => ignorePromise(controller.openPackage())}
          variant="ghost"
        >
          <FolderOpenIcon />
          Open .figit capture
        </Button>
      </div>
      {!capabilities.file ? (
        <p className="text-muted-foreground text-xs">
          Local capture packages will be enabled by the output module.
        </p>
      ) : null}
    </div>
  );
}

function ReviewView({
  controller,
  state,
}: {
  controller: WorkspaceController;
  state: WorkspaceState;
}) {
  const plan = state.capture.analysis?.plan;
  return (
    <div className="space-y-3">
      <StatusLine
        icon={<CheckCircleIcon />}
        text="Target analyzed. Review before capture."
      />
      <div className="grid grid-cols-3 gap-2 text-center">
        <Metric label="Image nodes" value={plan?.imageNodeCount ?? 0} />
        <Metric
          label="Unique images"
          value={plan?.uniqueImageResourceCount ?? 0}
        />
        <Metric
          label="CSS images"
          value={plan?.unsupportedBackgroundImageCount ?? 0}
        />
      </div>
      <p className="text-muted-foreground text-xs">
        {state.draftSettings.image.mode === "skip"
          ? "Images will be represented by transparent placeholders."
          : "Images will be prepared before fonts and page conversion."}
      </p>
      <Button
        className="w-full"
        disabled={state.fontSpec.status === "running"}
        onClick={() => ignorePromise(controller.startCapture())}
      >
        <PlayIcon />
        Start capture
      </Button>
      <Button
        className="w-full"
        disabled={state.fontSpec.status === "running"}
        onClick={() => ignorePromise(controller.copyFontSpec())}
        variant="outline"
      >
        {state.fontSpec.status === "running" ? (
          <CircleNotchIcon className="animate-spin" />
        ) : (
          <TextTIcon />
        )}
        {state.fontSpec.status === "running"
          ? "Copying typography spec..."
          : "Copy typography spec"}
      </Button>
      {state.fontSpec.status === "success" ||
      state.fontSpec.status === "failed" ? (
        <p
          className={
            state.fontSpec.status === "failed"
              ? "text-destructive text-xs"
              : "text-muted-foreground text-xs"
          }
          role={state.fontSpec.status === "failed" ? "alert" : "status"}
        >
          {state.fontSpec.message}
        </p>
      ) : null}
    </div>
  );
}

function ProgressView({
  controller,
  state,
}: {
  controller: WorkspaceController;
  state: WorkspaceState;
}) {
  const progress = state.capture.progress ?? state.capture.imageStage?.progress;
  const isImage = state.view === "image-progress";
  const isActivation = state.view === "activation-progress";
  return (
    <div className="space-y-3">
      <StatusLine
        icon={<CircleNotchIcon className="animate-spin" />}
        text={phaseLabel(state.view)}
      />
      {isImage && progress ? (
        <div className="space-y-2">
          <progress
            aria-label="Image preparation progress"
            className="h-2 w-full accent-primary"
            max={Math.max(progress.total, 1)}
            value={progress.completed}
          />
          <div className="flex justify-between gap-3 text-muted-foreground text-xs">
            <span>
              {progress.completed}/{progress.total} processed
            </span>
            <span>{progress.failed} failed</span>
            <span>{formatMiB(progress.preparedBytes)}</span>
          </div>
          <p className="text-muted-foreground text-xs">
            Elapsed {formatElapsed(progress.elapsedMs)}
          </p>
        </div>
      ) : null}
      {isActivation && state.capture.activationProgress ? (
        <div className="space-y-2">
          <progress
            aria-label="Lazy resource activation progress"
            className="h-2 w-full accent-primary"
            max={Math.max(state.capture.activationProgress.maxSteps, 1)}
            value={state.capture.activationProgress.step}
          />
          <div className="flex justify-between gap-3 text-muted-foreground text-xs">
            <span>
              Pass {state.capture.activationProgress.pass}/
              {state.capture.activationProgress.maxPasses}
            </span>
            <span>
              {state.capture.activationProgress.containersVisited} containers
            </span>
            <span>
              {formatElapsed(state.capture.activationProgress.elapsedMs)}
            </span>
          </div>
        </div>
      ) : null}
      {!isImage && state.capture.fontProgress ? (
        <div className="flex justify-between gap-3 text-muted-foreground text-xs">
          <span>
            {state.capture.fontProgress.completed}/
            {state.capture.fontProgress.total} fonts
          </span>
          <span>{state.capture.fontProgress.failed} failed</span>
        </div>
      ) : null}
      <Button
        className="w-full"
        disabled={state.capture.phase === "canceling"}
        onClick={() => ignorePromise(controller.dispatchCapture("cancel"))}
        variant="outline"
      >
        Cancel capture
      </Button>
    </div>
  );
}

function ImageRecoveryView({
  controller,
  state,
}: {
  controller: WorkspaceController;
  state: WorkspaceState;
}) {
  const hard = state.capture.decision === "placeholders-after-hard-budget";
  const soft = state.capture.decision === "continue-after-soft-budget";
  const failed = state.capture.imageStage?.progress.failed ?? 0;
  return (
    <div className="space-y-3">
      <StatusLine
        icon={<WarningCircleIcon />}
        text={imageRecoveryLabel(hard, soft)}
      />
      <p className="text-muted-foreground text-xs">
        {hard
          ? "No new images will be processed. Continue with placeholders or cancel."
          : `${failed} image resource${failed === 1 ? "" : "s"} need a decision.`}
      </p>
      {!(hard || soft) ? (
        <Button
          className="w-full"
          onClick={() =>
            ignorePromise(controller.dispatchCapture("retry-failed-images"))
          }
        >
          <ArrowClockwiseIcon />
          Retry failed images
        </Button>
      ) : null}
      {soft ? (
        <Button
          className="w-full"
          onClick={() =>
            ignorePromise(
              controller.dispatchCapture("continue-after-soft-budget")
            )
          }
        >
          Continue image processing
        </Button>
      ) : null}
      <Button
        className="w-full"
        onClick={() =>
          ignorePromise(
            controller.dispatchCapture("continue-with-placeholders")
          )
        }
        variant="outline"
      >
        Continue with placeholders
      </Button>
      {!hard ? (
        <Button
          className="w-full"
          onClick={() => ignorePromise(controller.dispatchCapture("cancel"))}
          variant="ghost"
        >
          Cancel capture
        </Button>
      ) : null}
    </div>
  );
}

function FontRecoveryView({
  controller,
  state,
}: {
  controller: WorkspaceController;
  state: WorkspaceState;
}) {
  return (
    <div className="space-y-3">
      <StatusLine
        icon={<WarningCircleIcon />}
        text="Strict font matching needs attention."
      />
      <p className="text-muted-foreground text-xs">
        Retry the font stage, use compatible matching, or cancel. Text nodes
        stay editable.
      </p>
      <Button
        className="w-full"
        onClick={() => ignorePromise(controller.dispatchCapture("retry-fonts"))}
      >
        <ArrowClockwiseIcon />
        Retry fonts
      </Button>
      <Button
        className="w-full"
        onClick={() =>
          ignorePromise(controller.dispatchCapture("switch-to-compatible"))
        }
        variant="outline"
      >
        Use compatible fonts
      </Button>
      <Button
        className="w-full"
        onClick={() => ignorePromise(controller.dispatchCapture("cancel"))}
        variant="ghost"
      >
        Cancel capture
      </Button>
      {state.capture.fontDiagnostics?.length ? (
        <p className="text-muted-foreground text-xs">
          {state.capture.fontDiagnostics.length} font requests were checked.
        </p>
      ) : null}
    </div>
  );
}

function ReadyView({
  controller,
  state,
}: {
  controller: WorkspaceController;
  state: WorkspaceState;
}) {
  const outputs = state.effectiveSettings.outputs;
  const label = outputCommandLabel(outputs);
  return (
    <div className="space-y-3">
      <StatusLine icon={<CheckCircleIcon />} text="Capture is ready." />
      <p className="text-muted-foreground text-xs">
        Output is manual. The page will not be recaptured when an output is
        retried.
      </p>
      <Button
        className="w-full"
        disabled={state.output.status === "running"}
        onClick={() => ignorePromise(controller.executeOutput())}
      >
        {state.output.status === "running" ? (
          <CircleNotchIcon className="animate-spin" />
        ) : (
          <FloppyDiskIcon />
        )}
        {label}
      </Button>
      <OutputResults controller={controller} output={state.output} />
    </div>
  );
}

function OutputResults({
  controller,
  output,
}: {
  controller: WorkspaceController;
  output: OutputRunState;
}) {
  const results = [output.results.clipboard, output.results.file].filter(
    (result): result is OutputSinkResult => result !== null
  );
  if (results.length === 0) {
    return null;
  }
  return (
    <div className="space-y-2 text-xs">
      {results.map((result) => (
        <div
          className="flex items-center justify-between gap-3"
          key={result.sink}
        >
          <span className="flex min-w-0 items-center gap-2">
            {result.status === "success" ? (
              <CheckCircleIcon className="size-4 shrink-0 text-primary" />
            ) : (
              <WarningCircleIcon className="size-4 shrink-0 text-destructive" />
            )}
            <span className="truncate">{outputLabel(result.sink)}</span>
          </span>
          {result.status === "failed" ? (
            <Button
              onClick={() => ignorePromise(controller.retryOutput(result.sink))}
              size="sm"
              variant="outline"
            >
              Retry
            </Button>
          ) : null}
        </div>
      ))}
      {results.some((result) => result.message) ? (
        <p className="text-muted-foreground text-xs">
          {results.find((result) => result.status === "failed")?.message}
        </p>
      ) : null}
    </div>
  );
}

function ErrorView({
  onPageCapture,
  state,
}: {
  onPageCapture: () => void;
  state: WorkspaceState;
}) {
  return (
    <div className="space-y-3">
      <StatusLine
        icon={<WarningCircleIcon />}
        text="Capture could not continue."
      />
      <p className="text-destructive text-xs" role="alert">
        {state.message?.text ??
          state.capture.failure?.message ??
          "Unknown capture error."}
      </p>
      <Button className="w-full" onClick={onPageCapture} variant="outline">
        <ArrowClockwiseIcon />
        Start a new capture
      </Button>
    </div>
  );
}

function OpeningView() {
  return (
    <StatusLine
      icon={<CircleNotchIcon className="animate-spin" />}
      text="Opening capture package..."
    />
  );
}

function SettingsSection({
  capabilities,
  controller,
  disabled,
  state,
}: {
  capabilities: Readonly<Record<CaptureOutput, boolean>>;
  controller: WorkspaceController;
  disabled: boolean;
  state: WorkspaceState;
}) {
  const settings = state.draftSettings;
  return (
    <div className="space-y-3 border-border border-t pt-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-medium text-sm">
          <SlidersHorizontalIcon className="size-4" />
          Capture settings
        </h2>
        <Button
          disabled={disabled}
          onClick={() => ignorePromise(controller.saveDefaults())}
          size="sm"
          variant="outline"
        >
          Set as default
        </Button>
      </div>
      <div className="grid gap-3">
        <SettingSelect
          disabled={disabled}
          label="Images"
          onChange={(value) =>
            controller.updateSettings({
              image: { mode: value as CaptureImageMode },
            })
          }
          options={[
            ["process", "Process images"],
            ["skip", "Skip images"],
          ]}
          value={settings.image.mode}
        />
        <SettingSelect
          disabled={disabled}
          label="Fonts"
          onChange={(value) =>
            controller.updateSettings({
              font: { mode: value as CaptureFontMode },
            })
          }
          options={[
            ["compatible", "Compatible"],
            ["fast-local", "Fast local"],
            ["strict", "Strict"],
          ]}
          value={settings.font.mode}
        />
      </div>
      <fieldset className="space-y-2" disabled={disabled}>
        <legend className="font-medium text-xs">Outputs</legend>
        <OutputToggle
          checked={settings.outputs.clipboard}
          label="Copy to Figma"
          onChange={(checked) =>
            controller.updateSettings({ outputs: { clipboard: checked } })
          }
        />
        <OutputToggle
          checked={settings.outputs.file}
          disabled={!capabilities.file}
          hint={
            capabilities.file
              ? undefined
              : "Available with the .figit output module"
          }
          label="Save local .figit"
          onChange={(checked) =>
            controller.updateSettings({ outputs: { file: checked } })
          }
        />
      </fieldset>
      <details>
        <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-muted-foreground text-xs">
          <ArrowsOutIcon className="size-3.5" />
          Advanced settings
        </summary>
        <div className="mt-3 grid gap-3">
          <SettingSelect
            disabled={disabled}
            label="Layout"
            onChange={(value) =>
              controller.updateSettings({
                advanced: { layout: value as CaptureLayout },
              })
            }
            options={[
              ["auto", "Auto layout"],
              ["absolute", "Absolute layout"],
            ]}
            value={settings.advanced.layout}
          />
          <SettingSelect
            disabled={disabled}
            label="Motion"
            onChange={(value) =>
              controller.updateSettings({
                advanced: { motion: value as CaptureMotion },
              })
            }
            options={[
              ["freeze", "Freeze motion"],
              ["live", "Keep motion live"],
            ]}
            value={settings.advanced.motion}
          />
          <SettingSelect
            disabled={disabled}
            label="CJK line breaks"
            onChange={(value) =>
              controller.updateSettings({
                advanced: { lineBreaks: value as CaptureLineBreaks },
              })
            }
            options={[
              ["auto", "Automatic"],
              ["off", "Off"],
            ]}
            value={settings.advanced.lineBreaks}
          />
          <OutputToggle
            checked={settings.advanced.lazyActivation === "auto"}
            disabled={disabled}
            label="Activate lazy-loaded media"
            onChange={(checked) =>
              controller.updateSettings({
                advanced: {
                  lazyActivation: (checked
                    ? "auto"
                    : "off") as CaptureLazyActivation,
                },
              })
            }
          />
          <label className="grid gap-1.5 font-medium text-xs">
            <span className="flex items-center justify-between gap-3">
              <span>Page settle timeout</span>
              <span className="font-normal text-muted-foreground">
                {settings.advanced.settleTimeoutMs === 0
                  ? "Skip"
                  : `${settings.advanced.settleTimeoutMs} ms`}
              </span>
            </span>
            <input
              className="w-full accent-primary"
              disabled={disabled}
              max={30_000}
              min={0}
              onChange={(event) =>
                controller.updateSettings({
                  advanced: {
                    settleTimeoutMs: Number(event.currentTarget.value),
                  },
                })
              }
              step={500}
              type="range"
              value={settings.advanced.settleTimeoutMs}
            />
          </label>
        </div>
      </details>
      {state.message ? (
        <p
          className={
            state.message.kind === "error"
              ? "text-destructive text-xs"
              : "text-muted-foreground text-xs"
          }
          role={state.message.kind === "error" ? "alert" : "status"}
        >
          {state.message.text}
        </p>
      ) : null}
    </div>
  );
}

function SettingSelect({
  disabled,
  label,
  onChange,
  options,
  value,
}: {
  disabled: boolean;
  label: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<readonly [string, string]>;
  value: string;
}) {
  return (
    <label className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 font-medium text-xs">
      <span>{label}</span>
      <select
        className="h-8 max-w-[180px] rounded-md border border-input bg-background px-2 text-foreground text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.value)}
        value={value}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function OutputToggle({
  checked,
  disabled = false,
  hint,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  hint?: string;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2 text-xs">
      <input
        checked={checked}
        className="mt-0.5 size-3.5 accent-primary"
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.checked)}
        type="checkbox"
      />
      <span className="grid gap-0.5">
        <span className={disabled ? "text-muted-foreground" : ""}>{label}</span>
        {hint ? (
          <span className="font-normal text-muted-foreground">{hint}</span>
        ) : null}
      </span>
    </label>
  );
}

function StatusLine({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 font-medium text-sm">
      <span className="text-primary">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid min-w-0 gap-1 rounded-md border border-border bg-background-secondary px-2 py-2">
      <strong className="font-heading text-base">{value}</strong>
      <span className="truncate text-[10px] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function isProgressView(view: WorkspaceView): boolean {
  return (
    view === "analyzing" ||
    view === "activation-progress" ||
    view === "image-progress" ||
    view === "font-progress" ||
    view === "settling" ||
    view === "converting"
  );
}

function isActiveCapture(view: WorkspaceView): boolean {
  return (
    isProgressView(view) ||
    view === "image-recovery" ||
    view === "image-budget-review" ||
    view === "font-recovery" ||
    view === "review"
  );
}

function isCaptureBusy(phase: WorkspaceState["capture"]["phase"]): boolean {
  return (
    phase === "analyzing" ||
    phase === "revalidating" ||
    phase === "activating" ||
    phase === "preparing-images" ||
    phase === "image-recovery" ||
    phase === "image-budget-review" ||
    phase === "preparing-fonts" ||
    phase === "font-recovery" ||
    phase === "settling" ||
    phase === "converting" ||
    phase === "canceling"
  );
}

function phaseLabel(view: WorkspaceView): string {
  switch (view) {
    case "analyzing":
      return "Analyzing target...";
    case "activation-progress":
      return "Activating lazy resources...";
    case "image-progress":
      return "Preparing images...";
    case "font-progress":
      return "Preparing fonts...";
    case "settling":
      return "Waiting for page stability...";
    case "converting":
      return "Converting page...";
    default:
      return "Working...";
  }
}

function formatElapsed(milliseconds: number): string {
  return `${Math.max(0, Math.round(milliseconds / MILLISECONDS_PER_SECOND))}s`;
}

function formatMiB(bytes: number): string {
  return `${(bytes / BYTES_PER_MEBIBYTE).toFixed(1)} MiB`;
}

function outputLabel(sink: CaptureOutput): string {
  return sink === "clipboard" ? "Copy to Figma" : "Save .figit";
}

function imageRecoveryLabel(hard: boolean, soft: boolean): string {
  if (hard) {
    return "Image size limit reached.";
  }
  if (soft) {
    return "Image size is high.";
  }
  return "Some images failed.";
}

function outputCommandLabel(
  outputs: WorkspaceState["effectiveSettings"]["outputs"]
): string {
  if (outputs.clipboard && outputs.file) {
    return "Copy and save";
  }
  if (outputs.file) {
    return "Save .figit";
  }
  return "Copy to Figma";
}

function ignorePromise(promise: Promise<unknown>): void {
  promise.catch(() => undefined);
}
