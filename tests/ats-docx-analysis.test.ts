import assert from 'node:assert/strict';
import test from 'node:test';
import { zipSync, strToU8 } from 'fflate';
import { DEFAULT_SETTINGS } from '../src/data.ts';
import { analyzeDocx } from '../src/lib/ats-docx-analysis.ts';
import { estimateAts } from '../src/lib/ats-estimate.ts';
import { buildResumeDocx } from '../src/lib/docx-export.ts';
import type { Resume } from '../src/types.ts';

const resume: Resume = {
  title: 'Fixture',
  profile: { name: 'Ada Example', email: 'ada@example.com', phone: '+33 1 23 45 67 89', website: '', city: '', birthday: '', status: '', headline: 'Engineer', avatar: '' },
  sections: [{ id: 'work', type: 'work', label: 'Experience', visible: true, items: [{ id: 'job', org: 'Acme', role: 'Engineer', startDate: '2020', body: '<ul><li>Built things</li><li>Shipped them</li></ul>' }] }],
};
const fake = (document: string, styles = '') => zipSync({ 'word/document.xml': strToU8(document), 'word/styles.xml': strToU8(styles) });

test('the app\'s own Word export has headings, real lists, no table or text box, and a language', async () => {
  const blob = await buildResumeDocx({ resume, settings: DEFAULT_SETTINGS }, 'en');
  const analysis = analyzeDocx(new Uint8Array(await blob.arrayBuffer()));
  assert.ok(analysis.headings >= 1, 'headings');
  assert.ok(analysis.listItems >= 2, 'real list items');
  assert.deepEqual([analysis.tables, analysis.textBoxes, analysis.typedBullets], [0, 0, 0]);
  assert.equal(analysis.languageDeclared, true);
});

test('tables, text boxes, typed bullets and a missing language are detected', () => {
  const analysis = analyzeDocx(fake('<w:document><w:body><w:tbl></w:tbl><w:p><w:r><w:txbxContent></w:txbxContent></w:r></w:p><w:p><w:r><w:t>• typed</w:t></w:r></w:p></w:body></w:document>'));
  assert.deepEqual([analysis.tables, analysis.textBoxes, analysis.typedBullets, analysis.headings, analysis.languageDeclared], [1, 1, 1, 0, false]);
});

test('the Word criteria are added once analysed and judge headings, structure and language', () => {
  const base = { resume, language: 'en', layoutVariant: 'ats', missingTranslations: null };
  const good = { paragraphs: 20, headings: 3, listItems: 5, typedBullets: 0, tables: 0, textBoxes: 0, languageDeclared: true };
  assert.equal(estimateAts(base).criteria.some(c => c.id === 'wordHeadings'), false);
  const ok = estimateAts({ ...base, docx: good });
  assert.equal(ok.percent, 100);
  const bad = estimateAts({ ...base, docx: { ...good, headings: 0, tables: 2, languageDeclared: false } });
  assert.deepEqual(['wordHeadings', 'wordStructure', 'wordLanguage'].map(id => bad.criteria.find(c => c.id === id)!.status), ['fail', 'fail', 'warn']);
});
