# Auditoría AXON LOGISTIC — 2026-04-30

## Resumen ejecutivo

- Total problemas críticos (🔴): 7
- Total problemas altos (🟠): 11
- Total problemas medios (🟡): 14
- Porcentaje de completitud estimado: 68%

---

## Área 1 — Backend: Rutas y Lógica

### ✅ Lo que funciona bien

- Todas las rutas registradas en `index.ts` tienen su archivo correspondiente en `routes/`. No hay archivos de ruta "huérfanos" ni rutas registradas sin archivo.
- Rutas registradas: `/api/auth`, `/api/users`, `/api/quotes`, `/api/shipments`, `/api/documents`, `/api/tracking`, `/api/payments`, `/api/customs`, `/api/stats`, `/api/food-imports`, `/api/import`, `/api/automation`, `/api/admin`, `/api/transport`.
- `asyncHandler` envuelve prácticamente todos los handlers; no hay bloques try/catch manuales desnudos.
- Formato de respuesta `{ success, data, message }` se respeta en casi todas las rutas.
- `auth.routes.ts` tiene `loginLimiter` (5 intentos / 15 min) y `registerLimiter` (3 / hora).
- Zod está presente en todos los endpoints que reciben body (auth, users, transport-catalog, import-expediente, food-import, automation, admin credentials).
- bcrypt salt = 12 en todos los hashes (`auth.service.ts`, `user.routes.ts`).
- El campo `password` se excluye de todas las respuestas mediante desestructuración (`{ password: _pw, ...safe }`).

### 🔴 Crítico

- **CORS permisivo en producción** (`index.ts` línea 39): el callback de `origin` termina con `cb(null, true)` para cualquier origen no coincidente con el comentario `// permissive during initial deployment`. Esto nunca se quitó; en producción Railway/Vercel cualquier dominio puede hacer peticiones autenticadas con las cookies del usuario.
- **generalLimiter no aplicado globalmente**: `rateLimiter.ts` exporta `generalLimiter` (300 req/15 min) pero nunca se importa ni usa en `index.ts`. Las rutas de documentos, expedientes y pagos no tienen ningún rate-limit.

### 🟠 Alto

- **Lógica de negocio en `user.routes.ts`**: hash de contraseña, creación de empresa y log de actividad están directamente en el handler de ruta (líneas 71-109), no en un servicio. Viola la separación de capas documentada en `CLAUDE.md`.
- **`document.routes.ts` línea 21**: `findMany` con `take: 200` fijo y sin paginación real para listado de documentos por usuario ADMIN/SUPERADMIN — podría devolver grandes volúmenes.
- **`payment.service.ts` `getPaymentHistory`**: `findMany` sin `take` ni paginación. Para cuentas con muchos pagos retorna todo el historial sin límite.
- **`tracking.service.ts` `getEvents`**: `findMany` sin `take` ni paginación para eventos de tracking de un shipment.
- **`customs.routes.ts` rutas `POST /:shipmentId` y `PUT /:id/status`**: no tienen `requireRole()`. Cualquier usuario autenticado (incluyendo TRANSPORTISTA) puede crear/actualizar registros aduaneros de embarques ajenos, sin verificar que el `shipmentId` pertenezca al usuario.

### 🟡 Medio

- **`shipment.routes.ts`**: ninguno de los endpoints (`GET /`, `GET /:id`, `PUT /:id/status`, `DELETE /:id`) tiene `requireRole()`; cualquier rol puede cambiar el estado de un embarque ajeno si adivina el ID (aunque `shipmentService` sí filtra por `userId`).
- **`activity-log.service.ts` usa su propia instancia de `PrismaClient`** (línea 3) en lugar de la instancia singleton en `lib/prisma.ts`. Potencial conexión extra al pool.
- **`tracking.routes.ts` `POST /manual/:shipmentId`**: no hay validación Zod del body (`status`, `description`, `location`). Cualquier string puede llegar sin verificación.
- **`customs.routes.ts` `GET /requirements/:hsCode`** (ruta pública): no tiene `authenticate`. Está antes del `customsRoutes.use(authenticate)`, lo que es intencional pero el endpoint no tiene rate-limit propio.

---

## Área 2 — Frontend: Páginas y Componentes

### ✅ Lo que funciona bien

- `api.ts` usa `process.env.NEXT_PUBLIC_API_URL` como base con fallback a `localhost:3001`. No hay URLs hardcodeadas a dominios de producción.
- `react-query` (`@tanstack/react-query`) se usa consistentemente en todas las páginas con datos: `empresa/page.tsx`, `import/page.tsx`, `import/[id]/page.tsx`, `dashboard/transporte/page.tsx`, etc.
- Formularios de auth (`login`, `register`) y cotizaciones usan `react-hook-form` + `zodResolver`.
- Las páginas de expedientes y dashboard muestran estados de loading (spinner) y estado vacío (mensaje + botón de acción).
- `apps/web/src/app/(dashboard)/empresa/page.tsx` maneja `isLoading`, `isError` con botón "Reintentar".
- Las tablas con datos tienen `overflow-x-auto` en: `admin/logs`, `admin/usuarios`, `dashboard/admin`, `dashboard/agente`, `dashboard/empresa`, `documents`, `shipments`.
- Fonts: `globals.css` carga correctamente Syne + DM Sans + JetBrains Mono vía Google Fonts.

### 🔴 Crítico

- **authStore no rehidrata el `user`**: `persist` en `authStore.ts` usa `partialize: (s) => ({ token, refreshToken })` — solo persiste los tokens, no el objeto `user`. Al refrescar la página, `user` es `null` hasta que se hace una llamada al API. El sidebar/layout usa `user?.role` para renderizar el menú: si el render es inmediato puede mostrar menú incorrecto o ninguno durante el flash inicial. No hay llamada automática a `/api/users/me` al rehidratar.

### 🟠 Alto

- **Formularios del wizard `import/new/page.tsx` no usan react-hook-form + zod**: usan `useState` con validación manual inline. Los campos `licenciaSanitaria`, `pilotoId`, `cabezalId` no tienen mensajes de error por campo.
- **Formulario de transport (`dashboard/transporte/page.tsx`)** usa tipado `any` explícito en el componente `Input` (línea 29): `function Input({ label, name, value, onChange, type = 'text' }: any)`. TypeScript no protege este formulario.
- **Páginas sin manejo de `isError`**: `import/page.tsx` maneja solo `isLoading` pero no estado de error con mensaje visible. El usuario ve pantalla vacía si el API falla. (Mismo problema en `quotes/page.tsx`, `shipments/page.tsx`).
- **`api.ts` interceptor 401**: al recibir un 401 hace `window.location.href = '/login'` sin intentar el refresh token primero. El token de acceso es de 7 días (`JWT_EXPIRES_IN=7d`), pero si expira anticipadamente la sesión se pierde sin reintentar con el refresh.

### 🟡 Medio

- **Colores hexadecimales hardcodeados** en múltiples archivos `.tsx` fuera de `globals.css`: `layout.tsx` (`'#fff'`, `'rgba(255,255,255,0.60)'`), `usuarios/page.tsx` (`'#16a34a'`, `'#9ca3af'`, `'#fff'`), `import/page.tsx` (`'#2563eb'`), `import/[id]/page.tsx` (`'#9CA3AF'`, `'#E5E7EB'`, `'#EF4444'`), `MonthlyShipmentsChart.tsx` (`'#1e3a5f'`). Deberían usar variables CSS.
- **Ningún botón icon-only tiene `aria-label`**: grep encontró 0 usos de `aria-label` en todo el frontend. Botones como "Cerrar sesión" (solo ícono), "Reintentar" (ícono) y los botones de modal son inaccesibles para screen readers.
- **Inputs en wizard y panel transporte no tienen `<label>` asociado formalmente**: usan el componente `FL` (que renderiza un `<label>` sin `htmlFor`) y `Input` genérico sin `id` asociado, rompiendo la accesibilidad.
- **`/export/page.tsx`**: módulo en desarrollo, no tiene datos reales ni placeholder útil; el link existe en el nav de ADMIN.

---

## Área 3 — Flujo de Importación MX→GT

### ✅ Lo que funciona bien

- `cfdi-parser.service.ts` extrae correctamente: `cfdiUUID` (vía `folio`), `cfdiFolio`, `expNombre` (emisor.nombre), `expRFC`, `impNombre` (receptor.nombre), `impNIT` (vía `numRegIdTrib` en CE Receptor), `mercancias[]` con `fraccionArancelaria`, `kilogramosNetos`, `valorDolares`, `incoterm` (inferido de `claveDePedimento`), `totalUSD` y `tipoCambio`.
- Al parsear el CFDI se crean `SIGIEPermiso` automáticamente por cada producto del array `mercancias` (`import-expediente.service.ts` líneas 130-146).
- `getChecklist()` en `expediente-checklist.service.ts` verifica correctamente las 3 etapas: Stage 1 (documentos/transporte), Stage 2 (SIGIEPermisos aprobados), Stage 3 (DUCA lista). El campo "CFDI subido" usa condición multi-campo: `!!(exp.cfdiXmlUrl || exp.cfdiUUID || exp.cfdiFolio || exp.expRFC)`.
- Las tres funciones `generateCartaPorteMX`, `generateCartaPorteGT`, `generatePackingList` existen en `pdf-generator.service.ts` y se suben a Cloudinary en `import-expediente.service.ts` líneas 213-217.
- El wizard `import/new/page.tsx` preserva `expedienteId` en el estado `preview.expedienteId` a través de todos los pasos. Tiene el paso MAGA/SIGIE (paso 5). Los selects de transporte cargan desde catálogos vía react-query y filtran pilotos/cabezales/cajas por empresa seleccionada.

### 🔴 Crítico

- **`cfdiUUID` no se extrae del atributo correcto**: en `cfdi-parser.service.ts`, `uuid` debería venir del complemento `TimbreFiscalDigital` (atributo `UUID`), no del campo `Folio` del comprobante. El código asigna `cfdiUUID: cfdi.folio` en `import-expediente.service.ts` línea 107. Un CFDI puede no tener `Folio` (es opcional), y el UUID real del SAT está en `TimbreFiscalDigital`. Si el CFDI no tiene `Folio`, `cfdiUUID` queda `undefined`.

### 🟠 Alto

- **`addTransportData` cambia status a `DOCS_GENERADOS` sin verificar que los docs existan** (`import-expediente.service.ts` línea 162). El status debería cambiar solo al generar los PDFs, no al guardar transporte.
- **`generateDocuments` solo valida `pilotoId`** (línea 177): lanza error si no hay piloto, pero no valida que existan `cabezalId` y `cajaId`, que son igualmente requeridos para los PDFs.
- **El checklist Stage 1 marca "Fito México subido" basado solo en `fitoMXNumero`** (línea 29 de `expediente-checklist.service.ts`), no en `fitoMXUrl`. Si el número se ingresa sin subir el archivo, el check aparece verde.

### 🟡 Medio

- **Regexp fallback en `parseCFDIRegexp`**: si `@xmldom/xmldom` no está disponible, el parser regex retorna `conceptos: []` (línea 143), perdiendo todos los productos. El modo fallback es muy limitado.
- **`cfdiUUID` vs `cfdiFolio`** se usan intercambiablemente en el código: `import-expediente.service.ts` línea 108 asigna el mismo valor a ambos (`cfdi.folio`). El UUID del SAT es diferente al folio del emisor.

---

## Área 4 — Módulo de Transporte

### ✅ Lo que funciona bien

- Modelos `TransportEmpresa`, `Piloto`, `Cabezal`, `Caja` existen en `schema.prisma` (líneas 489-545) con relaciones correctas y `@@index` en `empresaId`.
- `transport-catalog.routes.ts` tiene CRUD completo: GET/POST/PUT/DELETE para Empresas, Pilotos, Cabezales y Cajas con Zod validation y requireRole.
- El panel `dashboard/transporte/page.tsx` tiene tabs Pilotos | Cabezales | Cajas, carga datos reales via react-query, y muestra estado vacío por tab.
- En el wizard `import/new/page.tsx` (paso 2), los selects de pilotos/cabezales/cajas se habilitan solo cuando se selecciona empresa y se filtran correctamente por `transporteEmpresaId`.

### 🟠 Alto

- **`dashboard/transporte/page.tsx` solo muestra la primera empresa** (`const empresa = empresas?.[0]`): un usuario TRANSPORTISTA asociado a múltiples empresas solo ve la primera. No hay selector de empresa.
- **No hay tab de "Envíos" en el panel transportista**: el nav de `layout.tsx` tiene un link a `/shipments` (label "Mis Envíos") pero el `dashboard/transporte/page.tsx` solo tiene tabs Pilotos/Cabezales/Cajas. No hay vista de los expedientes asignados al transportista.
- **DELETE en catálogos es soft-delete** (`activo: false`) pero `GET /empresas` filtra `activo: true` y el GET de pilotos/cabezales/cajas también — correcto. Sin embargo, no hay endpoint para listar inactivos ni para restaurarlos (SUPERADMIN podría necesitarlo).

### 🟡 Medio

- **Falta validación en el panel**: al agregar piloto, si `nombre` o `numLicencia` están vacíos, la mutación se envía sin validación client-side (el tipo `any` en `Input` impide detectarlo en tiempo de compilación). El backend valida con Zod pero el UX no da feedback inmediato.
- **El panel no muestra los expedientes activos del transportista**: un TRANSPORTISTA no puede saber qué embarques tiene actualmente asignados desde su dashboard.

---

## Área 5 — Seguridad

### ✅ Lo que funciona bien

- `helmet()` está configurado en `index.ts` (línea 29).
- Rate limiting en `/auth/login` (5 intentos / 15 min, `skipSuccessfulRequests: true`) y `/auth/register` (3 / hora).
- JWT con expiración: access token `7d`, refresh token `30d`.
- bcrypt salt = 12 en todos los hashes.
- El campo `password` nunca aparece en las respuestas de rutas (se excluye via desestructuración en `auth.service.ts` y `user.routes.ts`).
- Credenciales SIGIE/SAT se encriptan con AES-256-CBC antes de guardar en BD (`credentials-vault.ts`).
- `requireRole` está bien implementado y se usa en las rutas sensibles de admin, automation y transport.
- El modelo `UserCredentials` almacena contraseñas cifradas, no en claro.

### 🔴 Crítico

- **CORS no limita en producción** (ver Área 1): el callback termina devolviendo `true` para cualquier origen no listado. Equivale a `origin: '*'` en producción.
- **`generalLimiter` no se aplica** (ver Área 1): rutas de documentos, expedientes y payments no tienen rate-limit. Un atacante autenticado puede hacer scraping masivo o DDoS a nivel de aplicación.

### 🟠 Alto

- **Un AGENTE puede ver todos los expedientes de todas las empresas**: `import-expediente.service.ts` línea 323: `const where = ['AGENTE', 'ADMIN', 'SUPERADMIN'].includes(role) ? {} : { userId }`. El AGENTE recibe `where: {}` — sin filtro — y ve todos los expedientes del sistema, incluyendo los de empresas competidoras. Debería filtrarse por empresa asignada.
- **`customs.routes.ts` rutas de escritura sin `requireRole`**: `POST /:shipmentId` (crear registro aduanero) y `PUT /:id/status` (cambiar status aduanero) no tienen `requireRole`. Cualquier TRANSPORTISTA o EMPRESA puede modificar registros aduaneros. Solo el AGENTE/ADMIN debería poder hacerlo.
- **`REFRESH_TOKEN_SECRET` es opcional en env-validator**: si no se configura, el código usa `JWT_SECRET + '_refresh'` como fallback (ver `jwt.ts` línea 6). En producción Railway, si no se setea `REFRESH_TOKEN_SECRET`, todos los refresh tokens son predecibles a partir del `JWT_SECRET`.

### 🟡 Medio

- **`findByEmail` en `user.model.ts` incluye la contraseña hasheada** en el objeto retornado (sin `select`). `sanitizeUser` en `auth.service.ts` la excluye antes de responder, pero si alguien usa `userModel.findByEmail` en otro contexto sin sanitizar, podría filtrarse.
- **JWT `expiresIn: '7d'` es muy largo** para un access token: si se compromete un token, el atacante tiene 7 días de acceso. Lo estándar es 15-60 minutos con refresh automático.
- **`app.set('trust proxy', 1)`** es necesario para Railway, pero significa que el IP del rate-limit viene del header `X-Forwarded-For`. Si hay un proxy mal configurado, el rate-limit puede ser fácilmente eludido.

---

## Área 6 — Base de Datos

### ✅ Lo que funciona bien

- Modelos presentes en el schema: `Company`, `User`, `RefreshToken`, `Quote`, `Shipment`, `ShipmentStatusHistory`, `Document`, `TrackingEvent`, `Payment`, `CustomsRecord`, `FoodImport`, `ImportExpediente`, `UserCredentials`, `ActivityLog`, `TransportEmpresa`, `Piloto`, `Cabezal`, `Caja`, `SIGIEPermiso`. Total: 19 modelos.
- `@@index([userId])` en `Shipment`, `Payment`, `FoodImport`, `ImportExpediente`, `ActivityLog`, `UserCredentials`.
- `@@index([shipmentId])` en `Document`, `TrackingEvent`, `CustomsRecord`, `ShipmentStatusHistory`.
- `@@index([status])` en `Shipment`, `Quote`, `Payment`, `FoodImport`, `ImportExpediente`.
- `onDelete: Cascade` en relaciones críticas: `User→Shipment`, `Shipment→Document`, `Shipment→TrackingEvent`, `Shipment→Payment`, `SIGIEPermiso→ImportExpediente`, `User→RefreshToken`, etc.
- Seed tiene los 4 usuarios: `super@axon.gt`, `empresa@axon.gt`, `agente@axon.gt`, `transporte@axon.gt`. También tiene 3 expedientes de prueba y catálogos de transporte (TransportEmpresa, Piloto, Cabezal, Caja).

### 🔴 Crítico

- **Solo hay 1 migración** (`20260429010619_add_activity_log`): esta migración contiene el schema completo (CREATE TABLE de todos los modelos). Esto significa que si la base de datos en Railway ya tiene datos y se aplica esta migración, puede fallar o crear tablas duplicadas. No hay historial de evolución incremental del schema.

### 🟠 Alto

- **Modelos `Piloto`, `Cabezal`, `Caja` no tienen `onDelete` en la relación con `TransportEmpresa`**: si se elimina una `TransportEmpresa` (aunque sea soft-delete), los pilotos/cabezales/cajas de esa empresa huérfanos quedarían en BD (su `empresaId` aún apunta a la empresa eliminada). Debería ser `onDelete: Restrict` o `Cascade`.
- **`ImportExpediente` referencia `TransportEmpresa`, `Piloto`, `Cabezal`, `Caja` sin `onDelete`**: Prisma aplica `SetNull` por defecto en relaciones opcionales. Si se hace soft-delete de un piloto y luego se intenta restaurar el expediente, el vínculo se perdió.
- **`Payment` no tiene `@@index([shipmentId])`**: dado que `shipmentId` es `@unique`, Prisma crea índice único automáticamente, pero no está explícito en el schema como `@@index`, lo que puede confundir al hacer auditorías de performance.

### 🟡 Medio

- **Comparación entre CLAUDE.md y schema**: `CLAUDE.md` lista módulo "Clients" (CRM básico) y "Reports" (PDF/Excel), pero no hay modelos `Client` ni `Report` en el schema. El módulo Exportaciones tampoco tiene modelos propios.
- **`FoodImport` y `ImportExpediente` son modelos paralelos** que hacen cosas similares (ambos parsean CFDI, ambos tienen status de SIGIE, ambos calculan tributos). No hay migración que consolide o explique la coexistencia.
- **`sigieCredUser` y `sigieCredPass` en `ImportExpediente`** son campos en claro en el modelo (líneas 433-434 del schema). Aunque el servicio usa `credentials-vault` para guardar las credenciales encriptadas en `UserCredentials`, estos campos en `ImportExpediente` sugieren que en algún momento se pensó guardar credenciales en texto plano directamente en el expediente.

---

## Área 7 — Integraciones Externas

### ✅ Lo que funciona bien

- Los archivos de integración existen: `cloudinary.ts`, `dhl.ts`, `maersk.ts`, `shipengine.ts`, `stripe.ts` en `integrations/`.
- Los archivos de automatización existen: `automation-queue.ts`, `sat-aduanas.bot.ts`, `sigie-maga.bot.ts`, `sigie-maga.automation.ts`, `browser-manager.ts` en `automation/`.
- `cloudinary.ts` se usa en `document.service.ts` e `import-expediente.service.ts`. Cloudinary está operativo.
- `stripe.ts` se usa en `payment.service.ts`. El webhook tiene raw body parsing correcto.
- `automation-queue.ts` (BullMQ) se degrada gracefully si Redis no está configurado — no crashea el servidor, solo desactiva las colas.
- `env-validator.ts` valida: `DATABASE_URL`, `JWT_SECRET`, `CLOUDINARY_*`, `STRIPE_*`, `SHIPENGINE_API_KEY`, `MAERSK_API_KEY`, `DHL_API_KEY`, `CREDENTIALS_ENCRYPTION_KEY`, `REDIS_HOST/PORT`.

### 🔴 Crítico

- **`sigie-maga.bot.ts` existe pero el archivo llamado en la instrucción de auditoría como `sigie-maga.bot.ts` en realidad son dos archivos distintos**: `sigie-maga.bot.ts` y `sigie-maga.automation.ts`. La automatización real usa Playwright para navegar el portal SIGIE. Esto funciona en desarrollo, pero en Railway (servidor sin GUI) requiere `PLAYWRIGHT_HEADLESS=true` y el binario de Chromium instalado. No hay evidencia de que el Dockerfile o `railway.toml` instale Playwright/Chromium.

### 🟠 Alto

- **`.env.example` tiene un typo**: `SHIPENGINEE_API_KEY` (doble E) en lugar de `SHIPENGINE_API_KEY`. Un desarrollador que copie el `.env.example` tendrá la variable mal nombrada y ShipEngine no funcionará.
- **Variables faltantes en `.env.example`**: no documenta `REFRESH_TOKEN_SECRET`, `REDIS_HOST`, `REDIS_PORT`, `CREDENTIALS_ENCRYPTION_KEY`, `PLAYWRIGHT_HEADLESS`, `PLAYWRIGHT_TIMEOUT`, `FRONTEND_URL`. Son variables críticas que el env-validator sí conoce pero el `.env.example` no menciona.
- **`FEDEX_API_KEY` en `.env.example`** pero no hay integración `fedex.ts` en `integrations/` ni validación en `env-validator.ts`. Es confuso para nuevos desarrolladores.

### 🟡 Medio

- **`maersk.ts` y `dhl.ts` existen** pero la verificación de conexión en `admin.routes.ts` hace llamadas reales a sus APIs con las claves — si las claves no son válidas, los tests de integración del panel admin siempre fallarán.
- **`automation-queue.ts` usa `any` para el tipo de las colas** (`let sigieQueue: any = null`). Si BullMQ cambia su API, el error no se detecta en compilación.

---

## Área 8 — UX y Diseño

### ✅ Lo que funciona bien

- Sistema de diseño coherente: CSS custom properties en `globals.css` cubren colores, tipografía, radios, sombras y transiciones.
- Las 3 fuentes están declaradas correctamente: Syne (display), DM Sans (body), JetBrains Mono (mono).
- El sidebar tiene hamburger menu para móvil (`Menu` icon) con drawer animado y overlay (ver `layout.tsx`).
- La mayoría de las tablas principales tienen `overflow-x-auto`: logs, usuarios, dashboard admin/agente/empresa, documentos, shipments.
- Las páginas clave muestran estados vacíos con iconos y CTAs (`empresa/page.tsx`, `import/page.tsx`, `import/[id]/page.tsx`).

### 🟠 Alto

- **No hay skeletons en ninguna página**: ningún archivo usa `animate-pulse` ni `Skeleton`. Las páginas muestran `—` o texto "Cargando..." pero no skeleton loaders durante las peticiones. Esto genera CLS (Cumulative Layout Shift).
- **Ningún botón icon-only tiene `aria-label`**: 0 instancias encontradas en todo el frontend (grep confirma 0 usos). Los botones de cierre de modales, toggle de sidebar, logout, etc. son invisibles para lectores de pantalla.

### 🟡 Medio

- **Colores hex hardcodeados** en múltiples archivos `.tsx` (listados en Área 2): `#fff`, `#2563eb`, `#9CA3AF`, `#16a34a`, `#EF4444`, `#1e3a5f`. Deberían usar variables CSS del sistema de diseño.
- **Los inputs en el wizard y formularios inline no tienen `for`/`id` asociados**: el componente `FL` renderiza un `<label>` sin `htmlFor`, y los `<input>` no tienen `id`. Los usuarios con lupa o screen reader no pueden activar el campo haciendo click en el label.
- **`settings/page.tsx` es read-only**: muestra nombre, email, rol y empresa pero no tiene forma de editar el perfil ni cambiar contraseña. El botón "Mi Cuenta" en el nav lleva a una página sin funcionalidad.
- **`export/page.tsx` muestra "Módulo en desarrollo"** pero aparece en el nav de ADMIN/SUPERADMIN como una ruta completamente accesible. Debería marcarse como `disabled` o redirigir.

---

## Plan de acción priorizado

| Problema | Área | Severidad | Tiempo estimado |
|----------|------|-----------|-----------------|
| CORS permisivo en producción — cambiar `cb(null, true)` fallback a `cb(new Error('Not allowed'), false)` | 1, 5 | 🔴 Crítico | 15 min |
| `generalLimiter` no aplicado — agregar `app.use(generalLimiter)` en `index.ts` | 1, 5 | 🔴 Crítico | 15 min |
| `cfdiUUID` extrae `folio` en lugar del UUID de `TimbreFiscalDigital` | 3 | 🔴 Crítico | 2 h |
| authStore no rehidrata `user` — agregar llamada a `/api/users/me` en `onRehydrateStorage` | 2 | 🔴 Crítico | 1 h |
| AGENTE ve todos los expedientes sin filtro de empresa | 5 | 🔴 Crítico | 2 h |
| Playwright/Chromium no instalado en Railway para automatización SIGIE | 7 | 🔴 Crítico | 4 h |
| Solo 1 migración (schema completo) — riesgo de destruir datos en BD existente | 6 | 🔴 Crítico | 3 h |
| `customs.routes.ts` rutas de escritura sin `requireRole` | 5 | 🟠 Alto | 30 min |
| `REFRESH_TOKEN_SECRET` opcional — hardcodear como requerido en producción | 5 | 🟠 Alto | 30 min |
| Lógica de negocio en `user.routes.ts` — mover a `user.service.ts` | 1 | 🟠 Alto | 2 h |
| `payment.service.ts` `getPaymentHistory` sin paginación | 1, 6 | 🟠 Alto | 30 min |
| `tracking.service.ts` `getEvents` sin `take` | 1, 6 | 🟠 Alto | 15 min |
| Transporte dashboard muestra solo primera empresa (`empresas?.[0]`) | 4 | 🟠 Alto | 1 h |
| No hay tab de Envíos en panel transportista | 4 | 🟠 Alto | 3 h |
| Typo `SHIPENGINEE_API_KEY` en `.env.example` | 7 | 🟠 Alto | 5 min |
| Variables críticas faltantes en `.env.example` | 7 | 🟠 Alto | 30 min |
| Access token de 7d — reducir a 15-60 min con refresh automático en interceptor | 5 | 🟠 Alto | 2 h |
| No hay skeleton loaders — agregar `animate-pulse` en tablas y KPIs | 8 | 🟠 Alto | 4 h |
| Ningún botón icon-only tiene `aria-label` | 8 | 🟠 Alto | 2 h |
| `addTransportData` cambia status a DOCS_GENERADOS sin verificar documentos | 3 | 🟠 Alto | 30 min |
| `sigieCredUser/Pass` en `ImportExpediente` — campos en claro potencialmente peligrosos | 6 | 🟠 Alto | 1 h |
| Formularios del wizard sin react-hook-form + zod | 2 | 🟡 Medio | 4 h |
| Tipado `any` en componente `Input` del panel transporte | 2, 4 | 🟡 Medio | 30 min |
| Colores hex hardcodeados en `.tsx` | 2, 8 | 🟡 Medio | 2 h |
| Inputs sin `htmlFor`/`id` | 8 | 🟡 Medio | 2 h |
| `settings/page.tsx` sin funcionalidad de edición | 8 | 🟡 Medio | 3 h |
| Interceptor 401 no intenta refresh antes de redirigir | 2 | 🟡 Medio | 1 h |
| `activity-log.service.ts` usa PrismaClient propio en lugar de singleton | 1 | 🟡 Medio | 15 min |
| `tracking.routes.ts` manual event sin validación Zod | 1 | 🟡 Medio | 30 min |
| Modelos `FoodImport` e `ImportExpediente` duplican funcionalidad | 6 | 🟡 Medio | 8 h (consolidación) |
| Relaciones `Piloto/Cabezal/Caja→TransportEmpresa` sin `onDelete` explícito | 6 | 🟡 Medio | 1 h |
| `FEDEX_API_KEY` en `.env.example` sin integración real | 7 | 🟡 Medio | 15 min |
| `export/page.tsx` accesible en nav pero sin funcionalidad | 8 | 🟡 Medio | 30 min |
