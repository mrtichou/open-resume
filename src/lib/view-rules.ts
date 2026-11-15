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

/**
 * What picking a language in the preview header does. The language you pick decides what you
 * work on, so the tab follows: a translation opens the Translation tab, and the source language
 * brings you back to Content. The other tabs (Design, Check, Share) keep their place: there the
 * choice only changes what is previewed and exported.
 */
export function applyLanguageChoice(view: string, choice: string, sourceLocale: string): { locale: string | null; view: string } {
  const toSource = choice === sourceLocale;
  const locale = toSource ? null : choice;
  if (view === 'edit' && !toSource) return { locale, view: 'translate' };
  if (view === 'translate' && toSource) return { locale, view: 'edit' };
  return { locale, view };
}
