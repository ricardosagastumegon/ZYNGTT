# AXON LOGISTIC — Instrucciones para Claude Code

## Contexto del Proyecto

**ZYN** es una plataforma SaaS de gestión logística para Centroamérica.
Permite a empresas gestionar embarques, documentos aduaneros, cotizaciones de flete,
tracking en tiempo real y pagos, todo en un solo lugar.

## Stack Tecnológico

- **Monorepo:** Turborepo + npm workspaces
- **API (Backend):** Node.js + Express + TypeScript + Prisma ORM
- **Web (Frontend):** Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui
- **Base de datos:** PostgreSQL (via Prisma)
- **Autenticación:** JWT + bcrypt
- **Pagos:** Stripe
- **Almacenamiento:** Cloudinary (documentos/imágenes)
- **Tracking:** ShipEngine API
- **Carriers:** Maersk, DHL, FedEx APIs
- **Email:** Nodemailer / Resend

## Estructura del Proyecto

```
zyn/
├── apps/
│   ├── api/                  # Backend Express + Prisma
│   │   ├── prisma/           # Schema y migraciones
│   │   └── src/
│   │       ├── routes/       # Endpoints REST
│   │       ├── services/     # Lógica de negocio
│   │       ├── models/       # Tipos y modelos
│   │       ├── middleware/   # Auth, validación, errores
│   │       ├── integrations/ # APIs externas
│   │       └── utils/        # Helpers
│   ├── web/                  # Frontend Next.js
│   │   └── src/
│   │       ├── app/          # App Router (páginas)
│   │       ├── components/   # Componentes React
│   │       ├── hooks/        # Custom hooks
│   │       └── lib/          # Utilidades frontend
│   └── mobile/               # App móvil (futuro)
├── packages/
│   ├── shared/               # Tipos y constantes compartidos
│   └── ui/                   # Componentes UI compartidos
├── docs/                     # Documentación del proyecto
├── infra/                    # Docker, Nginx, backups
└── .claude/commands/         # Comandos personalizados de Claude
```

## Módulos del Sistema

1. **Auth** — Registro, login, roles (admin, operador, cliente)
2. **Shipments** — Gestión de embarques (import/export)
3. **Documents** — Carga y gestión de documentos aduaneros
4. **Quotes** — Cotización de flete (Maersk, DHL, FedEx)
5. **Tracking** — Seguimiento en tiempo real (ShipEngine)
6. **Payments** — Pagos con Stripe (USD)
7. **Dashboard** — Métricas y KPIs
8. **Clients** — CRM básico de clientes
9. **Reports** — Reportes exportables (PDF/Excel)

## Convenciones de Código

- TypeScript estricto en todo el proyecto
- Nombres de archivos en kebab-case
- Funciones y variables en camelCase
- Clases y tipos en PascalCase
- Rutas REST: `/api/v1/[recurso]`
- Respuestas API: `{ success, data, error, message }`
- Manejo de errores con clases personalizadas
- Validación con Zod en todas las rutas

## Instrucciones para Claude

- Trabaja módulo por módulo, no saltes entre módulos sin terminar el actual
- Confirma el plan antes de escribir código en módulos grandes
- Siempre actualiza el schema de Prisma antes de crear servicios
- Crea los tipos en `packages/shared` antes de usarlos en apps
- No generes datos fake/mock en producción — usa variables de entorno
- Documenta cada integración con API externa en `docs/apis/`
