import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from 'react-i18next';
import type { Actividad } from '../../services/actividades';

type Props = {
  actividad: Actividad;
  /** Cuando true, se renderiza dentro del DragOverlay (sin listeners). */
  overlay?: boolean;
  /** Click en el botón ⋯ — abre el modal de edición. */
  onEdit?: (a: Actividad) => void;
};

export default function ActivityCard({ actividad, overlay = false, onEdit }: Props) {
  const { t } = useTranslation();
  const DIAS_LABELS = t('days.letter', { returnObjects: true }) as string[];

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: actividad.id,
    disabled: overlay,
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const isHabito = actividad.tipo === 'habito_ciclico';

  return (
    <article
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={
        'group relative bg-yt-bg/60 border border-yt-border rounded-xl p-3 transition-colors ' +
        'cursor-grab active:cursor-grabbing select-none ' +
        (overlay
          ? 'shadow-2xl shadow-black/60 ring-1 ring-heat-1/30 rotate-1'
          : 'hover:border-yt-muted ') +
        (isDragging && !overlay ? 'opacity-0' : '')
      }
    >
      {/* Botón ⋯ en hover. stopPropagation evita que el drag se active. */}
      {!overlay && onEdit && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(actividad);
          }}
          aria-label={t('board.card.edit')}
          title={t('board.card.edit')}
          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md text-yt-muted text-base leading-none opacity-0 group-hover:opacity-100 hover:bg-yt-surface hover:text-yt-text transition-all flex items-center justify-center"
        >
          ⋯
        </button>
      )}

      <div className="flex items-start justify-between gap-2 mb-1 pr-6">
        <h3 className="text-sm font-medium text-yt-text leading-snug break-words">
          {actividad.titulo}
        </h3>
        <TipoBadge isHabito={isHabito} t={t} />
      </div>

      {actividad.descripcion && (
        <p className="text-xs text-yt-muted mt-1 line-clamp-2">{actividad.descripcion}</p>
      )}

      {isHabito && actividad.dias_semana && actividad.dias_semana.length > 0 && (
        <div className="flex gap-1 mt-2">
          {DIAS_LABELS.map((label, idx) => {
            const dow = idx + 1;
            const active = actividad.dias_semana?.includes(dow);
            return (
              <span
                key={dow}
                className={
                  'text-[10px] w-4 h-4 flex items-center justify-center rounded-sm ' +
                  (active ? 'bg-heat-1/20 text-heat-2' : 'bg-yt-border/40 text-yt-muted/60')
                }
                aria-label={`Día ${label} ${active ? 'activo' : 'inactivo'}`}
              >
                {label}
              </span>
            );
          })}
        </div>
      )}

      {actividad.pomodoros_completados > 0 && (
        <div className="text-[10px] text-yt-muted mt-2 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-heat-5" />
          {actividad.pomodoros_completados}{' '}
          {actividad.pomodoros_completados === 1
            ? t('board.card.pomodoroSingular')
            : t('board.card.pomodoroPlural')}
        </div>
      )}
    </article>
  );
}

function TipoBadge({
  isHabito,
  t,
}: {
  isHabito: boolean;
  t: (k: string) => string;
}) {
  return (
    <span
      className={
        'text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ' +
        (isHabito
          ? 'bg-heat-1/15 text-heat-2 border border-heat-1/30'
          : 'bg-yt-border/40 text-yt-muted border border-yt-border')
      }
    >
      {isHabito ? t('board.card.habit') : t('board.card.task')}
    </span>
  );
}
