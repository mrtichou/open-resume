import assert from 'node:assert/strict';
import test from 'node:test';
import { estimateAts, standardSectionTitles } from '../src/lib/ats-estimate.ts';
import type { AtsCriterionId, AtsInput } from '../src/lib/ats-estimate.ts';
import type { Resume } from '../src/types.ts';

function resume(): Resume {
  return {
    title: 'Fixture',
    profile: { name: 'Ada Example', email: 'ada@example.com', phone: '+33 1 23 45 67 89', website: '', city: '', birthday: '', status: '', headline: 'Engineer', avatar: '' },
    sections: [
      { id: 'summary', type: 'summary', label: 'Summary', visible: true, items: [{ id: 's', body: 'Engineer' }] },
      { id: 'work', type: 'work', label: 'Experience', visible: true, items: [{ id: 'w1', org: 'Acme', role: 'Engineer', startDate: '2020-01', current: true }, { id: 'w2', org: 'Globex', period: '2017 - 2020' }] },
      { id: 'edu', type: 'education', label: 'Education', visible: true, items: [{ id: 'e1', school: 'Open University', startDate: '2012', endDate: '2016' }] },
      { id: 'skills', type: 'skills', label: 'Skills', visible: true, items: [{ id: 'k', title: 'Core', values: ['SQL'] }] },
    ],
  };
}
const input = (overrides: Partial<AtsInput> = {}): AtsInput => ({ resume: resume(), language: 'en', layoutVariant: 'ats', missingTranslations: null, ...overrides });
const by = (estimate: ReturnType<typeof estimateAts>, id: AtsCriterionId) => estimate.criteria.find(criterion => criterion.id === id);

test('a clean one-column resume scores 100 and every criterion that applies passes', () => {
  const estimate = estimateAts(input());
  assert.equal(estimate.percent, 100);
  assert.equal(estimate.level, 'good');
  assert.ok(estimate.criteria.every(criterion => criterion.status === 'pass'));
  assert.equal(by(estimate, 'translation'), undefined, 'nothing to say about translation while the source language is shown');
});

test('the percentage is computed over the criteria that apply, with their weights', () => {
  const estimate = estimateAts(input());
  assert.equal(estimate.criteria.reduce((sum, criterion) => sum + criterion.weight, 0), 90);
  const withTranslation = estimateAts(input({ missingTranslations: 0 }));
  assert.equal(withTranslation.criteria.reduce((sum, criterion) => sum + criterion.weight, 0), 100);
});

test('contact details: a missing or malformed email costs points, a missing phone never shows as a failure', () => {
  const noEmail = resume(); noEmail.profile.email = '';
  assert.equal(by(estimateAts(input({ resume: noEmail })), 'email')!.status, 'fail');
  const badEmail = resume(); badEmail.profile.email = 'ada at example';
  assert.equal(by(estimateAts(input({ resume: badEmail })), 'email')!.status, 'warn');
  const noPhone = resume(); noPhone.profile.phone = '';
  const result = estimateAts(input({ resume: noPhone }));
  assert.equal(by(result, 'phone')!.status, 'warn');
  assert.equal(by(result, 'phone')!.earned, 0);
  assert.ok(result.percent < 100);
  const noName = resume(); noName.profile.name = '  ';
  assert.equal(by(estimateAts(input({ resume: noName })), 'name')!.status, 'fail');
});

test('section titles are judged in the language of the resume, accents and case aside', () => {
  const unusual = resume();
  unusual.sections[1].label = 'My adventures';
  unusual.sections[3].label = 'Stuff I know';
  const estimate = estimateAts(input({ resume: unusual }));
  const headings = by(estimate, 'headings')!;
  assert.deepEqual([headings.details.count, headings.details.total], [2, 4]);
  assert.deepEqual(headings.details.labels, ['My adventures', 'Stuff I know']);
  assert.equal(headings.status, 'warn');

  const french = resume();
  french.sections.forEach((section, index) => { section.label = ['PROFIL', 'Expérience Professionnelle', 'Formation', 'Competences'][index]; });
  assert.equal(by(estimateAts(input({ resume: french, language: 'fr' })), 'headings')!.status, 'pass');
  // The same titles are not standard in English, and a language the app has no list for is not judged at all.
  assert.notEqual(by(estimateAts(input({ resume: french, language: 'en' })), 'headings')!.status, 'pass');
  assert.equal(by(estimateAts(input({ resume: french, language: 'de' })), 'headings'), undefined);
  assert.ok(standardSectionTitles('zh-TW'), 'regional tags use the base language');
  assert.equal(standardSectionTitles('de'), null);
});

test('hidden and empty sections are not judged', () => {
  const doc = resume();
  doc.sections.push({ id: 'odd', type: 'custom', label: 'Zzz', visible: false, items: [{ id: 'z', body: 'x' }] }, { id: 'empty', type: 'custom', label: 'Yyy', visible: true, items: [] });
  assert.equal(by(estimateAts(input({ resume: doc })), 'headings')!.status, 'pass');
});

test('experience and education need dates, and the score follows the share that has them', () => {
  const doc = resume();
  delete doc.sections[1].items[1].period;
  doc.sections[2].items[0].startDate = ''; doc.sections[2].items[0].endDate = '';
  const dates = by(estimateAts(input({ resume: doc })), 'dates')!;
  assert.deepEqual([dates.details.count, dates.details.total], [1, 3]);
  assert.equal(dates.status, 'fail');
  assert.ok(Math.abs(dates.earned - 15 / 3) < 1e-9);
  const skillsOnly = resume(); skillsOnly.sections = [skillsOnly.sections[3]];
  assert.equal(by(estimateAts(input({ resume: skillsOnly })), 'dates'), undefined, 'no dated section: not applicable');
});

test('templates that put the header in a side band are flagged, others are not', () => {
  for (const variant of ['leftbar', 'rightbar']) assert.equal(by(estimateAts(input({ layoutVariant: variant })), 'layout')!.status, 'warn', variant);
  for (const variant of ['ats', 'orbit', 'sidebar', 'classic', 'pillar']) assert.equal(by(estimateAts(input({ layoutVariant: variant })), 'layout')!.status, 'pass', variant);
  assert.ok(estimateAts(input({ layoutVariant: 'leftbar' })).percent < 100);
});

test('an alphabet the PDF fonts cannot draw fails, and the Word export is not penalised for it', () => {
  assert.equal(by(estimateAts(input({ language: 'ar' })), 'alphabet')!.status, 'fail');
  assert.equal(by(estimateAts(input({ language: 'fr' })), 'alphabet')!.status, 'pass');
});

test('untranslated texts only matter while a translation is shown', () => {
  assert.equal(by(estimateAts(input({ missingTranslations: 0 })), 'translation')!.status, 'pass');
  const partial = by(estimateAts(input({ missingTranslations: 5 })), 'translation')!;
  assert.deepEqual([partial.status, partial.details.count], ['warn', 5]);
});

test('the level follows the percentage', () => {
  const none = resume();
  none.profile = { ...none.profile, name: '', email: '', phone: '' };
  none.sections.forEach(section => { section.label = 'Odd ' + section.id; section.items.forEach(item => { delete item.startDate; delete item.endDate; delete item.current; delete item.period; }); });
  const poor = estimateAts(input({ resume: none, layoutVariant: 'leftbar', language: 'en' }));
  assert.ok(poor.percent < 50, `percent ${poor.percent}`);
  assert.equal(poor.level, 'poor');
  const fair = estimateAts(input({ layoutVariant: 'leftbar', resume: (() => { const doc = resume(); doc.profile.phone = ''; doc.profile.email = ''; return doc; })() }));
  assert.equal(fair.level, fair.percent >= 80 ? 'good' : fair.percent >= 50 ? 'fair' : 'poor');
});

// ---- Wording -----------------------------------------------------------------

test('every criterion has wording in every state, and a way to improve it unless it already passes', async () => {
  const { atsText } = await import('../src/lib/ats-copy.ts');
  const t = (message: string, values: Record<string, string | number> = {}) => message.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`));
  const states = [
    { resume: resume(), language: 'en', layoutVariant: 'ats', missingTranslations: 0 },
    (() => { const doc = resume(); doc.profile = { ...doc.profile, name: '', email: 'bad', phone: '' }; doc.sections[1].label = 'Odd'; doc.sections[1].items.forEach(item => { delete item.startDate; delete item.period; delete item.current; }); return { resume: doc, language: 'ar', layoutVariant: 'leftbar', missingTranslations: 3 }; })(),
  ];
  const seen = new Set<string>();
  for (const state of states) {
    for (const criterion of estimateAts(state).criteria) {
      const text = atsText(criterion, t);
      seen.add(`${criterion.id}:${criterion.status}`);
      assert.ok(text.title && text.detail, `${criterion.id}/${criterion.status} has wording`);
      assert.ok(!/\{\w+\}/.test(text.detail), `${criterion.id}/${criterion.status} leaves no placeholder: ${text.detail}`);
      assert.equal(Boolean(text.fix), criterion.status !== 'pass', `${criterion.id}/${criterion.status}: only unmet criteria offer a fix`);
    }
  }
  assert.ok(seen.size >= 12, `the test covered ${seen.size} states`);
});
