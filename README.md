# Axon Logistic

Plataforma SaaS de gestión logística para Centroamérica.

## Stack

- **API:** Node.js + Express + TypeScript + Prisma
- **Web:** Next.js 14 + Tailwind CSS + shadcn/ui
- **DB:** PostgreSQL
- **Monorepo:** Turborepo

## Inicio Rápido

```bash
# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env

# Desarrollo
npm run dev
```

## Estructura

```
apps/api    → Backend REST API
apps/web    → Frontend Next.js
packages/   → Código compartido
docs/       → Documentación
infra/      → Docker y configuración
```
