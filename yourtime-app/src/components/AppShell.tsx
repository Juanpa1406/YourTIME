import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import Sidebar from './Sidebar';
import Logo from './Logo';

type Props = {
  children: ReactNode;
  /** Widgets opcionales a inyectar en el sidebar (stats, etc). */
  sidebarExtras?: ReactNode;
};

export default function AppShell({ children, sidebarExtras }: Props) {
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-yt-bg">
      {/* Sidebar desktop (siempre visible) */}
      <div className="hidden md:block">
        <Sidebar extras={sidebarExtras} />
      </div>

      {/* Sidebar mobile (drawer) */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <button
            type="button"
            aria-label={t('sidebar.closeMenu')}
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 z-30 bg-black/60 md:hidden"
          />
          {/* Drawer */}
          <div className="fixed left-0 top-0 z-40 md:hidden">
            <Sidebar
              extras={sidebarExtras}
              onItemClick={() => setDrawerOpen(false)}
            />
          </div>
        </>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar mobile (hamburguesa + logo, oculta en desktop) */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-yt-border">
          <button
            type="button"
            aria-label={t('sidebar.openMenu')}
            onClick={() => setDrawerOpen(true)}
            className="w-9 h-9 rounded-md border border-yt-border bg-yt-surface text-yt-text flex items-center justify-center"
          >
            ☰
          </button>
          <Logo variant="full" />
          <div className="w-9" /> {/* spacer para centrar el logo */}
        </header>

        {children}
      </div>
    </div>
  );
}
