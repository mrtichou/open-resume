import assert from 'node:assert/strict';
import test from 'node:test';
import { applyLanguageChoice, effectiveLocale } from '../src/lib/view-rules.ts';

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
