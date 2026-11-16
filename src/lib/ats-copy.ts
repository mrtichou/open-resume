import type { AtsCriterion } from './ats-estimate.ts';

type Translator = (message: string, values?: Record<string, string | number>) => string;

/** Where the "improve" button of a criterion leads: a tab of the editor, or a field to locate. */
export interface AtsFix { label: string; view?: 'edit' | 'translate' | 'template' | 'share'; locate?: string }
export interface AtsText { title: string; detail: string; fix?: AtsFix }

/** The wording of one criterion, for the interface language. Kept apart from the calculation so that both stay simple. */
export function atsText(criterion: AtsCriterion, t: Translator): AtsText {
  const { id, status, details } = criterion;
  const ok = status === 'pass';
  switch (id) {
    case 'name':
      return { title: t('Candidate name'), detail: ok ? t('Your name is on the resume.') : t('Add your name: scanners use it to identify the candidate.'), fix: ok ? undefined : { label: t('Edit profile'), locate: 'profile' } };
    case 'email':
      return { title: t('Email address'), detail: ok ? t('An email address was found.') : status === 'warn' ? t('The email address does not look valid.') : t('No email address: scanners and recruiters expect one.'), fix: ok ? undefined : { label: t('Edit profile'), locate: 'profile' } };
    case 'phone':
      return { title: t('Phone number'), detail: ok ? t('A phone number was found.') : t('No phone number. It is optional, but many application forms ask for one.'), fix: ok ? undefined : { label: t('Edit profile'), locate: 'profile' } };
    case 'headings':
      return {
        title: t('Section titles'),
        detail: ok ? t('Every section has a standard title.') : t('{count} of {total} section titles are standard. Scanners look for names such as Experience, Education or Skills. Rename: {labels}.', { count: details.count ?? 0, total: details.total ?? 0, labels: (details.labels ?? []).join(', ') }),
        fix: ok ? undefined : { label: t('Edit sections'), view: 'edit' },
      };
    case 'dates':
      return {
        title: t('Dates on entries'),
        detail: ok ? t('Every experience and education entry has dates.') : t('{count} of {total} entries have dates. Scanners use them to order your experience.', { count: details.count ?? 0, total: details.total ?? 0 }),
        fix: ok ? undefined : { label: t('Edit entries'), view: 'edit' },
      };
    case 'layout':
      return {
        title: t('Page layout'),
        detail: ok ? t('The template has no side band that a scanner could mix up with the body.')
          : t('This template puts your name and contact details in a side band. A scanner that reads by position may mix it with the body; a one-column template such as ATS English or Orbit is safer.'),
        fix: ok ? undefined : { label: t('Change template'), view: 'template' },
      };
    case 'alphabet':
      return {
        title: t('Alphabet in the PDF'),
        detail: ok ? t('The PDF fonts can draw this language.') : t('The PDF fonts cannot draw this alphabet: send the Word export instead.'),
        fix: ok ? undefined : { label: t('Open exports'), view: 'share' },
      };
    case 'extraction':
      return { title: t('Text in the PDF'), detail: ok ? t('A scanner can extract the text of the PDF.') : t('A scanner finds almost no text in the PDF: send the Word export or check the template.'), fix: ok ? undefined : { label: t('Open exports'), view: 'share' } };
    case 'order':
      return {
        title: t('Reading order'),
        detail: ok ? t('The text comes in a natural reading order.') : t('The text jumps back up the page {count} times when read in file order, as happens when columns or bands are mixed. A one-column template is safer.', { count: details.count ?? 0 }),
        fix: ok ? undefined : { label: t('Change template'), view: 'template' },
      };
    case 'characters':
      return { title: t('Clean characters'), detail: ok ? t('No stray characters in the extracted text.') : t('{count} characters (ligatures, hidden or unreadable symbols) may come out garbled in a scanner.', { count: details.count ?? 0 }), fix: ok ? undefined : { label: t('Change template'), view: 'template' } };
    case 'found':
      return { title: t('Contact details in the PDF'), detail: ok ? t('Your email and phone are found in the extracted text.') : t('Your email or phone cannot be found in the extracted text of the PDF.'), fix: ok ? undefined : { label: t('Open exports'), view: 'share' } };
    case 'wordHeadings':
      return { title: t('Word: real headings'), detail: ok ? t('The Word file marks its section titles as headings.') : t('The Word file has no real headings, so a scanner cannot tell where sections start.') };
    case 'wordStructure':
      return { title: t('Word: plain structure'), detail: ok ? t('The Word file has no table or text box, and its lists are real lists.') : t('The Word file has {count} tables or text boxes, or {total} typed bullets: scanners can skip or scramble them.', { count: details.count ?? 0, total: details.total ?? 0 }) };
    case 'wordLanguage':
      return { title: t('Word: language'), detail: ok ? t('The Word file declares its language.') : t('The Word file does not declare its language.') };
    case 'translation':
      return {
        title: t('Translation'),
        detail: ok ? t('Every text is translated.') : t('{count} texts are still in the source language.', { count: details.count ?? 0 }),
        fix: ok ? undefined : { label: t('Open the Translation tab'), view: 'translate' },
      };
  }
}
