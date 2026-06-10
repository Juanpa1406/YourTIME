import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import AuthShell from '../components/AuthShell';
import TextField from '../components/TextField';
import Alert from '../components/Alert';
import Button from '../components/Button';

/**
 * Página de recuperación de contraseña — paso 1: pedir email.
 * En éxito muestra mensaje genérico ("if an account exists, we sent you a
 * link") para no filtrar si el email existe o no (anti user-enumeration).
 */
export default function ForgotPassword() {
  const { t } = useTranslation();
  const { resetPasswordForEmail, session, loading } = useAuth();

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (loading) return null;
  // Si el usuario ya está logueado, esta pantalla no aplica.
  if (session) return <Navigate to="/app" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    const { error } = await resetPasswordForEmail(email.trim());
    setSubmitting(false);
    if (error) {
      setErrorMsg(error.message);
      return;
    }
    setSent(true);
  };

  return (
    <AuthShell title={t('auth.forgot.title')} subtitle={t('auth.forgot.subtitle')}>
      {sent ? (
        <Alert tone="success">
          <span className="font-medium block mb-1">{t('auth.forgot.sentTitle')}</span>
          <span className="text-yt-muted">{t('auth.forgot.sentBody')}</span>
        </Alert>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <TextField
            label={t('auth.fields.email')}
            type="email"
            autoComplete="email"
            required
            value={email}
            onValueChange={setEmail}
            placeholder={t('auth.fields.emailPlaceholder')}
          />

          {errorMsg && <Alert tone="error">{errorMsg}</Alert>}

          <Button type="submit" loading={submitting} fullWidth>
            {submitting ? t('auth.forgot.sendingLoading') : t('auth.forgot.send')}
          </Button>
        </form>
      )}

      <p className="text-sm text-yt-muted mt-6 text-center">
        <Link to="/login" className="text-heat-2 hover:text-heat-3 transition-colors">
          {t('auth.forgot.backToLogin')}
        </Link>
      </p>
    </AuthShell>
  );
}
