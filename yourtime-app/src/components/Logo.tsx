type Props = {
  /** 'mark' = solo glifo (cuadrado, compacto). 'full' = wordmark completo. */
  variant?: 'mark' | 'full';
  className?: string;
};

/**
 * Logo de YourTime. Usa el PNG en /public/YourTimesinfondo.png (sin fondo).
 */
export default function Logo({ variant = 'full', className = '' }: Props) {
  const src = '/logo.svg';
  // Si className viene con tamaño (h-X), no agregamos default.
  // Sino, fallback razonable.
  const hasSizeClass = /\bh-\d/.test(className);
  const sizeClass = hasSizeClass ? '' : variant === 'mark' ? 'h-10 w-auto' : 'h-9 w-auto';

  return (
    <img
      src={src}
      alt="YourTime"
      className={`${sizeClass} object-contain select-none ${className}`}
      draggable={false}
    />
  );
}
