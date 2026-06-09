import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import type { Actividad } from './actividades';

export type Historial = Database['public']['Tables']['historial_productividad']['Row'];

// -----------------------------------------------------------------------------
// Helpers de fecha
// -----------------------------------------------------------------------------

/** YYYY-MM-DD en la zona horaria LOCAL del cliente. */
export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** ISO DOW del cliente: 1=Lun..7=Dom. */
export function isoDow(d: Date = new Date()): number {
  const js = d.getDay(); // 0=Sun..6=Sat
  return js === 0 ? 7 : js;
}

// -----------------------------------------------------------------------------
// Lectura del historial
// -----------------------------------------------------------------------------

/** Trae las filas del historial del usuario en un rango [startDate, endDate]. */
export async function listByRange(
  startDate: string,
  endDate: string,
): Promise<Historial[]> {
  const { data, error } = await supabase
    .from('historial_productividad')
    .select('*')
    .gte('fecha', startDate)
    .lte('fecha', endDate)
    .order('fecha', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Atajo: últimos N días desde hoy (inclusive). */
export async function listLastDays(days: number): Promise<Historial[]> {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));
  return listByRange(toDateString(start), toDateString(today));
}

// -----------------------------------------------------------------------------
// Cálculo de HOY a partir del estado local de actividades
// (la fila de HOY no existe en historial_productividad hasta que corra el cron)
// -----------------------------------------------------------------------------

export type TodayStats = {
  planificadas: number;
  completadas: number;
  porcentaje: number;
};

export function computeTodayStats(
  actividades: Actividad[],
  today: number = isoDow(),
): TodayStats {
  const aplicaHoy = (a: Actividad): boolean =>
    a.tipo === 'tarea_unica' ||
    (Array.isArray(a.dias_semana) && a.dias_semana.includes(today));

  const planificadas = actividades.filter((a) => !a.archivada && aplicaHoy(a)).length;
  const completadas = actividades.filter(
    (a) => !a.archivada && a.estado === 'done' && aplicaHoy(a),
  ).length;
  const porcentaje =
    planificadas === 0 ? 0 : Math.min(100, Math.round((100 * completadas) / planificadas));

  return { planificadas, completadas, porcentaje };
}

// -----------------------------------------------------------------------------
// Color helper para el heatmap
// -----------------------------------------------------------------------------

/**
 * Cuenta días consecutivos hasta hoy con completación > 0%.
 * Reglas:
 *   - Día sin actividades planificadas → NEUTRAL (no cuenta, no rompe la racha)
 *   - Día con planificadas y al menos 1 completada → cuenta +1
 *   - Día cerrado (ayer y anteriores) con planificadas y 0 completadas → ROMPE la racha
 *   - HOY con planificadas y 0 completadas → NEUTRAL (el día sigue en curso).
 *     La racha solo se "consolida" como rota cuando el cron cierra el día a
 *     medianoche local. Mientras el día corre, sacar una card de Done no debe
 *     borrar la racha del día anterior.
 *   - Se camina hacia atrás hasta encontrar el primer "rompe" o 365 días.
 *
 * @param historial filas del usuario (puede incluir o no la del día actual)
 * @param todayPct porcentaje del día actual computado live
 * @param todayPlanificadas total de actividades planificadas hoy
 */
export function computeStreak(
  historial: Historial[],
  todayPct: number,
  todayPlanificadas: number,
): number {
  const byDate = new Map<string, Historial>();
  for (const h of historial) byDate.set(h.fecha, h);

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const isToday = i === 0;
    let pct: number;
    let hadPlans: boolean;

    if (isToday) {
      pct = todayPct;
      hadPlans = todayPlanificadas > 0;
    } else {
      const h = byDate.get(toDateString(cursor));
      if (h) {
        pct = h.porcentaje ?? 0;
        hadPlans = h.total_planificadas > 0;
      } else {
        pct = 0;
        hadPlans = false;
      }
    }

    if (!hadPlans) {
      // Día sin plans → no cuenta y tampoco rompe
    } else if (pct > 0) {
      streak += 1;
    } else if (isToday) {
      // Hoy todavía no terminó: no cuenta, pero tampoco rompe. El día se
      // "consolida" solo cuando el cron cierra a medianoche local.
    } else {
      break; // día cerrado con plans y 0 completadas → racha cortada
    }

    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

/** Devuelve la clase Tailwind de fondo para el % dado. */
export function colorForPct(pct: number): string {
  if (pct === 0) return 'bg-heat-0';
  if (pct <= 20) return 'bg-heat-1';
  if (pct <= 40) return 'bg-heat-2';
  if (pct <= 60) return 'bg-heat-3';
  if (pct <= 80) return 'bg-heat-4';
  return 'bg-heat-5';
}
