import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import AuthShell from '../components/AuthShell';
import TextField from '../components/TextField';
import Alert from '../components/Alert';
import Button from '../components/Button';

/**
 * Página de recuperación — paso 2: el destino del link del email.
 * Supabase parsea automáticamente el URL fragment (detectSessionInUrl: true
 * en createClient) y deja al usuario en una sesión temporal de recovery.
 * Acá verificamos que esa sesión exista y permitimos cambiar la contraseña.
 */
export default function ResetPassword() {
  const { t } = useTranslation();
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  // null mientras chequeamos, boolean cuando ya sabemos si hay sesión.
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Check inicial: leer la sesión actual. Si el URL fragment ya fue parseado
    // al instanciar createClient, esto trae la sesión de recovery directo.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setHasSession(true);
      else {
        // Fallback: si todavía no hay sesión, esperamos al evento
        // PASSWORD_RECOVERY que Supabase dispara cuando termina de parsear el
        // URL fragment del email link. Le damos un tiempo prudente antes de
        // declarar el link inválido para evitar falsos negativos por race.
        const timeoutId = window.setTimeout(() => {
          setHasSession((current) => (current === null ? false : current));
        }, 1500);
        return () => window.clearTimeout(timeoutId);
      }
    });

    // Listener: el evento PASSWORD_RECOVERY se dispara una vez que Supabase
    // procesó el token del URL fragment. Esto es lo que garantiza que el form
    // aparezca incluso si la primera lectura de getSession() vino vacía.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setHasSession(true);
      } else if (event === 'SIGNED_IN' && session) {
        // Algunos flujos disparan SIGNED_IN en vez de PASSWORD_RECOVERY si
        // la sesión ya estaba activa antes del click; igual permitimos el
        // cambio de password.
        setHasSession(true);
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Mientras chequeamos la sesión, no mostramos nada (evita flicker).
  if (hasSession === null) return null;

  // Link inválido/expirado: no llegó sesión de recovery.
  if (!hasSession) {
    return (
      <AuthShell
        title={t('auth.reset.invalidTitle')}
        subtitle={t('auth.reset.invalidSubtitle')}
      >
        <Alert tone="error">{t('auth.reset.invalidBody')}</Alert>

        <p className="text-sm text-yt-muted mt-6 text-center">
          <Link
            to="/forgot-password"
            className="text-heat-2 hover:text-heat-3 transition-colors"
          >
            {t('auth.reset.requestNew')}
          </Link>
        </p>
      </AuthShell>
    );
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < 6) {
      setErrorMsg(t('auth.reset.passwordTooShort'));
      return;
    }

    setSubmitting(true);
    const { error } = await updatePassword(password);
    setSubmitting(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    // Tras updateUser, la sesión de recovery se "consolida" en una sesión
    // normal. Mandamos al dashboard sin re-login.
    navigate('/app', { replace: true });
  };

  return (
    <AuthShell title={t('auth.reset.title')} subtitle={t('auth.reset.subtitle')}>
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <TextField
          label={t('auth.reset.newPassword')}
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onValueChange={setPassword}
          placeholder={t('auth.fields.passwordPlaceholder')}
          hint={t('auth.fields.passwordHint')}
        />

        {errorMsg && <Alert tone="error">{errorMsg}</Alert>}

        <Button type="submit" loading={submitting} fullWidth>
          {submitting ? t('auth.reset.updatingLoading') : t('auth.reset.update')}
        </Button>
      </form>
    </AuthShell>
  );
}
