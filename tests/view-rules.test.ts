import assert from 'node:assert/strict';
import test from 'node:test';
import { effectiveLocale } from '../src/lib/view-rules.ts';

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
