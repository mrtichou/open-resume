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

/**
 * A short reminder of what an export or share link will contain, such as "Français · Backend roles".
 * Empty when there is nothing to choose (no translation and no active preset), so a plain resume
 * shows no extra line.
 */
export function outputSummary(languageName: string, presetName: string | undefined, hasTranslations: boolean): string {
  return [hasTranslations ? languageName : '', presetName ?? ''].filter(Boolean).join(' · ');
}

/**
 * The language the standard section titles (Experience, Skills...) of a resume are written in.
 * A resume with variants has a language of its own, so changing the interface language must not rewrite
 * its titles; an older resume without variants follows the interface language as before.
 * Returns null when the app has no titles for that language (nothing is rewritten then).
 */
export function sectionTitleLanguage(variants: { sourceLocale?: string } | undefined, interfaceLanguage: string, known: (language: string) => boolean): string | null {
  const language = variants ? (variants.sourceLocale ?? 'en') : interfaceLanguage;
  if (known(language)) return language;
  const base = language.split('-')[0];
  return known(base) ? base : null;
}
