# Estado del Proyecto — AXON LOGISTIC / ZYN
**Fecha:** 30 de abril de 2026  
**Repositorio:** `ricardosagastumegon/ZYNGTT` — rama `main`  
**Deploy:** Railway (API) + Vercel (Web) — Supabase PostgreSQL

---

## Resumen ejecutivo

El proyecto está en **estado funcional parcial**. El flujo core de importación MX→GT existe de extremo a extremo en código, con la automatización SIGIE/SAT implementada pero pendiente de validar en producción (requiere Chromium en Railway). La base de datos está conectada en Supabase. En esta sesión se completó una auditoría de 32 problemas y se corrigieron 27.

**Completitud estimada: ~72%**

---

## Lo que está completo y funcionando

### Backend (API)
- Auth completo: registro, login, refresh token, logout, roles (SUPERADMIN / ADMIN / EMPRESA / AGENTE / TRANSPORTISTA)
- CFDI parser: extrae UUID real del TimbreFiscalDigital, nombre del producto vía NoIdentificacion, NIT importador de numRegIdTrib, mercancias con kg y valor USD
- Flujo importación MX→GT: parseo CFDI → transporte → generación PDFs → fito MX → SIGIE → DUCA-D
- Generación de documentos PDF: Carta Porte MX, Carta Porte GT, Packing List — subida a Cloudinary
- Catálogo de transporte: CRUD completo de TransportEmpresa, Piloto, Cabezal, Caja
- Automatización SIGIE: bot Playwright implementado, cola BullMQ con Redis opcional
- Automatización SAT: bot Playwright implementado, bloqueado por checklist
- Credenciales cifradas: AES-256-CBC en UserCredentials
- Checklist 3 etapas: Stage 1 (docs) → Stage 2 (SIGIE por producto) → Stage 3 (DUCA-D)
- Rate limiting: loginLimiter + registerLimiter + generalLimiter (ahora montado)
- CORS: bloqueando orígenes no permitidos (corregido hoy)
- Pagos Stripe: webhook, payment intent, historial paginado
- Tracking: eventos con take:100, sync desde ShipEngine

### Frontend (Web)
- Wizard 6 pasos completo: CFDI → Transporte → Documentos → Fito MX → SIGIE → Confirmar
- Sidebar con menú por rol para los 5 roles
- Hamburger menu en móvil
- authStore persiste user + token + rehidrata al recargar (corregido hoy)
- Interceptor de API con refresh token automático antes de redirigir a /login
- Panel transportista: tabs Pilotos / Cabezales / Cajas / Envíos, selector de empresa
- Panel admin: CRUD de catálogo de transporte
- Lista de expedientes con paginación

### Base de datos
- Schema completo en Supabase (1 migración base + 1 migración de fixes)
- Todos los modelos con @@index() en campos frecuentes
- onDelete explícito en todas las relaciones (corregido hoy)
- sigieCredUser/Pass eliminados del schema (credenciales solo en UserCredentials)

---

## Lo que está pendiente

### Pendiente crítico (bloquea producción)

| Item | Detalle | Acción requerida |
|------|---------|-----------------|
| `REFRESH_TOKEN_SECRET` en Railway | Sin esta var el API no arranca | Agregar en Railway → Variables |
| Migración SQL en Supabase | `20260430130015_fix_delete_cascades_and_credentials` no aplicada | Correr en Supabase SQL Editor |
| Playwright/Chromium en Railway | Dockerfile creado pero no deployado | Railway usa el nuevo Dockerfile automáticamente al redeploy |
| Catálogos de transporte vacíos | Tablas existen pero sin datos en producción | Correr seed o cargar datos desde admin |

### Pendiente funcional

| Item | Severidad | Tiempo estimado |
|------|-----------|----------------|
| Skeleton loaders en todas las páginas | Medio | 4 horas |
| Wizard migrar a react-hook-form + zod | Medio | 4 horas |
| Settings page — editar perfil y cambiar contraseña | Medio | 3 horas |
| Colores hex hardcodeados en algunos TSX | Bajo | 2 horas |
| onDelete explícito pendiente de ejecutar en Supabase | Crítico (SQL) | 5 minutos |

### Módulos no iniciados

| Módulo | Estado |
|--------|--------|
| Exportaciones | Schema tiene ShipmentType.EXPORT pero no hay wizard |
| Cotizaciones Maersk/DHL | Integración existe con fallback mock, no conectada a UI de cotización |
| Reportes PDF/Excel exportables | No iniciado |
| App móvil | Carpeta `apps/mobile/` vacía |

---

## Arquitectura actual

```
apps/
├── api/                    ← Express + Prisma + TypeScript
│   ├── src/routes/         ← 14 archivos de rutas registrados
│   ├── src/services/       ← Lógica de negocio separada
│   ├── src/automation/     ← Bots Playwright (SIGIE + SAT)
│   ├── src/integrations/   ← Cloudinary ✅  Stripe ✅  ShipEngine ✅  Maersk ⚠️  DHL ⚠️
│   ├── prisma/schema.prisma ← 18 modelos, 2 migraciones
│   └── Dockerfile          ← Con Chromium para Railway (nuevo)
└── web/                    ← Next.js 14 App Router
    ├── src/app/(dashboard)/ ← 12 páginas
    ├── src/store/authStore  ← Zustand + persist (user + tokens)
    └── src/lib/api.ts       ← Axios con refresh interceptor
```

---

## Commits de hoy (2026-04-30)

| Hash | Cambio |
|------|--------|
| `3b8f5be` | P-23 + P-32: credenciales en vault + onDelete en FK |
| `7ba078e` | Auditoría: 25 de 32 problemas corregidos |
| `0dd2aaf` | CFDI parser: nombre producto + NIT + SIGIE auto-creation + quitar Aduana Salida MX |

---

## Próximos pasos sugeridos (en orden de impacto)

1. **AHORA** — Agregar `REFRESH_TOKEN_SECRET` en Railway (bloquea el API)
2. **AHORA** — Correr el SQL de migración en Supabase SQL Editor
3. **HOY** — Redeploy en Railway (activa el Dockerfile con Chromium)
4. **HOY** — Cargar al menos 1 TransportEmpresa + piloto + cabezal + caja en producción
5. **ESTA SEMANA** — Probar flujo completo MX→GT con un CFDI real en producción
6. **ESTA SEMANA** — Implementar skeleton loaders (eliminar el "Cargando..." de texto plano)
7. **PRÓXIMA SEMANA** — Settings page con edición de perfil y cambio de contraseña
