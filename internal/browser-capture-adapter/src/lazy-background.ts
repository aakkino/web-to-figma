const IMAGE_PROTOCOLS = new Set(["data:", "blob:", "http:", "https:"]);
const RESPONSIVE_DESCRIPTOR_PATTERN = /^(\d+(?:\.\d+)?)(w|x)$/iu;
const URL_FUNCTION_PATTERN =
  /^url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)(?:\s+(.+))?$/iu;
const MALFORMED_URL_FUNCTION_PATTERN = /^url\(/iu;
const WHITESPACE_PATTERN = /\s+/u;
const QUOTED_SOURCE_PATTERN = /^(?:"([\s\S]*)"|'([\s\S]*)')$/u;
const XS_MARKER_PATTERN = /-xs-(?=(?:(?:https?:)?\/\/|\/|https?\/))/iu;

export type LazyBackgroundSource = {
  source: string;
  sourceAttribute: "data-bgset";
};

export type LazyBackgroundResolutionOptions = {
  baseUrl: string;
  renderedWidth: number;
  devicePixelRatio: number;
};

type Candidate = {
  source: string;
  width?: number;
  density?: number;
  order: number;
};

/** Resolves explicit lazy-background metadata without DOM access or I/O. */
export function resolveLazyBackgroundSource(
  rawValue: string | null,
  options: LazyBackgroundResolutionOptions
): LazyBackgroundSource | null {
  const raw = rawValue?.trim();
  if (!raw) {
    return null;
  }

  const encodedSource = extractXsEncodedSource(raw);
  const selected =
    encodedSource ??
    (raw.toLowerCase().startsWith("data:")
      ? raw
      : selectCandidate(raw, options));
  const source = selected
    ? resolveResourceUrl(selected, options.baseUrl)
    : null;
  return source ? { source, sourceAttribute: "data-bgset" } : null;
}

function extractXsEncodedSource(raw: string): string | null {
  const marker = XS_MARKER_PATTERN.exec(raw);
  if (!marker || marker.index === 0) {
    return null;
  }
  return raw.slice(0, marker.index).trim() || null;
}

function selectCandidate(
  raw: string,
  options: LazyBackgroundResolutionOptions
): string | null {
  const candidates = splitTopLevelList(raw).map((entry, order) =>
    parseCandidate(entry, order)
  );
  if (
    candidates.length === 0 ||
    candidates.some((candidate) => candidate === null)
  ) {
    return null;
  }
  const validCandidates = candidates as Array<Candidate>;

  const descriptorKinds = new Set(
    validCandidates.map((candidate) => {
      if (candidate.width !== undefined) {
        return "width";
      }
      return candidate.density !== undefined ? "density" : "plain";
    })
  );
  if (descriptorKinds.size > 1) {
    return null;
  }

  const widthCandidates = validCandidates.filter(
    (candidate): candidate is Candidate & { width: number } =>
      candidate.width !== undefined
  );
  if (widthCandidates.length > 0) {
    const targetWidth =
      Math.max(1, options.renderedWidth) *
      Math.max(1, options.devicePixelRatio);
    return selectClosestCandidate(widthCandidates, targetWidth, "width");
  }

  const densityCandidates = validCandidates.filter(
    (candidate): candidate is Candidate & { density: number } =>
      candidate.density !== undefined
  );
  if (densityCandidates.length > 0) {
    return selectClosestCandidate(
      densityCandidates,
      Math.max(1, options.devicePixelRatio),
      "density"
    );
  }

  return validCandidates[0]?.source ?? null;
}

function selectClosestCandidate(
  candidates: ReadonlyArray<Candidate>,
  target: number,
  field: "width" | "density"
): string | null {
  return (
    [...candidates].sort((left, right) => {
      const leftValue = left[field] ?? 0;
      const rightValue = right[field] ?? 0;
      const leftAbove = leftValue >= target;
      const rightAbove = rightValue >= target;
      if (leftAbove !== rightAbove) {
        return leftAbove ? -1 : 1;
      }
      if (leftValue !== rightValue) {
        return leftAbove ? leftValue - rightValue : rightValue - leftValue;
      }
      return left.order - right.order;
    })[0]?.source ?? null
  );
}

function parseCandidate(entry: string, order: number): Candidate | null {
  const trimmed = entry.trim();
  if (!trimmed) {
    return null;
  }

  const urlFunction = URL_FUNCTION_PATTERN.exec(trimmed);
  if (urlFunction) {
    const source = (
      urlFunction[1] ??
      urlFunction[2] ??
      urlFunction[3] ??
      ""
    ).trim();
    const descriptor = parseDescriptor(urlFunction[4]);
    return source && descriptor ? { source, ...descriptor, order } : null;
  }
  if (MALFORMED_URL_FUNCTION_PATTERN.test(trimmed)) {
    return null;
  }

  const [source, descriptor, ...extra] = trimmed.split(WHITESPACE_PATTERN);
  if (!(source && extra.length === 0)) {
    return null;
  }
  const parsedDescriptor = parseDescriptor(descriptor);
  return parsedDescriptor
    ? { source: stripQuotes(source), ...parsedDescriptor, order }
    : null;
}

function parseDescriptor(value: string | undefined): {
  width?: number;
  density?: number;
} | null {
  if (!value) {
    return {};
  }
  const descriptor =
    value.startsWith("[") && value.endsWith("]") ? value.slice(1, -1) : value;
  const match = RESPONSIVE_DESCRIPTOR_PATTERN.exec(descriptor);
  if (!match) {
    return null;
  }
  const amount = Number.parseFloat(match[1] ?? "");
  if (!(Number.isFinite(amount) && amount > 0)) {
    return null;
  }
  return match[2]?.toLowerCase() === "w"
    ? { width: amount }
    : { density: amount };
}

function stripQuotes(value: string): string {
  return value.replace(QUOTED_SOURCE_PATTERN, "$1$2");
}

function resolveResourceUrl(raw: string, baseUrl: string): string | null {
  if (!raw) {
    return null;
  }
  try {
    const resolved = new URL(raw, baseUrl);
    return IMAGE_PROTOCOLS.has(resolved.protocol) ? resolved.toString() : null;
  } catch {
    return null;
  }
}

function splitTopLevelList(value: string): Array<string> {
  const parts: Array<string> = [];
  let start = 0;
  let depth = 0;
  let quote = "";
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quote) {
      if (character === quote && value[index - 1] !== "\\") {
        quote = "";
      }
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
    } else if (character === "(") {
      depth += 1;
    } else if (character === ")") {
      depth = Math.max(0, depth - 1);
    } else if (character === "," && depth === 0) {
      parts.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(value.slice(start).trim());
  return parts.filter(Boolean);
}
