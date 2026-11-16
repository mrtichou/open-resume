import assert from 'node:assert/strict';
import test from 'node:test';
import { applyLanguageChoice, effectiveLocale, outputSummary } from '../src/lib/view-rules.ts';

test('the Content tab always previews the source language, whatever translation was chosen', () => {
  assert.equal(effectiveLocale('edit', 'fr'), null);
  assert.equal(effectiveLocale('edit', null), null);
});

test('every other tab shows the translation that was chosen', () => {
  for (const view of ['translate', 'template', 'check', 'share']) {
    assert.equal(effectiveLocale(view, 'fr'), 'fr', view);
    assert.equal(effectiveLocale(view, null), null, `${view} with no translation chosen`);
  }
});

test('choosing a translation survives a visit to the Content tab', () => {
  const chosen = 'fr';
  const sequence = ['share', 'edit', 'check'].map(view => effectiveLocale(view, chosen));
  assert.deepEqual(sequence, ['fr', null, 'fr']);
});

test('picking a translation from Content opens the Translation tab', () => {
  assert.deepEqual(applyLanguageChoice('edit', 'fr', 'en'), { locale: 'fr', view: 'translate' });
});

test('picking the source language from the Translation tab goes back to Content', () => {
  assert.deepEqual(applyLanguageChoice('translate', 'en', 'en'), { locale: null, view: 'edit' });
});

test('picking a language from the output tabs only changes what is previewed and exported', () => {
  for (const view of ['template', 'check', 'share']) {
    assert.deepEqual(applyLanguageChoice(view, 'fr', 'en'), { locale: 'fr', view }, `${view}: translation`);
    assert.deepEqual(applyLanguageChoice(view, 'en', 'en'), { locale: null, view }, `${view}: source`);
  }
});

test('picking the language already shown changes nothing', () => {
  assert.deepEqual(applyLanguageChoice('edit', 'en', 'en'), { locale: null, view: 'edit' });
  assert.deepEqual(applyLanguageChoice('translate', 'fr', 'en'), { locale: 'fr', view: 'translate' });
});

test('the export reminder names the language and the preset, and is empty for a plain resume', () => {
  assert.equal(outputSummary('Français', 'Backend roles', true), 'Français · Backend roles');
  assert.equal(outputSummary('English', undefined, true), 'English');
  assert.equal(outputSummary('English', 'Backend roles', false), 'Backend roles');
  assert.equal(outputSummary('English', undefined, false), '');
  assert.equal(outputSummary('English', '', false), '');
});

test('standard section titles follow the resume\'s own language, not the interface language', async () => {
  const { sectionTitleLanguage } = await import('../src/lib/view-rules.ts');
  const known = (language: string) => ['en', 'fr', 'zh'].includes(language);
  assert.equal(sectionTitleLanguage({ sourceLocale: 'en' }, 'fr', known), 'en', 'a resume in English keeps English titles in a French interface');
  assert.equal(sectionTitleLanguage({}, 'fr', known), 'en', 'no source language recorded: English, the default');
  assert.equal(sectionTitleLanguage(undefined, 'fr', known), 'fr', 'an older resume without variants follows the interface');
  assert.equal(sectionTitleLanguage({ sourceLocale: 'fr-CA' }, 'en', known), 'fr', 'a regional tag uses its base language');
  assert.equal(sectionTitleLanguage({ sourceLocale: 'de' }, 'fr', known), null, 'no titles for that language: nothing is rewritten');
});
