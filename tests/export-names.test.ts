import assert from 'node:assert/strict';
import test from 'node:test';
import { exportBaseName } from '../src/lib/export-names.ts';

test('a document is named after the resume, the preset and the language it shows', () => {
  assert.equal(exportBaseName('document', { title: 'CV Ada', presetName: 'Backend roles', locale: 'fr' }), 'CV Ada - Backend roles - fr');
  assert.equal(exportBaseName('document', { title: 'CV Ada', presetName: 'Backend roles', locale: null }), 'CV Ada - Backend roles');
  assert.equal(exportBaseName('document', { title: 'CV Ada' }), 'CV Ada');
  assert.equal(exportBaseName('document', { title: 'CV Ada', locale: 'es-419' }), 'CV Ada - es-419');
});

test('a backup is named after the resume alone, whatever language or preset was on screen', () => {
  assert.equal(exportBaseName('backup', { title: 'CV Ada', presetName: 'Backend roles', locale: 'es-419' }), 'CV Ada - backup');
});

test('characters that files cannot hold are replaced, and an empty title falls back to "resume"', () => {
  assert.equal(exportBaseName('document', { title: 'A/B: "C"', presetName: 'x\\y|z' }), 'A-B- -C- - x-y-z');
  assert.equal(exportBaseName('document', { title: '   ' }), 'resume');
  assert.equal(exportBaseName('backup', { title: '' }), 'resume - backup');
  assert.equal(exportBaseName('document', { title: 'CV', presetName: '  ' }), 'CV');
});
