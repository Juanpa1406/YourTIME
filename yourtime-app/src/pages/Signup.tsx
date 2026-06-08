import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import AuthShell from '../components/AuthShell';
import TextField from '../components/TextField';
import Alert from '../components/Alert';
import Button from '../components/Button';

export default function Signup() {
  const { t } = useTranslation();
  const { signUp, session, loading } = useAuth();
  const navigate = useNavigate();

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  if (loading) return null;
  if (session) return <Navigate to="/app" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    const { error } = await signUp(email.trim(), password, nombre.trim() || undefined);
    setSubmitting(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setNeedsConfirmation(true);
    setTimeout(() => {
      if (!session) return;
      navigate('/app', { replace: true });
    }, 300);
  };

  return (
    <AuthShell title={t('auth.signup.title')} subtitle={t('auth.signup.subtitle')}>
      {needsConfirmation ? (
        <Alert tone="success">
          <span className="font-medium block mb-1">{t('auth.signup.confirmTitle')}</span>
          <span className="text-yt-muted">
            <Trans
              i18nKey="auth.signup.confirmBody"
              values={{ email }}
              components={{ strong: <strong className="text-yt-text" /> }}
            />{' '}
            <Link to="/login" className="text-heat-2 hover:text-heat-3 transition-colors">
              {t('auth.signup.confirmLink')}
            </Link>
            .
          </span>
        </Alert>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <TextField
            label={t('auth.fields.name')}
            type="text"
            autoComplete="name"
            value={nombre}
            onValueChange={setNombre}
            placeholder={t('auth.fields.namePlaceholder')}
          />
          <TextField
            label={t('auth.fields.email')}
            type="email"
            autoComplete="email"
            required
            value={email}
            onValueChange={setEmail}
            placeholder={t('auth.fields.emailPlaceholder')}
          />
          <TextField
            label={t('auth.fields.password')}
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
            {submitting ? t('auth.actions.signUpLoading') : t('auth.actions.signUp')}
          </Button>
        </form>
      )}

      <p className="text-sm text-yt-muted mt-6 text-center">
        {t('auth.signup.haveAccount')}{' '}
        <Link to="/login" className="text-heat-2 hover:text-heat-3 transition-colors">
          {t('auth.signup.signIn')}
        </Link>
      </p>
    </AuthShell>
  );
}
