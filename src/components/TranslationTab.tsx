import type { ComponentType } from 'react';
import { useTheme } from '../lib/theme.tsx';
import type { FieldInputProps } from '../lib/version-fields.ts';
import { useVariants } from '../lib/variants-context.ts';
import { LanguageBar } from './LanguageBar.tsx';
import { TranslationPanel } from './TranslationPanel.tsx';

/** The Translation tab: pick the language, then translate text by text beside its source. */
export function TranslationTab({ FieldInput }: { FieldInput: ComponentType<FieldInputProps> }) {
  const { t } = useTheme();
  const variants = useVariants();
  if (!variants) return null;
  return <section className="editor-content-panel" aria-label={t('Translation')}>
    <div className="flex flex-col gap-3">
      <LanguageBar />
      {variants.localeId
        ? <TranslationPanel FieldInput={FieldInput} />
        : <p className="text-xs leading-5 text-muted-foreground" role="status">{variants.translatedLocales.length > 0
          ? t('Choose a language above to see its translation.')
          : t('Add a translation above to start translating.')}</p>}
    </div>
  </section>;
}
