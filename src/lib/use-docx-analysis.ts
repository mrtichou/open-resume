import { useEffect, useState } from 'react';
import { analyzeDocx } from './ats-docx-analysis.ts';
import type { DocxAnalysis } from './ats-docx-analysis.ts';
import type { EditorDocument } from '../types.ts';

/**
 * Builds the Word export in memory and measures its structure. The Word library is large and the file is not
 * needed until someone looks at the Check tab, so nothing is built while `enabled` is false.
 */
export function useDocxAnalysis(document: EditorDocument | null, language: string, enabled: boolean): DocxAnalysis | null {
  const [analysis, setAnalysis] = useState<DocxAnalysis | null>(null);
  useEffect(() => {
    if (!enabled || !document) return;
    let cancelled = false;
    // Wait for a pause in editing before building a whole document.
    const timer = setTimeout(() => {
      void import('./docx-export.ts').then(async ({ buildResumeDocx }) => {
        const blob = await buildResumeDocx(document, language);
        const result = analyzeDocx(new Uint8Array(await blob.arrayBuffer()));
        if (!cancelled) setAnalysis(result);
      }).catch(() => { if (!cancelled) setAnalysis(null); });
    }, 600);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [document, language, enabled]);
  return analysis;
}
