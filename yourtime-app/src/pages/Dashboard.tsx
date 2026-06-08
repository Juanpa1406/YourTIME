import { useCallback, useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
import Board from '../components/Kanban/Board';
import Heatmap from '../components/Heatmap/Heatmap';
import PomodoroCard from '../components/Pomodoro/PomodoroCard';
import SidebarStats from '../components/SidebarStats';
import Alert from '../components/Alert';
import type { Actividad } from '../services/actividades';
import {
  computeStreak,
  computeTodayStats,
  listByRange,
  toDateString,
  type Historial,
} from '../services/historial';

export default function Dashboard() {
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [historial, setHistorial] = useState<Historial[]>([]);
  const [historialLoading, setHistorialLoading] = useState(true);
  const [historialError, setHistorialError] = useState<string | null>(null);
  const [todayKey, setTodayKey] = useState(() => toDateString(new Date()));

  const loadHistorial = useCallback(() => {
    setHistorialLoading(true);
    const year = new Date().getFullYear();
    listByRange(`${year}-01-01`, `${year}-12-31`)
      .then((data) => {
        setHistorial(data);
        setHistorialError(null);
      })
      .catch((err: unknown) => {
        setHistorialError(err instanceof Error ? err.message : 'No se pudo cargar el historial');
      })
      .finally(() => setHistorialLoading(false));
  }, []);

  useEffect(() => {
    loadHistorial();
  }, [loadHistorial, todayKey]);

  // Detector de cambio de día
  useEffect(() => {
    const t = window.setInterval(() => {
      const nowKey = toDateString(new Date());
      setTodayKey((prev) => (prev === nowKey ? prev : nowKey));
    }, 60 * 1000);
    return () => window.clearInterval(t);
  }, []);

  const today = computeTodayStats(actividades);
  const streak = computeStreak(historial, today.porcentaje, today.planificadas);

  return (
    <AppShell sidebarExtras={<SidebarStats today={today} streak={streak} />}>
      <div className="flex-1 flex flex-col gap-4 p-4 md:p-6">
        {/* Top row: heatmap (2/3) + pomodoro (1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 min-w-0">
            {historialError ? (
              <Alert tone="error">{historialError}</Alert>
            ) : (
              <Heatmap historial={historial} today={today} loading={historialLoading} />
            )}
          </div>

          <div className="lg:col-span-1 min-w-0">
            <PomodoroCard />
          </div>
        </div>

        {/* Bottom: kanban */}
        <Board onActividadesChange={setActividades} />
      </div>
    </AppShell>
  );
}
