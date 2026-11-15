import { CheckCircle2, ShieldCheck, TriangleAlert, XCircle } from 'lucide-react';
import { atsText } from '../lib/ats-copy.ts';
import type { AtsFix } from '../lib/ats-copy.ts';
import type { AtsCriterion, AtsEstimate } from '../lib/ats-estimate.ts';
import { useTheme } from '../lib/theme.tsx';
import { cn } from '../lib/utils.ts';
import { Button } from './ui/button.tsx';

const LEVEL_STYLES = {
  good: { text: 'text-emerald-700', bar: 'bg-emerald-500', frame: 'border-emerald-300 bg-emerald-50/50' },
  fair: { text: 'text-amber-700', bar: 'bg-amber-500', frame: 'border-amber-300 bg-amber-50/50' },
  poor: { text: 'text-red-700', bar: 'bg-red-500', frame: 'border-red-300 bg-red-50/50' },
} as const;

function StatusIcon({ status }: { status: AtsCriterion['status'] }) {
  if (status === 'pass') return <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />;
  if (status === 'warn') return <TriangleAlert size={18} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />;
  return <XCircle size={18} className="mt-0.5 shrink-0 text-red-600" aria-hidden="true" />;
}

/**
 * The ATS estimate: a percentage with a progress bar, what is already right, and what can still be improved
 * (biggest gain first). It describes the resume as it is previewed, so it follows the preset and language shown.
 */
export function AtsEstimatePanel({ estimate, onFix }: { estimate: AtsEstimate; onFix: (fix: AtsFix) => void }) {
  const { t } = useTheme();
  const style = LEVEL_STYLES[estimate.level];
  const total = estimate.criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  const achieved = estimate.criteria.filter(criterion => criterion.status === 'pass');
  // Biggest possible gain first, in percentage points of the final estimate.
  const improvable = estimate.criteria.filter(criterion => criterion.status !== 'pass')
    .map(criterion => ({ criterion, gain: Math.round(((criterion.weight - criterion.earned) / total) * 100) }))
    .sort((a, b) => b.gain - a.gain);

  const row = (criterion: AtsCriterion, gain?: number) => {
    const text = atsText(criterion, t);
    return <li key={criterion.id} className="flex gap-2.5 py-2" data-ats-criterion={criterion.id} data-ats-status={criterion.status}>
      <StatusIcon status={criterion.status} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-medium">{text.title}{gain ? <span className="text-xs font-normal text-muted-foreground">{t('up to +{gain}%', { gain })}</span> : null}</p>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{text.detail}</p>
        {text.fix && <Button variant="outline" size="sm" className="mt-2" onClick={() => onFix(text.fix!)}>{text.fix.label}</Button>}
      </div>
    </li>;
  };

  return <section className={cn('rounded-xl border p-4', style.frame)} aria-label={t('ATS estimate')}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={16} aria-hidden="true" />{t('ATS estimate')}</h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{t('How well automatic resume scanners can read the file you would send (the language and preset shown in the preview). An estimate, not a guarantee: each employer uses its own system.')}</p>
      </div>
      <p className={cn('shrink-0 text-3xl font-semibold tabular-nums', style.text)} aria-live="polite">{estimate.percent}%</p>
    </div>
    <div role="progressbar" aria-valuenow={estimate.percent} aria-valuemin={0} aria-valuemax={100} aria-label={t('ATS estimate')} className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
      <div className={cn('h-full rounded-full transition-all', style.bar)} style={{ width: `${estimate.percent}%` }} />
    </div>
    <p className="mt-2 text-xs text-muted-foreground">{t('{passed} of {total} checks passed', { passed: achieved.length, total: estimate.criteria.length })}</p>

    {improvable.length > 0 && <>
      <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-amber-800">{t('To improve ({count})', { count: improvable.length })}</h4>
      <ul className="divide-y divide-border/60">{improvable.map(({ criterion, gain }) => row(criterion, gain))}</ul>
    </>}
    {achieved.length > 0 && <>
      <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-emerald-800">{t('Achieved ({count})', { count: achieved.length })}</h4>
      <ul className="divide-y divide-border/60">{achieved.map(criterion => row(criterion))}</ul>
    </>}
  </section>;
}
