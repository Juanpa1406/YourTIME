import type { ReactNode } from 'react';
import Logo from './Logo';

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

/**
 * Shell visual común para Login y Signup: fondo con halo radial,
 * logo SVG centrado arriba, card de auth centrada.
 */
export default function AuthShell({ title, subtitle, children }: Props) {
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
