import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../Modal';
import Button from '../Button';
import TextField from '../TextField';
import Alert from '../Alert';
import { update, remove, type Actividad } from '../../services/actividades';

type Props = {
  /** null = cerrado; objeto = abierto con esa actividad pre-cargada. */
  actividad: Actividad | null;
  onClose: () => void;
  onSaved: (updated: Actividad) => void;
  onDeleted: (id: string) => void;
};

export default function EditActivityModal({ actividad, onClose, onSaved, onDeleted }: Props) {
  const { t } = useTranslation();
  const DIA_SHORT = t('days.short', { returnObjects: true }) as string[];
  const DIAS = DIA_SHORT.map((label, i) => ({ dow: i + 1, label }));

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [diasSemana, setDiasSemana] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Rehidratar el form cuando cambia la actividad seleccionada.
  useEffect(() => {
    if (!actividad) return;
    setTitulo(actividad.titulo);
    setDescripcion(actividad.descripcion ?? '');
    setDiasSemana(actividad.dias_semana ?? []);
    setErrorMsg(null);
    setConfirmDelete(false);
    setSubmitting(false);
  }, [actividad?.id]);  // eslint-disable-line react-hooks/exhaustive-deps

  if (!actividad) {
    return <Modal open={false} onClose={onClose}>{null}</Modal>;
  }

  const isHabito = actividad.tipo === 'habito_ciclico';

  const toggleDia = (dow: number) => {
    setDiasSemana((prev) =>
      prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow].sort(),
    );
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!titulo.trim()) {
      setErrorMsg(t('activityModal.errors.titleRequired'));
      return;
    }
    if (isHabito && diasSemana.length === 0) {
      setErrorMsg(t('activityModal.errors.habitNeedsDayEdit'));
      return;
    }

    setSubmitting(true);
    try {
      const updated = await update(actividad.id, {
        titulo,
        descripcion: descripcion,
        dias_semana: isHabito ? diasSemana : undefined,
      });
      onSaved(updated);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t('activityModal.errors.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await remove(actividad.id);
      onDeleted(actividad.id);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t('activityModal.errors.deleteFailed'));
      setSubmitting(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={t('activityModal.editTitle')} size="md">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="text-xs text-yt-muted -mt-2">
          {t('activityModal.typeLabel')}{' '}
          <span className="text-yt-text">
            {isHabito ? t('activityModal.typeHabit') : t('activityModal.typeUnique')}
          </span>
          <span className="text-yt-muted/60"> · {t('activityModal.typeImmutable')}</span>
        </div>

        <TextField
          label={t('activityModal.fields.title')}
          required
          maxLength={200}
          value={titulo}
          onValueChange={setTitulo}
          autoFocus
        />

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-yt-muted">
            {t('activityModal.fields.description').replace(' (opcional)', '').replace(' (optional)', '')}
          </span>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            maxLength={2000}
            rows={3}
            className="bg-yt-bg/60 border border-yt-border rounded-lg px-3.5 py-2.5 text-sm text-yt-text outline-none placeholder:text-yt-muted/60 focus:border-heat-1 focus:ring-2 focus:ring-heat-1/20 transition resize-y"
          />
        </label>

        {isHabito && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-yt-muted">{t('activityModal.fields.weekdays')}</span>
            <div className="flex gap-1.5 flex-wrap">
              {DIAS.map(({ dow, label }) => {
                const active = diasSemana.includes(dow);
                return (
                  <button
                    key={dow}
                    type="button"
                    onClick={() => toggleDia(dow)}
                    aria-pressed={active}
                    className={
                      'text-xs font-medium px-2.5 py-1.5 rounded-md border transition-colors ' +
                      (active
                        ? 'bg-heat-1 border-heat-1 text-yt-bg'
                        : 'bg-yt-bg/40 border-yt-border text-yt-muted hover:border-yt-muted hover:text-yt-text')
                    }
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {errorMsg && <Alert tone="error">{errorMsg}</Alert>}

        <div className="flex items-center justify-between mt-2 pt-3 border-t border-yt-border">
          {/* Delete a la izquierda — destructivo, separado */}
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className={
              'text-sm font-medium px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 ' +
              (confirmDelete
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'text-red-400 hover:text-red-300 hover:bg-red-950/30')
            }
          >
            {confirmDelete ? t('activityModal.actions.deleteConfirm') : t('activityModal.actions.delete')}
          </button>

          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              {t('activityModal.actions.cancel')}
            </Button>
            <Button type="submit" loading={submitting}>
              {t('activityModal.actions.save')}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
