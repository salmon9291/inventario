# Catálogo de Inventario

Aplicación web para controlar productos, existencias y rentabilidad de una tienda.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/inventario-catalogo` — aplicación React/Vite y catálogo principal.
- `artifacts/api-server/src/routes/products.ts` — endpoints CRUD y resumen del catálogo.
- `lib/api-spec/openapi.yaml` — contrato fuente de la API.
- `lib/db/src/schema/products.ts` — tabla y tipos de productos.

## Architecture decisions

- El contrato OpenAPI es la fuente única para generar hooks del cliente y validadores del servidor.
- Los precios se almacenan como `numeric` con modo numérico para cálculos monetarios en la interfaz.
- La existencia se mantiene como entero y el resumen calcula valor de inventario y utilidad proyectada en SQL.

## Product

- Catálogo inicial con alta, edición y eliminación de productos.
- Búsqueda por nombre/SKU, filtro por categoría y visualización de alertas de bajo stock.
- Resumen de productos, unidades, valor a costo y utilidad proyectada en MXN.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
