import type { ReactNode } from 'react';

type Tone = 'error' | 'success' | 'info';

type Props = {
  tone?: Tone;
  children: ReactNode;
};

const tones: Record<Tone, string> = {
  error: 'text-red-300 bg-red-950/30 border-red-900/50',
  success: 'text-heat-5 bg-yt-bg/60 border-yt-border',
  info: 'text-yt-text bg-yt-bg/60 border-yt-border',
};

export default function Alert({ tone = 'info', children }: Props) {
  return (
    <p role="alert" className={`text-sm border rounded-lg px-3 py-2 ${tones[tone]}`}>
      {children}
    </p>
  );
}
