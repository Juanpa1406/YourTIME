import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import {
  usePomodoro,
  ensureNotificationPermission,
  getNotificationPermission,
  type Phase,
} from '../../context/PomodoroContext';
import { supabase } from '../../lib/supabase';

const PHASE_COLOR: Record<Phase, string> = {
  idle: 'bg-yt-border text-yt-muted',
  focus: 'bg-heat-1 text-yt-bg',
  short_break: 'bg-heat-3 text-yt-bg',
  long_break: 'bg-heat-5 text-yt-bg',
  awaiting_continuation: 'bg-heat-5 text-yt-bg',
};

function format(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const mm = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const ss = (totalSec % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

/**
 * Card del Pomodoro siempre visible en el dashboard.
 * - Cuando idle: muestra "Listo" + helper "Arrastra una actividad a In Progress".
 * - Cuando active (focus/break): badge + countdown + título + controles.
 * - Cuando awaiting_continuation: CTA "Continuar / Listo".
 */
export default function PomodoroCard() {
  const { t } = useTranslation();
  const phaseLabel = (p: Phase) => t(`pomodoro.phases.${p}`);
  const {
    phase,
    remainingMs,
    paused,
    activeActividadId,
    cycleCount,
    pause,
    resume,
    skip,
    stop,
    continueFocus,
  } = usePomodoro();

  const [tituloActiva, setTituloActiva] = useState<string | null>(null);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | 'unsupported'>(
    () => getNotificationPermission(),
  );

  // Cargar título de la actividad activa cuando cambia
  useEffect(() => {
    if (!activeActividadId) {
      setTituloActiva(null);
      return;
    }
    let cancelled = false;
    supabase
      .from('actividades')
      .select('titulo')
      .eq('id', activeActividadId)
      .single()
      .then(({ data }) => {
        if (!cancelled) setTituloActiva(data?.titulo ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeActividadId]);

  const isIdle = phase === 'idle';
  const isAwaiting = phase === 'awaiting_continuation';

  return (
    <div className="bg-yt-surface border border-yt-border rounded-2xl p-5 flex flex-col h-full min-h-[200px]">
      {/* Badge de fase */}
      <div className="flex items-center justify-between mb-3">
        <span
          className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded ${PHASE_COLOR[phase]}`}
        >
          {phaseLabel(phase)}
          {phase === 'focus' && cycleCount > 0 && ` · ${cycleCount + 1}°`}
        </span>

        {notifPerm === 'default' && !isIdle && (
          <button
            type="button"
            onClick={async () => {
              const ok = await ensureNotificationPermission();
              setNotifPerm(ok ? 'granted' : getNotificationPermission());
            }}
            className="text-[10px] px-2 py-0.5 rounded border border-heat-1/40 text-heat-2 hover:bg-heat-1/10"
          >
            🔔
          </button>
        )}
      </div>

      {/* Countdown grande */}
      <div className="flex-1 flex items-center justify-center">
        <span
          className={`text-6xl font-bold tabular-nums tracking-tight ${
            isIdle ? 'text-yt-muted/40' : 'text-yt-text'
          }`}
        >
          {format(remainingMs)}
        </span>
      </div>

      {/* Footer dinámico según fase */}
      {isIdle && (
        <p className="text-xs text-yt-muted text-center mt-3 leading-relaxed">
          <Trans
            i18nKey="pomodoro.idleHelper"
            components={{ bold: <span className="text-yt-text" /> }}
          />
        </p>
      )}

      {!isIdle && !isAwaiting && (
        <div className="mt-3 flex flex-col gap-2">
          {phase === 'focus' && tituloActiva && (
            <p className="text-xs text-yt-muted text-center truncate">
              <span className="text-yt-text">{tituloActiva}</span>
            </p>
          )}{/* workingOn label trimmed for compactness */}
          <div className="flex items-center justify-center gap-2">
            {paused ? (
              <ControlBtn onClick={resume} title={t('pomodoro.actions.resume')}>▶</ControlBtn>
            ) : (
              <ControlBtn onClick={pause} title={t('pomodoro.actions.pause')}>⏸</ControlBtn>
            )}
            <ControlBtn onClick={skip} title={t('pomodoro.actions.skip')}>⏭</ControlBtn>
            <ControlBtn onClick={stop} title={t('pomodoro.actions.cancel')} danger>✕</ControlBtn>
          </div>
          {paused && (
            <p className="text-[10px] text-yt-muted text-center">{t('pomodoro.paused')}</p>
          )}
        </div>
      )}

      {isAwaiting && (
        <div className="mt-3 flex flex-col gap-2">
          {tituloActiva && (
            <p className="text-xs text-yt-muted text-center truncate">
              <Trans
                i18nKey="pomodoro.continueWith"
                values={{ title: tituloActiva }}
                components={{ bold: <span className="text-yt-text" /> }}
              />
            </p>
          )}
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={continueFocus}
              className="text-sm font-semibold px-4 py-2 rounded-lg bg-heat-1 hover:bg-heat-2 text-yt-bg shadow-md shadow-heat-1/30 transition-all"
            >
              {t('pomodoro.actions.continue')}
            </button>
            <button
              type="button"
              onClick={stop}
              className="text-sm font-semibold px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/30 transition-all"
            >
              {t('pomodoro.actions.done')}
            </button>
          </div>
          <p className="text-[10px] text-yt-muted/70 text-center">
            {t('pomodoro.closesIn', { seconds: Math.ceil(remainingMs / 1000) })}
          </p>
        </div>
      )}
    </div>
  );
}

function ControlBtn({
  children,
  onClick,
  title,
  danger = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={
        'w-10 h-10 rounded-lg text-base leading-none border-2 transition-all flex items-center justify-center shadow-sm ' +
        (danger
          ? 'bg-red-600 border-red-500 text-white hover:bg-red-500 hover:border-red-400'
          : 'bg-yt-bg border-yt-border text-yt-text hover:border-heat-2 hover:shadow-md hover:shadow-heat-1/10')
      }
    >
      {children}
    </button>
  );
}
