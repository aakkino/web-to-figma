import type { DomTreeStrategy } from "@figit/composed-dom";
import { openComposedDomTree } from "@figit/composed-dom";
import { create as createFont } from "fontkit";

import type {
  BundledFont,
  FontDiagnostic,
  FontDiagnosticSource,
  FontFailureMode,
  FontFile,
  FontLoader,
  FontMode,
  FontPreflightResult,
  FontProperties,
  FontResolver,
  FontResolverOptions,
  FontTransportResult,
} from "./types";

const CSS_FONT_FACE_RULE = 5;
const TEXT_NODE = 3;
const FALLBACK_WEIGHT = 400;
const PARSEABLE_FORMATS = new Set([
  "truetype",
  "opentype",
  "woff",
  "woff2",
  "embedded-opentype",
]);
const PARSEABLE_EXTENSION = /\.(ttf|otf|woff2?|eot)(\?|#|$)/i;
const FONT_URL_PATTERN =
  /url\(\s*['"]?([^'"\s)]+)['"]?\s*\)(?:\s+format\(\s*['"]?([^'"\s)]+)['"]?\s*\))?/g;
const FONT_STYLE_PATTERN = /^(italic|oblique)\b/i;
const CSS_WEIGHT_SPLIT_PATTERN = /\s+/;
const CSS_WEIGHT_KEYWORDS: Record<string, number> = {
  normal: 400,
  bold: 700,
  lighter: 300,
  bolder: 600,
};
const STYLE_MISMATCH_PENALTY = 10_000;
const MIN_FONT_WEIGHT = 1;
const MAX_FONT_WEIGHT = 1000;
const ASCII_VISIBLE_START = 0x21;
const ASCII_VISIBLE_END = 0x7e;
const LATIN_EXTENDED_START = 0xa1;
const LATIN_EXTENDED_END = 0x2_4f;
const CJK_RADICALS_START = 0x2e_80;
const CJK_PUNCTUATION_END = 0x30_3f;
const CJK_STROKES_START = 0x31_c0;
const CJK_STROKES_END = 0x31_ef;
const CJK_EXTENSION_A_START = 0x34_00;
const CJK_EXTENSION_A_END = 0x4d_bf;
const CJK_UNIFIED_START = 0x4e_00;
const CJK_UNIFIED_END = 0x9f_ff;
const CJK_COMPATIBILITY_START = 0xf9_00;
const CJK_COMPATIBILITY_END = 0xfa_ff;
const CJK_SUPPLEMENTARY_START = 0x2_00_00;
const CJK_SUPPLEMENTARY_END = 0x3_13_4f;
const TARGET_CODE_POINT_RANGES: ReadonlyArray<readonly [number, number]> = [
  [ASCII_VISIBLE_START, ASCII_VISIBLE_END],
  [LATIN_EXTENDED_START, LATIN_EXTENDED_END],
  [CJK_RADICALS_START, CJK_PUNCTUATION_END],
  [CJK_STROKES_START, CJK_STROKES_END],
  [CJK_EXTENSION_A_START, CJK_EXTENSION_A_END],
  [CJK_UNIFIED_START, CJK_UNIFIED_END],
  [CJK_COMPATIBILITY_START, CJK_COMPATIBILITY_END],
  [CJK_SUPPLEMENTARY_START, CJK_SUPPLEMENTARY_END],
];

type PageFontEntry = {
  family: string;
  weightMin: number;
  weightMax: number;
  italic: boolean;
  urls: ReadonlyArray<string>;
};

type FontCandidate = {
  source: FontDiagnosticSource;
  family: string;
  weight: number;
  italic: boolean;
  urls?: ReadonlyArray<string>;
  bytes: BundledFont["bytes"];
  resolvedFamily?: string;
  sourceLabel?: string;
};

type FontOutcome = {
  file: FontFile;
  source: FontDiagnosticSource;
  actualFamily: string;
  actualWeight: number;
  actualItalic: boolean;
  exact: boolean;
  attempts: ReadonlyArray<string>;
};

type ParsedFontMetadata = {
  familyName: string;
};

export class FontPreflightError extends Error {
  readonly failures: ReadonlyArray<FontDiagnostic>;

  constructor(failures: ReadonlyArray<FontDiagnostic>) {
    super(
      `Font preflight failed for ${failures.length} request${
        failures.length === 1 ? "" : "s"
      }`
    );
    this.name = "FontPreflightError";
    this.failures = failures;
  }
}

export function createFontResolver(
  options: FontResolverOptions = {}
): FontResolver {
  let currentDocument = options.document ?? getGlobalDocument();
  let pageEntries: ReadonlyArray<PageFontEntry> = currentDocument
    ? collectPageFontFaces(currentDocument)
    : [];
  const requestCache = new Map<string, Promise<FontOutcome>>();
  const activeCaptureOutcomes = new Map<string, Promise<FontOutcome>>();
  const byteCache = new Map<string, Promise<ArrayBuffer>>();
  const diagnostics = new Map<string, FontDiagnostic>();
  const fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
  const fallbackLoader = options.fallbackLoader ?? null;
  const fallbackIsLocal = options.fallbackIsLocal ?? false;
  const bundledFonts = options.bundledFonts ?? [];
  let activeMode: FontMode = "compatible";

  const loader: FontLoader = (request, signal) => {
    const captureOutcome = activeCaptureOutcomes.get(requestKey(request));
    if (captureOutcome) {
      return captureOutcome.then((outcome) => {
        recordDiagnostic(request, outcome);
        return outcome.file;
      });
    }
    return loadRequest(request, activeMode, signal, false);
  };

  function loadRequest(
    request: FontProperties,
    mode: FontMode,
    signal: AbortSignal | undefined,
    pinForCapture: boolean
  ): Promise<FontFile> {
    const key = `${mode}:${resolutionKey(request)}`;
    const cached = requestCache.get(key);
    const pending = cached ?? resolveRequest(request, mode, signal);
    if (!cached) {
      requestCache.set(key, pending);
    }
    if (pinForCapture) {
      activeCaptureOutcomes.set(requestKey(request), pending);
    }
    pending.catch(() => {
      if (requestCache.get(key) === pending) {
        requestCache.delete(key);
      }
      if (activeCaptureOutcomes.get(requestKey(request)) === pending) {
        activeCaptureOutcomes.delete(requestKey(request));
      }
    });
    return pending.then((outcome) => {
      recordDiagnostic(request, outcome);
      return outcome.file;
    });
  }

  const resolver: FontResolver = {
    loader,
    beginCapture(document) {
      currentDocument = document;
      pageEntries = collectPageFontFaces(document);
      diagnostics.clear();
      activeCaptureOutcomes.clear();
    },
    collectRequests(root, domTraversal = openComposedDomTree) {
      return collectFontRequests(root, domTraversal);
    },
    async preflight(
      requests,
      failureMode,
      signal
    ): Promise<FontPreflightResult> {
      const mode = normalizeFontMode(failureMode);
      activeMode = mode;
      const uniqueRequests = dedupeRequests(requests);
      await Promise.all(
        uniqueRequests.map(async (request) => {
          try {
            await loadRequest(request, mode, signal, true);
          } catch {
            // The structured diagnostic is captured by resolveRequest.
          }
        })
      );

      const failures = uniqueRequests
        .map((request) => diagnostics.get(requestKey(request)))
        .filter(
          (diagnostic): diagnostic is FontDiagnostic =>
            diagnostic !== undefined && diagnostic.status !== "exact"
        );

      if (mode === "strict" && failures.length > 0) {
        throw new FontPreflightError(failures);
      }

      return {
        requests: uniqueRequests,
        failures,
      };
    },
    getDiagnostics() {
      return [...diagnostics.values()];
    },
  };

  return resolver;

  async function resolveRequest(
    request: FontProperties,
    mode: FontMode,
    signal?: AbortSignal
  ): Promise<FontOutcome> {
    throwIfAborted(signal);
    const attempts: Array<string> = [];
    if (mode === "compatible" || mode === "strict") {
      const pageOutcome = await resolvePageFont(request, attempts, signal);
      if (pageOutcome) {
        recordDiagnostic(request, pageOutcome);
        return pageOutcome;
      }
    }

    throwIfAborted(signal);
    const bundledOutcome = await resolveBundledFont(request, attempts, signal);
    if (bundledOutcome) {
      recordDiagnostic(request, bundledOutcome);
      return bundledOutcome;
    }

    if (mode === "compatible" || (mode === "fast-local" && fallbackIsLocal)) {
      const fallbackOutcome = await resolveFallbackFont(
        request,
        attempts,
        signal
      );
      if (fallbackOutcome) {
        recordDiagnostic(request, fallbackOutcome);
        return fallbackOutcome;
      }
    }

    const diagnostic: FontDiagnostic = {
      request: fontIdentity(request),
      status: "failed",
      attempts: attempts.map(sanitizeMessage),
      reason: "No parseable font bytes were available",
    };
    diagnostics.set(requestKey(request), diagnostic);
    throw new Error(
      `Unable to resolve font ${formatRequest(request)}: ${diagnostic.reason}`
    );
  }

  async function resolvePageFont(
    request: FontProperties,
    attempts: Array<string>,
    signal?: AbortSignal
  ): Promise<FontOutcome | null> {
    for (const candidate of findPageCandidates(pageEntries, request)) {
      for (const url of candidate.urls) {
        const direct = await tryLoadUrl(
          url,
          fetchImpl,
          byteCache,
          attempts,
          signal
        );
        if (direct) {
          const outcome = buildPageOutcome(
            request,
            candidate,
            direct,
            attempts
          );
          if (outcome) {
            return outcome;
          }
        }
        const transported = await tryLoadTransportFont(
          request,
          candidate,
          url,
          attempts,
          signal
        );
        if (transported) {
          return transported;
        }
      }
    }
    return null;
  }

  async function resolveBundledFont(
    request: FontProperties,
    attempts: Array<string>,
    signal?: AbortSignal
  ): Promise<FontOutcome | null> {
    for (const candidate of findBundledCandidates(bundledFonts, request)) {
      try {
        const bytes = await readBundledBytes(candidate.bytes, signal);
        throwIfAborted(signal);
        const expectedFamily = candidate.resolvedFamily ?? candidate.family;
        const metadata = validateFontBytes(
          bytes,
          expectedFamily,
          request.codePoints
        );
        return buildOutcome(
          request,
          bytes,
          "bundled",
          expectedFamily,
          candidate.weight,
          candidate.italic,
          metadata,
          attempts,
          candidate.sourceLabel ?? `bundled ${candidate.family}`
        );
      } catch (error) {
        attempts.push(
          `bundled ${candidate.sourceLabel ?? candidate.family}: ${toErrorMessage(
            error
          )}`
        );
      }
    }
    return null;
  }

  async function resolveFallbackFont(
    request: FontProperties,
    attempts: Array<string>,
    signal?: AbortSignal
  ): Promise<FontOutcome | null> {
    if (!fallbackLoader) {
      return null;
    }
    try {
      throwIfAborted(signal);
      const file = await fallbackLoader(request, signal);
      const actualFamily = file.resolvedFamily ?? request.family;
      const actualWeight = file.resolvedWeight ?? request.weight;
      const actualItalic = file.resolvedItalic ?? request.italic;
      const metadata = validateFontBytes(
        file.bytes,
        actualFamily,
        request.codePoints
      );
      return buildOutcome(
        request,
        file.bytes,
        "fallback",
        actualFamily,
        actualWeight,
        actualItalic,
        metadata,
        attempts,
        "fallback loader",
        file
      );
    } catch (error) {
      throwIfAborted(signal);
      attempts.push(`fallback: ${toErrorCode(error)}`);
      return null;
    }
  }

  async function tryLoadTransportFont(
    request: FontProperties,
    candidate: PageFontEntry,
    url: string,
    attempts: Array<string>,
    signal?: AbortSignal
  ): Promise<FontOutcome | null> {
    if (!(options.transport && isHttpUrl(url))) {
      return null;
    }
    try {
      const transported = await loadTransportBytes(
        url,
        options.transport,
        signal
      );
      const metadata = validateFontBytes(
        transported.bytes,
        candidate.family,
        request.codePoints
      );
      return buildOutcome(
        request,
        transported.bytes,
        "transport",
        candidate.family,
        chooseCandidateWeight(request.weight, candidate),
        candidate.italic,
        metadata,
        attempts,
        "background transport"
      );
    } catch (error) {
      throwIfAborted(signal);
      attempts.push(`transport: ${toErrorCode(error)}`);
      return null;
    }
  }

  function recordDiagnostic(request: FontProperties, outcome: FontOutcome) {
    diagnostics.set(requestKey(request), {
      request: fontIdentity(request),
      status: outcome.exact ? "exact" : "fallback",
      source: outcome.source,
      resolvedFamily: outcome.actualFamily,
      resolvedWeight: outcome.actualWeight,
      resolvedItalic: outcome.actualItalic,
      attempts: outcome.attempts.map(sanitizeMessage),
      reason: outcome.exact
        ? undefined
        : sanitizeMessage(
            `Resolved to ${formatRequest({
              family: outcome.actualFamily,
              weight: outcome.actualWeight,
              italic: outcome.actualItalic,
            })}`
          ),
    });
  }
}

export const createCaptureFontLoader = createFontResolver;
export const createPageFontLoader = createFontResolver;

function buildPageOutcome(
  request: FontProperties,
  candidate: PageFontEntry,
  bytes: ArrayBuffer,
  attempts: Array<string>
): FontOutcome | null {
  try {
    const metadata = validateFontBytes(
      bytes,
      candidate.family,
      request.codePoints
    );
    return buildOutcome(
      request,
      bytes,
      "page",
      candidate.family,
      chooseCandidateWeight(request.weight, candidate),
      candidate.italic,
      metadata,
      attempts,
      "page @font-face"
    );
  } catch (error) {
    attempts.push(`page bytes: ${toErrorMessage(error)}`);
    return null;
  }
}

function buildOutcome(
  request: FontProperties,
  bytes: ArrayBuffer,
  source: FontDiagnosticSource,
  actualFamily: string,
  actualWeight: number,
  actualItalic: boolean,
  _metadata: ParsedFontMetadata,
  attempts: Array<string>,
  label: string,
  originalFile?: FontFile
): FontOutcome {
  const exact =
    sameFamily(request.family, actualFamily) &&
    request.weight === actualWeight &&
    request.italic === actualItalic;
  const file: FontFile = originalFile ?? {
    bytes,
    ...(sameFamily(request.family, actualFamily)
      ? {}
      : { resolvedFamily: actualFamily }),
    ...(request.weight === actualWeight
      ? {}
      : { resolvedWeight: actualWeight }),
    ...(request.italic === actualItalic
      ? {}
      : { resolvedItalic: actualItalic }),
  };
  attempts.push(`${label}: ok`);
  return {
    file,
    source,
    actualFamily,
    actualWeight,
    actualItalic,
    exact,
    attempts: [...attempts],
  };
}

async function tryLoadUrl(
  url: string,
  fetchImpl: typeof globalThis.fetch,
  byteCache: Map<string, Promise<ArrayBuffer>>,
  attempts: Array<string>,
  signal?: AbortSignal
): Promise<ArrayBuffer | null> {
  try {
    const bytes = await loadBytes(url, fetchImpl, byteCache, signal);
    attempts.push("page: ok");
    return bytes;
  } catch (error) {
    throwIfAborted(signal);
    attempts.push(`page: ${toErrorCode(error)}`);
    return null;
  }
}

function loadBytes(
  url: string,
  fetchImpl: typeof globalThis.fetch,
  byteCache: Map<string, Promise<ArrayBuffer>>,
  signal?: AbortSignal
): Promise<ArrayBuffer> {
  const cached = byteCache.get(url);
  if (cached) {
    return cached;
  }

  const pending = fetchImpl(url, {
    credentials: "omit",
    cache: "force-cache",
    signal,
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength === 0) {
      throw new Error("empty response");
    }
    return bytes;
  });
  byteCache.set(url, pending);
  pending.catch(() => {
    if (byteCache.get(url) === pending) {
      byteCache.delete(url);
    }
  });
  return pending;
}

async function loadTransportBytes(
  url: string,
  transport: NonNullable<FontResolverOptions["transport"]>,
  signal?: AbortSignal
): Promise<FontTransportResult> {
  const result = await transport(url, signal);
  const normalized = result instanceof ArrayBuffer ? { bytes: result } : result;
  if (
    !(normalized.bytes instanceof ArrayBuffer) ||
    normalized.bytes.byteLength === 0
  ) {
    throw new Error("empty or invalid transport response");
  }
  return normalized;
}

async function readBundledBytes(
  bytes: BundledFont["bytes"],
  signal?: AbortSignal
): Promise<ArrayBuffer> {
  const value = typeof bytes === "function" ? await bytes(signal) : bytes;
  if (!(value instanceof ArrayBuffer) || value.byteLength === 0) {
    throw new Error("empty bundled font");
  }
  return value;
}

function validateFontBytes(
  bytes: ArrayBuffer,
  expectedFamily: string,
  codePoints: ReadonlyArray<number> | undefined
): ParsedFontMetadata {
  if (bytes.byteLength === 0) {
    throw new Error("empty font bytes");
  }
  const parsed: unknown = createFont(
    new Uint8Array(bytes) as unknown as Buffer
  );
  if (isFontCollection(parsed)) {
    throw new Error("font collections are not supported");
  }
  const familyNameValue = (parsed as { familyName?: unknown }).familyName;
  const familyName = typeof familyNameValue === "string" ? familyNameValue : "";
  if (familyName && !sameFamily(familyName, expectedFamily)) {
    throw new Error(
      `family mismatch: expected ${expectedFamily}, got ${familyName}`
    );
  }
  const font = parsed as { hasGlyphForCodePoint(codePoint: number): boolean };
  if (
    codePoints?.some(
      (codePoint) =>
        isTargetCodePoint(codePoint) && !font.hasGlyphForCodePoint(codePoint)
    )
  ) {
    throw new Error("glyph-coverage-miss");
  }
  return { familyName };
}

function isFontCollection(value: unknown): boolean {
  if (typeof value !== "object" || value === null || !("type" in value)) {
    return false;
  }
  const type = (value as { type?: unknown }).type;
  return type === "TTC" || type === "DFont";
}

function collectPageFontFaces(document: Document): Array<PageFontEntry> {
  const entries: Array<PageFontEntry> = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    walkCssRules(rules, sheet.href || document.baseURI, entries);
  }
  return entries;
}

function walkCssRules(
  rules: CSSRuleList,
  baseUrl: string,
  entries: Array<PageFontEntry>
): void {
  for (let index = 0; index < rules.length; index += 1) {
    const rule = rules.item(index);
    if (!rule) {
      continue;
    }
    if (isFontFaceRule(rule)) {
      const entry = parseFontFaceRule(rule, baseUrl);
      if (entry) {
        entries.push(entry);
      }
      continue;
    }
    const nestedRules = getNestedRules(rule);
    if (nestedRules) {
      walkCssRules(nestedRules, baseUrl, entries);
    }
  }
}

function isFontFaceRule(rule: CSSRule): boolean {
  const type = (rule as CSSRule & { type?: number }).type;
  const constructorName = (rule.constructor as { name?: string }).name;
  return (
    type === CSS_FONT_FACE_RULE ||
    constructorName === "CSSFontFaceRule" ||
    ("style" in rule &&
      typeof (rule as CSSRule & { style?: CSSStyleDeclaration }).style
        ?.getPropertyValue === "function" &&
      Boolean(
        (
          rule as CSSRule & { style: CSSStyleDeclaration }
        ).style.getPropertyValue("src")
      ))
  );
}

function getNestedRules(rule: CSSRule): CSSRuleList | null {
  const candidate = rule as CSSRule & { cssRules?: CSSRuleList };
  return candidate.cssRules ?? null;
}

function parseFontFaceRule(
  rule: CSSRule,
  baseUrl: string
): PageFontEntry | null {
  const style = (rule as CSSRule & { style?: CSSStyleDeclaration }).style;
  if (!style) {
    return null;
  }
  const family = unquote(style.getPropertyValue("font-family"));
  const src = style.getPropertyValue("src");
  if (!(family && src)) {
    return null;
  }
  const urls = parseSources(src)
    .filter((source) => isParseableSource(source.url, source.format))
    .map((source) => resolveUrl(source.url, baseUrl))
    .filter((url): url is string => url !== null);
  if (urls.length === 0) {
    return null;
  }
  const [weightMin, weightMax] = parseWeightRange(
    style.getPropertyValue("font-weight") || "400"
  );
  const fontStyle = style.getPropertyValue("font-style").toLowerCase();
  return {
    family,
    weightMin,
    weightMax,
    italic: fontStyle === "italic" || fontStyle.startsWith("oblique"),
    urls,
  };
}

function parseSources(src: string): Array<{ url: string; format?: string }> {
  const sources: Array<{ url: string; format?: string }> = [];
  const pattern = new RegExp(FONT_URL_PATTERN.source, FONT_URL_PATTERN.flags);
  let match = pattern.exec(src);
  while (match) {
    const url = match[1];
    if (url) {
      sources.push({ url, format: match[2] });
    }
    match = pattern.exec(src);
  }
  return sources;
}

function isParseableSource(url: string, format: string | undefined): boolean {
  const normalizedFormat = format?.toLowerCase();
  if (normalizedFormat) {
    return (
      PARSEABLE_FORMATS.has(normalizedFormat) ||
      [...PARSEABLE_FORMATS].some((value) => normalizedFormat.startsWith(value))
    );
  }
  return PARSEABLE_EXTENSION.test(url) || url.startsWith("data:");
}

function findPageCandidates(
  entries: ReadonlyArray<PageFontEntry>,
  request: FontProperties
): Array<PageFontEntry> {
  return entries
    .filter((entry) => sameFamily(entry.family, request.family))
    .sort((a, b) => candidateScore(a, request) - candidateScore(b, request));
}

function candidateScore(
  candidate: PageFontEntry,
  request: FontProperties
): number {
  const styleDistance =
    candidate.italic === request.italic ? 0 : STYLE_MISMATCH_PENALTY;
  return styleDistance + weightDistance(candidate, request.weight);
}

function weightDistance(
  candidate: Pick<PageFontEntry, "weightMin" | "weightMax">,
  weight: number
): number {
  if (weight >= candidate.weightMin && weight <= candidate.weightMax) {
    return 0;
  }
  return weight < candidate.weightMin
    ? candidate.weightMin - weight
    : weight - candidate.weightMax;
}

function chooseCandidateWeight(
  requestedWeight: number,
  candidate: Pick<PageFontEntry, "weightMin" | "weightMax">
): number {
  if (
    requestedWeight >= candidate.weightMin &&
    requestedWeight <= candidate.weightMax
  ) {
    return requestedWeight;
  }
  return requestedWeight < candidate.weightMin
    ? candidate.weightMin
    : candidate.weightMax;
}

function findBundledCandidates(
  fonts: ReadonlyArray<BundledFont>,
  request: FontProperties
): Array<FontCandidate> {
  return fonts
    .filter((font) => {
      const names = [font.family, ...(font.aliases ?? [])];
      return names.some((name) => sameFamily(name, request.family));
    })
    .sort((a, b) => {
      const aStyle = a.italic === request.italic ? 0 : STYLE_MISMATCH_PENALTY;
      const bStyle = b.italic === request.italic ? 0 : STYLE_MISMATCH_PENALTY;
      return (
        aStyle +
        Math.abs(a.weight - request.weight) -
        (bStyle + Math.abs(b.weight - request.weight))
      );
    })
    .map((font) => ({
      source: "bundled",
      family: font.family,
      weight: font.weight,
      italic: font.italic,
      bytes: font.bytes,
      resolvedFamily: font.resolvedFamily,
      sourceLabel: font.source,
    }));
}

function collectFontRequests(
  root: Element,
  domTraversal: DomTreeStrategy
): Array<FontProperties> {
  const requests = new Map<string, FontProperties>();
  const document = root.ownerDocument;
  const visit = (node: Node): void => {
    if (node.nodeType === TEXT_NODE) {
      addFontRequest(node as Text, document, requests);
    }
  };

  visit(root);
  for (const { node } of domTraversal.walk(root)) {
    visit(node);
  }
  return [...requests.values()];
}

function addFontRequest(
  textNode: Text,
  document: Document,
  requests: Map<string, FontProperties>
): void {
  if (!textNode.textContent?.trim()) {
    return;
  }
  const element = textNode.parentElement;
  if (!element || isNonVisualTextNode(element)) {
    return;
  }
  const request = readFontRequest(element, document);
  if (!request) {
    return;
  }
  const key = requestKey(request);
  requests.set(
    key,
    mergeCodePoints(requests.get(key), {
      ...request,
      codePoints: collectCodePoints(textNode.textContent ?? ""),
    })
  );
}

function readFontRequest(
  element: Element,
  document: Document
): FontProperties | null {
  const view = document.defaultView;
  if (!view) {
    return null;
  }
  let style: CSSStyleDeclaration;
  try {
    style = view.getComputedStyle(element);
  } catch {
    return null;
  }
  if (style.display === "none") {
    return null;
  }
  const family = parseFirstFamily(style.fontFamily);
  if (!family) {
    return null;
  }
  return {
    family,
    weight: parseWeight(style.fontWeight),
    italic: FONT_STYLE_PATTERN.test(style.fontStyle),
  };
}

function parseFirstFamily(value: string): string {
  const first = value.split(",")[0]?.trim() ?? "";
  return unquote(first);
}

function parseWeight(value: string): number {
  const numeric = Number.parseInt(value, 10);
  if (!Number.isNaN(numeric)) {
    return clampWeight(numeric);
  }
  return clampWeight(
    CSS_WEIGHT_KEYWORDS[value.trim().toLowerCase()] ?? FALLBACK_WEIGHT
  );
}

function parseWeightRange(value: string): [number, number] {
  const numbers = value
    .trim()
    .split(CSS_WEIGHT_SPLIT_PATTERN)
    .map(
      (token) =>
        CSS_WEIGHT_KEYWORDS[token.toLowerCase()] ?? Number.parseInt(token, 10)
    )
    .filter((weight) => !Number.isNaN(weight))
    .map(clampWeight);
  if (numbers.length === 0) {
    return [FALLBACK_WEIGHT, FALLBACK_WEIGHT];
  }
  if (numbers.length === 1) {
    return [numbers[0] ?? FALLBACK_WEIGHT, numbers[0] ?? FALLBACK_WEIGHT];
  }
  return [numbers[0] ?? FALLBACK_WEIGHT, numbers[1] ?? FALLBACK_WEIGHT];
}

function clampWeight(weight: number): number {
  return Math.max(MIN_FONT_WEIGHT, Math.min(MAX_FONT_WEIGHT, weight));
}

function dedupeRequests(
  requests: ReadonlyArray<FontProperties>
): Array<FontProperties> {
  const unique = new Map<string, FontProperties>();
  for (const request of requests) {
    const key = requestKey(request);
    unique.set(key, mergeCodePoints(unique.get(key), request));
  }
  return [...unique.values()];
}

function requestKey(request: FontProperties): string {
  return `${normalizeFamily(request.family)}:${request.weight}:${request.italic}`;
}

function resolutionKey(request: FontProperties): string {
  return `${requestKey(request)}:${normalizeCodePoints(request.codePoints).join(",")}`;
}

function mergeCodePoints(
  existing: FontProperties | undefined,
  next: FontProperties
): FontProperties {
  if (!existing) {
    return {
      ...next,
      codePoints: normalizeCodePoints(next.codePoints),
    };
  }
  return {
    ...existing,
    codePoints: normalizeCodePoints([
      ...(existing.codePoints ?? []),
      ...(next.codePoints ?? []),
    ]),
  };
}

function collectCodePoints(text: string): ReadonlyArray<number> {
  return normalizeCodePoints(
    Array.from(text, (character) => character.codePointAt(0) ?? 0)
  ).filter(isTargetCodePoint);
}

function normalizeCodePoints(
  codePoints: ReadonlyArray<number> | undefined
): ReadonlyArray<number> {
  return [...new Set(codePoints ?? [])].sort((left, right) => left - right);
}

function isTargetCodePoint(codePoint: number): boolean {
  return TARGET_CODE_POINT_RANGES.some(
    ([start, end]) => codePoint >= start && codePoint <= end
  );
}

function fontIdentity(request: FontProperties): FontProperties {
  return {
    family: request.family,
    weight: request.weight,
    italic: request.italic,
  };
}

function sameFamily(left: string, right: string): boolean {
  return normalizeFamily(left) === normalizeFamily(right);
}

function normalizeFamily(value: string): string {
  return unquote(value).replace(/\s+/g, " ").trim().toLowerCase();
}

function unquote(value: string): string {
  return value
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .trim();
}

function resolveUrl(value: string, baseUrl: string): string | null {
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return null;
  }
}

function isHttpUrl(value: string): boolean {
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

function isNonVisualTextNode(element: Element): boolean {
  const tagName = element.localName.toLowerCase();
  return (
    tagName === "script" ||
    tagName === "style" ||
    tagName === "noscript" ||
    tagName === "template"
  );
}

function formatRequest(request: FontProperties): string {
  return `${request.family} ${request.weight} ${request.italic ? "italic" : "normal"}`;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function sanitizeMessage(message: string): string {
  return message.replace(/https?:\/\/[^\s)]+/gi, "[resource]");
}

function toErrorCode(error: unknown): string {
  const message = toErrorMessage(error).toLowerCase();
  if (message.includes("glyph-coverage-miss")) {
    return "glyph-coverage-miss";
  }
  if (message.includes("abort")) {
    return "aborted";
  }
  if (message.includes("http")) {
    return "http-error";
  }
  if (message.includes("empty")) {
    return "empty-response";
  }
  return "failed";
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw new Error("Font preparation aborted");
  }
}

function normalizeFontMode(mode: FontFailureMode): FontMode {
  return mode === "fallback" ? "compatible" : mode;
}

function getGlobalDocument(): Document | null {
  return typeof document === "undefined" ? null : document;
}
