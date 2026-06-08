-- =============================================================================
-- YourTime · Migración 0005 · Atomic increment de pomodoros (fix L-01)
-- Ver docs/SECURITY_AUDIT.md sección L-01.
-- =============================================================================
--
-- Antes: el cliente hacía read-then-write para incrementar el contador →
-- race window entre múltiples pestañas del mismo usuario.
-- Después: una sola sentencia UPDATE en DB, atómica.
--
-- SECURITY INVOKER → respeta RLS, solo el dueño puede actualizar su actividad.
-- search_path explícito por hardening.
-- -----------------------------------------------------------------------------

create or replace function public.increment_pomodoro(
  actividad_id    uuid,
  segundos_enfoque int default 1500
)
returns void
language sql
security invoker
set search_path = public
as $$
  update public.actividades
  set pomodoros_completados   = pomodoros_completados + 1,
      tiempo_enfoque_segundos = tiempo_enfoque_segundos + segundos_enfoque
  where id = actividad_id;
$$;

comment on function public.increment_pomodoro is
  'Increment atómico de pomodoros_completados + tiempo_enfoque_segundos. SECURITY INVOKER, RLS aplica.';

-- Control explícito de quién puede invocar (cinturón + tirantes con RLS).
revoke execute on function public.increment_pomodoro(uuid, int) from public;
revoke execute on function public.increment_pomodoro(uuid, int) from anon;
grant  execute on function public.increment_pomodoro(uuid, int) to authenticated;

-- -----------------------------------------------------------------------------
-- Verificación post-migración
-- -----------------------------------------------------------------------------
-- select grantee, privilege_type
-- from information_schema.routine_privileges
-- where routine_name = 'increment_pomodoro';
-- Debería listar SOLO `authenticated` con EXECUTE.
