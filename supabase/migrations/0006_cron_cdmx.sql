-- =============================================================================
-- YourTime · Migración 0006 · Cambio de zona horaria del cron a CDMX
-- México NO usa DST desde 2022 → CDMX está fija en UTC-6 todo el año.
-- 00:00 CDMX = 06:00 UTC.
-- =============================================================================

-- Borrar el agendado anterior (estaba a 03:00 UTC = ART)
do $$
declare
  jobid_to_remove bigint;
begin
  select jobid into jobid_to_remove from cron.job where jobname = 'yourtime_cerrar_dia';
  if jobid_to_remove is not null then
    perform cron.unschedule(jobid_to_remove);
  end if;
end $$;

-- Re-agendar a 06:00 UTC = 00:00 CDMX
select cron.schedule(
  'yourtime_cerrar_dia',
  '0 6 * * *',
  $$ select public.cerrar_dia(); $$
);

-- Verificación: select jobname, schedule from cron.job where jobname = 'yourtime_cerrar_dia';
-- Debería listar schedule = '0 6 * * *'.
