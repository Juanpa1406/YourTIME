import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  listForToday,
  todayIsoDow,
  updateEstado,
  type Actividad,
  type EstadoActividad,
} from '../../services/actividades';
import Column from './Column';
import ActivityCard from './ActivityCard';
import Alert from '../Alert';
import Button from '../Button';
import CreateActivityModal from './CreateActivityModal';
import EditActivityModal from './EditActivityModal';
import { usePomodoro } from '../../context/PomodoroContext';
import { playDone } from '../../lib/sounds';

type Props = {
  /** Notifica al padre cuando cambia el set de actividades.
   *  Lo usa Dashboard para alimentar el Heatmap de HOY sin re-fetch. */
  onActividadesChange?: (actividades: Actividad[]) => void;
};

type Grouped = Record<EstadoActividad, Actividad[]>;

function group(actividades: Actividad[]): Grouped {
  const acc: Grouped = { todo: [], in_progress: [], done: [] };
  for (const a of actividades) acc[a.estado].push(a);
  return acc;
}

function isVisibleToday(a: Actividad): boolean {
  if (a.tipo === 'tarea_unica') return true;
  const today = todayIsoDow();
  return Array.isArray(a.dias_semana) && a.dias_semana.includes(today);
}

export default function Board({ onActividadesChange }: Props = {}) {
  const { t } = useTranslation();
  const COLUMNAS: Array<{ estado: EstadoActividad; titulo: string }> = [
    { estado: 'todo', titulo: t('board.columns.todo') },
    { estado: 'in_progress', titulo: t('board.columns.in_progress') },
    { estado: 'done', titulo: t('board.columns.done') },
  ];

  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Actividad | null>(null);
  const pomodoro = usePomodoro();

  // Sensores: mouse/touch con umbral de 5px (evita drags accidentales en click);
  // teclado con defaults (space para agarrar, flechas para mover).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listForToday()
      .then((data) => {
        if (!cancelled) setActividades(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error desconocido');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreated = (a: Actividad) => {
    if (!isVisibleToday(a)) return;
    setActividades((prev) => [a, ...prev]);
  };

  const handleSaved = (updated: Actividad) => {
    setActividades((prev) => {
      // Si la edición cambió dias_semana y ya no aplica hoy → la sacamos del board.
      if (!isVisibleToday(updated)) {
        return prev.filter((a) => a.id !== updated.id);
      }
      return prev.map((a) => (a.id === updated.id ? updated : a));
    });
  };

  const handleDeleted = (id: string) => {
    setActividades((prev) => prev.filter((a) => a.id !== id));
    // Si era la actividad del pomodoro activo, paramos el timer.
    if (pomodoro.activeActividadId === id && pomodoro.phase !== 'idle') {
      pomodoro.stop();
    }
  };

  // Bubble up el set de actividades para que el padre (Dashboard) pueda
  // alimentar el Heatmap con stats de HOY computados live.
  useEffect(() => {
    onActividadesChange?.(actividades);
  }, [actividades, onActividadesChange]);

  // Cuando el Pomodoro completa un focus, incrementa cycleCount.
  // Reflejamos optimistamente el +1 pomodoro en la card local (el servicio
  // ya hizo el write en DB; esto solo evita un re-fetch).
  const prevCycleRef = useRef(pomodoro.cycleCount);
  useEffect(() => {
    const completed = pomodoro.cycleCount - prevCycleRef.current;
    prevCycleRef.current = pomodoro.cycleCount;
    if (completed > 0 && pomodoro.activeActividadId) {
      const id = pomodoro.activeActividadId;
      setActividades((prev) =>
        prev.map((a) =>
          a.id === id
            ? {
                ...a,
                pomodoros_completados: a.pomodoros_completados + completed,
                tiempo_enfoque_segundos:
                  a.tiempo_enfoque_segundos + completed * 25 * 60,
              }
            : a,
        ),
      );
    }
  }, [pomodoro.cycleCount, pomodoro.activeActividadId]);

  const onDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };

  const onDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const draggedId = String(active.id);
    const targetEstado = String(over.id) as EstadoActividad;

    const dragged = actividades.find((a) => a.id === draggedId);
    if (!dragged || dragged.estado === targetEstado) return;

    // ---- Update optimista ----
    const snapshot = actividades;
    setActividades((prev) =>
      prev.map((a) =>
        a.id === draggedId
          ? {
              ...a,
              estado: targetEstado,
              in_progress_started_at:
                targetEstado === 'in_progress'
                  ? new Date().toISOString()
                  : a.in_progress_started_at,
            }
          : a,
      ),
    );

    try {
      await updateEstado(draggedId, targetEstado);
      // Si entró a In Progress, disparar el bloque de focus de 25 min.
      // Si ya había uno corriendo (otra card), se reemplaza por la nueva.
      if (targetEstado === 'in_progress') {
        pomodoro.startFocus(draggedId);
      }
      // Si entró a Done, ding de confirmación (respeta el mute global).
      if (targetEstado === 'done') {
        playDone();
      }
      // Si la card que se movió era la activa del pomodoro y salió de In Progress,
      // cancelar el bloque (movió a To-Do o Done).
      if (
        targetEstado !== 'in_progress' &&
        pomodoro.activeActividadId === draggedId &&
        pomodoro.phase === 'focus'
      ) {
        pomodoro.stop();
      }
    } catch (err) {
      // Rollback ante fallo
      setActividades(snapshot);
      setError(err instanceof Error ? err.message : t('board.moveError'));
    }
  };

  const activeActividad = useMemo(
    () => (activeId ? actividades.find((a) => a.id === activeId) ?? null : null),
    [activeId, actividades],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-yt-muted">
        {t('board.loading')}
      </div>
    );
  }

  const grouped = group(actividades);

  return (
    <div className="flex flex-col">
      {error && (
        <div className="pb-3">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNAS.map(({ estado, titulo }) => (
            <Column
              key={estado}
              estado={estado}
              titulo={titulo}
              actividades={grouped[estado]}
              onEdit={setEditing}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 200 }}>
          {activeActividad ? (
            <ActivityCard actividad={activeActividad} overlay />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Botón "+ Nueva actividad" centrado debajo de las columnas */}
      <div className="flex justify-center pt-5">
        <Button onClick={() => setModalOpen(true)}>{t('board.newActivity')}</Button>
      </div>

      <CreateActivityModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
      />

      <EditActivityModal
        actividad={editing}
        onClose={() => setEditing(null)}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
