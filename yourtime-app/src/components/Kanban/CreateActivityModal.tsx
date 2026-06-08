import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../Modal';
import Button from '../Button';
import TextField from '../TextField';
import Alert from '../Alert';
import {
  create,
  type Actividad,
  type TipoActividad,
} from '../../services/actividades';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (a: Actividad) => void;
};

export default function CreateActivityModal({ open, onClose, onCreated }: Props) {
  const { t } = useTranslation();
  const DIA_SHORT = t('days.short', { returnObjects: true }) as string[];
  const DIAS = DIA_SHORT.map((label, i) => ({ dow: i + 1, label }));


  const [tipo, setTipo] = useState<TipoActividad>('tarea_unica');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [diasSemana, setDiasSemana] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const reset = () => {
    setTipo('tarea_unica');
    setTitulo('');
    setDescripcion('');
    setDiasSemana([]);
    setErrorMsg(null);
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

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
    if (tipo === 'habito_ciclico' && diasSemana.length === 0) {
      setErrorMsg(t('activityModal.errors.habitNeedsDay'));
      return;
    }

    setSubmitting(true);
    try {
      const created = await create({
        titulo,
        descripcion: descripcion.trim() || null,
        tipo,
        dias_semana: tipo === 'habito_ciclico' ? diasSemana : null,
      });
      onCreated(created);
      reset();
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t('activityModal.errors.createFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title={t('activityModal.createTitle')} size="md">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <TipoSegment value={tipo} onChange={setTipo} />

        <TextField
          label={t('activityModal.fields.title')}
          required
          maxLength={200}
          value={titulo}
          onValueChange={setTitulo}
          placeholder={t('activityModal.fields.titlePlaceholder')}
          autoFocus
        />

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-yt-muted">{t('activityModal.fields.description')}</span>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder={t('activityModal.fields.descriptionPlaceholder')}
            className="bg-yt-bg/60 border border-yt-border rounded-lg px-3.5 py-2.5 text-sm text-yt-text outline-none placeholder:text-yt-muted/60 focus:border-heat-1 focus:ring-2 focus:ring-heat-1/20 transition resize-y"
          />
        </label>

        {tipo === 'habito_ciclico' && (
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

        <div className="flex justify-end gap-2 mt-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            {t('activityModal.actions.cancel')}
          </Button>
          <Button type="submit" loading={submitting}>
            {t('activityModal.actions.create')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// -----------------------------------------------------------------------------
// Segment Tarea / Hábito
// -----------------------------------------------------------------------------

function TipoSegment({
  value,
  onChange,
}: {
  value: TipoActividad;
  onChange: (v: TipoActividad) => void;
}) {
  const { t } = useTranslation();
  const options: Array<{ value: TipoActividad; label: string; hint: string }> = [
    {
      value: 'tarea_unica',
      label: t('activityModal.typeUnique'),
      hint: t('activityModal.typeUniqueHint'),
    },
    {
      value: 'habito_ciclico',
      label: t('activityModal.typeHabit'),
      hint: t('activityModal.typeHabitHint'),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 bg-yt-bg/40 border border-yt-border rounded-lg p-1">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={
              'text-left px-3 py-2 rounded-md transition-colors ' +
              (active
                ? 'bg-yt-surface border border-yt-border text-yt-text'
                : 'text-yt-muted hover:text-yt-text')
            }
          >
            <div className="text-sm font-medium">{opt.label}</div>
            <div className="text-[11px] text-yt-muted">{opt.hint}</div>
          </button>
        );
      })}
    </div>
  );
}
