# AXON LOGISTIC (ZYN) — Auditoría de Arquitectura y Código

> Generado: 2026-04-27 | Proyecto: ZYN — Logística Digital Centroamérica

---

## Resumen Ejecutivo

**ZYN** es una plataforma B2B SaaS de logística y comercio exterior para Centroamérica. Monorepo con Express + Next.js 14, TypeScript estricto, Prisma + PostgreSQL, Stripe, Cloudinary, ShipEngine y automatización de portales gubernamentales via Playwright.

**Estado general**: Base sólida, ~70% lista para producción. Arquitectura modular correcta, buena separación de responsabilidades. Problemas críticos en seguridad (endpoint de tracking público), integridad de datos (cascadas faltantes), rendimiento (sin índices DB) y cero tests.

---

## 1. Estructura Actual

### 1.1 Árbol de Carpetas

```
AXON LOGISTIC/
├── apps/
│   ├── api/                        # Backend Express (2.427 líneas TS)
│   │   ├── prisma/
│   │   │   └── schema.prisma       # Schema DB (306 líneas, 11 modelos, 9 enums)
│   │   └── src/
│   │       ├── automation/         # Automatización SIGIE/MAGA con Playwright
│   │       ├── controllers/        # Handlers HTTP (5 archivos)
│   │       ├── data/               # Tablas de códigos HS y aduanas
│   │       ├── integrations/       # APIs externas (Maersk, DHL, Stripe, Cloudinary, ShipEngine)
│   │       ├── middleware/         # Auth, errores, uploads
│   │       ├── models/             # Capa de acceso a datos Prisma
│   │       ├── routes/             # Definición de rutas REST (9 archivos)
│   │       ├── services/           # Lógica de negocio (10 archivos)
│   │       └── utils/              # JWT, logging, clases de error
│   ├── web/                        # Frontend Next.js 14 (52 archivos)
│   │   └── src/
│   │       ├── app/                # App Router: páginas y layouts
│   │       ├── components/         # Componentes React (15+ archivos)
│   │       ├── hooks/              # Custom hooks (9 hooks)
│   │       └── lib/                # API client (axios), utilidades de auth
│   ├── store/                      # Zustand store de autenticación
│   └── mobile/                     # Placeholder (futuro)
├── packages/
│   ├── shared/                     # Tipos compartidos (vacío)
│   └── ui/                         # Librería UI (vacío)
├── docs/                           # Documentación (aduanas, apis, dev-notes, legal)
├── infra/
│   ├── backup/                     # Scripts de backup
│   ├── docker/                     # Configuración Docker
│   └── nginx/                      # Reverse proxy Nginx
├── CLAUDE.md                       # Documentación del proyecto
├── turbo.json                      # Pipeline Turborepo
└── package.json                    # Config raíz del monorepo
```

### 1.2 Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Monorepo | Turborepo + npm workspaces | ^2.0.0 |
| Backend | Node.js + Express | ≥18.0.0 / ^4.19.2 |
| ORM | Prisma | ^5.12.0 |
| Base de datos | PostgreSQL | — |
| Frontend | Next.js (App Router) | ^14.2.35 |
| React | React + React DOM | ^18.2.0 |
| Estado global | Zustand + TanStack React Query | ^4.5.2 / ^5.29.0 |
| Validación | Zod | ^3.22.4 (front y back) |
| Estilos | Tailwind CSS | ^3.4.3 |
| Componentes | shadcn/ui + Radix UI | — |
| Autenticación | JWT + bcryptjs | ^9.0.2 / ^2.4.3 |
| Pagos | Stripe | ^15.3.0 |
| Almacenamiento | Cloudinary | ^2.2.0 |
| Tracking | ShipEngine API | — |
| Automatización | Playwright | ^1.44.0 |
| Logging | Winston | ^3.13.0 |

---

## 2. Análisis del Backend (`apps/api`)

### 2.1 Patrón Arquitectónico: MVC + Service Layer

```
routes/ → controllers/ → services/ → models/ → Prisma → PostgreSQL
                       ↘ integrations/ (APIs externas)
middleware/ → auth, errores, uploads
```

Separación de responsabilidades correcta y consistente.

### 2.2 Rutas y Endpoints (40+)

| Módulo | Ruta base | Endpoints | Auth |
|--------|-----------|-----------|------|
| Auth | `/api/auth` | register, login, refresh, logout | Público (register/login) |
| Users | `/api/users` | me, profile | ✓ |
| Quotes | `/api/quotes` | CRUD + convert | ✓ |
| Shipments | `/api/shipments` | CRUD + status | ✓ |
| Documents | `/api/documents` | upload, list, delete, view | ✓ |
| Tracking | `/api/tracking` | lookup, events, sync, manual | ⚠️ GET público |
| Payments | `/api/payments` | initiate, history, webhook | ✓ (webhook: firma Stripe) |
| Customs | `/api/customs` | requirements (público), CRUD | Mixto |
| Stats | `/api/stats` | dashboard, report | ✓ |
| Food Import | `/api/food-imports` | CRUD + SIGIE automation | ✓ |

### 2.3 Manejo de Errores

**Bien implementado**:
- Clase `AppError` para errores operacionales
- `asyncHandler` que captura errores async y los pasa a `next()`
- Middleware `errorHandler` que separa errores operacionales de internos
- Stack traces logueados via Winston, nunca expuestos al cliente

**Faltante**:
- Sin logging de intentos de auth fallidos
- Sin trazabilidad de request (request ID)

### 2.4 Rutas sin Protección de Auth

| Endpoint | Riesgo | Acción |
|----------|--------|--------|
| `GET /api/tracking/:trackingNumber` | 🔴 CRÍTICO — enumeración de envíos | Autenticar o usar tokens opacos |
| `GET /api/customs/requirements/:hsCode` | 🟢 OK | Datos de referencia pública |
| `POST /api/auth/register` / `POST /api/auth/login` | 🟢 OK | Intencional |
| `POST /api/payments/webhook` | 🟢 OK | Valida firma de Stripe |

### 2.5 Queries N+1 Potenciales en Prisma

`shipmentModel.findById()` hace `include` de 6 relaciones simultáneas:
```typescript
include: {
  documents: true,
  trackingEvents: { orderBy: { occurredAt: 'desc' } },
  payment: true,
  customsRecord: true,
  statusHistory: { orderBy: { createdAt: 'asc' } },
  quote: true
}
```
Prisma genera JOINs eficientes — aceptable. Sin N+1 real detectado.

**Pendiente de verificar**: `documentService.getByShipment()` y `trackingService.getEvents()` cargan sin límite.

### 2.6 Validación con Zod

**Con cobertura**:
- ✓ `auth.controller.ts` — registerSchema, loginSchema
- ✓ `quote.controller.ts` — createSchema con enums de tipo
- ✓ `shipment.controller.ts` — updateStatusSchema
- ✓ `document.controller.ts` — typeSchema
- ✓ `food-import.routes.ts` — múltiples esquemas

**Sin cobertura**:
- ⚠️ `customsService.createRecord()` — acepta `req.body` sin validar
- ⚠️ `tracking.service.addManualEvent()` — sin validación de status/descripción
- ⚠️ `stats.routes.ts` — parsing suelto: `new Date((req.query.from as string) ?? ...)`

### 2.7 Variables de Entorno No Tipadas

No existe validación de entorno al arrancar. Acceso directo a `process.env` sin verificar:

```typescript
// apps/api/src/utils/jwt.ts
const JWT_SECRET = process.env.JWT_SECRET!;  // Non-null assertion, sin validación real
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || JWT_SECRET + '_refresh'; // Derivación débil

// apps/api/src/integrations/maersk.ts
headers: { 'Consumer-Key': process.env.MAERSK_API_KEY }  // Puede ser undefined

// apps/api/src/services/food-import.service.ts
const sigieUser = process.env.SIGIE_USERNAME;  // Sin verificar
```

**Variables requeridas** (de `.env.example`):
```
DATABASE_URL, JWT_SECRET, JWT_EXPIRES_IN, REFRESH_TOKEN_SECRET
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
SHIPENGINE_API_KEY, MAERSK_API_KEY, DHL_API_KEY
SIGIE_USERNAME, SIGIE_PASSWORD
NEXT_PUBLIC_APP_URL, PORT, NODE_ENV
```

### 2.8 Schema Prisma — Análisis Completo

**Ubicación**: `apps/api/prisma/schema.prisma` (306 líneas)

**Enums** (9): `Role`, `ShipmentType`, `TransportMode`, `ShipmentStatus`, `QuoteStatus`, `DocumentType`, `PaymentStatus`, `CustomsStatus`, `FoodImportStatus`

**Modelos** (11):

| Modelo | Campos | Relaciones | Problemas |
|--------|--------|-----------|-----------|
| `Company` | 6 | users (1:Many) | Sin `@unique` en taxId+country |
| `User` | 8 | company, tokens, shipments, etc. | Sin `onDelete` en companyId |
| `RefreshToken` | 4 | user | ✓ onDelete: Cascade |
| `Quote` | 10 | user, shipments | Sin `onDelete` en userId |
| `Shipment` | 13 | user, quote, docs, tracking... | Sin `onDelete` en relaciones clave |
| `ShipmentStatusHistory` | 4 | shipment | Sin `onDelete` |
| `Document` | 8 | shipment, uploadedBy | Sin `onDelete` |
| `TrackingEvent` | 6 | shipment | Sin `onDelete` |
| `Payment` | 11 | shipment, user | Sin `onDelete` |
| `CustomsRecord` | 8 | shipment | ✓ @unique shipmentId; sin `onDelete` |
| `FoodImport` | 32 | shipment, user | Sin `onDelete`; modelo muy grande |

---

## 3. Análisis del Frontend (`apps/web`)

### 3.1 Estructura de Rutas

**Auth** (`/app/(auth)/`):
- `/login` — React Hook Form + Zod ✓
- `/register` — Existe

**Dashboard** (`/app/(dashboard)/`):
- `/dashboard` — KPIs
- `/shipments` — Lista con filtros
- `/shipments/[id]` — Detalle
- `/shipments/[id]/documents` — Gestor de documentos
- `/shipments/[id]/tracking` — Timeline de tracking
- `/shipments/[id]/customs` — Checklist aduanas
- `/quotes/new` — Nueva cotización
- `/quotes` — Lista
- `/food-import` — Lista importaciones de alimentos
- `/food-import/new` — Crear (upload CFDI XML)
- `/food-import/[id]` — Detalle
- `/payments/[shipmentId]` — Stripe Checkout
- `/payments/success` — Confirmación
- `/payments/history` — Historial
- `/reports` — Exportar reportes

**Públicas**:
- `/` — Landing page
- `/tracking` — Búsqueda de tracking pública
- `/customs/guide` — Guía de aduanas

### 3.2 Estado Global

**Zustand** (`apps/web/src/store/authStore.ts`):
- Almacena: user, token, refreshToken, isAuthenticated
- Persist middleware hacia localStorage ✓
- Enfocado solo en auth ✓

**React Query** (9 custom hooks):
- `useAuth()`, `useShipments()`, `useQuotes()`, `useTracking()`, `useFoodImport()`, `useDocuments()`, `usePayments()`, `useCustoms()`, `useStats()`
- Configuración global: `retry: 1, staleTime: 60_000`
- Invalidación correcta en mutations ✓

**Problema**: Token duplicado en Zustand Y localStorage — inconsistencia en multi-tab.

### 3.3 Cliente API

```typescript
// apps/web/src/lib/api.ts
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
});

// Agrega Bearer token desde localStorage en cada request
api.interceptors.request.use(...)

// En 401: limpia auth y redirige a /login con window.location.href (hard redirect)
api.interceptors.response.use(...)
```

**Problema**: Hard redirect con `window.location.href` pierde estado de React. Usar `router.push()`.

**Faltante**: Lógica de refresh token automático (cuando access token expira, el usuario es expulsado).

### 3.4 Protección de Rutas

**No existe `middleware.ts` de Next.js**. Las rutas del dashboard no están protegidas a nivel de servidor.

Workaround actual: hooks individuales verifican `isAuthenticated`, causando flash de página antes del redirect.

### 3.5 Validación de Formularios

- Login: React Hook Form + Zod ✓
- Problema: `password: z.string().min(1)` en frontend vs `min(8)` en backend — inconsistencia

### 3.6 Accesibilidad

- Sidebar sin `aria-current="page"` en links activos
- Sin `scope` en `<th>` de tablas
- Indicadores de estado solo por color (sin texto alternativo)
- Sin link "skip to content"

---

## 4. Base de Datos

### 4.1 Índices Faltantes

```prisma
model Shipment {
  @@index([userId])
  @@index([status])
  @@index([trackingNumber])
  @@index([createdAt])
  @@index([userId, status])   // Compuesto para filtros habituales
}

model FoodImport {
  @@index([userId])
  @@index([status])
  @@index([shipmentId])
}

model Payment {
  @@index([userId])
  @@index([status])
  @@index([createdAt])
}
```

### 4.2 Relaciones sin `onDelete`

Riesgo: registros huérfanos si se elimina un usuario o envío.

```prisma
// ACTUAL (peligroso):
model Shipment {
  user User @relation(fields: [userId], references: [id])
}

// CORRECTO:
model Shipment {
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Todas las FK sin cascada**:
- `User.companyId` → Company
- `Quote.userId` → User
- `Shipment.userId` / `Shipment.quoteId` → User / Quote
- `ShipmentStatusHistory.shipmentId` → Shipment
- `Document.shipmentId` / `Document.uploadedById`
- `TrackingEvent.shipmentId`
- `Payment.shipmentId` / `Payment.userId`
- `CustomsRecord.shipmentId`
- `FoodImport.shipmentId` / `FoodImport.userId`

### 4.3 Campos que Deberían ser Únicos

- `FoodImport.sigieRequestNumber` — El SIGIE asigna números únicos
- `Document.publicId` — ID de Cloudinary es único
- `Company.taxId` + `country` — Restricción compuesta por país
- `Shipment.trackingNumber` — Actualmente opcional, debería ser @unique cuando existe

---

## 5. Seguridad

### 5.1 Endpoint de Tracking Público 🔴 CRÍTICO

```
GET /api/tracking/:trackingNumber  →  Sin autenticación
```

Cualquier persona puede rastrear envíos adivinando números de tracking. Permite enumeración masiva.

**Soluciones** (orden de preferencia):
1. Requerir autenticación
2. Usar tokens opacos/aleatorios en lugar de números secuenciales
3. Rate limiting agresivo + logging de accesos

### 5.2 Autenticación JWT

**Bueno**:
- bcrypt con 12 rounds
- Refresh token con secret separado
- Access token 7d, Refresh token 30d
- Contraseñas excluidas de respuestas via `sanitizeUser()`

**Problemas**:
- Si `REFRESH_TOKEN_SECRET` no está seteado, deriva del JWT_SECRET (débil)
- Sin rotación de refresh tokens (mismo token válido 30 días)
- Sin flujo de recuperación de contraseña
- Sin límite de intentos fallidos

### 5.3 CORS

```typescript
app.use(cors({
  origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  credentials: true
}));
```

✓ Origen único, sin wildcard. ✓ credentials: true.
⚠️ Usa variable de frontend para config de backend — debería ser `CORS_ORIGIN` separada.

### 5.4 Sin Rate Limiting

No hay `express-rate-limit`. Vulnerable a:
- Fuerza bruta en login
- Enumeración de tracking numbers
- Abuso de cuotas de APIs externas

### 5.5 Credenciales SIGIE en Variables de Entorno Planas

`SIGIE_USERNAME` y `SIGIE_PASSWORD` accesibles en texto plano. Para producción: AWS Secrets Manager, HashiCorp Vault, o similar.

### 5.6 Sin Headers de Seguridad CSP

`helmet` instalado pero sin configuración explícita de Content Security Policy.

---

## 6. Performance

### 6.1 Sin Índices en Base de Datos

Las queries más frecuentes (listar envíos por usuario, filtrar por estado) hacen full table scan. Crítico al crecer.

### 6.2 Operaciones Lentas

| Operación | Causa | Impacto |
|-----------|-------|---------|
| `POST /food-imports/:id/sigie-submit` | Playwright lanza browser real | 3-10s, bloquea HTTP |
| `POST /quotes/` | Llama 3 APIs externas en secuencia | 2-5s |
| CFDI XML parsing | @xmldom + regex fallback | Lento en documentos grandes |

Recomendación para SIGIE: mover a cola de tareas en background (BullMQ, Inngest).

### 6.3 Sin Caché

- Lookups de códigos HS recalculados en cada request (datos estáticos)
- `ioredis` importado pero no usado
- Sin caché de respuestas de APIs de carriers

### 6.4 Sin Límite en Algunas Queries

- `documentService.getByShipment()` — carga TODOS los documentos
- `trackingService.getEvents()` — carga TODOS los eventos
- `stats.routes.ts` — rango de fechas sin límite máximo

---

## 7. Plan de Mejoras Priorizadas

### 🔴 CRÍTICO — Bloquea producción

| # | Mejora | Archivo(s) | Tiempo est. |
|---|--------|-----------|-------------|
| C1 | Proteger `GET /api/tracking/:trackingNumber` | `apps/api/src/routes/tracking.routes.ts` | 2h |
| C2 | Agregar cascadas `onDelete` en schema Prisma | `apps/api/prisma/schema.prisma` | 3h |
| C3 | Rate limiting en auth y tracking | `apps/api/src/index.ts` | 2h |
| C4 | Validar variables de entorno al arrancar (Zod) | `apps/api/src/config/env.ts` (nuevo) | 3h |
| C5 | Agregar índices DB faltantes | `apps/api/prisma/schema.prisma` | 2h |
| C6 | Middleware Next.js para proteger rutas dashboard | `apps/web/src/middleware.ts` (nuevo) | 3h |

### 🟠 ALTO — Impacto directo en calidad y seguridad

| # | Mejora | Archivo(s) | Tiempo est. |
|---|--------|-----------|-------------|
| A1 | Rotación de refresh tokens | `apps/api/src/services/auth.service.ts` | 4h |
| A2 | Flujo de recuperación de contraseña | Nuevo route + service + email template | 1 día |
| A3 | Zod en endpoints sin cobertura (customs, tracking manual, stats) | 3 archivos | 4h |
| A4 | Logging de requests (audit trail) | Middleware nuevo en API | 3h |
| A5 | Mover SIGIE submission a cola async | BullMQ o similar | 2 días |
| A6 | Consistencia min. longitud password (front = back) | `apps/web/src/app/(auth)/login/page.tsx` | 30min |
| A7 | Refresh token automático en cliente axios | `apps/web/src/lib/api.ts` | 4h |

### 🟡 MEDIO — Calidad y mantenibilidad

| # | Mejora | Archivo(s) | Tiempo est. |
|---|--------|-----------|-------------|
| M1 | CSP headers con helmet | `apps/api/src/index.ts` | 1h |
| M2 | Caché Redis para lookups HS codes | Nueva integración | 4h |
| M3 | Paralelizar llamadas a APIs de carriers en quotes | `apps/api/src/services/quote.service.ts` | 3h |
| M4 | Paginación en documentos y tracking events | 2 services | 3h |
| M5 | ARIA en sidebar, tablas y estados | `apps/web/src/components/` | 1 día |
| M6 | Mover token a HTTP-only cookie (más seguro que localStorage) | Front + Back | 2 días |
| M7 | `@unique` en FoodImport.sigieRequestNumber y Document.publicId | Schema Prisma | 1h |

### 🟢 BAJO — Deuda técnica

| # | Mejora | Tiempo est. |
|---|--------|------------|
| B1 | Tests unitarios e integración (Jest + Supertest) | En curso |
| B2 | CI/CD con GitHub Actions | 1 día |
| B3 | Sentry para error tracking | 2h |
| B4 | OpenAPI/Swagger docs | 1 día |
| B5 | Activar packages compartidos (`packages/shared`, `packages/ui`) | 2 días |
| B6 | i18n (multiidioma, base en español) | 3 días |

---

## 8. Inventario de Archivos

| Área | Archivos | Líneas aprox. |
|------|----------|---------------|
| Backend total | — | 2.427 |
| — Routes | 9 | ~400 |
| — Controllers | 5 | ~500 |
| — Services | 10 | ~800 |
| — Models | 2 | ~100 |
| — Middleware | 3 | ~100 |
| — Integrations | 5 | ~300 |
| — Utils/Automation | ~5 | ~250 |
| Frontend | 52 archivos | — |
| — Pages | 20+ | ~2.000 |
| — Components | 15+ | ~1.500 |
| — Hooks | 9 | ~600 |
| — Lib | 3 | ~200 |
| Schema Prisma | 1 | 306 |
| **Total estimado** | | **~7.500** |

---

## Conclusión

ZYN tiene una base de código sólida con buenas decisiones arquitectónicas: TypeScript estricto, separación de responsabilidades, Zod en endpoints críticos, React Query para data fetching, y flujos de negocio complejos bien modelados (SIGIE, CFDI, Stripe, multi-carrier).

**Para producción, prioridad inmediata**:
1. Proteger el endpoint de tracking (C1)
2. Rate limiting en auth (C3)
3. Cascadas en Prisma (C2)
4. Índices en DB (C5)
5. Validar entorno al arrancar (C4)
6. Middleware de rutas en Next.js (C6)

Estas 6 acciones (estimado: 2 días de trabajo) llevan el proyecto a un nivel seguro para lanzar.
