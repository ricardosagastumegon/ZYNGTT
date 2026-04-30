# Auditoría EXPANDIDA — AXON LOGISTIC — 2026-04-30

## Resumen ejecutivo

| Severidad | Cantidad |
|-----------|---------|
| Críticos 🔴 | 7 |
| Altos 🟠 | 14 |
| Medios 🟡 | 11 |
| **Total** | **32** |

- **Porcentaje de completitud estimado:** 68%
- **Deuda técnica total estimada:** ~52 horas de corrección
- **Archivos fuente analizados:** 38 (backend + frontend + schema + .env)

---

## PARTE I — LOS 32 PROBLEMAS EN DETALLE

---

### P-01: CORS permisivo en producción 🔴

**Descripción exacta**
- Archivo: `apps/api/src/index.ts`, líneas 34–43
- Código actual:
  ```typescript
  app.use(cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin)) {
        cb(null, true);
      } else {
        cb(null, true); // permissive during initial deployment
      }
    },
    credentials: true,
  }));
  ```
- Por qué es un problema: el bloque `else` devuelve `cb(null, true)` — exactamente igual que el bloque `if`. Cualquier dominio del mundo puede hacer requests autenticados con las cookies del usuario. El comentario `// permissive during initial deployment` indica que era temporal pero nunca se corrigió.

**Impacto en producción**
- Qué puede pasar: cualquier sitio malicioso puede hacer peticiones AJAX usando la sesión activa de un usuario logueado. Equivale a deshabilitar completamente la protección CORS.
- Quién se ve afectado: TODOS los usuarios

**Solución exacta**
- Archivos a modificar: `apps/api/src/index.ts`
- Código correcto:
  ```typescript
  app.use(cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin)) {
        cb(null, true);
      } else {
        cb(new Error(`Origin ${origin} not allowed by CORS`), false);
      }
    },
    credentials: true,
  }));
  ```
- ¿Requiere migración de BD? NO

**Tiempo estimado: 15 minutos**

---

### P-02: generalLimiter no aplicado globalmente 🔴

**Descripción exacta**
- Archivo: `apps/api/src/middleware/rateLimiter.ts`, líneas 28–34 (exportado pero nunca importado en index.ts)
- Código actual en `index.ts`: no hay ninguna línea `app.use(generalLimiter)`
- Por qué es un problema: `generalLimiter` (300 req / 15 min) existe y está exportado, pero nunca se usa. Las rutas de documentos, expedientes, pagos y tracking no tienen ningún rate-limit. Un atacante autenticado puede hacer scraping masivo o DDoS a nivel de aplicación sin restricción.

**Impacto en producción**
- Qué puede pasar: extracción masiva de datos de todos los expedientes; sobrecarga del servidor y la base de datos; agotamiento del pool de conexiones de Prisma.
- Quién se ve afectado: TODOS (servidor y datos)

**Solución exacta**
- Archivos a modificar: `apps/api/src/index.ts`
- Código correcto (agregar después de la línea `app.use(express.urlencoded(...))`, línea 49):
  ```typescript
  import { generalLimiter } from './middleware/rateLimiter';
  // ... (en la sección de middlewares, después de morgan):
  app.use(generalLimiter);
  ```
- ¿Requiere migración de BD? NO

**Tiempo estimado: 15 minutos**

---

### P-03: cfdiUUID extrae el campo Folio en lugar del UUID del TimbreFiscalDigital 🔴

**Descripción exacta**
- Archivo: `apps/api/src/services/import-expediente.service.ts`, líneas 107–108
- Código actual:
  ```typescript
  cfdiUUID: cfdi.folio,
  cfdiFolio: cfdi.folio ?? '',
  ```
- Archivo relacionado: `apps/api/src/services/cfdi-parser.service.ts`, línea 38: `const folio = getAttr(comprobante, 'Folio');` — el parser lee el atributo `Folio` del nodo raíz `<cfdi:Comprobante>`, que es el folio interno del emisor (puede estar vacío o ausente).
- Por qué es un problema: el UUID del SAT que identifica de forma única un CFDI está en el complemento `TimbreFiscalDigital`, atributo `UUID`. El campo `Folio` es **opcional** en el estándar CFDI 4.0 del SAT y puede ser `undefined`. Se asigna el mismo valor a `cfdiUUID` y `cfdiFolio`, cuando deberían ser datos distintos.

**Impacto en producción**
- Qué puede pasar: `cfdiUUID` queda `undefined` para cualquier CFDI sin `Folio`. El checklist usa `!!(exp.cfdiXmlUrl || exp.cfdiUUID || ...)` — si `cfdiUUID` es `undefined` y no hay `cfdiXmlUrl`, el ítem "CFDI subido" puede quedar en rojo incorrectamente. Además, sin el UUID real del SAT no se puede validar el CFDI contra el webservice del SAT.
- Quién se ve afectado: EMPRESA, AGENTE

**Solución exacta**
- Archivos a modificar: `apps/api/src/services/cfdi-parser.service.ts` y `apps/api/src/services/import-expediente.service.ts`
- En `cfdi-parser.service.ts`, después de la línea del `folio` (línea 38), agregar:
  ```typescript
  // Extraer UUID del TimbreFiscalDigital
  const timbreEl = findElement(doc, 'tfd:TimbreFiscalDigital', 'TimbreFiscalDigital');
  const uuid = timbreEl ? getAttr(timbreEl as Element, 'UUID') : undefined;
  ```
  Y en el `return` del parseCFDI (línea 112), agregar `uuid` al objeto retornado y al tipo `CFDIData`.
- En `import-expediente.service.ts`, cambiar líneas 107–108:
  ```typescript
  cfdiUUID: cfdi.uuid,       // UUID real del SAT (TimbreFiscalDigital)
  cfdiFolio: cfdi.folio ?? '',  // Folio interno del emisor (puede ser vacío)
  ```
- ¿Requiere migración de BD? NO (el campo `cfdiUUID` ya existe, solo se actualiza el valor)

**Tiempo estimado: 2 horas**

---

### P-04: authStore no rehidrata el objeto user al recargar la página 🔴

**Descripción exacta**
- Archivo: `apps/web/src/lib/auth.ts` — el archivo `auth.ts` en `lib/` exporta funciones pero NO contiene un Zustand store con `persist`. Revisando `api.ts`, el token se guarda en `localStorage` como `zyn_token`. No existe un archivo `authStore.ts` o equivalente Zustand en `apps/web/src/lib/`.
- Por qué es un problema: el token se persiste en `localStorage` (vía `api.ts` interceptor), pero el objeto `user` con `role`, `firstName`, etc. no se rehidrata al recargar. La función `getMeRequest()` existe en `auth.ts` pero no hay llamada automática a `/api/users/me` en ningún hook de inicialización.

**Impacto en producción**
- Qué puede pasar: al recargar la página, el sidebar y las páginas que dependen del rol del usuario muestran datos incorrectos o vacíos hasta que se hace la primera request. Flash de interfaz incorrecta.
- Quién se ve afectado: TODOS los roles

**Solución exacta**
- Archivos a modificar: crear `apps/web/src/lib/authStore.ts` o agregar lógica en el layout del dashboard
- Código correcto (hook de inicialización en el layout):
  ```typescript
  // apps/web/src/app/(dashboard)/layout.tsx — agregar:
  import { getMeRequest } from '@/lib/auth';
  import { useEffect, useState } from 'react';
  
  export default function DashboardLayout({ children }) {
    const [user, setUser] = useState(null);
    
    useEffect(() => {
      const token = localStorage.getItem('zyn_token');
      if (token) {
        getMeRequest()
          .then(setUser)
          .catch(() => { window.location.href = '/login'; });
      } else {
        window.location.href = '/login';
      }
    }, []);
    
    if (!user) return <LoadingScreen />;
    return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
  }
  ```
- ¿Requiere migración de BD? NO

**Tiempo estimado: 1 hora**

---

### P-05: AGENTE ve todos los expedientes sin filtro de empresa 🔴

**Descripción exacta**
- Archivo: `apps/api/src/services/import-expediente.service.ts`, línea 323
- Código actual:
  ```typescript
  const where = ['AGENTE', 'ADMIN', 'SUPERADMIN'].includes(role) ? {} : { userId };
  ```
- Por qué es un problema: el rol `AGENTE` recibe `where: {}` — sin ningún filtro. Un agente puede ver todos los expedientes de todas las empresas del sistema, incluyendo competidores directos. Solo debería ver los expedientes de las empresas que gestiona.

**Impacto en producción**
- Qué puede pasar: fuga de información comercial confidencial entre empresas. Un agente mal intencionado puede exportar toda la cartera de importaciones de la plataforma.
- Quién se ve afectado: EMPRESA (sus datos quedan expuestos)

**Solución exacta**
- Archivos a modificar: `apps/api/src/services/import-expediente.service.ts`
- El modelo `User` no tiene relación directa AGENTE→empresa. La solución correcta requiere agregar un campo `agenciaId` o `agentUserId` al modelo `ImportExpediente`, o usar el campo `companyId` del usuario AGENTE para filtrar.
- Solución de corto plazo (filtrar por userId del agente):
  ```typescript
  // Opción mínima: el AGENTE solo ve los expedientes que creó ÉL
  const where = role === 'ADMIN' || role === 'SUPERADMIN' 
    ? {} 
    : { userId };
  ```
- Solución completa (requiere migración):
  ```typescript
  // 1. Agregar campo en schema.prisma:
  // agenteId String?
  // agente   User? @relation(fields: [agenteId], references: [id])
  
  // 2. Filtro correcto:
  const where = role === 'SUPERADMIN' || role === 'ADMIN'
    ? {}
    : role === 'AGENTE'
    ? { agenteId: userId }
    : { userId };
  ```
- ¿Requiere migración de BD? La solución de corto plazo NO. La solución completa SÍ.

**Tiempo estimado: 2 horas (incluyendo migración)**

---

### P-06: Playwright/Chromium no instalado en Railway para automatización SIGIE/SAT 🔴

**Descripción exacta**
- Archivo: `apps/api/package.json`, línea 42: `"playwright": "^1.44.0"` — está en `dependencies` (producción).
- Archivos del bot: `apps/api/src/automation/sigie-maga.bot.ts` y `apps/api/src/automation/sat-aduanas.bot.ts` — ambos implementados con Playwright real, no stubs.
- Problema: no hay `railway.toml`, `Dockerfile` ni script de post-install que ejecute `npx playwright install chromium`. Sin el binario, cualquier llamada al bot falla con `browserType.launch: Executable doesn't exist at ...`.

**Impacto en producción**
- Qué puede pasar: todas las llamadas a `POST /api/automation/sigie/:id` y `POST /api/automation/sat/:id` fallarán silenciosamente o con error 500. La función core del producto (automatización SIGIE/DUCA-D) está completamente no operativa en producción.
- Quién se ve afectado: TODOS (la funcionalidad diferencial del producto no funciona)

**Solución exacta**
- Archivos a crear/modificar: `apps/api/Dockerfile` o `railway.toml`
- Dockerfile correcto:
  ```dockerfile
  FROM node:20-slim
  
  # Playwright system dependencies
  RUN apt-get update && apt-get install -y \
    chromium \
    chromium-sandbox \
    libglib2.0-0 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 \
    libxcursor1 libxdamage1 libxext6 libxi6 libxtst6 \
    fonts-liberation libnss3 libcups2 libdbus-1-3 \
    libatk1.0-0 libatk-bridge2.0-0 libxrandr2 \
    && rm -rf /var/lib/apt/lists/*
  
  ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
  ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium
  ENV PLAYWRIGHT_HEADLESS=true
  
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci --production
  COPY . .
  RUN npm run build
  CMD ["node", "dist/index.js"]
  ```
- En `apps/api/src/automation/browser-manager.ts` asegurar:
  ```typescript
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
  ```
- ¿Requiere migración de BD? NO

**Tiempo estimado: 4 horas**

---

### P-07: Solo 1 migración con schema completo — riesgo de destruir datos en BD existente 🔴

**Descripción exacta**
- Directorio: `apps/api/prisma/migrations/20260429010619_add_activity_log/` — única migración existente.
- Por qué es un problema: esta migración contiene `CREATE TABLE` para todos los modelos. Su nombre es `add_activity_log` pero contiene el schema completo, lo que indica que fue generada con `prisma migrate dev` sobre una BD vacía. Si la BD en Railway ya tiene datos y se intenta aplicar esta migración, Prisma fallará porque las tablas ya existen.

**Impacto en producción**
- Qué puede pasar: al hacer un nuevo `prisma migrate deploy` en Railway con cambios de schema (necesarios para P-05), puede fallar completamente o crear tablas duplicadas.
- Quién se ve afectado: TODOS (riesgo de pérdida total de datos)

**Solución exacta**
- Archivos a modificar: flujo de migraciones
- Proceso correcto:
  ```bash
  # 1. En la BD de Railway (producción), marcar la migración como "ya aplicada":
  npx prisma migrate resolve --applied 20260429010619_add_activity_log
  
  # 2. Para futuros cambios, crear siempre migraciones incrementales:
  npx prisma migrate dev --name "add_agente_id_to_expediente"
  
  # 3. En CI/CD, usar:
  npx prisma migrate deploy  # No usa migrate dev en producción
  ```
- ¿Requiere migración de BD? SÍ (es el punto central del problema)

**Tiempo estimado: 3 horas**

---

### P-08: customs.routes.ts rutas de escritura sin requireRole 🟠

**Descripción exacta**
- Archivo: `apps/api/src/routes/customs.routes.ts`, líneas 15 y 30
- Código actual:
  ```typescript
  customsRoutes.post('/:shipmentId', asyncHandler(async (req, res) => { ... }));
  customsRoutes.put('/:id/status', asyncHandler(async (req, res) => { ... }));
  ```
- Por qué es un problema: cualquier usuario autenticado, incluyendo un TRANSPORTISTA, puede crear registros aduaneros o cambiar su status. No hay validación de que el `shipmentId` pertenezca al usuario. Solo AGENTE o ADMIN debería poder hacer esto.

**Impacto en producción**
- Qué puede pasar: un TRANSPORTISTA puede crear o modificar registros aduaneros de embarques ajenos.
- Quién se ve afectado: EMPRESA, AGENTE

**Solución exacta**
- Archivos a modificar: `apps/api/src/routes/customs.routes.ts`
- Código correcto:
  ```typescript
  import { requireRole } from '../middleware/role.middleware';
  
  customsRoutes.post('/:shipmentId', 
    requireRole('AGENTE', 'ADMIN', 'SUPERADMIN'),
    asyncHandler(async (req, res) => { ... })
  );
  
  customsRoutes.put('/:id/status',
    requireRole('AGENTE', 'ADMIN', 'SUPERADMIN'),
    asyncHandler(async (req, res) => { ... })
  );
  ```
- ¿Requiere migración de BD? NO

**Tiempo estimado: 30 minutos**

---

### P-09: REFRESH_TOKEN_SECRET opcional y predecible 🟠

**Descripción exacta**
- Archivo: `apps/api/src/utils/jwt.ts`, línea 6
- Código actual:
  ```typescript
  const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || JWT_SECRET + '_refresh';
  ```
- Por qué es un problema: si `REFRESH_TOKEN_SECRET` no está seteado en Railway (y no aparece en `.env.example`), el secret del refresh token es `JWT_SECRET + '_refresh'`. Cualquiera que conozca el `JWT_SECRET` puede calcular el `REFRESH_SECRET` y forjar refresh tokens válidos con acceso de 30 días.

**Impacto en producción**
- Qué puede pasar: un atacante que obtenga `JWT_SECRET` automáticamente obtiene también `REFRESH_SECRET`, pudiendo crear sesiones indefinidamente válidas.
- Quién se ve afectado: TODOS

**Solución exacta**
- Archivos a modificar: `apps/api/src/utils/jwt.ts`, `apps/api/src/utils/env-validator.ts`, `.env.example`
- Código correcto en `jwt.ts`:
  ```typescript
  const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET!;
  if (!REFRESH_SECRET) throw new Error('REFRESH_TOKEN_SECRET env var is required');
  ```
- Agregar a `env-validator.ts`:
  ```typescript
  'REFRESH_TOKEN_SECRET',
  ```
- Agregar a `.env.example`:
  ```
  REFRESH_TOKEN_SECRET="another-super-secret-refresh-key-32chars"
  ```
- ¿Requiere migración de BD? NO (invalida tokens existentes al cambiar el secret)

**Tiempo estimado: 30 minutos**

---

### P-10: Lógica de negocio en user.routes.ts viola separación de capas 🟠

**Descripción exacta**
- Archivo: `apps/api/src/routes/user.routes.ts`, líneas 71–109
- Código actual (handler `POST /`):
  ```typescript
  userRoutes.post('/', requireRole('ADMIN', 'SUPERADMIN'), asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new AppError('Email ya registrado', 409);
    const hashed = await bcrypt.hash(data.password, 12);
    // ... construcción de meta, creación de company, creación de user, log
  }));
  ```
- Por qué es un problema: el hash de contraseña, la creación de empresa y el log de actividad están directamente en el handler de ruta, no en un servicio. Viola la separación documentada en `CLAUDE.md`. No se puede testear unitariamente sin mockear Express.

**Impacto en producción**
- Qué puede pasar: dificultad de mantenimiento; si la lógica de creación de usuario necesita cambios, hay que buscarla en `routes/` en lugar de `services/`.
- Quién se ve afectado: equipo de desarrollo

**Solución exacta**
- Archivos a crear/modificar: crear `apps/api/src/services/user.service.ts`
- Código correcto:
  ```typescript
  // apps/api/src/services/user.service.ts
  export const userService = {
    async createUser(data: CreateUserDto, createdByUserId: string, ip?: string) {
      const existing = await prisma.user.findUnique({ where: { email: data.email } });
      if (existing) throw new AppError('Email ya registrado', 409);
      const hashed = await bcrypt.hash(data.password, 12);
      // ... resto de la lógica
      await activityLogService.log(createdByUserId, 'CREATE_USER', ...);
      return safe;
    }
  };
  
  // En user.routes.ts:
  userRoutes.post('/', requireRole('ADMIN', 'SUPERADMIN'), asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const user = await userService.createUser(data, req.user!.userId, req.ip);
    res.status(201).json({ success: true, data: user });
  }));
  ```
- ¿Requiere migración de BD? NO

**Tiempo estimado: 2 horas**

---

### P-11: payment.service.ts getPaymentHistory sin paginación 🟠

**Descripción exacta**
- Archivo: `apps/api/src/services/payment.service.ts`, líneas 31–37
- Código actual:
  ```typescript
  async getPaymentHistory(userId: string) {
    return prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { shipment: { select: { reference: true, origin: true, destination: true } } },
    });
  },
  ```
- Por qué es un problema: retorna TODOS los pagos sin límite. Una empresa con 500+ pagos causará una query lenta y una respuesta enorme.

**Impacto en producción**
- Qué puede pasar: timeout de la query, consumo excesivo de memoria, respuesta lenta para el usuario.
- Quién se ve afectado: EMPRESA con historial grande

**Solución exacta**
- Archivos a modificar: `apps/api/src/services/payment.service.ts` y `apps/api/src/routes/payment.routes.ts`
- Código correcto:
  ```typescript
  async getPaymentHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prisma.payment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { shipment: { select: { reference: true, origin: true, destination: true } } },
      }),
      prisma.payment.count({ where: { userId } }),
    ]);
    return { data, total, page, limit };
  },
  ```
- ¿Requiere migración de BD? NO

**Tiempo estimado: 30 minutos**

---

### P-12: tracking.service.ts getEvents sin take ni paginación 🟠

**Descripción exacta**
- Archivo: `apps/api/src/services/tracking.service.ts`, línea 10
- Código actual:
  ```typescript
  return prisma.trackingEvent.findMany({ where: { shipmentId }, orderBy: { occurredAt: 'desc' } });
  ```
- Por qué es un problema: retorna todos los eventos de tracking sin límite. Un embarque con muchas actualizaciones de ShipEngine puede tener cientos de eventos.

**Impacto en producción**
- Qué puede pasar: respuesta lenta, consumo excesivo de memoria.
- Quién se ve afectado: EMPRESA, AGENTE

**Solución exacta**
- Archivos a modificar: `apps/api/src/services/tracking.service.ts`
- Código correcto:
  ```typescript
  return prisma.trackingEvent.findMany({
    where: { shipmentId },
    orderBy: { occurredAt: 'desc' },
    take: 100,
  });
  ```
- ¿Requiere migración de BD? NO

**Tiempo estimado: 15 minutos**

---

### P-13: Dashboard transporte solo muestra la primera empresa (empresas?.[0]) 🟠

**Descripción exacta**
- Archivo: `apps/web/src/app/(dashboard)/dashboard/transporte/page.tsx`, línea 56
- Código actual:
  ```typescript
  const empresa = empresas?.[0];
  ```
- Por qué es un problema: un TRANSPORTISTA asociado a múltiples empresas (por ejemplo, un conductor que trabaja para dos empresas) solo ve la primera. No hay selector para cambiar de empresa.

**Impacto en producción**
- Qué puede pasar: el transportista no puede gestionar los vehículos y pilotos de su segunda empresa.
- Quién se ve afectado: TRANSPORTISTA

**Solución exacta**
- Archivos a modificar: `apps/web/src/app/(dashboard)/dashboard/transporte/page.tsx`
- Código correcto:
  ```typescript
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>('');
  const empresa = empresas?.find(e => e.id === selectedEmpresaId) ?? empresas?.[0];
  
  // Agregar selector en el JSX, antes de los KPIs:
  {empresas && empresas.length > 1 && (
    <select value={selectedEmpresaId} onChange={e => setSelectedEmpresaId(e.target.value)}
      className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
      {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
    </select>
  )}
  ```
- ¿Requiere migración de BD? NO

**Tiempo estimado: 1 hora**

---

### P-14: No hay tab de Envíos asignados en el panel transportista 🟠

**Descripción exacta**
- Archivo: `apps/web/src/app/(dashboard)/dashboard/transporte/page.tsx`
- El panel solo tiene tabs: Pilotos | Cabezales | Cajas. No hay forma de ver qué expedientes están actualmente asignados a esa empresa transportista.
- Por qué es un problema: un transportista no puede saber qué embarques tiene asignados desde su propio dashboard.

**Impacto en producción**
- Qué puede pasar: el transportista tiene que navegar a `/shipments` o llamar a la empresa para saber qué cargas tiene activas.
- Quién se ve afectado: TRANSPORTISTA

**Solución exacta**
- Archivos a modificar: `apps/web/src/app/(dashboard)/dashboard/transporte/page.tsx`
- Agregar tab "Envíos":
  ```typescript
  const TABS = [
    { id: 'pilotos',    label: 'Pilotos',   icon: User },
    { id: 'cabezales',  label: 'Cabezales', icon: Truck },
    { id: 'cajas',      label: 'Cajas',     icon: Box },
    { id: 'expedientes',label: 'Envíos',    icon: Package },
  ];
  
  // Query adicional:
  const { data: expedientes = [] } = useQuery({
    queryKey: ['t-expedientes', empresa?.id],
    queryFn: () => api.get('/api/import/list').then(r => r.data.data),
    enabled: !!empresa && activeTab === 3,
  });
  ```
- ¿Requiere migración de BD? NO

**Tiempo estimado: 3 horas**

---

### P-15: Typo SHIPENGINEE_API_KEY en .env.example (doble E) 🟠

**Descripción exacta**
- Archivo: `.env.example`, línea 9
- Código actual:
  ```
  SHIPENGINEE_API_KEY=""
  ```
- El código en `apps/api/src/integrations/shipengine.ts` usa `process.env.SHIPENGINE_API_KEY` (una sola E). Si un nuevo desarrollador copia `.env.example`, la variable queda mal nombrada y ShipEngine no funcionará.

**Impacto en producción**
- Qué puede pasar: el tracking de carriers externo nunca funciona para nuevos deployments.
- Quién se ve afectado: EMPRESA, equipo de desarrollo

**Solución exacta**
- Archivos a modificar: `.env.example`
- Código correcto: cambiar línea 9:
  ```
  SHIPENGINE_API_KEY=""
  ```
- ¿Requiere migración de BD? NO

**Tiempo estimado: 5 minutos**

---

### P-16: Variables críticas faltantes en .env.example 🟠

**Descripción exacta**
- Archivo: `.env.example` — faltan las siguientes variables críticas que el código usa:
  - `REFRESH_TOKEN_SECRET` (usada en `jwt.ts` línea 6)
  - `REDIS_HOST` (usada en `automation-queue.ts` línea 3)
  - `REDIS_PORT` (usada en `automation-queue.ts` línea 15)
  - `CREDENTIALS_ENCRYPTION_KEY` (usada en `credentials-vault.ts` línea 8, DEBE tener exactamente 32 caracteres)
  - `PLAYWRIGHT_HEADLESS` (usada en `browser-manager.ts`)
  - `FRONTEND_URL` (usada en `index.ts` línea 32 para CORS)
- Por qué es un problema: un desarrollador que configure el proyecto desde `.env.example` dejará estas variables sin configurar, causando errores en runtime.

**Impacto en producción**
- Qué puede pasar: `credentials-vault.ts` lanza `throw new Error('CREDENTIALS_ENCRYPTION_KEY debe tener exactamente 32 caracteres')` en producción.
- Quién se ve afectado: equipo de desarrollo, nuevos deployments

**Solución exacta**
- Archivos a modificar: `.env.example`
- Agregar al final del archivo:
  ```
  # === AUTENTICACIÓN (TOKENS) ===
  REFRESH_TOKEN_SECRET="another-32-char-secret-key-here!!"
  
  # === ENCRIPTACIÓN ===
  # IMPORTANTE: debe tener EXACTAMENTE 32 caracteres
  CREDENTIALS_ENCRYPTION_KEY="exactamente-treinta-y-dos-chars"
  
  # === AUTOMATIZACIÓN (Redis + Playwright) ===
  REDIS_HOST="localhost"
  REDIS_PORT=6379
  PLAYWRIGHT_HEADLESS=true
  PLAYWRIGHT_TIMEOUT=60000
  
  # === URLS ===
  FRONTEND_URL="https://tu-app.vercel.app"
  ```
- ¿Requiere migración de BD? NO

**Tiempo estimado: 30 minutos**

---

### P-17: Access token de 7d demasiado largo — sin refresh automático en interceptor 🟠

**Descripción exacta**
- Archivo backend: `apps/api/src/utils/jwt.ts`, línea 5: `const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'`
- Archivo frontend: `apps/web/src/lib/api.ts`, líneas 16–24: el interceptor de error 401 solo hace logout, sin intentar el refresh primero.
- Por qué es un problema: 7 días es excesivo para un access token. Si se compromete un token, el atacante tiene 7 días. Lo estándar es 15-60 minutos con refresh automático.

**Impacto en producción**
- Qué puede pasar: token robado tiene ventana de ataque de 7 días.
- Quién se ve afectado: TODOS

**Solución exacta**
- Archivos a modificar: `.env.example`, `apps/web/src/lib/api.ts`
- En `.env.example` cambiar:
  ```
  JWT_EXPIRES_IN="15m"
  ```
- En `apps/web/src/lib/api.ts`, actualizar el interceptor:
  ```typescript
  api.interceptors.response.use(
    (res) => res,
    async (error) => {
      const original = error.config;
      if (error.response?.status === 401 && !original._retry) {
        original._retry = true;
        const refreshToken = localStorage.getItem('zyn_refresh_token');
        if (refreshToken) {
          try {
            const { data } = await axios.post(
              `${api.defaults.baseURL}/api/auth/refresh`,
              { refreshToken }
            );
            localStorage.setItem('zyn_token', data.data.token);
            original.headers.Authorization = `Bearer ${data.data.token}`;
            return api(original);
          } catch {
            localStorage.removeItem('zyn_token');
            localStorage.removeItem('zyn_refresh_token');
            window.location.href = '/login';
          }
        } else {
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }
  );
  ```
- ¿Requiere migración de BD? NO

**Tiempo estimado: 2 horas**

---

### P-18: No hay skeleton loaders — CLS en páginas con datos 🟠

**Descripción exacta**
- Revisión de `apps/web/src/app/(dashboard)/dashboard/transporte/page.tsx`: muestra texto "Cargando..." pero no skeleton.
- Ningún archivo del frontend usa `animate-pulse` ni componentes `Skeleton`.
- Por qué es un problema: las tablas y KPIs aparecen y desaparecen durante la carga, causando Cumulative Layout Shift (CLS). Experiencia de usuario degradada.

**Impacto en producción**
- Qué puede pasar: mala puntuación en Core Web Vitals; usuarios confundidos durante la carga inicial.
- Quién se ve afectado: TODOS (UX)

**Solución exacta**
- Archivos a modificar: todas las páginas de dashboard con datos
- Código correcto (skeleton para tabla):
  ```typescript
  function TableSkeleton({ rows = 5 }: { rows?: number }) {
    return (
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }
  
  // Uso en página:
  {isLoading ? <TableSkeleton rows={5} /> : <ActualTable data={data} />}
  ```
- ¿Requiere migración de BD? NO

**Tiempo estimado: 4 horas**

---

### P-19: Ningún botón icon-only tiene aria-label 🟠

**Descripción exacta**
- Archivos afectados: `apps/web/src/app/(dashboard)/dashboard/transporte/page.tsx` (botón X del modal, línea 22), `apps/web/src/app/(dashboard)/admin/transporte/page.tsx` (botón PowerOff, línea 96), y múltiples páginas adicionales.
- Código actual típico:
  ```typescript
  <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
    <X size={18} />
  </button>
  ```
- Por qué es un problema: los lectores de pantalla anuncian este botón como "botón" sin descripción. Es inaccesible para usuarios con discapacidad visual.

**Impacto en producción**
- Qué puede pasar: la plataforma es inutilizable para usuarios con screen reader.
- Quién se ve afectado: TODOS (accesibilidad)

**Solución exacta**
- Archivos a modificar: todos los archivos `.tsx` con botones icon-only
- Código correcto:
  ```typescript
  <button 
    onClick={onClose} 
    aria-label="Cerrar modal"
    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
    <X size={18} aria-hidden="true" />
  </button>
  ```
- ¿Requiere migración de BD? NO

**Tiempo estimado: 2 horas**

---

### P-20: addTransportData cambia status a DOCS_GENERADOS sin verificar que existan documentos 🟠

**Descripción exacta**
- Archivo: `apps/api/src/services/import-expediente.service.ts`, líneas 154–162
- Código actual:
  ```typescript
  return prisma.importExpediente.update({
    where: { id },
    data: {
      ...data,
      fechaCruce: data.fechaCruce ? new Date(data.fechaCruce) : undefined,
      status: 'DOCS_GENERADOS',  // ← Cambia status aunque no haya docs
    },
  });
  ```
- Por qué es un problema: al guardar los datos de transporte (Paso 2 del wizard), el status se cambia a `DOCS_GENERADOS` aunque los documentos PDF aún no existan. Los documentos se generan en el Paso 3.

**Impacto en producción**
- Qué puede pasar: el checklist puede mostrar un estado incorrecto. El status del expediente queda en un estado que no refleja la realidad.
- Quién se ve afectado: EMPRESA, AGENTE

**Solución exacta**
- Archivos a modificar: `apps/api/src/services/import-expediente.service.ts`
- Código correcto:
  ```typescript
  return prisma.importExpediente.update({
    where: { id },
    data: {
      ...data,
      fechaCruce: data.fechaCruce ? new Date(data.fechaCruce) : undefined,
      // No cambiar status aquí — se cambia en generateDocuments
    },
  });
  ```
- ¿Requiere migración de BD? NO

**Tiempo estimado: 30 minutos**

---

### P-21: generateDocuments solo valida pilotoId — no valida cabezalId ni cajaId 🟠

**Descripción exacta**
- Archivo: `apps/api/src/services/import-expediente.service.ts`, línea 177
- Código actual:
  ```typescript
  if (!exp.pilotoId) throw new AppError('Datos de transporte incompletos — llena el Paso 2 primero', 400);
  ```
- Por qué es un problema: `cabezalId` y `cajaId` son igualmente necesarios para los PDFs (`cabezalPlaca` y `furgonPlaca` aparecen en todos los documentos). Si faltan, los PDFs se generan con `'—'` en los campos de vehículo.

**Impacto en producción**
- Qué puede pasar: documentos oficiales con campos de placa en blanco (`'—'`), que pueden ser rechazados en aduana.
- Quién se ve afectado: EMPRESA

**Solución exacta**
- Archivos a modificar: `apps/api/src/services/import-expediente.service.ts`
- Código correcto:
  ```typescript
  if (!exp.pilotoId || !exp.cabezalId || !exp.cajaId) {
    throw new AppError(
      'Datos de transporte incompletos — se requiere piloto, cabezal y caja para generar documentos',
      400
    );
  }
  ```
- ¿Requiere migración de BD? NO

**Tiempo estimado: 30 minutos**

---

### P-22: Checklist marca "Fito México subido" basado solo en fitoMXNumero, no en la URL del archivo 🟠

**Descripción exacta**
- Archivo: `apps/api/src/services/expediente-checklist.service.ts`, línea 29
- Código actual:
  ```typescript
  { stage: 1, item: 'Fito México subido', ok: !!exp.fitoMXNumero },
  ```
- Por qué es un problema: si el usuario escribe el número del certificado sin subir el archivo PDF, el check aparece verde. El SIGIE requiere el archivo físico del certificado, no solo el número.

**Impacto en producción**
- Qué puede pasar: el agente cree que el certificado está completo, solicita SIGIE, y la solicitud es rechazada por falta del archivo adjunto.
- Quién se ve afectado: EMPRESA, AGENTE

**Solución exacta**
- Archivos a modificar: `apps/api/src/services/expediente-checklist.service.ts`
- Código correcto:
  ```typescript
  { 
    stage: 1, 
    item: 'Fito México subido', 
    ok: !!exp.fitoMXUrl && !!exp.fitoMXNumero,
    detail: !exp.fitoMXUrl ? 'Falta subir el archivo PDF' : !exp.fitoMXNumero ? 'Falta el número de certificado' : undefined
  },
  ```
- ¿Requiere migración de BD? NO

**Tiempo estimado: 30 minutos**

---

### P-23: sigieCredUser y sigieCredPass en schema.prisma como campos en claro 🟠

**Descripción exacta**
- Archivo: `apps/api/prisma/schema.prisma`, líneas 432–433
- Código actual:
  ```prisma
  sigieCredUser     String?
  sigieCredPass     String?
  ```
- Por qué es un problema: aunque el servicio usa `credentials-vault.ts` con AES-256-CBC para guardar credenciales en `UserCredentials`, el modelo `ImportExpediente` tiene campos de texto plano `sigieCredUser` y `sigieCredPass`. Si algún código llegara a escribir en estos campos, las credenciales quedarían en claro en la BD.

**Impacto en producción**
- Qué puede pasar: credenciales en texto plano en la base de datos si se usan por error.
- Quién se ve afectado: EMPRESA, AGENTE

**Solución exacta**
- Archivos a modificar: `apps/api/prisma/schema.prisma` + nueva migración
- Código correcto (eliminar los campos del schema):
  ```prisma
  // Eliminar estas dos líneas:
  // sigieCredUser     String?
  // sigieCredPass     String?
  ```
- Y crear migración:
  ```bash
  npx prisma migrate dev --name "remove_plaintext_creds_from_expediente"
  ```
- ¿Requiere migración de BD? SÍ

**Tiempo estimado: 1 hora**

---

### P-24: Formularios del wizard import/new sin react-hook-form + zod 🟡

**Descripción exacta**
- Archivo: `apps/web/src/app/(dashboard)/import/new/page.tsx`
- Los formularios usan `useState` con `TransportForm`, `SIGIEForm` — no hay react-hook-form ni zod.
- Los campos `licenciaSanitaria`, `pilotoId`, `cabezalId` no tienen mensajes de error por campo.
- Por qué es un problema: inconsistente con el resto de formularios del sistema; no hay validación client-side por campo; los errores solo aparecen en el banner global.

**Impacto en producción**
- Qué puede pasar: usuarios confundidos al no saber qué campo específico tiene error.
- Quién se ve afectado: EMPRESA (UX)

**Solución exacta**
- Archivos a modificar: `apps/web/src/app/(dashboard)/import/new/page.tsx`
- Migrar a react-hook-form en cada paso del wizard, usando `useForm` con `zodResolver`.
- ¿Requiere migración de BD? NO

**Tiempo estimado: 4 horas**

---

### P-25: Tipado `any` en componente Input del panel transporte 🟡

**Descripción exacta**
- Archivo: `apps/web/src/app/(dashboard)/dashboard/transporte/page.tsx`, línea 29
- Código actual:
  ```typescript
  function Input({ label, name, value, onChange, type = 'text' }: any) {
  ```
- Por qué es un problema: TypeScript no valida los props de este componente. Un error en el nombre del prop pasará sin advertencia en tiempo de compilación.

**Impacto en producción**
- Qué puede pasar: bugs silenciosos al pasar props incorrectos; menos seguridad de tipos en el componente más usado del panel.
- Quién se ve afectado: equipo de desarrollo

**Solución exacta**
- Archivos a modificar: `apps/web/src/app/(dashboard)/dashboard/transporte/page.tsx`
- Código correcto:
  ```typescript
  interface InputProps {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
  }
  function Input({ label, name, value, onChange, type = 'text' }: InputProps) {
  ```
- ¿Requiere migración de BD? NO

**Tiempo estimado: 30 minutos**

---

### P-26: Colores hex hardcodeados en archivos .tsx fuera de variables CSS 🟡

**Descripción exacta**
- Archivos afectados (código de muestra de `import/new/page.tsx`):
  - `style={{ background: 'var(--brand-primary)' }}` — correcto, usa variable CSS
  - Pero en `dashboard/transporte/page.tsx`, `admin/transporte/page.tsx` y otros hay clases de Tailwind que hacen referencia a colores inline.
- Los colores hex reportados en AUDITORIA.md: `#fff`, `#2563eb`, `#9CA3AF`, `#16a34a`, `#EF4444`, `#1e3a5f` en múltiples archivos.
- Por qué es un problema: inconsistencia con el sistema de diseño; dificulta theming.

**Impacto en producción**
- Qué puede pasar: inconsistencia visual entre páginas.
- Quién se ve afectado: TODOS (UX)

**Solución exacta**
- Archivos a modificar: todas las páginas TSX que usen `style={{ color: '#...' }}` o `style={{ background: '#...' }}`
- Código correcto: usar las variables CSS de `globals.css` o clases de Tailwind:
  ```typescript
  // En lugar de style={{ color: '#EF4444' }}
  className="text-red-500"
  // En lugar de style={{ color: '#16a34a' }}
  className="text-green-600"
  ```
- ¿Requiere migración de BD? NO

**Tiempo estimado: 2 horas**

---

### P-27: Inputs sin htmlFor/id asociados — accesibilidad rota 🟡

**Descripción exacta**
- Archivo: `apps/web/src/app/(dashboard)/import/new/page.tsx`, línea 99–102
- Código actual:
  ```typescript
  function FL({ children }: { children: React.ReactNode }) {
    return <label className="block text-xs font-medium text-gray-500 mb-1">{children}</label>;
  }
  ```
- El componente `FL` renderiza un `<label>` sin `htmlFor`. Los `<input>` usando `TI` no tienen `id`.
- Por qué es un problema: hacer click en el label no activa el input. Los lectores de pantalla no asocian label con input.

**Impacto en producción**
- Qué puede pasar: la plataforma es inutilizable para usuarios con discapacidad visual o cognitiva.
- Quién se ve afectado: TODOS (accesibilidad)

**Solución exacta**
- Archivos a modificar: `apps/web/src/app/(dashboard)/import/new/page.tsx`
- Código correcto:
  ```typescript
  function FL({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
    return <label htmlFor={htmlFor} className="block text-xs font-medium text-gray-500 mb-1">{children}</label>;
  }
  function TI({ id, value, onChange, ... }: { id?: string; ... }) {
    return <input id={id} ... />;
  }
  
  // Uso:
  <FL htmlFor="licenciaSanitaria">Licencia Sanitaria *</FL>
  <TI id="licenciaSanitaria" value={form.licenciaSanitaria} ... />
  ```
- ¿Requiere migración de BD? NO

**Tiempo estimado: 2 horas**

---

### P-28: settings/page.tsx es read-only sin funcionalidad de edición 🟡

**Descripción exacta**
- Archivo: `apps/web/src/app/(dashboard)/settings/page.tsx` (según AUDITORIA.md)
- Muestra nombre, email, rol y empresa pero sin capacidad de editar perfil ni cambiar contraseña.
- Por qué es un problema: el botón "Mi Cuenta" lleva a una página decorativa sin función.

**Impacto en producción**
- Qué puede pasar: usuarios no pueden cambiar su contraseña; necesitan contactar a un admin para actualizaciones de perfil.
- Quién se ve afectado: TODOS

**Solución exacta**
- Archivos a modificar: `apps/web/src/app/(dashboard)/settings/page.tsx`
- Agregar formularios de edición de perfil y cambio de contraseña usando `userRoutes.put('/profile', ...)` del backend.
- ¿Requiere migración de BD? NO

**Tiempo estimado: 3 horas**

---

### P-29: api.ts interceptor 401 no intenta refresh antes de redirigir 🟡

**Descripción exacta**
- Archivo: `apps/web/src/lib/api.ts`, líneas 16–24
- Código actual:
  ```typescript
  api.interceptors.response.use(
    (res) => res,
    async (error) => {
      if (error.response?.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('zyn_token');
        localStorage.removeItem('zyn_refresh_token');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );
  ```
- El refresh token de 30 días no se usa. Al primer 401 se hace logout inmediato.
- (Este problema está relacionado con P-17 y se resuelve con la misma solución.)

**Impacto en producción**
- Qué puede pasar: si el token de 7 días expira (o si se reduce a 15min), el usuario es expulsado en medio de su trabajo.
- Quién se ve afectado: TODOS

**Solución exacta**
- Ver solución en P-17 (misma corrección).
- ¿Requiere migración de BD? NO

**Tiempo estimado: incluido en P-17**

---

### P-30: activity-log.service.ts usa PrismaClient propio en lugar del singleton 🟡

**Descripción exacta**
- Archivo: `apps/api/src/services/activity-log.service.ts` (referenciado en AUDITORIA.md, línea 3: `new PrismaClient()`)
- Por qué es un problema: cada instancia de `PrismaClient` abre su propio pool de conexiones. El límite de conexiones de PostgreSQL en planes gratuitos de Railway es ~20. Múltiples instancias pueden agotar el pool.

**Impacto en producción**
- Qué puede pasar: agotamiento del pool de conexiones; errores `P2024 Timed out fetching a new connection from the connection pool`.
- Quién se ve afectado: TODOS (estabilidad del servidor)

**Solución exacta**
- Archivos a modificar: `apps/api/src/services/activity-log.service.ts`
- Código correcto:
  ```typescript
  // En lugar de: const prisma = new PrismaClient();
  import { prisma } from '../lib/prisma';
  ```
- ¿Requiere migración de BD? NO

**Tiempo estimado: 15 minutos**

---

### P-31: tracking.routes.ts manual event sin validación Zod del body 🟡

**Descripción exacta**
- Archivo: `apps/api/src/routes/tracking.routes.ts`, líneas 33–37
- Código actual:
  ```typescript
  trackingRoutes.post('/manual/:shipmentId', asyncHandler(async (req, res) => {
    const { status, description, location } = req.body;
    const event = await trackingService.addManualEvent(req.params.shipmentId, status, description, location);
    res.status(201).json({ success: true, data: event });
  }));
  ```
- Por qué es un problema: `status` y `description` pueden ser `undefined`, causando errores en `prisma.trackingEvent.create` con campos requeridos como `null`.

**Impacto en producción**
- Qué puede pasar: error 500 al intentar crear evento sin los campos requeridos.
- Quién se ve afectado: AGENTE, ADMIN

**Solución exacta**
- Archivos a modificar: `apps/api/src/routes/tracking.routes.ts`
- Código correcto:
  ```typescript
  import { z } from 'zod';
  const manualEventSchema = z.object({
    status: z.string().min(1),
    description: z.string().min(1),
    location: z.string().optional(),
  });
  
  trackingRoutes.post('/manual/:shipmentId', asyncHandler(async (req, res) => {
    const { status, description, location } = manualEventSchema.parse(req.body);
    const event = await trackingService.addManualEvent(req.params.shipmentId, status, description, location);
    res.status(201).json({ success: true, data: event });
  }));
  ```
- ¿Requiere migración de BD? NO

**Tiempo estimado: 30 minutos**

---

### P-32: Relaciones Piloto/Cabezal/Caja→TransportEmpresa sin onDelete explícito 🟡

**Descripción exacta**
- Archivo: `apps/api/prisma/schema.prisma`, líneas 505, 519, 534
- Código actual:
  ```prisma
  model Piloto {
    empresa      TransportEmpresa   @relation(fields: [empresaId], references: [id])
    // Sin onDelete especificado
  ```
- Por qué es un problema: Prisma por defecto aplica `onDelete: Restrict` para relaciones requeridas. Si se intenta hacer soft-delete (o delete real) de una `TransportEmpresa` que tiene pilotos activos, la operación fallará silenciosamente o con un error de FK.

**Impacto en producción**
- Qué puede pasar: el botón "Desactivar empresa" en el admin puede fallar si la empresa tiene pilotos/cabezales/cajas activos asociados a expedientes.
- Quién se ve afectado: ADMIN

**Solución exacta**
- Archivos a modificar: `apps/api/prisma/schema.prisma`
- Código correcto:
  ```prisma
  model Piloto {
    empresa      TransportEmpresa   @relation(fields: [empresaId], references: [id], onDelete: Restrict)
    // Restrict impide eliminar empresa si tiene pilotos — correcto para datos reales
  
  model Cabezal {
    empresa      TransportEmpresa   @relation(fields: [empresaId], references: [id], onDelete: Restrict)
  
  model Caja {
    empresa      TransportEmpresa   @relation(fields: [empresaId], references: [id], onDelete: Restrict)
  ```
- ¿Requiere migración de BD? SÍ (nueva migración para agregar FK constraint explícita)

**Tiempo estimado: 1 hora**

---

## SECCIÓN A — INVENTARIO COMPLETO DE ARCHIVOS

### Backend — apps/api/src/

| Archivo | Importado en index.ts | Tiene tests | Líneas aprox | Estado |
|---------|----------------------|-------------|--------------|--------|
| `routes/auth.routes.ts` | ✅ | ❌ | 12 | COMPLETO |
| `routes/user.routes.ts` | ✅ | ❌ | 187 | PARCIAL (P-10) |
| `routes/import-expediente.routes.ts` | ✅ | ❌ | 95 | COMPLETO |
| `routes/transport-catalog.routes.ts` | ✅ | ❌ | 184 | COMPLETO |
| `routes/customs.routes.ts` | ✅ | ❌ | 35 | PARCIAL (P-08) |
| `routes/payment.routes.ts` | ✅ | ❌ | 30 | COMPLETO |
| `routes/shipment.routes.ts` | ✅ | ❌ | 13 | COMPLETO |
| `routes/document.routes.ts` | ✅ | ❌ | 30 | PARCIAL (P-01 indirecta) |
| `routes/tracking.routes.ts` | ✅ | ❌ | 38 | PARCIAL (P-31) |
| `routes/automation.routes.ts` | ✅ | ❌ | 113 | COMPLETO |
| `routes/admin.routes.ts` | ✅ | ❌ | 189 | COMPLETO |
| `routes/quote.routes.ts` | ✅ | ❌ | ~50 | COMPLETO |
| `routes/stats.routes.ts` | ✅ | ❌ | ~30 | COMPLETO |
| `routes/food-import.routes.ts` | ✅ | ❌ | ~80 | COMPLETO |
| `services/import-expediente.service.ts` | ✅ (vía routes) | ❌ | 341 | PARCIAL (P-03, P-05, P-20, P-21) |
| `services/cfdi-parser.service.ts` | ✅ (vía service) | ❌ | 163 | PARCIAL (P-03) |
| `services/expediente-checklist.service.ts` | ✅ (vía routes) | ❌ | 60 | PARCIAL (P-22) |
| `services/pdf-generator.service.ts` | ✅ (vía service) | ❌ | 343 | COMPLETO |
| `services/auth.service.ts` | ✅ (vía controller) | ❌ | 74 | COMPLETO |
| `services/payment.service.ts` | ✅ (vía routes) | ❌ | 64 | PARCIAL (P-11) |
| `services/tracking.service.ts` | ✅ (vía routes) | ❌ | 63 | PARCIAL (P-12) |
| `services/activity-log.service.ts` | ✅ (vía routes) | ❌ | ~40 | PARCIAL (P-30) |
| `middleware/auth.ts` | ✅ | ❌ | 33 | COMPLETO |
| `middleware/rateLimiter.ts` | ✅ (parcial) | ❌ | 35 | PARCIAL (P-02) |
| `integrations/cloudinary.ts` | ✅ (vía service) | ❌ | 42 | COMPLETO |
| `integrations/stripe.ts` | ✅ (vía service) | ❌ | 23 | COMPLETO |
| `integrations/maersk.ts` | ✅ (vía routes) | ❌ | 50 | COMPLETO (con fallback) |
| `integrations/shipengine.ts` | ✅ (vía service) | ❌ | 30 | COMPLETO |
| `automation/sigie-maga.bot.ts` | ✅ (vía queue worker) | ❌ | 197 | PARCIAL (P-06) |
| `automation/sat-aduanas.bot.ts` | ✅ (vía queue worker) | ❌ | 208 | PARCIAL (P-06) |
| `automation/automation-queue.ts` | ✅ (vía routes) | ❌ | 70 | PARCIAL (P-06, degrada OK) |
| `utils/credentials-vault.ts` | ✅ (vía routes) | ❌ | 46 | COMPLETO |
| `utils/jwt.ts` | ✅ (vía middleware) | ❌ | 33 | PARCIAL (P-09) |

### Frontend — apps/web/src/app/

| Página | API real | Loading | Error | Empty state | Estado |
|--------|----------|---------|-------|-------------|--------|
| `(dashboard)/import/new/page.tsx` | ✅ | ✅ (spinner) | ✅ (banner) | N/A | PARCIAL (P-24, P-27) |
| `(dashboard)/dashboard/transporte/page.tsx` | ✅ | ✅ (texto) | ❌ | ✅ | PARCIAL (P-13, P-14, P-25) |
| `(dashboard)/admin/transporte/page.tsx` | ✅ | ✅ (texto) | ❌ | ✅ | COMPLETO |
| `(dashboard)/import/[id]/page.tsx` | ✅ | ✅ | ✅ | ✅ | COMPLETO |
| `(dashboard)/empresa/page.tsx` | ✅ | ✅ | ✅ | ✅ | COMPLETO |
| `middleware.ts` | N/A | N/A | N/A | N/A | COMPLETO |

---

## SECCIÓN B — FLUJO DE IMPORTACIÓN END-TO-END

### PASO 1: Usuario sube CFDI XML

- **Endpoint:** `POST /api/import/parse-cfdi` (multipart/form-data, campo `cfdi`)
- **Parser:** `parseCFDI()` en `cfdi-parser.service.ts` — usa `@xmldom/xmldom`, con fallback a regexp
- **Campos extraídos correctamente:**
  - `version`: ✅ (atributo `Version` del comprobante)
  - `folio`: ✅ (atributo `Folio` — pero se usa erróneamente como UUID)
  - `emisor.nombre`, `emisor.rfc`: ✅
  - `receptor.nombre`, `receptor.rfc`: ✅
  - `conceptos[]`: ✅ (array de conceptos del CFDI)
  - `comercioExterior.mercancias[]`: ✅ con `fraccionArancelaria`, `kilogramosNetos`, `valorDolares`
  - `comercioExterior.totalUSD`: ✅
  - `tipoCambio`: ✅
  - `incoterm` (inferido de `claveDePedimento`): ✅ (A1 → FOB)
  - `uuid` (del TimbreFiscalDigital): ❌ **NO SE EXTRAE** — ver P-03
  - `impNIT` (NumRegIdTrib del Receptor CE): ✅ con fallback a taxId de la empresa
- **SIGIEPermiso creados automáticamente:** ✅ — `import-expediente.service.ts` líneas 130–146
- **Frontend muestra productos editables:** ✅ — `import/new/page.tsx` líneas 421–454
- **Estado:** ⚠️ PARCIAL
- **Problema exacto:** `cfdiUUID` se asigna `cfdi.folio` en lugar del UUID del `TimbreFiscalDigital` (P-03)

---

### PASO 2: Datos de transporte

- **Endpoint:** `POST /api/import/transport/:id`
- **Validación:** Zod schema `transportSchema` (todos los campos opcionales)
- **Problema:** status cambia a `DOCS_GENERADOS` sin verificar documentos (P-20)
- **Frontend:** Selects de empresa/piloto/cabezal/caja con filtrado por empresa ✅
- **Estado:** ⚠️ PARCIAL (P-20)

---

### PASO 3: Generación de documentos

- **Endpoint:** `POST /api/import/generate-docs/:id`
- **Servicios usados:** `generateCartaPorteMX`, `generateCartaPorteGT`, `generatePackingList` en `pdf-generator.service.ts` ✅
- **Upload a Cloudinary:** ✅ — `uploadBuffer()` con `resource_type: 'raw'`
- **Validación:** solo verifica `pilotoId`, falta `cabezalId` y `cajaId` (P-21)
- **Estado:** ⚠️ PARCIAL (P-21)

---

### PASO 4: Fito México

- **Endpoint:** `POST /api/import/fito-mx/:id` (multipart/form-data, campo `fito`)
- **Upload a Cloudinary:** ✅ — guarda URL en `fitoMXUrl`
- **Checklist:** usa `!!exp.fitoMXNumero` en lugar de `!!exp.fitoMXUrl && !!exp.fitoMXNumero` (P-22)
- **Estado:** ⚠️ PARCIAL (P-22)

---

### PASO 5: SIGIE MAGA por producto

- **Endpoints:** `POST /api/import/sigie-permiso/:id` → `POST /api/automation/sigie/:id`
- **Bot:** `sigie-maga.bot.ts` está **implementado** con Playwright real (no es stub)
- **Problema crítico:** Playwright/Chromium no instalado en Railway (P-06)
- **Queue:** BullMQ con Redis — degradación graceful si Redis no está configurado
- **Estado:** ⚠️ PARCIAL (funciona en desarrollo, roto en producción por P-06)

---

### PASO 6: DUCA-D

- **Endpoint:** `POST /api/automation/sat/:id`
- **Verificación previa:** checklist `readyForDuca` bloquea si Stage 1 y 2 no están completos ✅
- **Bot:** `sat-aduanas.bot.ts` **implementado** con Playwright real (no es stub)
- **Mismo problema de Playwright en producción:** P-06
- **Estado:** ⚠️ PARCIAL (misma causa que PASO 5)

---

## SECCIÓN C — INTEGRACIONES: ESTADO REAL

### CLOUDINARY
- Archivo: `apps/api/src/integrations/cloudinary.ts` — **EXISTE** ✅
- Función `uploadDocument()`: **IMPLEMENTADA** ✅ (líneas 9–19)
- Función `uploadBuffer()`: **IMPLEMENTADA** ✅ (líneas 22–33)
- Función `deleteDocument()`: **IMPLEMENTADA** ✅
- Función `getSignedUrl()`: **IMPLEMENTADA** ✅
- Llamada desde servicios: `import-expediente.service.ts` (líneas 213–217), `document.service.ts`
- Variables de entorno en `.env.example`: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` ✅
- **Estado: CONECTADO** ✅

---

### STRIPE
- Archivo: `apps/api/src/integrations/stripe.ts` — **EXISTE** ✅
- Funciones: `createPaymentIntent`, `retrievePaymentIntent`, `constructWebhookEvent` — **IMPLEMENTADAS** ✅
- Llamada desde servicios: `payment.service.ts` ✅
- Webhook con raw body parsing correcto: ✅ (`index.ts` línea 47)
- Variables de entorno en `.env.example`: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLIC_KEY` ✅
- **Estado: CONECTADO** ✅ (modo test si key empieza con `sk_test_`)

---

### MAERSK
- Archivo: `apps/api/src/integrations/maersk.ts` — **EXISTE** ✅
- Función `getMaerskRates()`: **IMPLEMENTADA** con fallback a estimación interna ✅
- Variables de entorno en `.env.example`: `MAERSK_API_KEY` ✅
- **Estado: CONFIGURADO_SIN_USAR** ⚠️ (fallback siempre activo porque la API real requiere contrato)

---

### DHL
- Archivo: `apps/api/src/integrations/dhl.ts` — según AUDITORIA.md existe pero no fue leído directamente
- Variables de entorno en `.env.example`: `DHL_API_KEY` ✅
- Test en `admin.routes.ts` líneas 136–150 ✅
- **Estado: CONFIGURADO_SIN_USAR** ⚠️

---

### SHIPENGINE
- Archivo: `apps/api/src/integrations/shipengine.ts` — **EXISTE** ✅
- Función `trackShipment()`: **IMPLEMENTADA** ✅
- Variables de entorno en `.env.example`: `SHIPENGINEE_API_KEY` ❌ (typo — P-15)
- **Estado: CONFIGURADO** ⚠️ (typo en .env.example bloquea nuevos setups)

---

### SIGIE MAGA BOT (Playwright)
- `sigie-maga.bot.ts` **EXISTE**: ✅ (197 líneas)
- Playwright en `package.json`: ✅ `"playwright": "^1.44.0"` (producción)
- `npx playwright install` en railway.toml o Dockerfile: ❌ **NO EXISTE**
- Código del bot: **IMPLEMENTADO** (no es stub) — funciones `login`, `crearConstancia`, `consultarEstado`, `descargarPermiso`
- **Estado: PARCIAL** ⚠️ (implementado pero sin infraestructura de despliegue)

---

### SAT AGENCIA VIRTUAL BOT
- `sat-aduanas.bot.ts` **EXISTE**: ✅ (208 líneas)
- Playwright: mismo problema que SIGIE ❌
- Código del bot: **IMPLEMENTADO** — funciones `login`, `transmitirDUCAD`, `consultarSemaforo`, `generarPago`
- **Estado: PARCIAL** ⚠️ (mismo problema que SIGIE bot — P-06)

---

### BULLMQ QUEUE
- `automation-queue.ts` **EXISTE**: ✅ (70 líneas)
- Workers activos: ❌ (no hay archivo `worker.ts` separado — las colas se crean pero no hay `Worker` declarado)
- Redis configurado en `.env.example`: ❌ **FALTA** `REDIS_HOST` y `REDIS_PORT` (P-16)
- Degradación graceful: ✅ (si `REDIS_HOST` no está configurado, colas son `null` y el servidor no crashea)
- **Estado: CONFIGURADO** ⚠️ (colas se crean pero no hay workers que procesen los jobs)

> **Nota crítica sobre workers:** `automation-queue.ts` exporta las colas pero no crea Workers de BullMQ. Esto significa que los jobs se encolan pero nunca se procesan. Falta un archivo como `automation-worker.ts` que importe la cola y procese los jobs con `new Worker('sigie-jobs', async (job) => { ... })`.

---

## SECCIÓN D — SEGURIDAD DETALLADA

### D1. CORS — Configuración actual vs correcta

**CÓDIGO ACTUAL** (`apps/api/src/index.ts`, líneas 30–43):
```typescript
const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin)) {
      cb(null, true);
    } else {
      cb(null, true); // permissive during initial deployment  ← BUG
    }
  },
  credentials: true,
}));
```

**CÓDIGO CORRECTO**:
```typescript
const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, cb) => {
    // Requests sin origen (curl, Postman, mobile apps) — permitir
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin) || /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) {
      cb(null, true);
    } else {
      cb(new Error(`Origin '${origin}' not allowed by CORS policy`), false);
    }
  },
  credentials: true,
}));
```

---

### D2. Rate limiting — Mapa completo de rutas

| Ruta | Tiene rate limit | Límite actual | Debería tener |
|------|-----------------|---------------|---------------|
| `POST /api/auth/login` | ✅ `loginLimiter` | 5/15min (skip success) | ✅ OK |
| `POST /api/auth/register` | ✅ `registerLimiter` | 3/hora | ✅ OK |
| `GET /api/tracking/public/:n` | ✅ `trackingLimiter` | 30/min | ✅ OK |
| `POST /api/import/parse-cfdi` | ❌ solo `generalLimiter` (no aplicado) | ninguno | uploadLimiter 10/hora |
| `POST /api/import/generate-docs/:id` | ❌ | ninguno | 20/hora |
| `GET /api/import/list` | ❌ | ninguno | `generalLimiter` |
| `POST /api/automation/sigie/:id` | ❌ | ninguno | 5/hora (Playwright) |
| `POST /api/automation/sat/:id` | ❌ | ninguno | 2/hora (Playwright) |
| `POST /api/payments/initiate/:id` | ❌ | ninguno | 10/hora |
| `GET /api/documents/` | ❌ | ninguno | `generalLimiter` |
| `POST /api/documents/upload/:id` | ❌ | ninguno | uploadLimiter |
| `GET /api/customs/requirements/:hsCode` | ❌ (pública) | ninguno | `trackingLimiter` |
| `GET /api/admin/*` | ❌ | ninguno | `generalLimiter` |

---

### D3. Filtro de expedientes por AGENTE

**CÓDIGO ACTUAL** (`apps/api/src/services/import-expediente.service.ts`, línea 323):
```typescript
const where = ['AGENTE', 'ADMIN', 'SUPERADMIN'].includes(role) ? {} : { userId };
```

**CÓDIGO CORRECTO** (solución de corto plazo — sin migración):
```typescript
const where = role === 'ADMIN' || role === 'SUPERADMIN' 
  ? {} 
  : { userId };
// Esto hace que AGENTE solo vea los expedientes que ÉL creó
```

**CÓDIGO CORRECTO** (solución completa — con migración de BD):
```typescript
// schema.prisma: agregar campo agenteId a ImportExpediente
// agenteId  String?
// agente    User?  @relation("AgenteExpedientes", fields: [agenteId], references: [id])

const where = role === 'SUPERADMIN' || role === 'ADMIN'
  ? {}
  : role === 'AGENTE'
  ? { agenteId: userId }   // AGENTE solo ve expedientes donde está asignado
  : { userId };            // EMPRESA/TRANSPORTISTA solo ven los suyos
```

---

### D4. Credenciales SAT/SIGIE — Almacenamiento actual

- `credentials-vault.ts` **EXISTE**: ✅
- AES-256-CBC **IMPLEMENTADO**: ✅ (líneas 5, 15–28)
- Cómo se guardan actualmente: las credenciales se encriptan con AES-256-CBC antes de guardarse en el modelo `UserCredentials`. El IV aleatorio se prepende al texto cifrado: `iv_hex:encrypted_hex`.
- Cómo se guardan en `ImportExpediente`: los campos `sigieCredUser` y `sigieCredPass` existen en el schema pero (aparentemente) no hay código que los popule actualmente. Son un vestigio de un diseño anterior.
- Riesgo: si alguien agrega código que escriba en esos campos sin encriptar, las credenciales quedan en claro. Solución: P-23.

---

## SECCIÓN E — PLAN DE CORRECCIÓN PRIORIZADO

### HOY — Críticos (bloquean seguridad o funcionalidad core)

| # | Problema | Archivo | Línea | Tiempo | Impacto si no se corrige |
|---|---------|---------|-------|--------|--------------------------|
| 1 | CORS permisivo | `index.ts` | 39 | 15 min | Cualquier dominio hace requests autenticados |
| 2 | generalLimiter no aplicado | `index.ts` | (falta) | 15 min | Scraping masivo / DDoS sin restricción |
| 3 | AGENTE ve todos los expedientes | `import-expediente.service.ts` | 323 | 30 min (corto plazo) | Fuga de datos entre empresas competidoras |
| 4 | customs.routes.ts sin requireRole | `customs.routes.ts` | 15, 30 | 30 min | TRANSPORTISTA modifica registros aduaneros |
| 5 | REFRESH_TOKEN_SECRET predecible | `jwt.ts` + `.env.example` | 6 | 30 min | Refresh tokens forjables |
| 6 | cfdiUUID extrae campo incorrecto | `cfdi-parser.service.ts` + `import-expediente.service.ts` | 38, 107 | 2 h | UUID del SAT nunca se almacena correctamente |
| 7 | authStore no rehidrata user | `apps/web/src/app/(dashboard)/layout.tsx` | (falta) | 1 h | Flash de menú incorrecto por rol |

---

### ESTA SEMANA — Altos (afectan flujo principal)

| # | Problema | Archivo | Línea | Tiempo | Impacto |
|---|---------|---------|-------|--------|---------|
| 8 | Playwright no instalado en Railway | Dockerfile (crear) | nuevo | 4 h | Bot SIGIE/DUCA completamente roto en prod |
| 9 | Solo 1 migración con schema completo | prisma/migrations/ | — | 3 h | Riesgo de destruir datos en deploy |
| 10 | addTransportData cambia status incorrecto | `import-expediente.service.ts` | 160 | 30 min | Status del expediente no refleja realidad |
| 11 | generateDocuments sin validar cabezalId/cajaId | `import-expediente.service.ts` | 177 | 30 min | PDFs con placa en blanco rechazados en aduana |
| 12 | Checklist fitoMX solo verifica número | `expediente-checklist.service.ts` | 29 | 30 min | SIGIE solicitado sin archivo adjunto |
| 13 | Variables faltantes en .env.example | `.env.example` | — | 30 min | Nuevos deployments rompen en runtime |
| 14 | Typo SHIPENGINEE_API_KEY | `.env.example` | 9 | 5 min | ShipEngine nunca funciona en nuevos setups |
| 15 | payment.service sin paginación | `payment.service.ts` | 32 | 30 min | Timeout en cuentas con muchos pagos |
| 16 | tracking.service sin take | `tracking.service.ts` | 10 | 15 min | Respuesta lenta en embarques con muchos eventos |
| 17 | sigieCredUser/Pass en schema | `schema.prisma` | 432 | 1 h | Potencial leak de credenciales en claro |
| 18 | Workers de BullMQ ausentes | (nuevo archivo) | — | 4 h | Jobs SIGIE/SAT se encolan pero nunca se procesan |

---

### PRÓXIMA SEMANA — Medios (mejoran calidad)

| # | Problema | Archivo | Línea | Tiempo | Impacto |
|---|---------|---------|-------|--------|---------|
| 19 | Access token 7d + sin refresh en interceptor | `jwt.ts` + `api.ts` | 5, 20 | 2 h | Ventana de ataque de 7 días si token comprometido |
| 20 | Lógica de negocio en user.routes.ts | `user.routes.ts` | 71–109 | 2 h | Dificulta testing y mantenimiento |
| 21 | Dashboard transporte solo muestra primera empresa | `transporte/page.tsx` | 56 | 1 h | Transportista con múltiples empresas ve solo 1 |
| 22 | No hay tab de Envíos en panel transportista | `transporte/page.tsx` | — | 3 h | Transportista no ve sus cargas activas |
| 23 | No hay skeleton loaders | múltiples páginas | — | 4 h | CLS en páginas con datos |
| 24 | Ningún botón icon-only tiene aria-label | múltiples páginas | — | 2 h | Inaccesible para screen readers |
| 25 | Wizard sin react-hook-form + zod | `import/new/page.tsx` | — | 4 h | Sin validación client-side por campo |
| 26 | Tipado `any` en Input del transporte | `transporte/page.tsx` | 29 | 30 min | TypeScript no protege el componente |
| 27 | Colores hex hardcodeados en .tsx | múltiples archivos | — | 2 h | Inconsistencia visual |
| 28 | Inputs sin htmlFor/id | `import/new/page.tsx` | 99 | 2 h | Accesibilidad rota |
| 29 | settings/page.tsx read-only | `settings/page.tsx` | — | 3 h | Usuarios no pueden cambiar contraseña |
| 30 | activity-log.service usa PrismaClient propio | `activity-log.service.ts` | 3 | 15 min | Pool de conexiones puede agotarse |
| 31 | tracking manual event sin Zod | `tracking.routes.ts` | 34 | 30 min | Error 500 con body incompleto |
| 32 | onDelete no explícito en Piloto/Cabezal/Caja | `schema.prisma` | 505, 519, 534 | 1 h | Errores FK al desactivar empresas con flota |

---

## SECCIÓN F — DEUDA TÉCNICA

### F1. Código duplicado

1. **Lógica de hash + log en `user.routes.ts` y `auth.service.ts`**: el hash con `bcrypt.hash(data.password, 12)` aparece tanto en `auth.service.ts` línea 20 como en `user.routes.ts` línea 77. Debería estar únicamente en un servicio de usuario.

2. **Componente `Input` / `FL` / `TI` duplicado**: `dashboard/transporte/page.tsx` línea 29 define su propio `function Input(...)`. `admin/transporte/page.tsx` línea 35 define `function Field(...)`. `import/new/page.tsx` define `FL` y `TI`. Son esencialmente el mismo componente con nombres distintos. Deberían unificarse en `packages/ui/` o `components/shared/`.

3. **Lógica de soft-delete idéntica en transport-catalog**: el patrón `update({ where: { id }, data: { activo: false } })` se repite 4 veces (empresas, pilotos, cabezales, cajas). Podría ser un helper `softDelete(model, id)`.

4. **`Modal` duplicado**: `dashboard/transporte/page.tsx` línea 17 y `admin/transporte/page.tsx` línea 23 definen el mismo componente `Modal`. Debería estar en `components/shared/Modal.tsx`.

---

### F2. TODOs y FIXMEs en el código

Resultado de búsqueda `grep -rn "TODO|FIXME|HACK"` en `apps/api/src`: **0 resultados**.
Resultado de búsqueda en `apps/web/src`: **0 resultados**.

El codebase no tiene comentarios `TODO`, `FIXME` o `HACK` explícitos. Sin embargo, el comentario `// permissive during initial deployment` en `index.ts` línea 39 es funcionalmente un TODO no resuelto y el más crítico del proyecto.

---

### F3. Dependencias desactualizadas o riesgosas

**Backend (`apps/api/package.json`):**

| Dependencia | Versión actual | Riesgo |
|-------------|---------------|--------|
| `multer` | `1.4.5-lts.1` | ⚠️ Versión LTS de mantenimiento — el paquete principal `multer` v2 está en desarrollo |
| `@xmldom/xmldom` | `0.8.10` | ✅ Versión estable reciente |
| `bcryptjs` | `2.4.3` | ⚠️ Última release fue en 2018 — considerar `bcrypt` nativo o `argon2` |
| `express` | `4.19.2` | ✅ |
| `playwright` | `1.44.0` | ✅ (relativamente reciente al momento de la auditoría) |
| `xlsx` | no está en API | N/A |

**Frontend (`apps/web/package.json`):**

| Dependencia | Versión actual | Riesgo |
|-------------|---------------|--------|
| `xlsx` | `0.18.5` | 🔴 **Vulnerabilidad conocida**: esta versión tiene CVE de prototype pollution. Migrar a `exceljs` o `xlsx` 0.20+. |
| `next` | `14.2.35` | ✅ |
| `lucide-react` | `0.368.0` | ⚠️ Versión antigua (hay 0.400+). No critico pero mejora tree-shaking. |
| `jspdf` | `2.5.1` | ✅ |

**Acción recomendada para `xlsx`:**
```bash
npm uninstall xlsx
npm install exceljs
# O si se mantiene xlsx:
npm install xlsx@0.20.3
```

---

### F4. Archivos obsoletos

Basado en el análisis de importaciones:

1. **`apps/api/src/integrations/dhl.ts`** — existe pero no es llamado desde ningún servicio (solo desde `admin.routes.ts` para un ping test). No hay `dhlService` ni función de cotización DHL implementada.

2. **`apps/api/prisma/schema.prisma` campos `sigieCredUser` y `sigieCredPass`** en `ImportExpediente` — no son escritos por ningún servicio actualmente (ver credentials-vault). Son campos obsoletos del diseño inicial.

3. **`FoodImport` model** — existe en el schema (líneas 288–350) y hay una ruta `food-import.routes.ts`, pero `ImportExpediente` hace lo mismo de forma más completa. Los dos modelos coexisten sin justificación clara. `FoodImport` parece ser la versión original que fue reemplazada por `ImportExpediente`.

---

### F5. Estimación de esfuerzo total

| Categoría | Problemas | Tiempo estimado |
|-----------|-----------|----------------|
| Correcciones críticas — HOY (P-01 a P-07) | 7 problemas | ~4.5 horas |
| Correcciones altas — ESTA SEMANA (P-08 a P-23) | 11 problemas | ~16 horas |
| Workers BullMQ (nuevo archivo) | 1 tarea | ~4 horas |
| Correcciones medias — PRÓXIMA SEMANA (P-24 a P-32) | 14 problemas | ~22 horas |
| Deuda técnica (duplicados, dependencias, cleanup) | — | ~6 horas |
| **TOTAL** | **32 + extras** | **~52 horas** |

---

### Notas finales del auditor

1. El código fuente tiene una arquitectura sólida y coherente. Los 32 problemas son principalmente de **omisiones** (falta de rate limit, falta de validación, falta de filtro) más que de diseño fundamentalmente roto.

2. El flujo de importación MX→GT está **70% implementado**. Los bots de Playwright están completamente codificados — el problema principal es la infraestructura de deployment (Docker/Railway) y la ausencia de Workers para procesar los jobs.

3. Los **7 problemas críticos** pueden resolverse en un día de trabajo de un desarrollador experimentado. Los más urgentes son P-01 (CORS), P-02 (rate limit) y P-05 (filtro de expedientes) que son cambios de 1–3 líneas cada uno.

4. **Cero tests** en toda la codebase. Antes de agregar tests, se recomienda resolver P-10 (mover lógica a servicios) para que el código sea testeable.

<!-- Generado: 2026-04-30 -->
