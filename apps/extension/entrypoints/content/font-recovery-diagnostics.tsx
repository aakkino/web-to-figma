import type { FontDiagnostic } from "@figit/browser-capture-adapter";

const MAX_LABEL_LENGTH = 160;
const URL_PATTERN = /\b(?:https?|file|data|blob):(?:\/\/)?/iu;
const CODE_POINT_PATTERN = /\b(?:code ?points?|u\+|0x)[\da-f\s,]*/iu;
const CONTROL_OR_FORMAT_PATTERN = /[\p{Cc}\p{Cf}]/u;

type FontRecoveryDiagnosticsProps = {
  diagnostics: ReadonlyArray<FontDiagnostic> | undefined;
};

export type FontDiagnosticSummary = {
  total: number;
  exact: number;
  fallback: number;
  unavailable: number;
};

export function FontRecoveryDiagnostics({
  diagnostics,
}: FontRecoveryDiagnosticsProps) {
  if (!diagnostics?.length) {
    return null;
  }

  const summary = summarizeFontDiagnostics(diagnostics);
  const mismatches = diagnostics.filter(
    (diagnostic) => diagnostic.status !== "exact"
  );

  return (
    <section aria-labelledby="font-diagnostic-summary" className="space-y-2">
      <p
        className="text-muted-foreground text-xs tabular-nums"
        id="font-diagnostic-summary"
      >
        {summary.total} font request{summary.total === 1 ? "" : "s"}:{" "}
        {summary.exact} exact, {summary.fallback} fallback,{" "}
        {summary.unavailable} unavailable.
      </p>
      {mismatches.length ? (
        <div className="space-y-2">
          {mismatches.map((diagnostic) => (
            <FontMismatchDiagnostic
              diagnostic={diagnostic}
              key={fontDiagnosticKey(diagnostic)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function summarizeFontDiagnostics(
  diagnostics: ReadonlyArray<FontDiagnostic>
): FontDiagnosticSummary {
  let exact = 0;
  let fallback = 0;
  let unavailable = 0;

  for (const diagnostic of diagnostics) {
    if (diagnostic.status === "exact") {
      exact += 1;
    } else if (diagnostic.status === "fallback") {
      fallback += 1;
    } else {
      unavailable += 1;
    }
  }

  return { total: diagnostics.length, exact, fallback, unavailable };
}

function FontMismatchDiagnostic({
  diagnostic,
}: {
  diagnostic: FontDiagnostic;
}) {
  const attempts = sanitizeAttempts(diagnostic.attempts);
  const unavailable = diagnostic.status === "failed";

  return (
    <article className="min-w-0 space-y-2 rounded-md border border-border bg-background-secondary px-3 py-2 [overflow-wrap:anywhere]">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <p className="min-w-0 break-words font-medium text-xs">
          Requested: {formatRequestedFont(diagnostic)}
        </p>
        <span
          className={
            unavailable
              ? "shrink-0 text-[10px] text-destructive uppercase"
              : "shrink-0 text-[10px] text-amber-700 uppercase dark:text-amber-300"
          }
        >
          {unavailable ? "Unavailable" : "Fallback"}
        </span>
      </div>
      {diagnostic.status === "fallback" ? (
        <p className="break-words text-muted-foreground text-xs">
          Resolved: {formatResolvedFont(diagnostic)}
        </p>
      ) : (
        <p className="break-words text-muted-foreground text-xs">
          Reason: {unavailableReason(diagnostic, attempts)}
        </p>
      )}
      <details className="border-border border-t pt-2">
        <summary className="cursor-pointer text-muted-foreground text-xs">
          Technical details
        </summary>
        {attempts.length ? (
          <ul className="mt-2 list-disc space-y-1 break-words pl-4 text-[11px] text-muted-foreground">
            {attempts.map((attempt) => (
              <li key={attempt}>{attempt}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[11px] text-muted-foreground">
            No safe diagnostic attempts were recorded.
          </p>
        )}
      </details>
    </article>
  );
}

function formatRequestedFont(diagnostic: FontDiagnostic): string {
  const family = safeFamily(diagnostic.request.family);
  return `${family} / ${diagnostic.request.weight} / ${
    diagnostic.request.italic ? "italic" : "normal"
  }`;
}

function formatResolvedFont(diagnostic: FontDiagnostic): string {
  const family = diagnostic.resolvedFamily
    ? safeFamily(diagnostic.resolvedFamily)
    : "family unavailable";
  const weight =
    diagnostic.resolvedWeight === undefined
      ? "weight unavailable"
      : diagnostic.resolvedWeight;
  const style = formatResolvedStyle(diagnostic.resolvedItalic);
  return `${family} / ${weight} / ${style}`;
}

function formatResolvedStyle(italic: boolean | undefined): string {
  if (italic === undefined) {
    return "style unavailable";
  }
  return italic ? "italic" : "normal";
}

function safeFamily(family: string): string {
  return safeText(family) ?? "family unavailable";
}

function sanitizeAttempts(attempts: ReadonlyArray<string>): Array<string> {
  return [
    ...new Set(
      attempts.flatMap((attempt) => {
        const label = safeAttemptLabel(attempt);
        return label ? [label] : [];
      })
    ),
  ];
}

function safeAttemptLabel(attempt: string): string | undefined {
  const safeAttempt = safeText(attempt);
  if (!safeAttempt) {
    return;
  }

  const normalized = safeAttempt.toLowerCase();
  const source = attemptSource(normalized);
  if (!source) {
    return;
  }

  return `${source}: ${attemptOutcome(normalized)}`;
}

function attemptSource(attempt: string): string | undefined {
  if (attempt.startsWith("page bytes") || attempt.startsWith("page")) {
    return "page";
  }
  if (
    attempt.startsWith("background transport") ||
    attempt.startsWith("transport")
  ) {
    return "transport";
  }
  if (attempt.startsWith("bundled")) {
    return "bundled";
  }
  if (attempt.startsWith("fallback loader") || attempt.startsWith("fallback")) {
    return "fallback";
  }
}

function attemptOutcome(attempt: string): string {
  if (attempt.endsWith(": ok")) {
    return "ok";
  }
  if (attempt.includes("glyph-coverage-miss")) {
    return "glyph coverage unavailable";
  }
  if (attempt.includes("http-error")) {
    return "resource unavailable";
  }
  if (attempt.includes("empty-response")) {
    return "empty response";
  }
  if (attempt.includes("aborted")) {
    return "interrupted";
  }
  return "failed";
}

function unavailableReason(
  diagnostic: FontDiagnostic,
  attempts: ReadonlyArray<string>
): string {
  const reason = safeText(diagnostic.reason)?.toLowerCase() ?? "";
  const evidence = `${reason} ${attempts.join(" ")}`;

  if (evidence.includes("glyph")) {
    return "Available fonts did not cover the requested glyphs.";
  }
  if (evidence.includes("resource unavailable") || reason.includes("http")) {
    return "A font resource could not be loaded.";
  }
  if (evidence.includes("empty response") || reason.includes("empty")) {
    return "A font resource returned no usable data.";
  }
  if (evidence.includes("interrupted") || reason.includes("abort")) {
    return "Font preparation was interrupted.";
  }
  if (reason.includes("parseable") || reason.includes("font bytes")) {
    return "No usable font data was available.";
  }
  return "No compatible font could be loaded.";
}

function safeText(value: string | undefined): string | undefined {
  if (
    !value ||
    hasControlCharacter(value) ||
    URL_PATTERN.test(value) ||
    CODE_POINT_PATTERN.test(value)
  ) {
    return;
  }
  const normalized = value.trim().replace(/\s+/gu, " ");
  return normalized ? normalized.slice(0, MAX_LABEL_LENGTH) : undefined;
}

function hasControlCharacter(value: string): boolean {
  return CONTROL_OR_FORMAT_PATTERN.test(value);
}

function fontDiagnosticKey(diagnostic: FontDiagnostic): string {
  return `${diagnostic.request.family}-${diagnostic.request.weight}-${diagnostic.request.italic}`;
}
