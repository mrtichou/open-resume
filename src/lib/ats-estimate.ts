import { RESUME_SECTION_LABELS } from '../resume-locales.ts';
import type { Resume } from '../types.ts';
import { readableShare } from './ats-pdf-analysis.ts';
import type { PdfAnalysis } from './ats-pdf-analysis.ts';
import type { DocxAnalysis } from './ats-docx-analysis.ts';
import { isPdfRenderable } from './translation-languages.ts';
import { SIDE_BAND_HEADER_VARIANTS } from './template-layout.ts';

/**
 * An estimate of how well automatic resume scanners can read the resume as it will be sent.
 *
 * It is a set of checkable criteria with weights, not the verdict of a real recruitment system: no such
 * system can be tested here and each employer configures theirs. The result always carries the list of
 * criteria, so the percentage can be explained and improved. This module holds only the calculation; the
 * wording lives with the interface.
 */
export type AtsCriterionId = 'name' | 'email' | 'phone' | 'headings' | 'dates' | 'layout' | 'alphabet' | 'translation' | 'extraction' | 'order' | 'characters' | 'found' | 'wordHeadings' | 'wordStructure' | 'wordLanguage';
export type AtsStatus = 'pass' | 'warn' | 'fail';

export interface AtsCriterion {
  id: AtsCriterionId;
  status: AtsStatus;
  weight: number;
  /** Points earned out of `weight`. */
  earned: number;
  /** Facts the interface needs to explain the result (counts, labels to fix). */
  details: { count?: number; total?: number; labels?: string[]; variant?: string };
}
export interface AtsEstimate {
  /** 0 to 100, over the criteria that apply. */
  percent: number;
  level: 'good' | 'fair' | 'poor';
  criteria: AtsCriterion[];
}
export interface AtsInput {
  /** The resume as it will be sent: preset and language already applied. */
  resume: Resume;
  /** Language of that resume, for the section titles scanners expect. */
  language: string;
  /** The template's layout variant (see TEMPLATE_VARIANTS). */
  layoutVariant: string;
  /** Texts still in the source language while a translation is shown; null when the source language is shown. */
  missingTranslations: number | null;
  /** Measurements of the text extracted from the PDF of the preview, once analysed. */
  pdf?: PdfAnalysis | null;
  /** Structure of the Word export, once analysed. */
  docx?: DocxAnalysis | null;
}

const WEIGHTS: Record<AtsCriterionId, number> = { name: 7, email: 15, phone: 8, headings: 20, dates: 15, layout: 15, alphabet: 10, translation: 10, extraction: 15, order: 15, characters: 5, found: 10, wordHeadings: 8, wordStructure: 8, wordLanguage: 4 };

// ---- Section titles ---------------------------------------------------------

const fold = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

// Common alternatives to the titles the app proposes, in the two languages where several are in everyday use.
const EXTRA_TITLES: Record<string, string[]> = {
  en: ['professional summary', 'summary', 'profile', 'about me', 'objective', 'career summary', 'work experience', 'professional experience', 'experience', 'employment history', 'work history',
    'education', 'education and training', 'skills', 'core skills', 'technical skills', 'key skills', 'projects', 'personal projects', 'languages', 'awards', 'honors', 'certifications',
    'certificates', 'volunteering', 'volunteer experience', 'publications', 'interests'],
  fr: ['profil', 'profil professionnel', 'resume', 'resume de carriere', 'a propos', 'objectif', 'experience', 'experiences professionnelles', 'experience professionnelle', 'parcours professionnel',
    'formation', 'formations', 'education', 'diplomes', 'competences', 'competences cles', 'competences techniques', 'projets', 'langues', 'distinctions', 'certifications', 'certificats',
    'benevolat', 'centres d interet', 'loisirs', 'publications'],
};

/** The section titles scanners expect in a language, or null when the app cannot tell for that language. */
export function standardSectionTitles(language: string): Set<string> | null {
  const base = language in RESUME_SECTION_LABELS ? language : language.split('-')[0];
  const titles = new Set<string>();
  // `fallback` is the name of a blank resume, not a section title.
  for (const [key, label] of Object.entries(RESUME_SECTION_LABELS[base] ?? {})) if (key !== 'fallback') titles.add(fold(label));
  for (const label of EXTRA_TITLES[base] ?? []) titles.add(fold(label));
  return RESUME_SECTION_LABELS[base] || EXTRA_TITLES[base] ? titles : null;
}

// ---- The criteria -----------------------------------------------------------

const DATED_SECTIONS = new Set(['work', 'project', 'organization', 'education']);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const digits = (text: string) => text.replace(/\D/g, '').length;

type Result = Pick<AtsCriterion, 'status' | 'details'> & { fraction: number };
const statusFor = (fraction: number): AtsStatus => fraction >= 0.999 ? 'pass' : fraction >= 0.5 ? 'warn' : 'fail';
const shareResult = (count: number, total: number, extra: AtsCriterion['details'] = {}): Result => {
  const fraction = total ? count / total : 1;
  return { fraction, status: statusFor(fraction), details: { count, total, ...extra } };
};

function criterionResults(input: AtsInput): Partial<Record<AtsCriterionId, Result>> {
  const { resume } = input;
  const email = resume.profile.email.trim();
  const phone = resume.profile.phone.trim();
  const sections = resume.sections.filter(section => section.visible && section.items.length > 0);
  const results: Partial<Record<AtsCriterionId, Result>> = {};

  results.name = resume.profile.name.trim() ? { fraction: 1, status: 'pass', details: {} } : { fraction: 0, status: 'fail', details: {} };
  results.email = !email ? { fraction: 0, status: 'fail', details: {} } : EMAIL.test(email) ? { fraction: 1, status: 'pass', details: {} } : { fraction: 0.5, status: 'warn', details: {} };
  // A missing phone number is common and sometimes deliberate: it costs points but never shows as a failure.
  results.phone = digits(phone) >= 7 ? { fraction: 1, status: 'pass', details: {} } : { fraction: 0, status: 'warn', details: {} };

  const titles = standardSectionTitles(input.language);
  if (titles && sections.length > 0) {
    const odd = sections.filter(section => !titles.has(fold(section.label)));
    results.headings = shareResult(sections.length - odd.length, sections.length, { labels: odd.map(section => section.label) });
  }

  const datable = sections.filter(section => DATED_SECTIONS.has(section.type)).flatMap(section => section.items);
  if (datable.length > 0) {
    const dated = datable.filter(item => item.startDate || item.endDate || item.current || (item.period ?? '').trim());
    results.dates = shareResult(dated.length, datable.length);
  }

  // Only the side-band templates are flagged here: a band that holds the header can be read out of order.
  // The actual column structure of the file is measured once the PDF is analysed.
  results.layout = SIDE_BAND_HEADER_VARIANTS.has(input.layoutVariant)
    ? { fraction: 0.5, status: 'warn', details: { variant: input.layoutVariant } }
    : { fraction: 1, status: 'pass', details: { variant: input.layoutVariant } };

  results.alphabet = isPdfRenderable(input.language) ? { fraction: 1, status: 'pass', details: {} } : { fraction: 0, status: 'fail', details: {} };

  if (input.missingTranslations !== null) {
    results.translation = input.missingTranslations === 0
      ? { fraction: 1, status: 'pass', details: { count: 0 } }
      : { fraction: 0.4, status: 'warn', details: { count: input.missingTranslations } };
  }

  if (input.pdf) {
    const { extractable, orderShare, strayShare } = readableShare(input.pdf);
    results.extraction = extractable ? { fraction: 1, status: 'pass', details: {} } : { fraction: 0, status: 'fail', details: {} };
    // Without text there is nothing to order or compare: those criteria would only repeat the failure.
    if (extractable) {
      results.order = { fraction: orderShare, status: statusFor(orderShare), details: { count: input.pdf.upwardJumps, total: input.pdf.items } };
      const cleanShare = strayShare === 0 ? 1 : strayShare < 0.01 ? 0.5 : 0;
      results.characters = { fraction: cleanShare, status: statusFor(cleanShare), details: { count: input.pdf.strayChars } };
      const wanted = [email, digits(phone) >= 7 ? phone : ''].filter(Boolean);
      if (wanted.length > 0) {
        const found = (email ? Number(input.pdf.emailFound) : 0) + (digits(phone) >= 7 ? Number(input.pdf.phoneFound) : 0);
        results.found = shareResult(found, wanted.length);
      }
    }
  }
  if (input.docx) {
    const docx = input.docx;
    results.wordHeadings = docx.headings > 0 ? { fraction: 1, status: 'pass', details: {} } : { fraction: 0, status: 'fail', details: {} };
    const hidden = docx.tables + docx.textBoxes;
    const structure = hidden > 0 ? 0 : docx.typedBullets > 0 ? 0.5 : 1;
    results.wordStructure = { fraction: structure, status: statusFor(structure), details: { count: hidden, total: docx.typedBullets } };
    results.wordLanguage = docx.languageDeclared ? { fraction: 1, status: 'pass', details: {} } : { fraction: 0, status: 'warn', details: {} };
  }
  return results;
}

export function estimateAts(input: AtsInput): AtsEstimate {
  const results = criterionResults(input);
  const criteria: AtsCriterion[] = (Object.keys(WEIGHTS) as AtsCriterionId[])
    .flatMap(id => results[id] ? [{ id, status: results[id]!.status, weight: WEIGHTS[id], earned: WEIGHTS[id] * results[id]!.fraction, details: results[id]!.details }] : []);
  const total = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  const earned = criteria.reduce((sum, criterion) => sum + criterion.earned, 0);
  const percent = total ? Math.round((earned / total) * 100) : 0;
  return { percent, level: percent >= 80 ? 'good' : percent >= 50 ? 'fair' : 'poor', criteria };
}
