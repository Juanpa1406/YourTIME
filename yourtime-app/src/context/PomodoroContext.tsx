import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import i18n from '../i18n';
import { incrementPomodoros } from '../services/actividades';
import { useSettings } from './SettingsContext';

// -----------------------------------------------------------------------------
// Constantes (defaults — pueden overridearse por Settings)
// -----------------------------------------------------------------------------
export const DEFAULT_FOCUS_MS = 25 * 60 * 1000;
/** Ventana tras descanso donde el usuario decide continuar o cerrar. */
export const AWAIT_CONTINUATION_MS = 30 * 1000;
const STORAGE_KEY = 'yt:pomodoro';

export type Phase =
  | 'idle'
  | 'focus'
  | 'short_break'
  | 'long_break'
  | 'awaiting_continuation';

type State = {
  phase: Phase;
  /** ms absolute timestamp when current phase ends. null if idle. */
  endsAt: number | null;
  activeActividadId: string | null;
  /** Focus blocks completados desde el último long_break. */
  cycleCount: number;
  /** Si está en pausa, cuántos ms quedaban al pausar. */
  pausedRemainingMs: number | null;
};

const IDLE: State = {
  phase: 'idle',
  endsAt: null,
  activeActividadId: null,
  cycleCount: 0,
  pausedRemainingMs: null,
};

type ContextValue = {
  phase: Phase;
  activeActividadId: string | null;
  cycleCount: number;
  remainingMs: number;
  paused: boolean;
  startFocus: (actividadId: string) => void;
  /** Continúa con la misma actividad — solo válido durante awaiting_continuation. */
  continueFocus: () => void;
  pause: () => void;
  resume: () => void;
  skip: () => void;
  stop: () => void;
};

const PomodoroContext = createContext<ContextValue | undefined>(undefined);

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

type PhaseDurations = {
  focusMs: number;
  shortBreakMs: number;
  longBreakMs: number;
};

function durationForPhase(phase: Phase, d: PhaseDurations): number {
  switch (phase) {
    case 'focus':
      return d.focusMs;
    case 'short_break':
      return d.shortBreakMs;
    case 'long_break':
      return d.longBreakMs;
    case 'awaiting_continuation':
      return AWAIT_CONTINUATION_MS;
    default:
      return 0;
  }
}

function loadFromStorage(): State {
  if (typeof window === 'undefined') return IDLE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return IDLE;
    const parsed = JSON.parse(raw) as Partial<State>;
    return {
      phase: parsed.phase ?? 'idle',
      endsAt: parsed.endsAt ?? null,
      activeActividadId: parsed.activeActividadId ?? null,
      cycleCount: parsed.cycleCount ?? 0,
      pausedRemainingMs: parsed.pausedRemainingMs ?? null,
    };
  } catch {
    return IDLE;
  }
}

function saveToStorage(s: State) {
  if (typeof window === 'undefined') return;
  if (s.phase === 'idle') {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

/**
 * "Fast-forward": si al cargar la app habían pasado horas y el timer expiró,
 * avanza por las fases que correspondían (focus → break → idle, etc.)
 * y devuelve cuántos focus completos se perdieron (para registrarlos en DB).
 */
function reconcile(
  s: State,
  now: number,
  d: PhaseDurations,
  blocksUntilLong: number,
): { state: State; focusesCompleted: number } {
  if (s.phase === 'idle' || s.pausedRemainingMs !== null || s.endsAt === null) {
    return { state: s, focusesCompleted: 0 };
  }
  let phase: Phase = s.phase;
  let endsAt: number | null = s.endsAt;
  let cycleCount = s.cycleCount;
  let focusesCompleted = 0;

  while (phase !== 'idle' && endsAt !== null && endsAt <= now) {
    if (phase === 'focus') {
      focusesCompleted++;
      cycleCount++;
      const nextPhase: Phase =
        cycleCount % blocksUntilLong === 0 ? 'long_break' : 'short_break';
      phase = nextPhase;
      endsAt = endsAt + durationForPhase(nextPhase, d);
    } else if (phase === 'short_break') {
      phase = 'awaiting_continuation';
      endsAt = endsAt + AWAIT_CONTINUATION_MS;
    } else if (phase === 'long_break') {
      phase = 'awaiting_continuation';
      endsAt = endsAt + AWAIT_CONTINUATION_MS;
      cycleCount = 0;
    } else if (phase === 'awaiting_continuation') {
      phase = 'idle';
      endsAt = null;
    }
  }

  return {
    state: {
      ...s,
      phase,
      endsAt,
      cycleCount,
      activeActividadId: phase === 'idle' ? null : s.activeActividadId,
    },
    focusesCompleted,
  };
}

// -----------------------------------------------------------------------------
// Notifications
// -----------------------------------------------------------------------------

export async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  if (result === 'granted') {
    // Notificación de confirmación inmediata para que el usuario sepa que andan.
    notify(
      i18n.t('pomodoro.notif.permissionEnabled') as string,
      i18n.t('pomodoro.notif.permissionBody') as string,
    );
  }
  return result === 'granted';
}

export function notify(title: string, body?: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('[YourTime] Browser sin soporte de Notification API');
    return;
  }
  if (Notification.permission !== 'granted') {
    console.warn(
      `[YourTime] Notificación NO enviada — permission="${Notification.permission}"`,
    );
    return;
  }
  try {
    new Notification(title, { body, tag: 'yourtime-pomodoro' });
  } catch (e) {
    console.warn('[YourTime] Error enviando notificación:', e);
  }
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

// -----------------------------------------------------------------------------
// Provider
// -----------------------------------------------------------------------------

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const durations: PhaseDurations = useMemo(
    () => ({
      focusMs: settings.pomodoro.focusMin * 60 * 1000,
      shortBreakMs: settings.pomodoro.shortBreakMin * 60 * 1000,
      longBreakMs: settings.pomodoro.longBreakMin * 60 * 1000,
    }),
    [settings.pomodoro],
  );
  const blocksUntilLong = settings.pomodoro.blocksUntilLong;

  // Estado inicial: hidratar desde localStorage + fast-forward de fases vencidas.
  // Captura `settings` por closure (ya disponible en este punto).
  const [state, setState] = useState<State>(() => {
    const loaded = loadFromStorage();
    const d0: PhaseDurations = {
      focusMs: settings.pomodoro.focusMin * 60 * 1000,
      shortBreakMs: settings.pomodoro.shortBreakMin * 60 * 1000,
      longBreakMs: settings.pomodoro.longBreakMin * 60 * 1000,
    };
    const { state: rec, focusesCompleted } = reconcile(
      loaded,
      Date.now(),
      d0,
      settings.pomodoro.blocksUntilLong,
    );
    if (focusesCompleted > 0 && loaded.activeActividadId) {
      const id = loaded.activeActividadId;
      for (let i = 0; i < focusesCompleted; i++) {
        incrementPomodoros(id, d0.focusMs / 1000).catch((e) =>
          console.error('Pomodoro increment falló al hidratar:', e),
        );
      }
    }
    return rec;
  });

  // Tick cada segundo SOLO para forzar re-render del countdown (no decide lógica).
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (state.phase === 'idle' || state.pausedRemainingMs !== null) return;
    const t = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [state.phase, state.pausedRemainingMs]);
  // marker para no romper exhaustive-deps de eslint con tick:
  void tick;

  // Persistir cada vez que cambia el estado.
  useEffect(() => {
    saveToStorage(state);
  }, [state]);

  // Refs para evitar capturas obsoletas en el setTimeout de transiciones.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // ---- Transición de fase (focus→break, break→idle) ----
  const advance = useCallback(() => {
    setState((prev) => {
      if (prev.phase === 'focus') {
        const newCycle = prev.cycleCount + 1;
        const nextPhase: Phase =
          newCycle % blocksUntilLong === 0 ? 'long_break' : 'short_break';
        if (prev.activeActividadId) {
          incrementPomodoros(prev.activeActividadId, durations.focusMs / 1000).catch((e) =>
            console.error('Pomodoro increment falló:', e),
          );
        }
        const isLong = nextPhase === 'long_break';
        notify(
          (isLong
            ? i18n.t('pomodoro.notif.longBreakTitle', { cycle: blocksUntilLong })
            : i18n.t('pomodoro.notif.focusEndedTitle')) as string,
          (isLong
            ? i18n.t('pomodoro.notif.longBreakBody', {
                minutes: durations.longBreakMs / 60000,
              })
            : i18n.t('pomodoro.notif.focusEndedBody', {
                minutes: durations.shortBreakMs / 60000,
              })) as string,
        );
        return {
          ...prev,
          phase: nextPhase,
          endsAt: Date.now() + durationForPhase(nextPhase, durations),
          cycleCount: newCycle,
          pausedRemainingMs: null,
        };
      }
      if (prev.phase === 'short_break' || prev.phase === 'long_break') {
        notify(
          i18n.t('pomodoro.notif.breakEndedTitle') as string,
          i18n.t('pomodoro.notif.breakEndedBody') as string,
        );
        return {
          ...prev,
          phase: 'awaiting_continuation',
          endsAt: Date.now() + AWAIT_CONTINUATION_MS,
          cycleCount: prev.phase === 'long_break' ? 0 : prev.cycleCount,
          pausedRemainingMs: null,
        };
      }
      if (prev.phase === 'awaiting_continuation') {
        return IDLE;
      }
      return prev;
    });
  }, [durations, blocksUntilLong]);

  // Scheduler: timeout alineado a endsAt. Se reprograma en cada cambio.
  useEffect(() => {
    if (state.phase === 'idle' || state.pausedRemainingMs !== null || !state.endsAt) {
      return;
    }
    const delay = state.endsAt - Date.now();
    if (delay <= 0) {
      advance();
      return;
    }
    const t = window.setTimeout(advance, delay);
    return () => window.clearTimeout(t);
  }, [state.phase, state.endsAt, state.pausedRemainingMs, advance]);

  // ---- API pública ----
  const startFocus = useCallback(
    (actividadId: string) => {
      // NO pedimos Notification.requestPermission() acá: arrastrar una card a
      // "In Progress" no es semánticamente "activar notificaciones" y los
      // antivirus (Malwarebytes ID 10008) + browsers modernos (Chrome quiet UI,
      // Safari) flaggean este patrón como abuso. El permiso se solicita SOLO
      // desde el botón "Activar" en Settings → Notificaciones (user gesture
      // explícito y semánticamente relacionado). Si el permiso no fue otorgado,
      // notify() skipea silenciosamente y el Pomodoro corre igual.
      setState({
        phase: 'focus',
        endsAt: Date.now() + durations.focusMs,
        activeActividadId: actividadId,
        cycleCount: stateRef.current.cycleCount,
        pausedRemainingMs: null,
      });
    },
    [durations.focusMs],
  );

  const pause = useCallback(() => {
    setState((prev) => {
      if (prev.phase === 'idle' || prev.pausedRemainingMs !== null || !prev.endsAt) {
        return prev;
      }
      const remaining = Math.max(0, prev.endsAt - Date.now());
      return { ...prev, pausedRemainingMs: remaining };
    });
  }, []);

  const resume = useCallback(() => {
    setState((prev) => {
      if (prev.pausedRemainingMs === null) return prev;
      return {
        ...prev,
        endsAt: Date.now() + prev.pausedRemainingMs,
        pausedRemainingMs: null,
      };
    });
  }, []);

  const skip = useCallback(() => {
    // Saltar la fase actual = forzar transición ahora.
    advance();
  }, [advance]);

  const stop = useCallback(() => {
    setState(IDLE);
  }, []);

  const continueFocus = useCallback(() => {
    setState((prev) => {
      if (prev.phase !== 'awaiting_continuation' || !prev.activeActividadId) {
        return prev;
      }
      return {
        phase: 'focus',
        endsAt: Date.now() + durations.focusMs,
        activeActividadId: prev.activeActividadId,
        cycleCount: prev.cycleCount,
        pausedRemainingMs: null,
      };
    });
  }, [durations.focusMs]);

  // Computar remainingMs en cada render (depende del tick).
  const remainingMs = useMemo(() => {
    if (state.pausedRemainingMs !== null) return state.pausedRemainingMs;
    if (state.phase === 'idle' || !state.endsAt) return 0;
    return Math.max(0, state.endsAt - Date.now());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.pausedRemainingMs, state.phase, state.endsAt, tick]);

  const value: ContextValue = {
    phase: state.phase,
    activeActividadId: state.activeActividadId,
    cycleCount: state.cycleCount,
    paused: state.pausedRemainingMs !== null,
    remainingMs,
    startFocus,
    continueFocus,
    pause,
    resume,
    skip,
    stop,
  };

  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePomodoro(): ContextValue {
  const ctx = useContext(PomodoroContext);
  if (!ctx) {
    throw new Error('usePomodoro() debe usarse dentro de <PomodoroProvider>.');
  }
  return ctx;
}
