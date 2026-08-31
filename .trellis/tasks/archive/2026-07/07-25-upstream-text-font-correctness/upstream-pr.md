# Upstream PR Drafts: Text And Font Correctness

## Candidate A

### Proposed Commit

`fix(converter): make font loading glyph-aware`

### PR Title

Make font loading glyph-aware and preserve resolved font metadata

### PR Body

#### Problem

Font family, weight, and italic state do not identify whether a font file can
render a specific text run. Reusing a Latin-only resolution for CJK or
supplementary-plane text can produce missing glyphs, while declaring the
requested family after a loader substituted different bytes makes Figma font
metadata disagree with the metrics and glyph data in the payload.

#### Change

Add an optional `codePoints` hint to the existing font request. The converter
collects sorted, unique Unicode code points from transformed text, excludes
whitespace, and includes the normalized set in its font-cache key. Loaders may
ignore the field or use it to choose a file with suitable glyph coverage.

When a loader reports resolved family, weight, or italic values, the converter
uses those values consistently for `fontName`, font metadata, style naming,
metrics, and PostScript metadata.

#### Compatibility

The request field and all resolved fields are optional. Existing structural
loaders continue to compile and run without inspecting `codePoints`. No source
text, catalog choice, fallback order, diagnostics, or network policy enters the
converter contract.

#### Test Evidence

- Pure tests cover sorted/deduplicated Latin, CJK, non-BMP, and whitespace
  handling without retaining source text.
- Cache tests prove equivalent coverage sets deduplicate and different glyph
  demands resolve independently through a loader that ignores the new field.
- Browser payload tests cover transformed text and resolved family/style/
  PostScript consistency.
- Consumer resolver tests cover CJK selection, mixed requests, fallback, and
  diagnostics outside the core package.

## Candidate B

### Proposed Commit

`fix(converter): preserve browser-enforced single-line text`

### PR Title

Preserve explicitly single-line text when Figma remeasures it

### PR Body

#### Problem

Figma can remeasure pasted text with slightly different font metrics. A label
that the browser explicitly kept on one line can wrap after paste when its text
box remains fixed. Applying auto width to every one-line measurement is also
incorrect because normal, truncated, or responsive text may depend on its
fixed browser box.

#### Change

Emit `textAutoResize: "WIDTH_AND_HEIGHT"` only when browser range evidence is a
single rendered line, computed `white-space` is `pre` or `nowrap`, the source
contains no explicit line separator, and `text-overflow` is not `ellipsis`.
For eligible children of inferred Auto Layout, emit
`stackChildAlignSelf: "AUTO"` so Figma keeps both axes hug-sized.

Range creation and computed-style reads use the element's owner document and
window, preserving iframe behavior.

#### Compatibility

The public converter API and wire schema are unchanged. Normal wrapping,
explicit or visual multiline text, and ellipsis retain the existing fixed-box
behavior. Measured size, width buffer, transform, baselines, glyph data, and
parent geometry are unchanged.

#### Test Evidence

- Browser tests cover `pre` and `nowrap` positives.
- Negative cases cover normal text, explicit newline, visual wrapping, and
  ellipsis.
- A flex-button fixture covers Auto Layout child alignment and measured
  geometry.
- An iframe fixture proves owner-document measurement.
- The text oracle scene and full parity gate cover consumer-visible output.

## Local Extraction Order

1. Apply Candidate A hunks from `delta-map.md` to the reviewed upstream base,
   run its focused tests, and commit it independently.
2. Reset to the reviewed base plus accepted prerequisites, apply Candidate B,
   and run its focused tests independently.
3. Run the complete upstream suite for each candidate and the fork integration
   suite for the combined result.
4. Keep adapter policy and extension changes out of both proposals.

No branch was pushed and no remote PR was created.
