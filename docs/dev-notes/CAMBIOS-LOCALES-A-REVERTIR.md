# Cambios para desarrollo local — REVERTIR antes de producción

Este documento registra los cambios temporales hechos para correr el proyecto
en localhost sin Docker ni PostgreSQL. Antes de hacer deploy a producción,
revertir todo lo que está aquí.

---

## CAMBIO 1 — Base de datos: SQLite → PostgreSQL

### Archivo: `apps/api/prisma/schema.prisma`

**ACTUAL (SQLite — solo local):**
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

**PRODUCCIÓN (revertir a esto):**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### También revertir los modelos: reemplazar todos los campos `String` que eran enums

En SQLite los enums no existen. En producción con PostgreSQL, restaurar las
declaraciones de enum y usarlas en los modelos. Ejemplo:

**ACTUAL (SQLite):**
```prisma
model User {
  role String @default("CLIENT")
}
```

**PRODUCCIÓN:**
```prisma
enum Role { ADMIN OPERATOR CLIENT }

model User {
  role Role @default(CLIENT)
}
```

Los enums a restaurar son:
- `Role` → campo `role` en `User`
- `ShipmentType` → campo `type` en `Shipment` y `Quote`
- `TransportMode` → campo `mode` en `Shipment` y `Quote`
- `ShipmentStatus` → campo `status` en `Shipment` y `ShipmentStatusHistory`
- `QuoteStatus` → campo `status` en `Quote`
- `DocumentType` → campo `type` en `Document`
- `PaymentStatus` → campo `status` en `Payment`
- `CustomsStatus` → campo `status` en `CustomsRecord`

---

## CAMBIO 2 — Variables de entorno

### Archivo: `apps/api/.env`

**ACTUAL (local con SQLite):**
```
DATABASE_URL="file:./prisma/dev.db"
```

**PRODUCCIÓN (revertir a esto):**
```
DATABASE_URL="postgresql://user:password@host:5432/axon_logistic"
```

### También configurar en producción:
- `STRIPE_SECRET_KEY` → clave real de Stripe (no placeholder)
- `STRIPE_WEBHOOK_SECRET` → secreto real del webhook de Stripe
- `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` → credenciales reales
- `SHIPENGINE_API_KEY` → clave real de ShipEngine
- `MAERSK_API_KEY` → clave real de Maersk
- `DHL_API_KEY` → clave real de DHL

---

## CAMBIO 3 — Archivo de base de datos local

Al correr `npm run db:push` se crea el archivo:
```
apps/api/prisma/dev.db
```
Este archivo NO debe subirse a git. Ya está en `.gitignore`.

---

## PASOS PARA PRODUCCIÓN

1. Levantar PostgreSQL (Docker o servicio cloud como Railway, Supabase, Neon)
2. Revertir `schema.prisma` a PostgreSQL con enums
3. Actualizar `DATABASE_URL` en variables de entorno
4. Configurar todas las API keys reales
5. Correr `npm run db:migrate` (no `db:push`)
6. Deploy en Railway / Vercel / VPS

---

## Fecha de este documento
Creado: 2026-04-27
Estado: ACTIVO — proyecto corriendo en SQLite local
