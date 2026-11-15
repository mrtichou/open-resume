import { Languages, Layers } from 'lucide-react';
import { useId } from 'react';
import { useTheme } from '../lib/theme.tsx';
import { useVariants } from '../lib/variants-context.ts';
import { applyLanguageChoice } from '../lib/view-rules.ts';
import { languageName } from './LanguageBar.tsx';

// Not a valid preset id (they are generated), so it can sit among the options.
const MANAGE = '__manage__';
const selectClass = 'max-w-36 truncate rounded border border-border bg-background px-1.5 py-0.5 text-xs text-foreground';

/**
 * What the preview shows and what the exports contain, chosen where it is always visible: the
 * preview header. The tabs decide what you edit; these decide what you look at and export.
 */
export function PreviewViewSelectors({ activeView, onActiveView, onManagePresets }: { activeView: string; onActiveView: (view: string) => void; onManagePresets: () => void }) {
  const { t } = useTheme();
  const variants = useVariants();
  const languageId = useId();
  const presetId = useId();
  const hasLanguages = (variants?.translatedLocales.length ?? 0) > 0;
  const hasPresets = (variants?.presets.length ?? 0) > 0;
  if (!variants || (!hasLanguages && !hasPresets)) return null;
  const options = [variants.sourceLocale, ...variants.translatedLocales];
  return <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
    {hasPresets && <div className="flex items-center gap-1.5">
      <label htmlFor={presetId} title={t('Preset')} className="text-muted-foreground"><Layers size={14} aria-hidden="true" /><span className="sr-only">{t('Preset')}</span></label>
      <select id={presetId} className={selectClass} value={variants.presetId ?? ''}
        onChange={event => {
          // The last choice is not a preset: it takes you to where presets are created, renamed and deleted.
          if (event.target.value === MANAGE) onManagePresets();
          else variants.selectPreset(event.target.value || null);
        }}>
        <option value="">{t('Full resume (no preset)')}</option>
        {variants.presets.map(preset => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
        <option value={MANAGE}>{t('Manage presets…')}</option>
      </select>
    </div>}
    {hasLanguages && <div className="flex items-center gap-1.5">
      <label htmlFor={languageId} title={t('Language')} className="text-muted-foreground"><Languages size={14} aria-hidden="true" /><span className="sr-only">{t('Language')}</span></label>
      <select id={languageId} className={selectClass} value={variants.localeId ?? variants.sourceLocale}
        onChange={event => {
          const next = applyLanguageChoice(activeView, event.target.value, variants.sourceLocale);
          variants.selectLocale(next.locale);
          if (next.view !== activeView) onActiveView(next.view);
        }}>
        {options.map(code => <option key={code} value={code}>{languageName(code)}</option>)}
      </select>
    </div>}
  </div>;
}
