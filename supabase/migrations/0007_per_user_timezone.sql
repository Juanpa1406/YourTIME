-- =============================================================================
-- YourTime · Migración 0007 · Timezone por usuario
-- Cada usuario tiene su propia TZ. El cron corre cada hora y procesa solo a los
-- que están en su 00:00 local. Sigue funcionando igual para CDMX (que es el
-- default), y respeta a usuarios en cualquier otra parte del mundo.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Agregar columna timezone
-- -----------------------------------------------------------------------------
alter table public.usuarios
  add column if not exists timezone text not null default 'America/Mexico_City';

comment on column public.usuarios.timezone is
  'IANA timezone name (ej. America/Mexico_City). Auto-detectado del browser, sobrescribible desde settings.';

-- Constraint: aceptar solo IANA names válidos (validación blanda — Postgres
-- valida al USAR la TZ en at-time-zone, no en el insert).

-- -----------------------------------------------------------------------------
-- 2) Nueva función que procesa a TODOS los usuarios respetando su TZ
-- -----------------------------------------------------------------------------

create or replace function public.cerrar_dia_all_users()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  user_tz text;
  user_local_hour int;
  target_date date;
  v_dow smallint;
  v_planificadas int;
  v_completadas int;
begin
  for uid, user_tz in
    select id, timezone from public.usuarios
  loop
    -- Calcular hora local del usuario
    begin
      user_local_hour := extract(hour from (now() at time zone user_tz))::int;
    exception when others then
      -- TZ inválida: saltear este usuario, no fallar el cron
      continue;
    end;

    -- Procesar solo si está en la primera hora del día local (00:00-00:59)
    if user_local_hour <> 0 then
      continue;
    end if;

    -- Fecha "ayer" en TZ local del usuario
    target_date := ((now() at time zone user_tz)::date) - 1;
    v_dow := extract(isodow from target_date)::smallint;

    -- Contar planificadas y completadas para ayer (segun el DOW de ayer)
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

    -- Reset de hábitos cíclicos al nuevo día
    update public.actividades
    set estado = 'todo',
        in_progress_started_at = null
    where usuario_id = uid
      and tipo = 'habito_ciclico'
      and archivada = false
      and estado <> 'todo';

    -- Archivado de tareas únicas completadas
    update public.actividades
    set archivada = true
    where usuario_id = uid
      and tipo = 'tarea_unica'
      and estado = 'done'
      and archivada = false;
  end loop;
end;
$$;

comment on function public.cerrar_dia_all_users is
  'Itera todos los usuarios y cierra el día solo para los que están en su 00:00 local (según usuarios.timezone). Diseñada para correr cada hora.';

-- Hardening: revocar execute, solo postgres/service_role/pg_cron
revoke execute on function public.cerrar_dia_all_users() from public;
revoke execute on function public.cerrar_dia_all_users() from anon;
revoke execute on function public.cerrar_dia_all_users() from authenticated;

-- -----------------------------------------------------------------------------
-- 3) Reschedule pg_cron: cada hora en lugar de una sola vez
-- -----------------------------------------------------------------------------

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
  '0 * * * *',  -- cada hora en punto
  $$ select public.cerrar_dia_all_users(); $$
);

-- -----------------------------------------------------------------------------
-- Verificaciones
-- -----------------------------------------------------------------------------
-- select column_name, data_type, column_default
-- from information_schema.columns
-- where table_name = 'usuarios' and column_name = 'timezone';
--
-- select jobname, schedule, command
-- from cron.job where jobname = 'yourtime_cerrar_dia';
-- -> debería decir '0 * * * *'
--
-- -- Forzar ejecución manual para testear:
-- select public.cerrar_dia_all_users();
