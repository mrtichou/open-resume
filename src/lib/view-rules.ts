/**
 * Which language the preview and the exports use right now.
 *
 * The Content tab edits the source text, so it always previews the source language (null):
 * what you type is what you see. Every other tab shows the translation the user chose (or the
 * source language when none is chosen).
 */
export function effectiveLocale(view: string, chosen: string | null): string | null {
  return view === 'edit' ? null : chosen;
}
