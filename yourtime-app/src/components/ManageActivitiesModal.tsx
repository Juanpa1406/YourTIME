import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import Alert from './Alert';
import EditActivityModal from './Kanban/EditActivityModal';
import { listMine, remove, type Actividad } from '../services/actividades';
import { usePomodoro } from '../context/PomodoroContext';

type Props = {
  open: boolean;
  onClose: () => void;
};

/**
 * Modal que lista todas las actividades NO archivadas del usuario, agrupadas
 * por tipo. Permite editar y eliminar cualquiera de ellas, incluyendo hábitos
 * que no aplican hoy (caso de uso: hábito creado para mañana que querés borrar
 * antes de que aparezca en el board).
 *
 * Comunicación con el Board:
 * - Tras un edit/delete, dispara `window.dispatchEvent(yt:activities-changed)`.
 * - El Board escucha y re-fetchea su lista de hoy. Patrón parecido al de
 *   `yt:sound-changed` que usa el useSoundEnabled hook.
 */
export default function ManageActivitiesModal({ open, onClose }: Props) {
  const { t } = useTranslation();
  const DIAS_LETTER = t('days.letter', { returnObjects: true }) as string[];
  const pomodoro = usePomodoro();

  const [activities, setActivities] = useState<Actividad[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState<Actividad | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setErrorMsg(null);
    listMine()
      .then(setActivities)
      .catch((err: unknown) => {
        setErrorMsg(err instanceof Error ? err.message : 'Error');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (open) {
      refresh();
      setConfirmingId(null);
    }
  }, [open, refresh]);

  const notifyChange = () => {
    window.dispatchEvent(new CustomEvent('yt:activities-changed'));
  };

  /** Si la actividad borrada/editada era la activa del pomodoro, parar. */
  const stopPomodoroIfActive = (id: string) => {
    if (pomodoro.activeActividadId === id && pomodoro.phase !== 'idle') {
      pomodoro.stop();
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setErrorMsg(null);
    try {
      await remove(id);
      stopPomodoroIfActive(id);
      setActivities((prev) => prev.filter((a) => a.id !== id));
      setConfirmingId(null);
      notifyChange();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : t('manageActivities.deleteFailed'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdited = (updated: Actividad) => {
    setActivities((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    notifyChange();
  };

  const handleEditedDeleted = (id: string) => {
    stopPomodoroIfActive(id);
    setActivities((prev) => prev.filter((a) => a.id !== id));
    notifyChange();
  };

  const habits = activities.filter((a) => a.tipo === 'habito_ciclico');
  const tasks = activities.filter((a) => a.tipo === 'tarea_unica');

  return (
    <>
      <Modal open={open} onClose={onClose} title={t('manageActivities.title')} size="lg">
        <div className="flex flex-col gap-5 max-h-[60vh] overflow-y-auto pr-1">
          {errorMsg && <Alert tone="error">{errorMsg}</Alert>}

          {loading ? (
            <p className="text-sm text-yt-muted text-center py-8">
              {t('manageActivities.loading')}
            </p>
          ) : activities.length === 0 ? (
            <p className="text-sm text-yt-muted text-center py-8">
              {t('manageActivities.empty')}
            </p>
          ) : (
            <>
              {habits.length > 0 && (
                <section>
                  <h3 className="text-xs uppercase tracking-wider font-semibold text-yt-muted mb-2">
                    {t('manageActivities.habits')} ({habits.length})
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {habits.map((h) => (
                      <ActivityRow
                        key={h.id}
                        actividad={h}
                        diasLetter={DIAS_LETTER}
                        isConfirming={confirmingId === h.id}
                        isDeleting={deletingId === h.id}
                        onEdit={() => setEditing(h)}
                        onAskDelete={() => setConfirmingId(h.id)}
                        onCancelDelete={() => setConfirmingId(null)}
                        onConfirmDelete={() => handleDelete(h.id)}
                        t={t}
                      />
                    ))}
                  </ul>
                </section>
              )}
              {tasks.length > 0 && (
                <section>
                  <h3 className="text-xs uppercase tracking-wider font-semibold text-yt-muted mb-2">
                    {t('manageActivities.tasks')} ({tasks.length})
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {tasks.map((task) => (
                      <ActivityRow
                        key={task.id}
                        actividad={task}
                        diasLetter={DIAS_LETTER}
                        isConfirming={confirmingId === task.id}
                        isDeleting={deletingId === task.id}
                        onEdit={() => setEditing(task)}
                        onAskDelete={() => setConfirmingId(task.id)}
                        onCancelDelete={() => setConfirmingId(null)}
                        onConfirmDelete={() => handleDelete(task.id)}
                        t={t}
                      />
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </Modal>

      {/* Modal de edición se monta sobre el de gestión. Cuando se guarda o
          elimina, actualiza nuestro estado local sin re-fetch completo. */}
      <EditActivityModal
        actividad={editing}
        onClose={() => setEditing(null)}
        onSaved={handleEdited}
        onDeleted={handleEditedDeleted}
      />
    </>
  );
}

// -----------------------------------------------------------------------------
// Subcomponente: fila individual de una actividad
// -----------------------------------------------------------------------------

type RowProps = {
  actividad: Actividad;
  diasLetter: string[];
  isConfirming: boolean;
  isDeleting: boolean;
  onEdit: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  t: (k: string) => string;
};

function ActivityRow({
  actividad,
  diasLetter,
  isConfirming,
  isDeleting,
  onEdit,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
  t,
}: RowProps) {
  const isHabito = actividad.tipo === 'habito_ciclico';

  return (
    <li className="flex items-center gap-3 bg-yt-bg/40 border border-yt-border rounded-lg px-3 py-2.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-yt-text font-medium truncate">{actividad.titulo}</p>
        {isHabito ? (
          <div className="flex gap-1 mt-1.5">
            {diasLetter.map((label, idx) => {
              const dow = idx + 1;
              const active = actividad.dias_semana?.includes(dow);
              return (
                <span
                  key={dow}
                  className={
                    'text-[10px] w-4 h-4 flex items-center justify-center rounded-sm ' +
                    (active
                      ? 'bg-heat-1/20 text-heat-2'
                      : 'bg-yt-border/40 text-yt-muted/60')
                  }
                >
                  {label}
                </span>
              );
            })}
          </div>
        ) : (
          <p className="text-[10px] text-yt-muted mt-1 uppercase tracking-wider">
            {t(`manageActivities.status.${actividad.estado}`)}
          </p>
        )}
      </div>

      {isConfirming ? (
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onConfirmDelete}
            disabled={isDeleting}
            className="text-xs font-medium px-2.5 py-1 rounded-md bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 transition-colors"
          >
            {isDeleting ? '…' : t('manageActivities.confirmDelete')}
          </button>
          <button
            type="button"
            onClick={onCancelDelete}
            disabled={isDeleting}
            className="text-xs text-yt-muted hover:text-yt-text px-2 py-1 disabled:opacity-50 transition-colors"
          >
            {t('manageActivities.cancelDelete')}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onEdit}
            aria-label={t('manageActivities.edit')}
            title={t('manageActivities.edit')}
            className="w-7 h-7 rounded-md text-yt-muted hover:text-yt-text hover:bg-yt-surface flex items-center justify-center transition-colors"
          >
            <EditIcon />
          </button>
          <button
            type="button"
            onClick={onAskDelete}
            aria-label={t('manageActivities.delete')}
            title={t('manageActivities.delete')}
            className="w-7 h-7 rounded-md text-yt-muted hover:text-red-400 hover:bg-red-950/30 flex items-center justify-center transition-colors"
          >
            <TrashIcon />
          </button>
        </div>
      )}
    </li>
  );
}

// -----------------------------------------------------------------------------
// Iconos SVG inline (Lucide style)
// -----------------------------------------------------------------------------

function EditIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
