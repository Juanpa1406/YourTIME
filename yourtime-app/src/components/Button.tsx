import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type Props = {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const base =
  'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors ' +
  'focus:outline-none focus:ring-2 focus:ring-heat-2/40 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

const variants: Record<Variant, string> = {
  primary: 'bg-heat-1 hover:bg-heat-2 active:bg-heat-3 text-yt-bg',
  secondary: 'bg-yt-surface border border-yt-border hover:border-yt-muted text-yt-text',
  ghost: 'text-yt-muted hover:text-yt-text hover:bg-yt-surface',
  danger: 'bg-red-600/90 hover:bg-red-600 text-white',
};

const sizes: Record<Size, string> = {
  sm: 'text-xs px-3 py-1.5',
  md: 'text-sm px-4 py-2.5',
  lg: 'text-base px-5 py-3',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  className = '',
  children,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block w-3.5 h-3.5 border-2 border-current border-r-transparent rounded-full animate-spin"
    />
  );
}
