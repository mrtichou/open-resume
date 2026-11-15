import { useEffect, useState } from 'react';
import { analyzePdfText, extractPdfText } from './ats-pdf-analysis.ts';
import type { PdfAnalysis, PdfDocumentLike } from './ats-pdf-analysis.ts';
import type { PdfSnapshot } from './pdf-snapshot.ts';

/**
 * Measures the text of the PDF shown in the preview, the way a scanner would receive it. Runs after each new
 * snapshot and keeps only counts. Returns null while there is nothing (yet) to measure or if it fails.
 */
export function usePdfAnalysis(snapshot: PdfSnapshot | null, expected: { email: string; phone: string }): PdfAnalysis | null {
  const [analysis, setAnalysis] = useState<PdfAnalysis | null>(null);
  const { email, phone } = expected;
  useEffect(() => {
    if (!snapshot) return;
    let cancelled = false;
    let task: { promise: Promise<PdfDocumentLike>; destroy(): Promise<void> } | undefined;
    void Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]).then(async ([pdfjs, worker]) => {
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      // pdf.js transfers its buffer: give it a copy so the download buffer stays intact.
      task = pdfjs.getDocument({ data: snapshot.bytes.slice() }) as unknown as typeof task;
      const document = await task!.promise;
      const pages = await extractPdfText(document);
      if (!cancelled) setAnalysis(analyzePdfText(pages, { email, phone }));
    }).catch(() => { if (!cancelled) setAnalysis(null); });
    return () => { cancelled = true; void task?.destroy().catch(() => {}); };
  }, [snapshot, email, phone]);
  return analysis;
}
