import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Logo from './Logo';

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

/**
 * Shell visual común para Login y Signup: fondo con halo radial,
 * link de "Volver al inicio" arriba a la izquierda, logo SVG centrado
 * arriba, card de auth centrada.
 */
export default function AuthShell({ title, subtitle, children }: Props) {
  const { t } = useTranslation();
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Halos de color de fondo (mismos tonos del heatmap) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          background:
            'radial-gradient(60% 50% at 15% 10%, #4d84ff 0%, transparent 60%),' +
            'radial-gradient(50% 40% at 90% 95%, #4dff5f 0%, transparent 65%)',
        }}
      />

      {/* Link de regreso a la landing, fijo arriba a la izquierda.
          Pill con glassmorphism — mismo lenguaje visual que la card de auth. */}
      <Link
        to="/"
        className="absolute top-5 left-5 md:top-6 md:left-6 z-10 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm text-yt-muted hover:text-yt-text bg-yt-surface/60 backdrop-blur-sm border border-yt-border hover:border-yt-muted/50 rounded-full shadow-lg shadow-black/20 transition-all hover:shadow-black/30"
      >
        <span aria-hidden className="text-base leading-none">←</span>
        {t('auth.shell.back')}
      </Link>

      <div className="relative w-full max-w-sm">
        {/* Logo oficial */}
        <div className="flex items-center justify-center mb-8">
          <Logo variant="full" className="h-12 w-auto max-w-[220px]" />
        </div>

        <div className="bg-yt-surface/80 backdrop-blur-sm border border-yt-border rounded-2xl p-7 shadow-2xl shadow-black/30">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-yt-text">{title}</h1>
            <p className="text-sm text-yt-muted mt-1">{subtitle}</p>
          </div>

          {children}
        </div>
      </div>
    </main>
  );
}
