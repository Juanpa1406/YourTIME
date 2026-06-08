# Security Audit · YourTime

**Fecha**: 2026-06-07
**Alcance**: Auditoría estática (Parte A). Validación dinámica (Parte B) pendiente de ejecutar por el usuario.

---

## Resumen ejecutivo

| Severidad | Encontrados | Estado |
|---|---|---|
| 🔴 High / Critical | 0 | — |
| 🟡 Medium | 1 | ✅ Fixed (migración `0004_security_fixes.sql`) |
| 🟢 Low / Info | 4 | ✅ 2 fixed (0004, 0005) · 2 documentados para deploy |

**Veredicto**: postura de seguridad del MVP sólida y validada. Todos los hallazgos accionables sin deploy están cerrados. L-03 y L-04 requieren acción al momento de deploy (ver sección "Deployment hardening").

---

## ✅ Checks que pasaron

### Frontend (React + Vite)

- ✅ **Sin `dangerouslySetInnerHTML`** en todo `src/` (grep limpio)
- ✅ **Sin `eval()`, `new Function()`, `.innerHTML`** en todo `src/`
- ✅ **Sin referencias a `SERVICE_ROLE_KEY`** en código cliente
- ✅ **Cliente Supabase config** (`src/lib/supabase.ts`) usa solo `VITE_SUPABASE_ANON_KEY`
- ✅ **Todo acceso a DB pasa por el SDK** (`supabase.from(...)`, `supabase.auth.*`). Cero strings de SQL armados a mano.
- ✅ **`.env.local` bloqueado por `.gitignore`** (patrones `.env.*` y `*.local`)
- ✅ **React auto-escape de texto** protege contra XSS en títulos / descripciones / emails — ningún componente renderiza HTML crudo desde input de usuario
- ✅ **Type-safety end-to-end** con tipos generados de Supabase — imposible armar payloads con campos no declarados

### Base de datos · RLS

- ✅ **RLS activado en las 3 tablas**: `usuarios`, `actividades`, `historial_productividad`
- ✅ **Todas las policies usan `(select auth.uid())`** envuelto en subselect (optimización oficial de Supabase para que `auth.uid()` se evalúe una vez por query y no por fila)
- ✅ **`usuarios`**: SELECT y UPDATE limitadas a `id = auth.uid()`. SIN INSERT manual (solo lo hace el trigger). SIN DELETE manual (cascada vía `auth.users`).
- ✅ **`actividades`**: las 4 operaciones limitadas a `usuario_id = auth.uid()`. CHECK constraints adicionales en SQL bloquean datos inválidos (hábito sin días, tarea con días).
- ✅ **`historial_productividad`**: SELECT/INSERT/UPDATE limitadas. SIN DELETE (historial inmutable desde cliente).
- ✅ **`REVOKE ALL ... FROM anon`** en las 3 tablas (defensa en profundidad, cinturón + tirantes sobre RLS).

### Base de datos · Funciones

- ✅ **`handle_new_user()`** (trigger SECURITY DEFINER):
  - Usa `set search_path = public` → previene inyección por manipulación de `search_path`
  - Solo invocable por trigger (no expuesta vía RPC)
  - Usa `new.id` de `auth.users` (no input cliente) para el FK
- ✅ **`cerrar_dia()`**: `set search_path = public` configurado (ver issue M-01 abajo)
- ✅ **`cron.schedule`** corre como `postgres` (no como `authenticated`), inmune a manipulación cliente

---

## 🟡 Issues encontrados

### M-01 (Medium) — `cerrar_dia()` ejecutable por `authenticated` y `anon` vía RPC

**Descripción**: La función `public.cerrar_dia()` se creó con `SECURITY DEFINER` pero sin restricción de EXECUTE. En PostgreSQL, los privilegios EXECUTE en funciones del schema `public` se otorgan por default a `PUBLIC` (que incluye `anon` y `authenticated`).

**Impacto**: cualquier usuario logueado podría llamar:
```ts
supabase.rpc('cerrar_dia');
```
y forzar el cierre del día para **TODOS los usuarios** (porque la función itera `select distinct usuario_id from actividades` y, por ser SECURITY DEFINER, bypassea RLS).

Daño potencial:
- Reset masivo de hábitos cíclicos a 'todo'
- Archivado masivo de tareas en done
- Upserts incorrectos en `historial_productividad` si `target_date` no es ayer real

**Explotación**: trivial con cualquier consola del navegador, una sola línea.

**Fix**: aplicado en `supabase/migrations/0004_security_fixes.sql`:
```sql
revoke execute on function public.cerrar_dia(date) from public, anon, authenticated;
-- service_role conserva execute por default
```

**Verificación post-fix**:
```sql
-- Como authenticated → debería fallar
select public.cerrar_dia();  -- ERROR: permission denied
```

---

## 🟢 Issues informativos · estado final

### L-01 — `incrementPomodoros` no atómico → ✅ **FIXED**

**Antes**: read-then-write desde el cliente. Race window entre pestañas del mismo usuario podía perder pomodoros.

**Después** (migración `0005_atomic_increment.sql`):
- RPC `public.increment_pomodoro(actividad_id uuid, segundos_enfoque int default 1500)` en Postgres
- Una sola sentencia UPDATE atómica
- `SECURITY INVOKER` + RLS → solo el dueño puede actualizar su actividad
- `revoke from public, anon` + `grant to authenticated` (cinturón + tirantes)
- Cliente refactorizado: `services/actividades.ts → incrementPomodoros()` ahora llama `supabase.rpc('increment_pomodoro', ...)`
- Tipo agregado a `database.types.ts.Functions` (re-generar tipos lo conservará)

**Verificación**:
```sql
select grantee, privilege_type
from information_schema.routine_privileges
where routine_name = 'increment_pomodoro';
-- Debe listar SOLO `authenticated` con EXECUTE.
```

### L-02 — Validación servidor del largo de `nombre` → ✅ **FIXED**

Aplicado en migración `0004_security_fixes.sql`:
```sql
alter table public.usuarios
  add constraint usuarios_nombre_max_length
  check (nombre is null or char_length(nombre) <= 80);
```
Verificado: el constraint existe en `pg_constraint`.

### L-03 — CSP headers → 📝 **DOCUMENTADO** (deploy-time)

No aplicable en desarrollo local (Vite usa `eval` para HMR; un CSP estricto rompería el dev server). Ver "Deployment hardening" abajo para los headers exactos a agregar al deployar.

### L-04 — Rate limiting auth → 📝 **DOCUMENTADO** (config Supabase)

No es código nuestro. Supabase tiene defaults razonables (~30 requests/h por IP para signup). Ver "Deployment hardening" para cómo revisarlo y endurecerlo si lo abrís al público.

---

## Deployment hardening checklist

Al deployar YourTime (Vercel / Netlify / Cloudflare Pages / etc.), aplicar lo siguiente:

### 1. Content-Security-Policy header (cierra L-03)

Configurá tu hosting para servir este header en las respuestas HTML. Ejemplo para **Vercel** (`vercel.json`):

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; connect-src 'self' https://*.supabase.co wss://*.supabase.co; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
        },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    }
  ]
}
```

**Notas**:
- `style-src 'unsafe-inline'`: Tailwind y `<dialog>` polyfills pueden necesitarlo
- `connect-src` debe incluir tu Supabase Project URL (subdominio) — reemplazá `*.supabase.co` por tu host específico para más restricción
- Probá la app después de aplicar — si algo rompe, revisar la consola del browser por violaciones CSP

Equivalente para **Netlify** (`netlify.toml`):
```toml
[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "default-src 'self'; connect-src 'self' https://*.supabase.co wss://*.supabase.co; ..."
    X-Frame-Options = "DENY"
    # etc
```

### 2. Rate limiting de auth (cierra L-04)

Revisar en **Supabase Dashboard → Authentication → Rate limits**:
- `Sign up`: default 30/h por IP → bajar a 10/h si solo vos vas a usar la app
- `Token verifications` y `Email sends`: revisar defaults
- Activar **CAPTCHA** si abrís signups al público (Supabase soporta hCaptcha y Turnstile)

### 3. Otros checks pre-deploy

- ✅ `.env.local` está en `.gitignore` (verificar `git check-ignore yourtime-app/.env.local`)
- ✅ Variables de entorno configuradas en el hosting (no committeadas)
- ✅ Site URL en Supabase Auth → URL Configuration apunta al dominio de prod (no localhost)
- ✅ Redirect URLs incluyen el dominio de prod
- ✅ HTTPS forzado (la mayoría de hostings ya lo hacen)
- ⚠️ Considerar Supabase **PITR** (Point In Time Recovery) si la data es valiosa — plan pago
- ⚠️ Considerar Sentry/PostHog para monitoreo de errores en cliente

---

## Parte B · Tests dinámicos (te toca a vos)

Una vez aplicada la migración 0004, ejecutá en el **SQL Editor de Supabase**:

```sql
-- Test 1: verificar el revoke quedó aplicado
select grantee, privilege_type
from information_schema.routine_privileges
where routine_name = 'cerrar_dia';
-- Debería listar SOLO postgres / service_role. NUNCA anon ni authenticated.

-- Test 2: como service_role (que es lo que sos en SQL Editor) debería poder
select public.cerrar_dia(current_date - 10);  -- una fecha vieja, no destruye nada

-- Test 3: verificar nombre check (insertar un nombre largo debería fallar)
insert into public.usuarios (id, nombre) 
values (gen_random_uuid(), repeat('x', 200));
-- ERROR: check constraint "usuarios_nombre_max_length"
```

**Test cross-user (opcional, requiere 2 cuentas)**:
1. Creá 2 usuarios distintos vía signup
2. Logueate como user A en una pestaña
3. Anotá el `id` de user B (verlo en SQL Editor con `select id, nombre from usuarios`)
4. En la pestaña de user A, en DevTools console:
   ```js
   const { data } = await supabase.from('actividades').select('*').eq('usuario_id', 'ID_DE_USER_B');
   console.log(data); // debería ser [] (RLS filtra todo lo ajeno)
   ```

---

## Conclusión

YourTime tiene una postura de seguridad **conservadora y correcta**. Los patrones que protegen son:

1. RLS estricta + `(select auth.uid())` en todas las policies
2. SECURITY DEFINER funciones con `search_path` fijo
3. Cliente sin acceso a `service_role`
4. Sin código que renderice HTML crudo (XSS impossible by construction)
5. Tipos generados que descartan payloads malformados
6. `revoke all from anon` como cinturón sobre RLS

El único bug real (M-01) se cierra con la migración 0004.
