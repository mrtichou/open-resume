/**
 * What a scanner receives when it extracts the text of the PDF that would be sent: is there text at all,
 * does it come in reading order, is it free of stray characters, and can the contact details be found in it.
 * Only measurements are kept; the text itself is dropped as soon as the checks are done.
 *
 * The functions take the parts of a pdf.js document they need, so they run in the browser and in tests.
 */
export interface PdfTextItem { text: string; y: number }
export interface PdfPageText { items: PdfTextItem[] }
export interface PdfAnalysis {
  pages: number;
  items: number;
  chars: number;
  /** Times the next piece of text sits clearly higher on the page than the previous one, in file order. */
  upwardJumps: number;
  /** Ligatures, private-use, replacement, zero-width and control characters. */
  strayChars: number;
  emailFound: boolean;
  phoneFound: boolean;
}
export interface PdfDocumentLike {
  numPages: number;
  getPage(n: number): Promise<{ getTextContent(): Promise<{ items: unknown[] }> }>;
}

/** Reads the text items of every page, in the order the file stores them. */
export async function extractPdfText(document: PdfDocumentLike): Promise<PdfPageText[]> {
  const pages: PdfPageText[] = [];
  for (let n = 1; n <= document.numPages; n++) {
    const content = await (await document.getPage(n)).getTextContent();
    const items: PdfTextItem[] = [];
    for (const raw of content.items) {
      const item = raw as { str?: unknown; transform?: unknown };
      if (typeof item.str === 'string' && item.str !== '' && Array.isArray(item.transform)) items.push({ text: item.str, y: Number(item.transform[5]) });
    }
    pages.push({ items });
  }
  return pages;
}

const isStray = (code: number) => (code >= 0xfb00 && code <= 0xfb06) || (code >= 0xe000 && code <= 0xf8ff) || code === 0xfffd
  || code === 0x200b || code === 0x200c || code === 0x200d || code === 0xfeff || code === 0xad || (code < 0x20 && code !== 0x09 && code !== 0x0a);
const compact = (text: string) => text.toLowerCase().replace(/\s+/g, '');

/** Measures the extracted text. `email` and `phone` are the details the resume is expected to contain. */
export function analyzePdfText(pages: PdfPageText[], expected: { email: string; phone: string }): PdfAnalysis {
  let items = 0, chars = 0, upwardJumps = 0, strayChars = 0;
  let all = '';
  for (const page of pages) {
    let lastY = Infinity;
    for (const item of page.items) {
      items += 1;
      chars += item.text.length;
      if (item.y > lastY + 3) upwardJumps += 1;
      lastY = item.y;
      for (const ch of item.text) if (isStray(ch.codePointAt(0)!)) strayChars += 1;
      all += item.text + ' ';
    }
  }
  const email = compact(expected.email);
  const phoneDigits = expected.phone.replace(/\D/g, '');
  return {
    pages: pages.length, items, chars, upwardJumps, strayChars,
    emailFound: email !== '' && compact(all).includes(email),
    phoneFound: phoneDigits.length >= 7 && all.replace(/\D/g, '').includes(phoneDigits),
  };
}

/** Whether the file has text a scanner can take, and how much of it comes in a sensible order. */
export function readableShare(analysis: PdfAnalysis): { extractable: boolean; orderShare: number; strayShare: number } {
  return {
    extractable: analysis.chars >= 40,
    // A few jumps are normal (a date line, a header); many mean the columns are interleaved.
    orderShare: analysis.items ? Math.max(0, 1 - analysis.upwardJumps / (analysis.items * 0.08)) : 0,
    strayShare: analysis.chars ? analysis.strayChars / analysis.chars : 0,
  };
}
