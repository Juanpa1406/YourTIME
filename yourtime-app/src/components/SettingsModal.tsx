import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import Button from './Button';
import Alert from './Alert';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useSoundEnabled } from '../lib/sounds';
import {
  ensureNotificationPermission,
  getNotificationPermission,
} from '../context/PomodoroContext';
import { supabase } from '../lib/supabase';
import { persistLang, type Lang } from '../i18n';

type Props = {
  open: boolean;
  onClose: () => void;
};

type Tab = 'pomodoro' | 'notif' | 'cuenta';

export default function SettingsModal({ open, onClose }: Props) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('pomodoro');

  return (
    <Modal open={open} onClose={onClose} title={t('settings.title')} size="lg">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-yt-border mb-5 -mx-2">
        <TabButton active={tab === 'pomodoro'} onClick={() => setTab('pomodoro')}>
          {t('settings.tabs.pomodoro')}
        </TabButton>
        <TabButton active={tab === 'notif'} onClick={() => setTab('notif')}>
          {t('settings.tabs.notif')}
        </TabButton>
        <TabButton active={tab === 'cuenta'} onClick={() => setTab('cuenta')}>
          {t('settings.tabs.account')}
        </TabButton>
      </div>

      {tab === 'pomodoro' && <PomodoroTab />}
      {tab === 'notif' && <NotifTab />}
      {tab === 'cuenta' && <CuentaTab />}
    </Modal>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'text-sm font-medium px-3 py-2 border-b-2 transition-colors -mb-px ' +
        (active
          ? 'border-heat-2 text-yt-text'
          : 'border-transparent text-yt-muted hover:text-yt-text')
      }
    >
      {children}
    </button>
  );
}

// -----------------------------------------------------------------------------
// Tab Pomodoro
// -----------------------------------------------------------------------------

function PomodoroTab() {
  const { t } = useTranslation();
  const { settings, updatePomodoro, resetPomodoro } = useSettings();
  const p = settings.pomodoro;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-yt-muted -mt-1">{t('settings.pomodoro.intro')}</p>

      <NumberField
        label={t('settings.pomodoro.focusMin')}
        value={p.focusMin}
        min={5}
        max={90}
        onChange={(v) => updatePomodoro({ focusMin: v })}
      />
      <NumberField
        label={t('settings.pomodoro.shortBreakMin')}
        value={p.shortBreakMin}
        min={1}
        max={30}
        onChange={(v) => updatePomodoro({ shortBreakMin: v })}
      />
      <NumberField
        label={t('settings.pomodoro.longBreakMin')}
        value={p.longBreakMin}
        min={5}
        max={60}
        onChange={(v) => updatePomodoro({ longBreakMin: v })}
      />
      <NumberField
        label={t('settings.pomodoro.blocksUntilLong')}
        value={p.blocksUntilLong}
        min={2}
        max={8}
        onChange={(v) => updatePomodoro({ blocksUntilLong: v })}
      />

      <div className="flex justify-end mt-2 pt-3 border-t border-yt-border">
        <Button variant="secondary" size="sm" onClick={resetPomodoro}>
          {t('settings.pomodoro.restore')}
        </Button>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  // Draft local: permite que el usuario escriba/borre libremente sin que el
  // padre rechace cada keystroke. Commit (clamp + onChange) solo al blur/Enter.
  const [draft, setDraft] = useState<string>(String(value));

  // Si el value externo cambia (ej. botón "Restaurar"), sincronizar el draft.
  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed === '') {
      // Vacío → no permitido, revertir al último valor válido
      setDraft(String(value));
      return;
    }
    const n = parseInt(trimmed, 10);
    if (Number.isNaN(n)) {
      setDraft(String(value));
      return;
    }
    // Clamp dentro del rango
    const clamped = Math.min(max, Math.max(min, n));
    setDraft(String(clamped));
    if (clamped !== value) onChange(clamped);
  };

  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-sm text-yt-text">{label}</span>
      <div className="flex flex-col items-end gap-1">
        <input
          type="number"
          value={draft}
          min={min}
          max={max}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              (e.currentTarget as HTMLInputElement).blur();
            }
          }}
          className="w-20 bg-yt-bg/60 border border-yt-border rounded-lg px-3 py-1.5 text-sm text-yt-text outline-none focus:border-heat-1 focus:ring-2 focus:ring-heat-1/20 transition tabular-nums text-right"
        />
        <RangeHint min={min} max={max} />
      </div>
    </label>
  );
}

function RangeHint({ min, max }: { min: number; max: number }) {
  const { t } = useTranslation();
  return (
    <span className="text-[10px] text-yt-muted tabular-nums">
      {t('settings.pomodoro.rangeHint', { min, max })}
    </span>
  );
}

// -----------------------------------------------------------------------------
// Tab Notificaciones
// -----------------------------------------------------------------------------

function NotifTab() {
  const { t } = useTranslation();
  const { enabled: soundEnabled, toggle: toggleSound } = useSoundEnabled();
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | 'unsupported'>(
    () => getNotificationPermission(),
  );

  const requestPerm = async () => {
    const ok = await ensureNotificationPermission();
    setNotifPerm(ok ? 'granted' : getNotificationPermission());
  };

  return (
    <div className="flex flex-col gap-5">
      <Row label={t('settings.notif.soundLabel')} hint={t('settings.notif.soundHint')}>
        <ToggleSwitch checked={soundEnabled} onChange={toggleSound} />
      </Row>

      <Row label={t('settings.notif.browserLabel')} hint={t('settings.notif.browserHint')}>
        {notifPerm === 'unsupported' ? (
          <span className="text-xs text-yt-muted">{t('settings.notif.browserUnsupported')}</span>
        ) : notifPerm === 'granted' ? (
          <span className="text-xs text-heat-5">{t('settings.notif.browserGranted')}</span>
        ) : notifPerm === 'denied' ? (
          <span className="text-xs text-red-400">{t('settings.notif.browserDenied')}</span>
        ) : (
          <button
            type="button"
            onClick={requestPerm}
            className="text-xs px-3 py-1.5 rounded-md border border-heat-1/40 text-heat-2 hover:bg-heat-1/10"
          >
            {t('settings.notif.browserActivate')}
          </button>
        )}
      </Row>
    </div>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1">
        <div className="text-sm text-yt-text">{label}</div>
        {hint && <div className="text-xs text-yt-muted mt-0.5">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={
        'relative inline-block w-11 h-6 rounded-full transition-colors shrink-0 ' +
        (checked ? 'bg-heat-1' : 'bg-yt-border')
      }
    >
      <span
        aria-hidden
        style={{
          transform: `translateX(${checked ? 22 : 2}px)`,
        }}
        className="absolute top-0.5 left-0 w-5 h-5 rounded-full bg-white transition-transform"
      />
    </button>
  );
}

// -----------------------------------------------------------------------------
// Tab Cuenta
// -----------------------------------------------------------------------------

function CuentaTab() {
  const { t, i18n } = useTranslation();
  const { user, profile, refreshProfile } = useAuth();

  const changeLang = (lang: Lang) => {
    void i18n.changeLanguage(lang);
    persistLang(lang);
  };

  const [nombre, setNombre] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(
    null,
  );

  const [newPassword, setNewPassword] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const onSaveName = async (e: FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setSavingName(true);
    setNameMsg(null);
    try {
      if (!user?.id) throw new Error(t('settings.account.noSession'));
      const { error } = await supabase
        .from('usuarios')
        .update({ nombre: nombre.trim() })
        .eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
      setNameMsg({ tone: 'success', text: t('settings.account.nameUpdated') });
      setNombre('');
    } catch (err) {
      setNameMsg({
        tone: 'error',
        text: err instanceof Error ? err.message : t('settings.account.nameFailed'),
      });
    } finally {
      setSavingName(false);
    }
  };

  const onSavePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) return;
    setSavingPwd(true);
    setPwdMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPwdMsg({ tone: 'success', text: t('settings.account.passwordUpdated') });
      setNewPassword('');
    } catch (err) {
      setPwdMsg({
        tone: 'error',
        text: err instanceof Error ? err.message : t('settings.account.passwordFailed'),
      });
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Language selector */}
      <div>
        <div className="text-xs text-yt-muted mb-1.5">{t('settings.language.label')}</div>
        <div className="flex gap-2">
          <LangButton
            active={i18n.language.startsWith('es')}
            onClick={() => changeLang('es')}
          >
            🇲🇽 {t('settings.language.es')}
          </LangButton>
          <LangButton
            active={i18n.language.startsWith('en')}
            onClick={() => changeLang('en')}
          >
            🇺🇸 {t('settings.language.en')}
          </LangButton>
        </div>
      </div>

      {/* Email read-only */}
      <div>
        <div className="text-xs text-yt-muted mb-1">{t('settings.account.email')}</div>
        <div className="text-sm text-yt-text bg-yt-bg/40 border border-yt-border rounded-lg px-3 py-2">
          {user?.email}
        </div>
      </div>

      {/* Timezone read-only */}
      <div>
        <div className="text-xs text-yt-muted mb-1">{t('settings.timezone.label')}</div>
        <div className="text-sm text-yt-text bg-yt-bg/40 border border-yt-border rounded-lg px-3 py-2 tabular-nums">
          {profile?.timezone ?? '—'}
        </div>
        <div className="text-[10px] text-yt-muted/70 mt-1">{t('settings.timezone.hint')}</div>
      </div>

      {/* Cambiar nombre */}
      <form onSubmit={onSaveName} className="flex flex-col gap-2">
        <div className="text-xs text-yt-muted">
          {t('settings.account.currentName')}{' '}
          <span className="text-yt-text">
            {profile?.nombre || t('settings.account.noName')}
          </span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            maxLength={80}
            placeholder={t('settings.account.newName')}
            className="flex-1 bg-yt-bg/60 border border-yt-border rounded-lg px-3 py-2 text-sm text-yt-text outline-none placeholder:text-yt-muted/60 focus:border-heat-1 focus:ring-2 focus:ring-heat-1/20 transition"
          />
          <Button type="submit" loading={savingName} size="sm">
            {t('settings.account.save')}
          </Button>
        </div>
        {nameMsg && <Alert tone={nameMsg.tone}>{nameMsg.text}</Alert>}
      </form>

      {/* Cambiar contraseña */}
      <form onSubmit={onSavePassword} className="flex flex-col gap-2">
        <div className="text-xs text-yt-muted">{t('auth.fields.password')}</div>
        <div className="flex gap-2">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={6}
            placeholder={t('settings.account.newPassword')}
            className="flex-1 bg-yt-bg/60 border border-yt-border rounded-lg px-3 py-2 text-sm text-yt-text outline-none placeholder:text-yt-muted/60 focus:border-heat-1 focus:ring-2 focus:ring-heat-1/20 transition"
          />
          <Button type="submit" loading={savingPwd} size="sm">
            {t('settings.account.save')}
          </Button>
        </div>
        {pwdMsg && <Alert tone={pwdMsg.tone}>{pwdMsg.text}</Alert>}
      </form>

      {/* Borrar cuenta — placeholder por ahora */}
      <div className="border-t border-yt-border pt-4">
        <div className="text-xs text-yt-muted mb-2">{t('settings.account.dangerZone')}</div>
        <Alert tone="info">{t('settings.account.deleteNotice')}</Alert>
      </div>
    </div>
  );
}

function LangButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'flex-1 text-sm font-medium px-3 py-2 rounded-md border transition-colors ' +
        (active
          ? 'bg-heat-1 border-heat-1 text-yt-bg'
          : 'bg-yt-bg/40 border-yt-border text-yt-muted hover:border-yt-muted hover:text-yt-text')
      }
    >
      {children}
    </button>
  );
}
