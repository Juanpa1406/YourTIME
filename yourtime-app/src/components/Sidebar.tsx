import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useSoundEnabled } from '../lib/sounds';
import Logo from './Logo';
import SettingsModal from './SettingsModal';

type Props = {
  /** Para cerrar el drawer en mobile al hacer click en algo. */
  onItemClick?: () => void;
  /** Slot opcional para widgets entre el logo y el footer (stats, navegación, etc). */
  extras?: ReactNode;
};

export default function Sidebar({ onItemClick, extras }: Props) {
  const { t } = useTranslation();
  const { user, profile, signOut } = useAuth();
  const { enabled: soundEnabled, toggle: toggleSound } = useSoundEnabled();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Prioridad: profile.nombre → fallback email
  const displayName = profile?.nombre?.trim() || user?.email || '';
  const initial = displayName.charAt(0).toUpperCase() || 'U';

  return (
    <aside className="w-52 shrink-0 h-screen bg-yt-surface border-r border-yt-border flex flex-col py-5 px-4">
      {/* Botón de cerrar drawer (solo en mobile, identificado por la presencia
          del callback onItemClick que el AppShell solo pasa en modo drawer). */}
      {onItemClick && (
        <div className="flex justify-end -mt-1 mb-1">
          <button
            type="button"
            onClick={onItemClick}
            aria-label={t('sidebar.closeMenu')}
            title={t('sidebar.closeMenu')}
            className="w-8 h-8 rounded-md text-yt-muted hover:text-yt-text hover:bg-yt-bg/60 transition-colors flex items-center justify-center"
          >
            <CloseArrowIcon />
          </button>
        </div>
      )}

      {/* Logo top */}
      <div className="flex items-center justify-center py-2">
        <Logo variant="full" className="w-full max-w-[170px] h-auto" />
      </div>

      {/* Widgets (stats, navegación) inyectados desde el page */}
      {extras}

      <div className="flex-1" />

      {/* Footer: avatar + sonido + logout */}
      <div className="flex flex-col gap-2 border-t border-yt-border pt-4">
        {/* Avatar + email */}
        <div className="flex items-center gap-2.5 px-1">
          <div
            className="w-8 h-8 rounded-full bg-yt-surface border border-yt-border text-yt-text text-sm font-semibold flex items-center justify-center shrink-0"
            aria-hidden
          >
            {initial}
          </div>
          <span
            className="text-xs text-yt-muted truncate flex-1"
            title={user?.email ?? ''}
          >
            {displayName}
          </span>
        </div>

        {/* Acciones en fila: sonido · ajustes · logout */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleSound}
            title={soundEnabled ? t('sidebar.soundOn') : t('sidebar.soundOff')}
            aria-label={soundEnabled ? t('sidebar.soundOn') : t('sidebar.soundOff')}
            className="flex-1 h-9 rounded-md border border-yt-border bg-yt-surface text-yt-muted hover:border-yt-muted hover:text-yt-text transition-colors flex items-center justify-center"
          >
            {soundEnabled ? <SoundOnIcon /> : <SoundOffIcon />}
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            title={t('sidebar.settings')}
            aria-label={t('sidebar.settings')}
            className="flex-1 h-9 rounded-md border border-yt-border bg-yt-surface text-yt-muted hover:border-yt-muted hover:text-yt-text transition-colors flex items-center justify-center"
          >
            <SettingsIcon />
          </button>
          <button
            type="button"
            onClick={() => {
              signOut();
              onItemClick?.();
            }}
            title={t('sidebar.logout')}
            aria-label={t('sidebar.logout')}
            className="flex-1 h-9 rounded-md text-base border border-yt-border bg-yt-surface text-yt-muted hover:bg-red-600 hover:border-red-500 hover:text-white transition-colors flex items-center justify-center"
          >
            ⏻
          </button>
        </div>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </aside>
  );
}

// -----------------------------------------------------------------------------
// Icons SVG minimalistas (heredan color via currentColor)
// -----------------------------------------------------------------------------

function SoundOnIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function SoundOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}

/** Cog de 8 dientes + círculo central. Estilo Lucide/Feather, minimalista. */
function SettingsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

/** Flecha izquierda (←) usada para cerrar el drawer en mobile. */
function CloseArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}
