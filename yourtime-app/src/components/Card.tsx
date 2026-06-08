import type { HTMLAttributes, ReactNode } from 'react';

type Props = {
  padded?: boolean;
  hoverable?: boolean;
  children: ReactNode;
} & HTMLAttributes<HTMLDivElement>;

/**
 * Superficie elevada estándar de YourTime: bg-yt-surface + borde sutil + radio 2xl.
 * Usar para cards de Kanban, paneles del timer, contenedores del heatmap, etc.
 */
export default function Card({
  padded = true,
  hoverable = false,
  className = '',
  children,
  ...rest
}: Props) {
  return (
    <div
      {...rest}
      className={
        'bg-yt-surface border border-yt-border rounded-2xl ' +
        (padded ? 'p-5 ' : '') +
        (hoverable ? 'hover:border-yt-muted transition-colors ' : '') +
        className
      }
    >
      {children}
    </div>
  );
}
