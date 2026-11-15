// Characters that file systems or upload forms reject.
const UNSAFE = /[\\/:*?"<>|\u0000-\u001f]+/g;
const clean = (value: string | undefined) => (value ?? '').replace(UNSAFE, '-').replace(/\s+/g, ' ').trim();

/**
 * The name of an export without its extension.
 *
 * A document (PDF, PNG, Word) shows one language and one preset, so its name says which: "title - preset - language".
 * A backup holds the whole resume, every language and every preset, so naming it after the language or the preset
 * that happened to be displayed would be wrong: it is named after the resume alone.
 */
export function exportBaseName(kind: 'document' | 'backup', parts: { title: string; presetName?: string; locale?: string | null }): string {
  const title = clean(parts.title) || 'resume';
  if (kind === 'backup') return `${title} - backup`;
  return [title, clean(parts.presetName), parts.locale].filter(Boolean).join(' - ');
}
