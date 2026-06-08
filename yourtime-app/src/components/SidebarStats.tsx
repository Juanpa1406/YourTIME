import { useTranslation } from 'react-i18next';
import type { TodayStats } from '../services/historial';
import { colorForPct } from '../services/historial';

type Props = {
  today: TodayStats;
  streak: number;
};

const DIAS_LARGOS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DIAS_LARGOS_EN = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MESES_CORTOS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_CORTOS_EN = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

export default function SidebarStats({ today, streak }: Props) {
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language.startsWith('en');
  const diasLargos = isEnglish ? DIAS_LARGOS_EN : DIAS_LARGOS_ES;
  const mesesCortos = isEnglish ? MESES_CORTOS_EN : MESES_CORTOS_ES;

  const now = new Date();
  const diaNombre = diasLargos[now.getDay()].slice(0, 3);
  const fechaStr = isEnglish
    ? `${diaNombre} ${mesesCortos[now.getMonth()]} ${now.getDate()}`
    : `${diaNombre} ${now.getDate()} ${mesesCortos[now.getMonth()]}`;

  const pct = today.porcentaje;
  const barColor = pct === 0 ? 'bg-yt-border' : colorForPct(pct);

  return (
    <div className="flex flex-col gap-4 mt-6">
      {/* HOY widget */}
      <section className="bg-yt-surface/60 border border-yt-border rounded-xl p-3">
        <div className="text-[10px] uppercase tracking-wider text-yt-muted font-semibold">
          {t('sidebar.today')}
        </div>
        <div className="text-sm text-yt-text mt-0.5 capitalize">{fechaStr}</div>

        <div className="mt-2.5">
          <div className="h-1.5 rounded-full bg-yt-bg overflow-hidden">
            <div
              className={`h-full ${barColor} transition-all`}
              style={{ width: `${Math.max(2, pct)}%` }}
            />
          </div>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-base font-semibold text-yt-text tabular-nums">{pct}%</span>
            <span className="text-[10px] text-yt-muted tabular-nums">
              {today.completadas} / {today.planificadas}
            </span>
          </div>
        </div>
      </section>

      {/* STREAK widget */}
      <section className="bg-yt-surface/60 border border-yt-border rounded-xl p-3">
        <div className="text-[10px] uppercase tracking-wider text-yt-muted font-semibold">
          {t('sidebar.streak')}
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span aria-hidden className="text-xl leading-none">🔥</span>
          <span className="text-2xl font-bold text-yt-text tabular-nums leading-none">
            {streak}
          </span>
        </div>
        <div className="text-[10px] text-yt-muted mt-1">
          {streak === 0
            ? t('sidebar.streakNone')
            : streak === 1
            ? t('sidebar.streakSingular')
            : t('sidebar.streakPlural')}
        </div>
      </section>
    </div>
  );
}
