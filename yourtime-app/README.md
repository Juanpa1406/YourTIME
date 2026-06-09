# yourtime-app

This is the Vite app inside the YourTime monorepo.

For project overview, setup instructions, tech stack and architecture, see the [root README](../README.md).

## Quick start

```bash
pnpm install
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
pnpm dev
```

## Available scripts

| Script | What it does |
|---|---|
| `pnpm dev` | Start Vite dev server on `localhost:5173` |
| `pnpm build` | Type-check + production build to `dist/` |
| `pnpm exec tsc -b` | Type-check only |
| `pnpm lint` | Run ESLint |
| `pnpm preview` | Serve the production build locally |
