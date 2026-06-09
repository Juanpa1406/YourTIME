import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import AuthShell from '../components/AuthShell';
import TextField from '../components/TextField';
import Alert from '../components/Alert';
import Button from '../components/Button';

export default function Login() {
  const { t } = useTranslation();
  const { signIn, session, loading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (loading) return null;
  if (session) return <Navigate to="/app" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (error) {
      setErrorMsg(error.message);
      return;
    }
    navigate('/app', { replace: true });
  };

  return (
    <AuthShell title={t('auth.login.title')} subtitle={t('auth.login.subtitle')}>
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
        <TextField
          label={t('auth.fields.password')}
          type="password"
          autoComplete="current-password"
          required
          minLength={6}
          value={password}
          onValueChange={setPassword}
          placeholder={t('auth.fields.passwordPlaceholder')}
        />

        {errorMsg && <Alert tone="error">{errorMsg}</Alert>}

        <Button type="submit" loading={submitting} fullWidth>
          {submitting ? t('auth.actions.signInLoading') : t('auth.actions.signIn')}
        </Button>
      </form>

      <p className="text-sm text-yt-muted mt-6 text-center">
        {t('auth.login.noAccount')}{' '}
        <Link to="/signup" className="text-heat-2 hover:text-heat-3 transition-colors">
          {t('auth.login.createOne')}
        </Link>
      </p>

      <p className="text-xs text-yt-muted mt-4 text-center">
        <Trans
          i18nKey="auth.login.needHelp"
          components={{
            supportLink: (
              <a
                href="mailto:support@yourtimeapp.me"
                className="text-heat-2 hover:text-heat-3 transition-colors"
              />
            ),
          }}
        />
      </p>
    </AuthShell>
  );
}
