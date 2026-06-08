import { useCallback, useEffect, useState } from 'react';

const SOUND_KEY = 'yt:sound-enabled';
const SOUND_EVENT = 'yt:sound-changed';

// -----------------------------------------------------------------------------
// Preferencia: mute global persistido en localStorage
// -----------------------------------------------------------------------------

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(SOUND_KEY) !== 'false';
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SOUND_KEY, enabled ? 'true' : 'false');
  // Broadcast a TODOS los hooks useSoundEnabled montados — los mantiene en sync.
  window.dispatchEvent(new CustomEvent(SOUND_EVENT, { detail: enabled }));
}

/**
 * Hook React para el toggle de sonido en la UI.
 * Sincronizado entre componentes vía CustomEvent: si cualquier componente
 * llama a toggle, todos los useSoundEnabled montados se re-renderizan.
 */
export function useSoundEnabled(): { enabled: boolean; toggle: () => void } {
  const [enabled, setEnabled] = useState<boolean>(() => isSoundEnabled());

  useEffect(() => {
    const onChange = (e: Event) => {
      const ce = e as CustomEvent<boolean>;
      setEnabled(ce.detail);
    };
    // Mismo tab: CustomEvent broadcast desde setSoundEnabled
    window.addEventListener(SOUND_EVENT, onChange);
    // Multi-tab: si cambia desde otra pestaña, también nos enteramos
    const onStorage = (e: StorageEvent) => {
      if (e.key === SOUND_KEY) setEnabled(e.newValue !== 'false');
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(SOUND_EVENT, onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const toggle = useCallback(() => {
    setSoundEnabled(!isSoundEnabled());
  }, []);

  return { enabled, toggle };
}

// -----------------------------------------------------------------------------
// AudioContext singleton (lazy)
// -----------------------------------------------------------------------------

let audioCtx: AudioContext | null = null;

type WebkitWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (audioCtx) {
    // Algunos browsers suspenden el contexto sin interacción reciente
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }
    return audioCtx;
  }
  try {
    const Ctor =
      window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
    return audioCtx;
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------
// playDone: ding de 2 notas ascendente (C5 → G5) tipo confirmación.
// -----------------------------------------------------------------------------

export function playDone(): void {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx) return;

  const start = ctx.currentTime;
  playNote(ctx, 523.25, start, 0.18, 0.22); // C5
  playNote(ctx, 783.99, start + 0.09, 0.24, 0.22); // G5
}

function playNote(
  ctx: AudioContext,
  freq: number,
  when: number,
  duration: number,
  gainPeak: number,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(ctx.destination);

  // Envolvente: attack rápido, decay exponencial — evita "click" inicial.
  gain.gain.setValueAtTime(0, when);
  gain.gain.linearRampToValueAtTime(gainPeak, when + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);

  osc.start(when);
  osc.stop(when + duration + 0.02);
}
