import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthError, Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type AuthResult = { error: AuthError | null };

type Profile = {
  nombre: string | null;
  avatar_url: string | null;
  timezone: string;
};

/** Detecta la TZ del navegador (ej. "America/Mexico_City"). Fallback a CDMX. */
function detectBrowserTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz || 'America/Mexico_City';
  } catch {
    return 'America/Mexico_City';
  }
}

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  /** Perfil del usuario desde public.usuarios. null mientras carga. */
  profile: Profile | null;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, nombre?: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  /** Re-fetchea el profile desde DB. Llamar tras actualizar el nombre. */
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  const userId = session?.user?.id ?? null;

  const fetchProfile = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('usuarios')
      .select('nombre, avatar_url, timezone')
      .eq('id', id)
      .single();
    if (error) {
      console.warn('[YourTime] No se pudo cargar el profile:', error.message);
      setProfile(null);
      return;
    }
    setProfile({
      nombre: data.nombre,
      avatar_url: data.avatar_url,
      timezone: data.timezone,
    });

    // Sync TZ: si el browser detecta una distinta a la guardada, actualizar.
    // Esto cubre: primer login (default 'America/Mexico_City' → la real del browser)
    // + viajes (usuario en otra ciudad sigue viendo todo correctamente).
    const browserTz = detectBrowserTimezone();
    if (browserTz && browserTz !== data.timezone) {
      const { error: updErr } = await supabase
        .from('usuarios')
        .update({ timezone: browserTz })
        .eq('id', id);
      if (!updErr) {
        setProfile((prev) =>
          prev ? { ...prev, timezone: browserTz } : prev,
        );
      } else {
        console.warn('[YourTime] No se pudo sincronizar timezone:', updErr.message);
      }
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      return;
    }
    await fetchProfile(userId);
  }, [userId, fetchProfile]);

  // Auth lifecycle
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .finally(() => setLoading(false));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Cargar/recargar profile cuando cambia el usuario
  useEffect(() => {
    if (userId) {
      void fetchProfile(userId);
    } else {
      setProfile(null);
    }
  }, [userId, fetchProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      profile,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error };
      },
      signUp: async (email, password, nombre) => {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: nombre ? { data: { nombre } } : undefined,
        });
        return { error };
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
      refreshProfile,
    }),
    [session, loading, profile, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth() debe usarse dentro de <AuthProvider>.');
  }
  return ctx;
}
