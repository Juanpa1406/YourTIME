import { useDroppable } from '@dnd-kit/core';
import { useTranslation } from 'react-i18next';
import type { Actividad, EstadoActividad } from '../../services/actividades';
import ActivityCard from './ActivityCard';

type Props = {
  estado: EstadoActividad;
  titulo: string;
  actividades: Actividad[];
  onEdit?: (a: Actividad) => void;
};

const dotByEstado: Record<EstadoActividad, string> = {
  todo: 'bg-yt-muted',
  in_progress: 'bg-heat-2',
  done: 'bg-heat-5',
};

export default function Column({ estado, titulo, actividades, onEdit }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: estado });

  return (
    <div
      ref={setNodeRef}
      className={
        'flex flex-col rounded-2xl p-3 min-h-[300px] border transition-colors ' +
        (isOver
          ? 'bg-heat-1/5 border-heat-1/40'
          : 'bg-yt-surface/50 border-yt-border')
      }
    >
      <header className="flex items-center justify-between px-1 pb-3 mb-3 border-b border-yt-border">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${dotByEstado[estado]}`} />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-yt-muted">
            {titulo}
          </h2>
        </div>
        <span className="text-xs text-yt-muted tabular-nums">{actividades.length}</span>
      </header>

      {actividades.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-2">
          {actividades.map((a) => (
            <ActivityCard key={a.id} actividad={a} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="flex-1 flex items-center justify-center text-xs text-yt-muted/60 italic py-6">
      {t('board.column.dropHere')}
    </div>
  );
}
