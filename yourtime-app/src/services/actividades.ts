import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

// -----------------------------------------------------------------------------
// Tipos derivados del schema
// -----------------------------------------------------------------------------
export type Actividad = Database['public']['Tables']['actividades']['Row'];
export type ActividadInsert = Database['public']['Tables']['actividades']['Insert'];
export type ActividadUpdate = Database['public']['Tables']['actividades']['Update'];
export type EstadoActividad = Database['public']['Enums']['estado_actividad'];
export type TipoActividad = Database['public']['Enums']['tipo_actividad'];

// -----------------------------------------------------------------------------
// Utils de día
// -----------------------------------------------------------------------------

/** ISO day-of-week para "hoy" (zona local del cliente): 1=Lunes..7=Domingo. */
export function todayIsoDow(): number {
  const dow = new Date().getDay(); // 0..6 con 0=Domingo
  return dow === 0 ? 7 : dow;
}

// -----------------------------------------------------------------------------
// Lecturas
// -----------------------------------------------------------------------------

/**
 * Trae todas las actividades del usuario actual, no archivadas, más recientes primero.
 * RLS filtra por auth.uid() del lado de Supabase.
 */
export async function listMine(): Promise<Actividad[]> {
  const { data, error } = await supabase
    .from('actividades')
    .select('*')
    .eq('archivada', false)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Actividades visibles HOY:
 * - Tareas únicas: siempre (mientras no estén archivadas).
 * - Hábitos cíclicos: solo si hoy ∈ dias_semana.
 */
export async function listForToday(): Promise<Actividad[]> {
  const all = await listMine();
  const today = todayIsoDow();
  return all.filter((a) => {
    if (a.tipo === 'tarea_unica') return true;
    return Array.isArray(a.dias_semana) && a.dias_semana.includes(today);
  });
}

// -----------------------------------------------------------------------------
// Escrituras
// -----------------------------------------------------------------------------

export type CreateInput = {
  titulo: string;
  descripcion?: string | null;
  tipo: TipoActividad;
  /** Requerido si tipo === 'habito_ciclico'. ISO: 1=Lun..7=Dom. */
  dias_semana?: number[] | null;
};

/** Crea una nueva actividad (tarea única o hábito). */
export async function create(input: CreateInput): Promise<Actividad> {
  const { data: userResult } = await supabase.auth.getUser();
  const usuario_id = userResult.user?.id;
  if (!usuario_id) throw new Error('No hay sesión activa.');

  if (input.tipo === 'habito_ciclico') {
    if (!input.dias_semana || input.dias_semana.length === 0) {
      throw new Error('Un hábito necesita al menos un día seleccionado.');
    }
  }

  const payload: ActividadInsert = {
    usuario_id,
    titulo: input.titulo.trim(),
    descripcion: input.descripcion?.trim() || null,
    tipo: input.tipo,
    dias_semana: input.tipo === 'habito_ciclico' ? input.dias_semana ?? [] : null,
  };

  const { data, error } = await supabase
    .from('actividades')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

/**
 * Patch parcial sobre los campos editables por el usuario: título, descripción
 * y días de la semana (este último solo válido para hábitos cíclicos).
 * No permite cambiar `tipo` ni `estado` (esos van por sus propias APIs).
 */
export type UpdateInput = {
  titulo?: string;
  descripcion?: string | null;
  dias_semana?: number[] | null;
};

export async function update(id: string, patch: UpdateInput): Promise<Actividad> {
  const cleanPatch: ActividadUpdate = {};
  if (patch.titulo !== undefined) cleanPatch.titulo = patch.titulo.trim();
  if (patch.descripcion !== undefined) {
    cleanPatch.descripcion = patch.descripcion?.trim() || null;
  }
  if (patch.dias_semana !== undefined) cleanPatch.dias_semana = patch.dias_semana;

  if (Object.keys(cleanPatch).length === 0) {
    throw new Error('No hay cambios para guardar.');
  }

  const { data, error } = await supabase
    .from('actividades')
    .update(cleanPatch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

/**
 * Cambia el estado de la actividad. Si pasa a 'in_progress', anota el timestamp
 * para que después podamos medir si terminó en menos de 25 min (métrica de eficiencia).
 */
export async function updateEstado(
  id: string,
  estado: EstadoActividad,
): Promise<Actividad> {
  const updates: ActividadUpdate = { estado };
  if (estado === 'in_progress') {
    updates.in_progress_started_at = new Date().toISOString();
  }
  const { data, error } = await supabase
    .from('actividades')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

/**
 * Suma un pomodoro completado + tiempo de enfoque acumulado de forma ATÓMICA.
 * Implementación: RPC a `increment_pomodoro(uuid, int)` en Postgres → un solo
 * UPDATE. SECURITY INVOKER + RLS garantizan que solo el dueño puede actualizar.
 * Sin race entre pestañas del mismo usuario (fix L-01 del audit).
 */
export async function incrementPomodoros(
  id: string,
  segundosEnfoque: number,
): Promise<void> {
  const { error } = await supabase.rpc('increment_pomodoro', {
    actividad_id: id,
    segundos_enfoque: segundosEnfoque,
  });
  if (error) throw error;
}

/** Archiva una tarea única (usado al cerrar el día). */
export async function archive(id: string): Promise<void> {
  const { error } = await supabase
    .from('actividades')
    .update({ archivada: true })
    .eq('id', id);
  if (error) throw error;
}

/** Borra una actividad permanentemente (acción destructiva del usuario). */
export async function remove(id: string): Promise<void> {
  const { error } = await supabase.from('actividades').delete().eq('id', id);
  if (error) throw error;
}
