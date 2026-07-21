# Routes And Corpus

## File Routes

`src/routes/__root.tsx` owns document metadata, global CSS, and the route
outlet. `index.tsx` renders the scene gallery. `scenes.$.tsx` resolves the
splat in its loader and throws TanStack `notFound()` for an unknown scene.

Keep route data lookup in the route loader so the component consumes typed
`Route.useLoaderData()` rather than parsing the URL again.

When TanStack requires interface declaration merging, use the narrow,
documented Biome exception shown in `src/router.tsx`. Do not disable the
repository type-style rule globally.

## Scene Discovery

`src/corpus/index.ts` eagerly imports exactly one directory level of
`./<category>/<slug>.html` using `import.meta.glob`. It derives:

- stable slug `<category>/<filename>`;
- category from the directory;
- display name from the kebab-case filename;
- deterministic category and slug ordering.

To add a playground scene, add one focused HTML file under the appropriate
category. Do not add a parallel registry entry. New categories not in
`CATEGORY_ORDER` sort after known categories.

Keep scenes self-contained and small enough to explain one rendering concern.
Use integration scenes only when interaction among several properties is the
subject. The raw HTML is executed in a same-origin `srcDoc` iframe, so do not
add unreviewed live network content or scripts to committed scenes.

