-- =============================================================================
-- YourTime · Migración 0001 · Esquema inicial
-- Tablas: usuarios, actividades, historial_productividad
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extensiones
-- -----------------------------------------------------------------------------
create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.tipo_actividad as enum ('tarea_unica', 'habito_ciclico');
create type public.estado_actividad as enum ('todo', 'in_progress', 'done');

-- -----------------------------------------------------------------------------
-- Tabla: usuarios
-- Perfil ligado 1:1 con auth.users. Se puebla por trigger al sign-up.
-- -----------------------------------------------------------------------------
create table public.usuarios (
  id          uuid primary key references auth.users (id) on delete cascade,
  nombre      text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

comment on table public.usuarios is 'Perfil público del usuario, vinculado 1:1 a auth.users.';

-- Trigger: al crearse un usuario en auth.users, insertamos su fila en public.usuarios.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, nombre)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Tabla: actividades
-- Tareas Únicas + Hábitos Cíclicos discriminados por `tipo`.
-- -----------------------------------------------------------------------------
create table public.actividades (
  id                       uuid primary key default gen_random_uuid(),
  usuario_id               uuid not null references public.usuarios (id) on delete cascade,
  titulo                   text not null check (char_length(titulo) between 1 and 200),
  descripcion              text check (char_length(descripcion) <= 2000),
  tipo                     public.tipo_actividad   not null,
  estado                   public.estado_actividad not null default 'todo',
  dias_semana              smallint[],
  archivada                boolean not null default false,
  pomodoros_completados    int not null default 0 check (pomodoros_completados >= 0),
  tiempo_enfoque_segundos  int not null default 0 check (tiempo_enfoque_segundos >= 0),
  in_progress_started_at   timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),

  -- Hábitos cíclicos: dias_semana obligatorio y dentro de [1..7] (ISO: 1=Lun..7=Dom)
  -- Nota: Postgres no permite subqueries en CHECK; usamos el operador `<@`
  -- ("array A contenido en array B") para validar el rango de valores.
  constraint actividades_habito_requiere_dias check (
    tipo <> 'habito_ciclico'
    or (
      dias_semana is not null
      and array_length(dias_semana, 1) between 1 and 7
      and dias_semana <@ array[1,2,3,4,5,6,7]::smallint[]
    )
  ),

  -- Tareas únicas: dias_semana debe ser NULL
  constraint actividades_tarea_sin_dias check (
    tipo <> 'tarea_unica' or dias_semana is null
  )
);

comment on table public.actividades is 'Tareas únicas y hábitos cíclicos del usuario.';
comment on column public.actividades.dias_semana is 'ISO: 1=Lunes .. 7=Domingo. Solo para tipo=habito_ciclico.';
comment on column public.actividades.in_progress_started_at is 'Timestamp del último ingreso a In Progress; usado para detectar done < 25 min.';

create index actividades_usuario_estado_idx
  on public.actividades (usuario_id, estado)
  where archivada = false;

create index actividades_usuario_tipo_idx
  on public.actividades (usuario_id, tipo);

-- Trigger updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger actividades_set_updated_at
  before update on public.actividades
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Tabla: historial_productividad
-- Una fila por (usuario, fecha). Fuente de verdad del Heatmap.
-- -----------------------------------------------------------------------------
create table public.historial_productividad (
  id                     uuid primary key default gen_random_uuid(),
  usuario_id             uuid not null references public.usuarios (id) on delete cascade,
  fecha                  date not null,
  total_planificadas     int  not null default 0 check (total_planificadas >= 0),
  total_completadas      int  not null default 0 check (total_completadas >= 0),
  pomodoros_completados  int  not null default 0 check (pomodoros_completados >= 0),
  tareas_eficientes      int  not null default 0 check (tareas_eficientes >= 0),
  porcentaje smallint generated always as (
    case
      when total_planificadas = 0 then 0
      else least(100, (100 * total_completadas / total_planificadas))::smallint
    end
  ) stored,
  created_at             timestamptz not null default now(),

  constraint historial_completadas_le_planificadas
    check (total_completadas <= total_planificadas),
  constraint historial_unique_usuario_fecha
    unique (usuario_id, fecha)
);

comment on table public.historial_productividad is 'Agregado diario de productividad por usuario. Alimenta el heatmap anual.';
comment on column public.historial_productividad.porcentaje is 'Calculado en DB: floor(100 * completadas / planificadas), cap 100.';

create index historial_usuario_fecha_idx
  on public.historial_productividad (usuario_id, fecha desc);
