-- =============================================================================
-- YourTime · Migración 0004 · Security fixes (auditoría F5-T02)
-- Ver docs/SECURITY_AUDIT.md para contexto completo.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- M-01 · cerrar_dia() no debe ser ejecutable por usuarios autenticados.
-- Es SECURITY DEFINER y bypassea RLS — si un cliente puede llamarla por RPC,
-- puede forzar el cierre del día para todos los usuarios.
-- -----------------------------------------------------------------------------

revoke execute on function public.cerrar_dia(date) from public;
revoke execute on function public.cerrar_dia(date) from anon;
revoke execute on function public.cerrar_dia(date) from authenticated;

-- service_role conserva execute (postgres y owner siempre lo tienen).
-- pg_cron corre como postgres → el agendado sigue funcionando.

comment on function public.cerrar_dia is
  'INTERNAL · solo invocable por pg_cron o service_role. Revoke aplicado en migración 0004.';

-- -----------------------------------------------------------------------------
-- L-02 · CHECK de largo en usuarios.nombre (el cliente ya limita, pero un
-- payload armado a mano podría meter texto enorme).
-- -----------------------------------------------------------------------------

alter table public.usuarios
  add constraint usuarios_nombre_max_length
  check (nombre is null or char_length(nombre) <= 80);

-- -----------------------------------------------------------------------------
-- Verificación post-migración (queries de referencia, no ejecutan acá)
-- -----------------------------------------------------------------------------
-- select grantee, privilege_type
-- from information_schema.routine_privileges
-- where routine_name = 'cerrar_dia';
--
-- select conname, pg_get_constraintdef(oid)
-- from pg_constraint
-- where conrelid = 'public.usuarios'::regclass;
