import { strFromU8, unzipSync } from 'fflate';

/**
 * The structure of the Word file that would be exported, as an automatic scanner meets it: real headings,
 * real lists, no table or text box that hides text from a reader, a declared language. Only counts are kept.
 */
export interface DocxAnalysis {
  paragraphs: number;
  headings: number;
  /** Paragraphs that are real list items (numbering). */
  listItems: number;
  /** Paragraphs that start with a typed bullet character instead of a real list. */
  typedBullets: number;
  tables: number;
  textBoxes: number;
  languageDeclared: boolean;
}

const count = (xml: string, pattern: RegExp) => xml.match(pattern)?.length ?? 0;
const decode = (xml: string) => xml.replace(/<[^>]+>/g, '');

export function analyzeDocx(bytes: Uint8Array): DocxAnalysis {
  const files = unzipSync(bytes, { filter: file => file.name === 'word/document.xml' || file.name === 'word/styles.xml' });
  const document = files['word/document.xml'] ? strFromU8(files['word/document.xml']) : '';
  const styles = files['word/styles.xml'] ? strFromU8(files['word/styles.xml']) : '';
  const paragraphs = document.match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? [];
  return {
    paragraphs: paragraphs.length,
    headings: paragraphs.filter(p => /<w:pStyle w:val="(Heading|Title)/i.test(p)).length,
    listItems: paragraphs.filter(p => p.includes('<w:numPr>')).length,
    typedBullets: paragraphs.filter(p => !p.includes('<w:numPr>') && /^\s*[•●▪■◦·]/.test(decode(p))).length,
    tables: count(document, /<w:tbl>/g),
    textBoxes: count(document, /<w:txbxContent>/g),
    languageDeclared: /<w:lang [^>]*w:val="[^"]+"/.test(styles) || /<w:lang [^>]*w:val="[^"]+"/.test(document),
  };
}
