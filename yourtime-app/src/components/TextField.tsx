import type { InputHTMLAttributes } from 'react';

type Props = {
  label: string;
  hint?: string;
  error?: string;
  onValueChange?: (value: string) => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'>;

/**
 * Input + label uniformes para todos los formularios de YourTime.
 * Si pasás `onValueChange`, te llega el string puro; sino, usá `onInput` nativo.
 */
export default function TextField({
  label,
  hint,
  error,
  onValueChange,
  className = '',
  ...rest
}: Props) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-yt-muted">{label}</span>
      <input
        {...rest}
        onChange={onValueChange ? (e) => onValueChange(e.target.value) : undefined}
        className={
          'bg-yt-bg/60 border rounded-lg px-3.5 py-2.5 text-sm text-yt-text outline-none ' +
          'placeholder:text-yt-muted/60 transition ' +
          (error
            ? 'border-red-700/70 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
            : 'border-yt-border focus:border-heat-1 focus:ring-2 focus:ring-heat-1/20') +
          (className ? ` ${className}` : '')
        }
      />
      {hint && !error && <span className="text-xs text-yt-muted">{hint}</span>}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </label>
  );
}
