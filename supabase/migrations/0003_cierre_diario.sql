-- =============================================================================
-- YourTime · Migración 0003 · Cierre diario automatizado
-- Función cerrar_dia() + agendado con pg_cron a las 00:00 ART (03:00 UTC).
-- =============================================================================

-- pg_cron viene preinstalado en Supabase pero la extensión debe activarse.
create extension if not exists pg_cron;

-- -----------------------------------------------------------------------------
-- Función principal: cerrar_dia(target_date)
-- Lo que hace por usuario:
--  1. Cuenta las actividades planificadas para target_date (tareas únicas no
--     archivadas + hábitos cíclicos cuyo dias_semana incluye el DOW del día).
--  2. Cuenta cuántas terminaron en 'done'.
--  3. Upsert en historial_productividad con el resumen del día.
-- Lo que hace global:
--  4. Resetea TODOS los hábitos cíclicos no archivados a estado='todo'
--     (limpia in_progress_started_at).
--  5. Archiva todas las tareas únicas con estado='done' (archivada=true).
-- -----------------------------------------------------------------------------

create or replace function public.cerrar_dia(target_date date default (current_date - 1))
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  v_dow smallint;
  v_planificadas int;
  v_completadas int;
begin
  -- ISO DOW: 1=Lunes .. 7=Domingo
  v_dow := extract(isodow from target_date)::smallint;

  -- Iterar usuarios con actividades vivas
  for uid in
    select distinct usuario_id from public.actividades where archivada = false
  loop
    select
      count(*) filter (
        where tipo = 'tarea_unica'
           or (tipo = 'habito_ciclico' and v_dow = any(dias_semana))
      ),
      count(*) filter (
        where estado = 'done'
          and (
            tipo = 'tarea_unica'
            or (tipo = 'habito_ciclico' and v_dow = any(dias_semana))
          )
      )
      into v_planificadas, v_completadas
    from public.actividades
    where usuario_id = uid and archivada = false;

    -- Si no había nada planificado, no contamina el heatmap con ceros vacíos.
    if v_planificadas > 0 then
      insert into public.historial_productividad (
        usuario_id, fecha, total_planificadas, total_completadas
      ) values (
        uid, target_date, v_planificadas, v_completadas
      )
      on conflict (usuario_id, fecha) do update set
        total_planificadas = excluded.total_planificadas,
        total_completadas  = excluded.total_completadas;
    end if;
  end loop;

  -- Reset de hábitos cíclicos al nuevo día (regla del producto).
  update public.actividades
  set estado = 'todo',
      in_progress_started_at = null
  where tipo = 'habito_ciclico'
    and archivada = false
    and estado <> 'todo';

  -- Archivado de tareas únicas completadas.
  update public.actividades
  set archivada = true
  where tipo = 'tarea_unica'
    and estado = 'done'
    and archivada = false;
end;
$$;

comment on function public.cerrar_dia is
  'Cierra el día (default: ayer): consolida historial_productividad, resetea hábitos a todo, archiva tareas únicas done.';

-- -----------------------------------------------------------------------------
-- pg_cron: agendar a las 03:00 UTC = 00:00 Argentina (UTC-3, sin DST).
-- Si tu zona horaria cambia, modificá el cron string acá.
-- -----------------------------------------------------------------------------

-- Idempotencia: borrar job previo si existía (por si re-corremos la migración).
do $$
declare
  jobid_to_remove bigint;
begin
  select jobid into jobid_to_remove from cron.job where jobname = 'yourtime_cerrar_dia';
  if jobid_to_remove is not null then
    perform cron.unschedule(jobid_to_remove);
  end if;
end $$;

select cron.schedule(
  'yourtime_cerrar_dia',
  '0 3 * * *',  -- 03:00 UTC todos los días
  $$ select public.cerrar_dia(); $$
);

-- -----------------------------------------------------------------------------
-- Verificación: queries útiles (no ejecutar acá, solo referencia)
-- -----------------------------------------------------------------------------
-- select * from cron.job;                              -- ver el agendado
-- select * from cron.job_run_details order by start_time desc limit 5;
-- select public.cerrar_dia(current_date);              -- forzar cierre de HOY (test)
-- select public.cerrar_dia('2026-01-01');              -- forzar fecha arbitraria
