/**
 * Template variants whose header (photo, name, contact details) sits in a narrow side band. There the
 * contact details are shown one per line, because a single "a | b | c" sentence wraps inside the band and
 * leaves bars at the start of lines. The test in tests/template-layout.test.ts keeps this list in step with
 * the stylesheet, so a new side-band template cannot be forgotten.
 */
export const SIDE_BAND_HEADER_VARIANTS: ReadonlySet<string> = new Set(['leftbar', 'rightbar']);
