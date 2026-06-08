import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

// -----------------------------------------------------------------------------
// Shape de las preferencias del usuario (persisten en localStorage)
// -----------------------------------------------------------------------------

export type PomodoroSettings = {
  focusMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  blocksUntilLong: number;
};

export type NotifSettings = {
  /** Mostrar el countdown en el title de la pestaña durante el focus. */
  showCountdownInTitle: boolean;
};

export type Settings = {
  pomodoro: PomodoroSettings;
  notif: NotifSettings;
};

export const DEFAULT_SETTINGS: Settings = {
  pomodoro: {
    focusMin: 25,
    shortBreakMin: 5,
    longBreakMin: 30,
    blocksUntilLong: 4,
  },
  notif: {
    showCountdownInTitle: true,
  },
};

const STORAGE_KEY = 'yt:settings';

function load(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      pomodoro: { ...DEFAULT_SETTINGS.pomodoro, ...(parsed.pomodoro ?? {}) },
      notif: { ...DEFAULT_SETTINGS.notif, ...(parsed.notif ?? {}) },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function save(s: Settings) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

// -----------------------------------------------------------------------------
// Context
// -----------------------------------------------------------------------------

type ContextValue = {
  settings: Settings;
  updatePomodoro: (patch: Partial<PomodoroSettings>) => void;
  updateNotif: (patch: Partial<NotifSettings>) => void;
  resetPomodoro: () => void;
};

const SettingsContext = createContext<ContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => load());

  useEffect(() => {
    save(settings);
  }, [settings]);

  const updatePomodoro = useCallback((patch: Partial<PomodoroSettings>) => {
    setSettings((prev) => ({
      ...prev,
      pomodoro: { ...prev.pomodoro, ...patch },
    }));
  }, []);

  const updateNotif = useCallback((patch: Partial<NotifSettings>) => {
    setSettings((prev) => ({
      ...prev,
      notif: { ...prev.notif, ...patch },
    }));
  }, []);

  const resetPomodoro = useCallback(() => {
    setSettings((prev) => ({ ...prev, pomodoro: DEFAULT_SETTINGS.pomodoro }));
  }, []);

  const value = useMemo<ContextValue>(
    () => ({ settings, updatePomodoro, updateNotif, resetPomodoro }),
    [settings, updatePomodoro, updateNotif, resetPomodoro],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSettings(): ContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings() debe usarse dentro de <SettingsProvider>.');
  }
  return ctx;
}
