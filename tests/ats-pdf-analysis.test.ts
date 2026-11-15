import assert from 'node:assert/strict';
import test from 'node:test';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { analyzePdfText, extractPdfText, readableShare } from '../src/lib/ats-pdf-analysis.ts';
import type { PdfDocumentLike } from '../src/lib/ats-pdf-analysis.ts';
import { estimateAts } from '../src/lib/ats-estimate.ts';
import type { Resume } from '../src/types.ts';

// Synthetic PDFs only: no real resume is involved.
async function makePdf(lines: Array<{ text: string; y: number }>): Promise<PdfDocumentLike> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595, 842]);
  for (const line of lines) page.drawText(line.text, { x: 50, y: line.y, size: 11, font });
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  return (await pdfjs.getDocument({ data: await doc.save(), verbosity: 0 }).promise) as unknown as PdfDocumentLike;
}
const contacts = { email: 'ada@example.com', phone: '+33 1 23 45 67 89' };
const body = 'Worked on reliable systems for several years and wrote documentation for the team'.split(' ');

test('a well ordered PDF is extractable, in order, clean, and shows the contact details', async () => {
  const lines = [{ text: 'Ada Example', y: 800 }, { text: 'ada@example.com +33 1 23 45 67 89', y: 780 }, ...body.map((word, i) => ({ text: word + ' lorem ipsum dolor sit amet', y: 740 - i * 15 }))];
  const analysis = analyzePdfText(await extractPdfText(await makePdf(lines)), contacts);
  assert.equal(analysis.pages, 1);
  assert.equal(analysis.upwardJumps, 0);
  assert.equal(analysis.strayChars, 0);
  assert.ok(analysis.emailFound && analysis.phoneFound);
  const share = readableShare(analysis);
  assert.deepEqual([share.extractable, share.orderShare, share.strayShare], [true, 1, 0]);
});

test('text stored in an interleaved order jumps back up the page and loses the order criterion', async () => {
  const lines = body.flatMap((word, i) => [{ text: word + ' left column text here', y: 800 - i * 15 }, { text: word + ' right column text here', y: 400 - i * 15 }]);
  const jumpy = analyzePdfText(await extractPdfText(await makePdf(lines.map((line, i) => i % 2 ? { ...line, y: line.y + 300 } : line))), contacts);
  assert.ok(jumpy.upwardJumps >= 5, `jumps ${jumpy.upwardJumps}`);
  assert.ok(readableShare(jumpy).orderShare < 0.5);
});

test('a page with no text is not extractable, and contact details are not found', async () => {
  const analysis = analyzePdfText(await extractPdfText(await makePdf([])), contacts);
  assert.equal(analysis.chars, 0);
  assert.equal(readableShare(analysis).extractable, false);
  assert.equal(analysis.emailFound, false);
});

test('stray characters are counted and only measurements are kept', () => {
  const analysis = analyzePdfText([{ items: [{ text: 'oﬁce  ​ ok', y: 10 }, { text: 'plain text that is long enough to count as a page of words', y: 0 }] }], contacts);
  assert.equal(analysis.strayChars, 3);
  assert.ok(!JSON.stringify(analysis).includes('plain'));
});

function resume(): Resume {
  return {
    title: 'Fixture',
    profile: { name: 'Ada Example', email: contacts.email, phone: contacts.phone, website: '', city: '', birthday: '', status: '', headline: '', avatar: '' },
    sections: [{ id: 'work', type: 'work', label: 'Experience', visible: true, items: [{ id: 'w', org: 'Acme', startDate: '2020' }] }],
  };
}
const base = { resume: resume(), language: 'en', layoutVariant: 'ats', missingTranslations: null };
const clean = { pages: 1, items: 40, chars: 900, upwardJumps: 0, strayChars: 0, emailFound: true, phoneFound: true };

test('the estimate adds the extraction criteria only once the PDF is analysed, and judges them', () => {
  assert.equal(estimateAts(base).criteria.some(c => c.id === 'extraction'), false);
  const good = estimateAts({ ...base, pdf: clean });
  assert.equal(good.percent, 100);
  for (const id of ['extraction', 'order', 'characters', 'found']) assert.equal(good.criteria.find(c => c.id === id)!.status, 'pass', id);

  const bad = estimateAts({ ...base, pdf: { ...clean, upwardJumps: 20, strayChars: 30, emailFound: false } });
  assert.equal(bad.criteria.find(c => c.id === 'order')!.status, 'fail');
  assert.equal(bad.criteria.find(c => c.id === 'characters')!.status, 'fail');
  assert.equal(bad.criteria.find(c => c.id === 'found')!.status, 'warn');
  assert.ok(bad.percent < 100);

  const empty = estimateAts({ ...base, pdf: { ...clean, chars: 0, items: 0 } });
  assert.equal(empty.criteria.find(c => c.id === 'extraction')!.status, 'fail');
  assert.equal(empty.criteria.some(c => c.id === 'order'), false, 'nothing to order without text');
});
