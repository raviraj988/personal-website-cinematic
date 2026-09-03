# Brand lint

    npm run lint:brand

Checks the site against the ESE kit. Exits non-zero if a required check fails,
so it works as a pre-push hook or a CI step.

## What it tests

| Check | Fails when |
| --- | --- |
| Every painted value traces to the kit | A colour is not one of the eight, not within 15° of a kit hue, and not an excused exception |
| No raw `#ffffff` / `#000000` as a colour | The kit's own rule: the two starred neutrals replace black and white, "including text and backgrounds" |
| Each type role names the kit face first | `--font-display` doesn't start with Morvi, `--font-body` with Marion, etc. |
| Sub-heading tracking is the kit's +25 | `--track-label` is not `0.025em` |
| Every caps rule uses one role's treatment | A rule is uppercase but uses the wrong face, or sets a tracking of its own |
| Text clears 4.5:1 on every declared ground | Any ink/ground pairing the theme blocks declare falls under WCAG AA |
| No placeholder domain in absolute URLs | `example.com` or a placeholder address survives in live code |
| The mark ships as artwork, at the declared ratio | A logo asset is missing, over 120KB, or the aspect ratio doesn't match the trimmed files |

One **warning** tier: classes used in markup that no stylesheet names. That is
not always a bug — `.people-band` is a semantic hook styled through
`.section-shell`, and `.case-study__lede` is reached by `.case-study__copy > p`.
But it is exactly how `.serve-band__intro`, `.section-lede`,
`footer-button--ghost` and `.cinematic-footer__actions` each shipped with no
styling at all, so the list is worth scanning. It does not fail the run.

## Where the rules come from

`spec.json`, transcribed from `ref_docs/brand/colors-and-fonts.jpg` in the Drive
export. **Change the kit there, never in the lint.** The colour sheet is an
image, so the values cannot be parsed from it — if the kit is reissued, the
hexes and faces have to be re-read by eye and corrected in that one file.

## Exceptions

An exception is granted to a **selector**, not to a colour:

```json
"#ffffff": { "reason": "Google's sign-in button …", "selectors": ["admin-button--google", "serp-preview"] }
```

Granting `#ffffff` globally would exempt every raw white on the site, which is
the one rule the kit is most explicit about. Add a selector to the list only
when the element genuinely has to look like somewhere else.

## Extending it

Each check is a `check(name, fn)` (fails the run) or `warn(name, fn)` (reports
only) in `scripts/brand-lint.mjs`. `fn` receives a `fail` callback; call it once
per offending item with a string that names the file, the selector and the
value, so the output is actionable rather than a score.

The lint reads **source** CSS and resolves `var()` chains itself, so it runs
without a build.

## Verifying the lint still works

A lint that only ever passes is indistinguishable from a lint that is broken.
Inject a fault and confirm it is caught:

```bash
printf '\n.zz-test { color: #7b3fa0; background: #ffffff; }\n' >> src/app/globals.css
npm run lint:brand          # should FAIL on both the off-kit hue and the raw white
git checkout src/app/globals.css
```
