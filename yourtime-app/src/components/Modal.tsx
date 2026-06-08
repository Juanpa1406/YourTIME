import { useEffect, useRef, type ReactNode } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Ancho máximo. Default: max-w-md */
  size?: 'sm' | 'md' | 'lg';
};

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

/**
 * Modal basado en el elemento nativo <dialog>.
 * Beneficios gratis: focus trap, Escape para cerrar, backdrop, top-layer rendering.
 */
export default function Modal({ open, onClose, title, children, size = 'md' }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  // Sincronizar prop `open` con el método imperativo del <dialog>.
  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    if (!open && dlg.open) dlg.close();
  }, [open]);

  // Cuando el usuario aprieta Escape o click en el backdrop, el <dialog>
  // dispara `close` y nosotros propagamos al parent para mantener estado sincronizado.
  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    const handle = () => onClose();
    dlg.addEventListener('close', handle);
    return () => dlg.removeEventListener('close', handle);
  }, [onClose]);

  // Click en el backdrop (fuera del contenido) cierra el modal.
  const onBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === ref.current) {
      ref.current?.close();
    }
  };

  return (
    <dialog
      ref={ref}
      onClick={onBackdropClick}
      className={
        // Reset del estilo default del <dialog> nativo + nuestra paleta.
        'bg-transparent p-0 m-auto backdrop:bg-black/60 backdrop:backdrop-blur-sm ' +
        'open:flex open:items-center open:justify-center ' +
        'w-full ' +
        sizes[size]
      }
    >
      {/* Wrapper para que el click DENTRO no propague al backdrop handler */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-yt-surface border border-yt-border rounded-2xl shadow-2xl shadow-black/40 w-full p-6"
      >
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold tracking-tight text-yt-text">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="text-yt-muted hover:text-yt-text text-xl leading-none px-2"
            >
              ×
            </button>
          </div>
        )}
        {children}
      </div>
    </dialog>
  );
}
