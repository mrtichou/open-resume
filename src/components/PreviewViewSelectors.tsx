import { useId } from 'react';
import { useTheme } from '../lib/theme.tsx';
import { useVariants } from '../lib/variants-context.ts';
import { applyLanguageChoice } from '../lib/view-rules.ts';
import { languageName } from './LanguageBar.tsx';

const selectClass = 'max-w-40 rounded border border-border bg-background px-1.5 py-1 text-xs text-foreground';

/**
 * What the preview shows and what the exports contain, chosen where it is always visible: the
 * preview header. The tabs decide what you edit; these decide what you look at and export.
 */
export function PreviewViewSelectors({ activeView, onActiveView }: { activeView: string; onActiveView: (view: string) => void }) {
  const { t } = useTheme();
  const variants = useVariants();
  const languageId = useId();
  if (!variants || variants.translatedLocales.length === 0) return null;
  const options = [variants.sourceLocale, ...variants.translatedLocales];
  return <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
    <div className="flex items-center gap-1.5">
      <label htmlFor={languageId} className="text-xs text-muted-foreground">{t('Language')}</label>
      <select id={languageId} className={selectClass} value={variants.localeId ?? variants.sourceLocale}
        onChange={event => {
          const next = applyLanguageChoice(activeView, event.target.value, variants.sourceLocale);
          variants.selectLocale(next.locale);
          if (next.view !== activeView) onActiveView(next.view);
        }}>
        {options.map(code => <option key={code} value={code}>{languageName(code)}</option>)}
      </select>
    </div>
  </div>;
}
