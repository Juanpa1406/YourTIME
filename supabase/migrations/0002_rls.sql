-- =============================================================================
-- YourTime · Migración 0002 · Row Level Security
-- Cada usuario solo accede a sus propios datos vía auth.uid().
-- =============================================================================

-- -----------------------------------------------------------------------------
-- usuarios
-- -----------------------------------------------------------------------------
alter table public.usuarios enable row level security;

create policy "usuarios_select_self"
  on public.usuarios for select
  to authenticated
  using (id = (select auth.uid()));

create policy "usuarios_update_self"
  on public.usuarios for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Nota: INSERT se hace por el trigger handle_new_user (SECURITY DEFINER), no
-- por el cliente, así que no exponemos política de INSERT.
-- DELETE en cascada vía auth.users; no exponemos DELETE manual.

-- -----------------------------------------------------------------------------
-- actividades
-- -----------------------------------------------------------------------------
alter table public.actividades enable row level security;

create policy "actividades_select_own"
  on public.actividades for select
  to authenticated
  using (usuario_id = (select auth.uid()));

create policy "actividades_insert_own"
  on public.actividades for insert
  to authenticated
  with check (usuario_id = (select auth.uid()));

create policy "actividades_update_own"
  on public.actividades for update
  to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

create policy "actividades_delete_own"
  on public.actividades for delete
  to authenticated
  using (usuario_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- historial_productividad
-- Lectura siempre del propio usuario. Escrituras: usuario puede upsert su día
-- (el cron nocturno corre con service_role y bypasea RLS de todos modos).
-- -----------------------------------------------------------------------------
alter table public.historial_productividad enable row level security;

create policy "historial_select_own"
  on public.historial_productividad for select
  to authenticated
  using (usuario_id = (select auth.uid()));

create policy "historial_insert_own"
  on public.historial_productividad for insert
  to authenticated
  with check (usuario_id = (select auth.uid()));

create policy "historial_update_own"
  on public.historial_productividad for update
  to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

-- DELETE no expuesto: el historial es inmutable desde el cliente.

-- =============================================================================
-- Defensa en profundidad: revocar permisos por defecto al rol anon.
-- RLS ya lo cubre, pero revocar es cinturón + tirantes.
-- =============================================================================
revoke all on public.usuarios               from anon;
revoke all on public.actividades            from anon;
revoke all on public.historial_productividad from anon;
