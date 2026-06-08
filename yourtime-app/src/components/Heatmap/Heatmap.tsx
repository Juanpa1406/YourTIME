import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  colorForPct,
  isoDow,
  toDateString,
  type Historial,
  type TodayStats,
} from '../../services/historial';

type Props = {
  /** Filas de historial_productividad para el año visible. */
  historial: Historial[];
  /** Stats del día actual computado live (no está en historial aún). */
  today: TodayStats;
  /** Año a mostrar (default: año actual). */
  year?: number;
  loading?: boolean;
};

// Labels se obtienen vía i18n dentro del componente.

/**
 * Construye 53 semanas calendario para el año dado.
 * Cada semana es un array de 7 Date (Lun..Dom).
 * Días fuera del año se incluyen en la grilla para mantener alineación
 * (después se renderizan como huecos invisibles).
 */
function buildYearWeeks(year: number): Date[][] {
  const jan1 = new Date(year, 0, 1);
  const jan1Dow = isoDow(jan1);
  // Lunes anterior (o igual a) Jan 1
  const start = new Date(year, 0, 1 - (jan1Dow - 1));

  const dec31 = new Date(year, 11, 31);
  const dec31Dow = isoDow(dec31);
  // Domingo posterior (o igual a) Dec 31
  const end = new Date(year, 11, 31 + (7 - dec31Dow));

  const days: Date[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

export default function Heatmap({
  historial,
  today,
  year = new Date().getFullYear(),
  loading = false,
}: Props) {
  const { t } = useTranslation();
  const DIAS_SHORT = t('days.short', { returnObjects: true }) as string[];
  // Mostrar Lun (idx 0), Mié (idx 2), Vie (idx 4); el resto en blanco para no saturar.
  const DIAS_LABELS = DIAS_SHORT.map((d, i) => (i % 2 === 0 && i <= 4 ? d : ''));
  const MESES = t('months.short', { returnObjects: true }) as string[];

  const weeks = useMemo(() => buildYearWeeks(year), [year]);
  const todayKey = useMemo(() => toDateString(new Date()), []);

  const byDate = useMemo(() => {
    const m = new Map<string, { pct: number; planificadas: number; completadas: number }>();
    for (const h of historial) {
      m.set(h.fecha, {
        pct: h.porcentaje ?? 0,
        planificadas: h.total_planificadas,
        completadas: h.total_completadas,
      });
    }
    // Override de HOY con stats live
    m.set(todayKey, {
      pct: today.porcentaje,
      planificadas: today.planificadas,
      completadas: today.completadas,
    });
    return m;
  }, [historial, today, todayKey]);

  // Total de actividades completadas en el año (para el header)
  const totalCompletadas = useMemo(() => {
    let total = 0;
    for (const h of historial) {
      if (h.fecha === todayKey) continue; // hoy lo sumamos aparte (live)
      total += h.total_completadas;
    }
    // Sumar HOY solo si pertenece al año mostrado
    if (new Date(todayKey).getFullYear() === year) {
      total += today.completadas;
    }
    return total;
  }, [historial, today, todayKey, year]);

  return (
    <div className="bg-yt-surface border border-yt-border rounded-2xl p-5 h-full flex flex-col">
      {/* Header: contador + leyenda */}
      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4">
        <h2 className="text-base font-semibold text-yt-text">
          {t('heatmap.title', { count: totalCompletadas, year })}
        </h2>
        <Legend t={t} />
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-yt-muted">{t('heatmap.loading')}</div>
      ) : (
        <div className="overflow-x-auto pb-1">
          <div className="inline-flex gap-2 min-w-fit">
            {/* Columna de labels Lun/Mié/Vie */}
            <div className="flex flex-col gap-1 text-[11px] text-yt-muted/70 pr-1 pt-[22px]">
              {DIAS_LABELS.map((d, i) => (
                <span key={i} className="h-4 leading-4">
                  {d}
                </span>
              ))}
            </div>

            <div className="flex flex-col gap-1.5">
              {/* Labels de meses arriba */}
              <div className="flex gap-1 text-[11px] text-yt-muted/70 h-4">
                {weeks.map((week, wIdx) => {
                  // Mostrar el label si la primera semana del mes contiene
                  // algún día con day-of-month <= 7 Y es del año visible.
                  const firstInYear = week.find((d) => d.getFullYear() === year);
                  const showLabel = firstInYear && firstInYear.getDate() <= 7;
                  return (
                    <div key={wIdx} className="w-4 whitespace-nowrap overflow-visible">
                      {showLabel ? MESES[firstInYear.getMonth()] : ''}
                    </div>
                  );
                })}
              </div>

              {/* Grilla de cells: una columna por semana */}
              <div className="flex gap-1">
                {weeks.map((week, wIdx) => (
                  <div key={wIdx} className="flex flex-col gap-1">
                    {week.map((d, dIdx) => {
                      // Días fuera del año visible: hueco invisible para alinear.
                      if (d.getFullYear() !== year) {
                        return <div key={dIdx} className="w-4 h-4" />;
                      }
                      const key = toDateString(d);
                      const cell = byDate.get(key);
                      const isToday = key === todayKey;
                      const isFuture = d > new Date();

                      const hasData = cell && cell.planificadas > 0;
                      const colorClass = hasData
                        ? colorForPct(cell.pct)
                        : 'bg-yt-bg/40';

                      const tooltip = hasData
                        ? t('heatmap.tooltipWith', {
                            date: key,
                            done: cell.completadas,
                            planned: cell.planificadas,
                            pct: cell.pct,
                          })
                        : isFuture
                        ? key
                        : t('heatmap.tooltipNone', { date: key });

                      return (
                        <div
                          key={dIdx}
                          title={tooltip}
                          className={
                            'w-4 h-4 rounded-sm border transition-colors ' +
                            colorClass +
                            (hasData ? ' border-transparent' : ' border-yt-border/60') +
                            (isToday
                              ? ' ring-1 ring-heat-2 ring-offset-1 ring-offset-yt-surface'
                              : '') +
                            (isFuture ? ' opacity-40' : '')
                          }
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Legend({ t }: { t: (k: string) => string }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-yt-muted">
      <span>{t('heatmap.less')}</span>
      <span className="w-4 h-4 rounded-sm bg-yt-bg/40 border border-yt-border/60" />
      <span className="w-4 h-4 rounded-sm bg-heat-1" />
      <span className="w-4 h-4 rounded-sm bg-heat-2" />
      <span className="w-4 h-4 rounded-sm bg-heat-3" />
      <span className="w-4 h-4 rounded-sm bg-heat-4" />
      <span className="w-4 h-4 rounded-sm bg-heat-5" />
      <span>{t('heatmap.more')}</span>
    </div>
  );
}
