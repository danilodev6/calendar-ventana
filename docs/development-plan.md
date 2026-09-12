# Plan de desarrollo — Reservas Casa

> Fuente de verdad para construir la v1 de manera incremental. Implementar **una sola fase por vez**, ejecutar sus validaciones y detenerse. La revisión y el commit son siempre manuales.

## 1. Producto, objetivo y alcance

### Descripción

Reservas Casa es una aplicación local, en español, para gestionar una única vivienda turística familiar. La pantalla principal es un calendario visual; además permite registrar y consultar reservas, administrar gastos y ver un balance simple.

### Objetivo

Reemplazar anotaciones dispersas por una herramienta doméstica clara que evite dobles reservas, conserve el historial y muestre un balance comprensible sin introducir complejidad hotelera o contable.

### Usuaria principal

Una sola persona, sin conocimientos técnicos, que usa una PC con Windows 11. La aplicación se abre desde un acceso directo, funciona en `localhost` y no requiere login en la v1. El desarrollo y las pruebas habituales se realizan en macOS.

### Alcance de la v1

- Una propiedad y una usuaria.
- Calendario con tres meses simultáneos en desktop.
- Alta, detalle, edición, cancelación y eliminación de reservas.
- Historial con búsqueda por huésped y filtros simples.
- Estados de reserva y de pago definidos en este documento.
- Gastos manuales y balance mensual/histórico.
- SQLite local, backups automáticos consistentes y lanzadores sencillos para Windows/macOS.
- Tests de reglas de dominio y smoke tests de flujos críticos.

### Fuera de alcance

- Múltiples propiedades, habitaciones, usuarios, roles o permisos.
- Autenticación, OAuth, acceso por Internet o sincronización entre equipos.
- Channel manager, CRM, inventario, housekeeping o facturación.
- Registro de movimientos individuales de pagos, cuotas o conciliación bancaria.
- Múltiples monedas; v1 muestra pesos argentinos (`ARS`) y no guarda una moneda por registro.
- Categorías de gastos, reportes avanzados o exportaciones.
- Backend separado, REST general, Redux, Redis, Docker, microservicios, CQRS, event sourcing, Repository Pattern, contenedor de inyección de dependencias o CRUD genérico.
- Electron/Tauri y empaquetado como aplicación de escritorio.

## 2. Stack propuesto

| Área | Elección | Motivo |
|---|---|---|
| Aplicación | Next.js estable, App Router, React, TypeScript estricto | Una sola aplicación con UI y servidor local, sin backend separado. Fijar versiones exactas al ejecutar la Fase 0. |
| Estilos/UI | Tailwind CSS + componentes puntuales de shadcn/ui + Lucide | Consistencia sin adoptar un design system grande. Copiar solo los componentes realmente usados. |
| Persistencia | Prisma ORM + SQLite | Modelo pequeño, archivo local y migraciones legibles. |
| Formularios | React Hook Form + Zod | Formulario fluido con el mismo esquema validado nuevamente en servidor. |
| Fechas | date-fns | Parseo, formato y cálculo de noches explícitos. |
| Calendario | FullCalendar React **Standard**, plugin Multi-Month | Ofrece vista multimes configurable y eventos como rangos. |
| Tests | Vitest + Testing Library; Playwright solo para pocos smoke tests | Tests rápidos de dominio y cobertura pequeña de flujos reales. |
| Package manager | npm | Viene con Node, funciona igual en macOS/Windows y reduce requisitos iniciales. Commit manual de `package-lock.json`. |

### Decisión sobre el calendario

Elegir FullCalendar Standard con la integración React y el plugin Multi-Month, condicionado a un spike visual en la Fase 8. La documentación oficial permite una vista `multiMonth` con duración arbitraria —se configurarán tres meses—, columnas máximas y ancho mínimo por mes. Los plugins Standard, incluido Multi-Month, usan licencia MIT; no se necesita Scheduler/Premium. Los eventos soportan `start`/`end` y el final es exclusivo, compatible con `[checkIn, checkOut)`. Referencias: [Multi-Month Grid](https://fullcalendar.io/docs/multimonth-grid), [modelo de evento y final exclusivo](https://fullcalendar.io/docs/event-object), [licencias](https://fullcalendar.io/license).

Ventajas: navegación y rangos ya resueltos, localización, click de eventos y una vista probada. Coste: CSS de terceros, componente cliente y personalización visual. No se habilitarán drag-and-drop, recursos, horarios ni plugins Premium. Si el spike no logra tres meses legibles, rangos continuos claros y accesibilidad razonable sin hacks extensos, detener la fase y documentar la comparación con un calendario propio; no cambiar de librería silenciosamente.

## 3. Decisiones arquitectónicas

### Forma de la aplicación

- Monolito Next.js ejecutado por un único proceso Node local.
- Server Components para páginas y lecturas iniciales.
- Client Components solo donde hay interacción: formularios, calendario, filtros y diálogos.
- Server Actions para crear/editar/cancelar/eliminar reservas y gastos. Son la opción más corta para formularios App Router, permiten validar en servidor y revalidar/navegar sin una API duplicada. Next.js las define como mecanismo de mutación mediante `POST`: [Mutating Data](https://nextjs.org/docs/app/getting-started/mutating-data).
- Route Handlers únicamente cuando existe un consumidor HTTP real: `GET /api/health` para el launcher y, solo si el calendario lo exige, una lectura JSON acotada. No crear una REST API paralela.
- Funciones puras en `src/domain/` para fechas, conflictos, dinero y balance. No crear clases, repositorios ni interfaces ceremoniales.
- Acceso a Prisma directo desde servicios/acciones server-only pequeños. Un singleton de Prisma evita clientes repetidos en desarrollo.

### Flujo de una mutación

`Formulario cliente -> Server Action -> Zod -> función de dominio -> transacción Prisma/SQLite -> revalidación/redirect -> mensaje humano`

Nunca confiar solo en la validación del navegador. Los errores esperables se devuelven como un resultado discriminado y serializable; los detalles técnicos se registran en el servidor y no se muestran a la usuaria.

### Concurrencia y superposición

SQLite no ofrece una restricción declarativa simple para rangos. Toda creación/edición cuyo resultado sea bloqueante debe pasar obligatoriamente por un mutex **local y acotado a las mutaciones de reservas**. Dentro del mutex se abre una transacción serializable, se consulta el conflicto y recién después se escribe. SQLite admite solo `Serializable` y es su nivel por defecto según [Prisma Transactions](https://www.prisma.io/docs/orm/prisma-client/queries/transactions). Si aparece `SQLITE_BUSY`, el reintento breve debe abarcar la operación completa —mutex, transacción, nueva consulta y escritura—, nunca solo el `create`/`update`. En la Fase 4 se hará un test de dos escrituras concurrentes. Esto es válido porque la v1 ejecuta un único proceso y el launcher impide instancias duplicadas; deberá reemplazarse por una garantía de base de datos al migrar a varios procesos.

### Cache

Las páginas con Prisma serán dinámicas. Tras una mutación, revalidar las rutas afectadas (`/`, `/reservas`, `/reservas/[id]`, `/balance`) de forma explícita. No agregar una capa de caché propia.

### Configuración y rutas

- Resolver `data/` y `backups/` desde una variable opcional (`RESERVAS_DATA_DIR`) o desde una ubicación estable relativa al directorio de instalación, usando `node:path`; nunca concatenar separadores ni hardcodear rutas de usuario.
- `.env` solo para configuración local no secreta como URL de SQLite. Incluir un `.env.example` cuando corresponda, nunca datos reales.
- La base real y backups deben quedar ignorados por Git; una base de test usa un archivo temporal independiente.

## 4. Reglas de negocio críticas

### Fechas y noches

- `checkIn` y `checkOut` son fechas civiles con formato canónico `YYYY-MM-DD`.
- Intervalo de ocupación: `[checkIn, checkOut)`. El día de salida no ocupa esa noche.
- `checkOut` debe ser estrictamente posterior a `checkIn`.
- Hay conflicto entre A y B si `A.checkIn < B.checkOut && A.checkOut > B.checkIn`.
- Al editar, excluir el propio registro: `id != currentReservationId`.
- `RESERVED` y `COMPLETED` bloquean rangos. `COMPLETED` bloquea fechas históricas porque representa una estadía real. `INQUIRY` y `CANCELLED` no bloquean.
- El calendario recibe el `end` sin sumar/restar días porque FullCalendar también usa final exclusivo.

### Estado de reserva

| Dominio | Etiqueta UI | Bloquea | Ingreso posible |
|---|---|---:|---:|
| `INQUIRY` | Consulta | No | No |
| `RESERVED` | Reservada | Sí | Sí, si está pagada completa |
| `CANCELLED` | Cancelada | No | No |
| `COMPLETED` | Finalizada | Sí, históricamente | Sí, si está pagada completa |

Cancelar conserva el registro y cambia el estado a `CANCELLED`; eliminar hace hard delete y se reserva a errores de carga. Ambas acciones requieren textos y confirmaciones diferentes.

### Dinero, pago e ingresos

- La v1 opera exclusivamente con pesos argentinos enteros, sin centavos. Guardar importes como `Int` no negativos (`totalAmount`, `depositAmount`, `amount`) evita punto flotante y mantiene sencilla la entrada usada por el negocio. Zod debe imponer el máximo de `Int` de Prisma; si el negocio necesitara centavos u otra moneda, requeriría una migración explícita, no floats.
- La seña debe ser menor o igual al total.
- `UNPAID` exige `depositAmount = 0`.
- `DEPOSIT_PAID` exige `depositAmount > 0` y `depositAmount < totalAmount`; si la seña cubre todo el total, el estado correcto es `PAID_FULL`.
- `PAID_FULL` puede conservar el importe de la seña original —incluso cero si se pagó todo directamente—, pero el Balance siempre ignora ese campo y cuenta solo el total.
- El saldo **no se persiste**. `pending = 0` si `paymentStatus === PAID_FULL`; en otro caso `max(total - deposit, 0)`.
- El Balance considera exactamente `totalAmount`, nunca `total + deposit`, únicamente si pago=`PAID_FULL` y estado=`RESERVED` o `COMPLETED`.
- `INQUIRY` y `CANCELLED` quedan excluidas aunque por datos previos figure pago completo.
- En v1 el ingreso se imputa al mes de `checkIn`. Es una medida de producción por estadía, no de caja por fecha de cobro.
- Consecuencia aceptada: marcar hoy como pagada una reserva de un mes anterior modifica retrospectivamente aquel mes. Si se necesita contabilidad por fecha de cobro, la mejora futura correcta es una entidad Payment; no inferir fechas ni reutilizar la seña.
- El balance histórico aplica las mismas reglas sin filtro mensual. Gastos se imputan por su propia fecha civil.

### Validaciones

- Obligatorios: nombre, teléfono, entrada y salida.
- Email opcional pero válido si existe; normalizar vacío a `null`.
- Cantidad de personas opcional, entera y positiva.
- Importes en rango seguro para enteros de JavaScript y no negativos.
- La consulta de conflicto devuelve nombre y fechas de la primera reserva incompatible para construir un mensaje como: “Estas fechas ya están ocupadas por la reserva de Laura Pérez del 12 al 16 de septiembre.”

## 5. Modelo de datos Prisma propuesto

SQLite no tiene un tipo fecha civil dedicado. Para evitar conversiones UTC, cambio de día por zona horaria y diferencias macOS/Windows, guardar `checkIn`, `checkOut` y `Expense.date` como `String` canónica `YYYY-MM-DD`. Ese formato ordena lexicográficamente igual que cronológicamente. Zod y helpers de dominio impiden cadenas inválidas; nunca construir estas fechas mediante `new Date('YYYY-MM-DD')` para lógica de negocio. `createdAt`/`updatedAt` sí son instantes técnicos `DateTime`.

Prisma documenta que `DateTime` se traduce a almacenamiento SQLite y que sus adaptadores recientes pueden usar ISO 8601, pero eso sigue representando timestamp, no el concepto de fecha civil requerido: [SQLite connector](https://docs.prisma.io/docs/orm/overview/databases/sqlite).

### `Reservation`

| Campo | Tipo Prisma | Null | Regla |
|---|---|---:|---|
| `id` | `String @id @default(cuid())` | No | Identificador opaco. |
| `guestName` | `String` | No | Trim, longitud razonable. |
| `phone` | `String` | No | Texto, no número; conserva `+`, espacios y ceros. |
| `dni` | `String?` | Sí | Texto para no perder formato. |
| `email` | `String?` | Sí | Minúsculas/trim según decisión de implementación. |
| `originCity` | `String?` | Sí | Localidad libre. |
| `guestCount` | `Int?` | Sí | Mayor que cero. |
| `notes` | `String?` | Sí | Texto libre con límite razonable. |
| `checkIn` | `String` | No | Fecha civil canónica. |
| `checkOut` | `String` | No | Posterior a entrada. |
| `status` | `ReservationStatus` | No | Default `INQUIRY`. |
| `paymentStatus` | `PaymentStatus` | No | Default `UNPAID`. |
| `totalAmount` | `Int` | No | Pesos enteros, default 0, no negativo. |
| `depositAmount` | `Int` | No | Pesos enteros, default 0, entre 0 y total. |
| `channel` | `BookingChannel` | No | Default `DIRECT`. |
| `createdAt` | `DateTime @default(now())` | No | Auditoría técnica. |
| `updatedAt` | `DateTime @updatedAt` | No | Auditoría técnica. |

Enums: `ReservationStatus { INQUIRY RESERVED CANCELLED COMPLETED }`, `PaymentStatus { UNPAID DEPOSIT_PAID PAID_FULL }`, `BookingChannel { DIRECT AIRBNB BOOKING OTHER }`. SQLite puede almacenar enums como texto sin imponer todos sus valores a nivel motor; Zod y Prisma son parte de la defensa.

Índices útiles y suficientes:

- `@@index([status, checkIn, checkOut])` para buscar conflictos y filtros temporales.
- `@@index([checkIn])` para calendario/balance.
- No indexar nombre inicialmente: el volumen es mínimo y la búsqueda parcial no aprovecharía un índice simple de forma fiable.

### `Expense`

| Campo | Tipo Prisma | Null | Regla |
|---|---|---:|---|
| `id` | `String @id @default(cuid())` | No | Identificador opaco. |
| `date` | `String` | No | Fecha civil `YYYY-MM-DD`. |
| `description` | `String` | No | Trim, no vacía. |
| `amount` | `Int` | No | Pesos enteros, mayor que cero. |
| `createdAt` | `DateTime @default(now())` | No | Auditoría técnica. |
| `updatedAt` | `DateTime @updatedAt` | No | Auditoría técnica. |

Índice: `@@index([date])`. No hay relaciones: la v1 no adjudica un gasto a una reserva.

## 6. Estructura conceptual

```text
calendar-ventana/
├── docs/
│   └── development-plan.md
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── data/                    # ignorado por Git; app.db real
├── backups/                 # ignorado por Git; snapshots validados
├── scripts/                 # backup, launcher y utilidades cross-platform
├── src/
│   ├── app/
│   │   ├── (app)/           # layout con sidebar
│   │   │   ├── page.tsx     # Calendario
│   │   │   ├── reservas/
│   │   │   └── balance/
│   │   └── api/health/
│   ├── components/
│   │   ├── layout/
│   │   ├── reservations/
│   │   ├── calendar/
│   │   ├── balance/
│   │   └── ui/              # solo piezas shadcn usadas
│   ├── domain/              # funciones puras y tipos de negocio
│   ├── server/              # Prisma, queries, actions server-only
│   └── lib/                 # formato, paths y utilidades pequeñas
└── tests/                   # integración/smoke cuando aporte claridad
```

Los nombres se pueden ajustar durante el bootstrap, pero conservar la separación simple: UI, reglas puras y acceso server-only. No crear una capa por cada verbo CRUD.

## 7. Sistema visual de v1

### Layout

- Desktop-first. Sidebar fijo a la izquierda, altura completa y ancho aproximado de 260–300 px; contenido con ancho cómodo y scroll independiente.
- Exactamente cuatro accesos principales, grandes y siempre visibles: Calendario, Nueva reserva, Todas las reservas y Balance.
- Icono grande, etiqueta grande, área pulsable mínima de 48 px y estado activo evidente por fondo, contraste y marcador; no depender solo del color.
- En anchos menores, adaptación básica a una barra superior o navegación visible; móvil no condiciona la arquitectura de v1.

### Componentes y lenguaje

- Tipografía base de al menos 16 px; títulos 28–36 px; espacios generosos.
- Un único botón primario sólido por contexto. Secundarios con borde. Destructivo rojo y con texto explícito.
- Etiquetas siempre visibles sobre inputs; no usar placeholder como única etiqueta.
- Cards para grupos “Datos del huésped”, “Estadía”, “Reserva” y “Pago”.
- Tabla de historial simple, con filas cómodas y acción textual “Ver”; sin menús de tres puntos.
- Badges de estado con texto e icono además de color. Paleta sugerida: Consulta ámbar, Reservada azul/verde, Cancelada rojo/gris, Finalizada violeta/gris; comprobar contraste WCAG AA.
- Dinero alineado y formateado con `Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })` mediante un helper único.
- Fechas visibles como `dd/MM/yyyy` o texto español, aunque se almacenen ISO civil.

### Feedback y estados

- Botones muestran “Guardando…” y se deshabilitan durante envío para evitar dobles acciones.
- Éxito: mensaje breve visible y navegación predecible al detalle.
- Error de campo junto al input; error de negocio en bloque destacado con lenguaje humano.
- Confirmación diferenciada: “Cancelar reserva” explica que conserva historial y libera fechas; “Eliminar definitivamente” explica que borra el registro.
- Empty states con próxima acción: “Todavía no hay reservas” + “Nueva reserva”; “No hay gastos este mes” + “Agregar gasto”.
- Skeleton o mensaje “Cargando…” en transiciones que realmente demoren; no añadir spinners a contenido instantáneo.
- Foco visible, navegación por teclado, `aria-label` en iconos y botones con icono + texto en acciones principales.

## 8. Plan incremental por fases

### Fase 0 — Bootstrap reproducible y herramientas mínimas

#### Objetivo

Obtener una aplicación Next.js vacía que arranque en macOS/Windows y tenga comandos de calidad, sin funcionalidad de negocio.

#### Archivos/componentes involucrados

`package.json`, lockfile npm, configuración Next/TypeScript/Tailwind/ESLint, `.gitignore`, `.env.example`, `src/app/*`, configuración Vitest.

#### Implementación

1. Inicializar Next.js con App Router, TypeScript, `src/`, Tailwind y ESLint en el directorio actual.
2. Antes del primer commit, inicializar Git manualmente en `calendar-ventana` y revisar el `.gitignore`. El agente no ejecuta `git init` salvo autorización explícita; la revisión y todos los commits siguen siendo humanos.
3. Fijar y documentar Node LTS y npm mínimos (por ejemplo `.nvmrc` más `engines`; comprobar alternativa Windows en README cuando se cree).
4. Instalar únicamente las dependencias del stack que vayan a usarse de inmediato; fijar versiones resueltas en `package-lock.json`.
5. Agregar scripts cross-platform: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:run`. Evitar comandos Unix dentro de scripts npm.
6. Configurar alias `@/*`, TypeScript estricto y un test mínimo del runner.
7. Dejar la portada mínima de bootstrap; no crear todavía pantallas de negocio.

#### Reglas de negocio involucradas

Ninguna.

#### Tests

- El runner descubre y ejecuta un test mínimo.
- TypeScript y lint sobre el proyecto inicial.

#### Validación manual

- En macOS y, si está disponible, Windows: instalar con `npm ci`, ejecutar dev y abrir `http://localhost:3000`.
- Confirmar que ningún path del proyecto depende de Unix.

#### Comandos

```text
npm ci
npm run dev
npm run lint
npm run typecheck
npm run test:run
npm run build
```

#### Criterios de aceptación

- [ ] App Router abre una portada mínima.
- [ ] El directorio es un repositorio Git inicializado y `.gitignore` fue revisado antes del primer commit manual.
- [ ] Existe un único lockfile npm.
- [ ] Lint, tipos, tests y build pasan.
- [ ] No hay modelo Prisma ni funcionalidad adelantada.

#### Commit sugerido

`chore: bootstrap Next.js application and quality scripts`

**STOP. Esperar revisión humana y commit manual antes de continuar.**

---

### Fase 1 — Shell visual y navegación estática

#### Objetivo

Poder recorrer desde temprano las cuatro secciones con una interfaz clara, todavía sin datos.

#### Archivos/componentes involucrados

Layout del grupo principal, sidebar, estilos globales, componentes UI mínimos, páginas placeholder de calendario, nueva reserva, todas las reservas y balance.

#### Implementación

1. Incorporar solo componentes shadcn necesarios (`Button`, `Card`, quizá `Badge`) y Lucide.
2. Construir sidebar de altura completa con exactamente las cuatro opciones exigidas y estado activo según ruta.
3. Hacer `/` la ruta Calendario; crear `/reservas/nueva`, `/reservas` y `/balance`.
4. Agregar encabezados, espacios, foco visible y comportamiento básico para ancho reducido.
5. Centralizar etiquetas de navegación; no agregar configuración ni submenús.

#### Reglas de negocio involucradas

- Calendario es la pantalla inicial.
- Solo existen cuatro opciones principales.

#### Tests

- Test de componente: muestra las cuatro etiquetas y marca la ruta activa.
- Verificación accesible de links y foco.

#### Validación manual

- Navegar por las cuatro opciones a tamaño desktop y ventana angosta.
- Confirmar que no hay enlaces ocultos y que cada objetivo es fácil de pulsar.

#### Comandos

`npm run dev`, `npm run lint`, `npm run typecheck`, `npm run test:run`

#### Criterios de aceptación

- [ ] `/` abre Calendario.
- [ ] Sidebar ocupa la altura y contiene exactamente cuatro opciones grandes.
- [ ] La sección activa es inequívoca.
- [ ] Todas las rutas placeholder funcionan.
- [ ] Checks automáticos pasan.

#### Commit sugerido

`feat(ui): add application shell and primary navigation`

**STOP. Esperar revisión humana y commit manual antes de continuar.**

---

### Fase 2 — Dominio puro: fechas, conflictos y dinero

#### Objetivo

Codificar y probar las reglas que no deben depender de React ni Prisma.

#### Archivos/componentes involucrados

Módulos `domain/date`, `domain/reservations`, `domain/money`, `domain/balance`, esquemas Zod compartidos y tests unitarios.

#### Implementación

1. Crear parser/validador estricto de fecha civil y helpers de formato/cantidad de noches sin conversiones UTC implícitas.
2. Implementar `rangesOverlap` y `blocksAvailability`.
3. Implementar filtro de conflictos con exclusión opcional por id.
4. Implementar validación Zod completa de reserva y gasto, incluyendo normalización de opcionales.
5. Implementar parseo seguro de importes en pesos enteros, saldo derivado y elegibilidad/monto de ingreso.
6. Implementar agregación pura mensual/histórica de ingresos, gastos y resultado.

#### Reglas de negocio involucradas

Todas las de fechas, superposición, saldo, ingreso y gastos de las secciones 4 y 5.

#### Tests

- Solapamientos parcial, total, contenido e idéntico.
- Check-out/check-in el mismo día no se superpone.
- Consulta y Cancelada no bloquean; Reservada y Finalizada sí.
- Edición excluye su propio id pero detecta otro.
- Salida debe ser posterior; años bisiestos y fechas inexistentes se rechazan.
- Saldo normal y pagado completo dan cero; una seña igual al total exige estado Pagado completo.
- Sin pagar con seña se rechaza; Seña pagada con importe cero se rechaza; Pagado completo conserva una seña previa sin duplicarla.
- Seña nunca se suma al ingreso.
- Pagada completa aporta exactamente el total; Sin pagar/Seña pagada no aportan.
- Consulta y Cancelada pagadas quedan fuera.
- Balance mensual usa mes de check-in; histórico no filtra; gastos usan su fecha; resultado puede ser negativo.
- Importes negativos, seña mayor al total y huéspedes no positivos se rechazan.

#### Validación manual

- Leer los casos como ejemplos de negocio; no hay flujo nuevo en navegador.
- Ejecutar tests en una zona horaria distinta si es sencillo (`TZ` solo como comando de diagnóstico, no como dependencia del producto).

#### Comandos

`npm run lint`, `npm run typecheck`, `npm run test:run`

#### Criterios de aceptación

- [ ] Las reglas son funciones puras sin imports de Next/Prisma/React.
- [ ] Los casos críticos solicitados tienen nombres de test legibles.
- [ ] Las fechas adyacentes son válidas.
- [ ] La seña no duplica ingresos.
- [ ] Checks pasan.

#### Commit sugerido

`feat(domain): add tested reservation and balance rules`

**STOP. Esperar revisión humana y commit manual antes de continuar.**

---

### Fase 3 — Persistencia Prisma + SQLite

#### Objetivo

Crear el modelo mínimo y comprobar lecturas/escrituras aisladas sobre una base de desarrollo.

#### Archivos/componentes involucrados

`prisma/schema.prisma`, configuración Prisma, primera migración, cliente singleton, paths de datos, `.gitignore`, helpers/fixtures de test.

#### Implementación

1. Instalar/configurar Prisma y el driver SQLite compatible con la versión fijada.
2. Implementar exactamente `Reservation`, `Expense`, enums e índices descritos; no persistir saldo.
3. Ubicar desarrollo en `data/app.db` y tests en archivos temporales únicos.
4. Crear y revisar la migración inicial; no usar `db push` como flujo normal.
5. Crear cliente server-only y desconexión limpia para scripts/tests.
6. Agregar una prueba de integración que migre una base temporal, cree y lea ambos modelos.

#### Reglas de negocio involucradas

- Fecha civil se guarda como string canónica.
- Dinero se guarda como entero de pesos ARS.
- Solo dos entidades, sin relaciones innecesarias.

#### Tests

- Round-trip conserva exactamente fechas `YYYY-MM-DD` e importes enteros.
- Defaults/enums esperados.
- La base de test nunca toca `data/app.db`.

#### Validación manual

- Inspeccionar la migración SQL.
- Abrir Prisma Studio solo si se desea y verificar campos; no cargar datos reales todavía.

#### Comandos

```text
npx prisma validate
npx prisma migrate dev
npm run test:run
npm run lint
npm run typecheck
```

#### Criterios de aceptación

- [ ] Migración reproducible desde una base vacía.
- [ ] Solo existen Reservation y Expense.
- [ ] `data/*.db*` y `backups/` están ignorados.
- [ ] Saldo no está persistido.
- [ ] Test de persistencia y checks pasan.

#### Commit sugerido

`feat(data): add minimal Prisma SQLite schema`

**STOP. Esperar revisión humana y commit manual antes de continuar.**

---

### Fase 4 — Servicio transaccional de reservas

#### Objetivo

Garantizar en servidor que una escritura no cree ocupaciones incompatibles.

#### Archivos/componentes involucrados

Servicio server-only de reservas, consulta de conflictos, mapeo de errores y tests de integración con SQLite.

#### Implementación

1. Crear funciones pequeñas para listar por rango, obtener por id, crear y actualizar.
2. En create/update: validar Zod, abrir transacción serializable, consultar cualquier `RESERVED`/`COMPLETED` con `checkIn < nuevoCheckOut` y `checkOut > nuevoCheckIn`, excluyendo id actual, y recién después escribir.
3. Revalidar conflicto solo cuando el resultado de la mutación sea bloqueante; aun así validar siempre fechas y datos.
4. Traducir conflicto, registro inexistente y busy agotado a errores de dominio humanos.
5. Envolver obligatoriamente las mutaciones bloqueantes en el mutex local descrito; si se reintenta por `SQLITE_BUSY`, repetir la transacción completa desde la consulta.
6. Ejecutar una prueba concurrente repetible de dos altas solapadas que demuestre que solo una persiste.

#### Reglas de negocio involucradas

- `[checkIn, checkOut)`.
- Consultas/canceladas no bloquean.
- Finalizadas preservan ocupación histórica.
- La reserva editada no choca consigo misma.
- Validación obligatoriamente server-side.

#### Tests

- Dos confirmadas solapadas: solo una persiste.
- Dos rangos adyacentes persisten.
- Varias consultas iguales persisten.
- Consulta sobre una confirmada persiste.
- Cancelada no bloquea; Finalizada sí.
- Consulta que cambia a Reservada vuelve a validar.
- Cambio de fechas/estado al editar valida y excluye el id propio.
- Mensaje de conflicto contiene huésped y fechas sin detalles técnicos.

#### Validación manual

- Por ahora mediante tests y, opcionalmente, Prisma Studio. No crear endpoints temporales.

#### Comandos

`npm run test:run`, `npm run lint`, `npm run typecheck`

#### Criterios de aceptación

- [ ] Ninguna entrada pública escribe una reserva bloqueante sin mutex local y consulta de conflicto dentro de la transacción.
- [ ] La carrera concurrente está cubierta.
- [ ] Los errores son de dominio y aptos para UI.
- [ ] Todos los tests pasan.

#### Commit sugerido

`feat(reservations): enforce server-side availability rules`

**STOP. Esperar revisión humana y commit manual antes de continuar.**

---

### Fase 5 — Alta de reserva completa

#### Objetivo

Entregar el primer flujo vertical usable: crear una consulta o reserva desde el navegador.

#### Archivos/componentes involucrados

Página `/reservas/nueva`, formulario React Hook Form, campos UI, Server Action `createReservation`, mensajes y redirect.

#### Implementación

1. Diseñar formulario en grupos cortos: huésped/estadía primero, luego administración/economía y opcionales.
2. Mostrar todos los campos requeridos por alcance, con defaults Consulta, Sin pagar y Directa.
3. Integrar RHF con Zod para feedback inmediato y volver a ejecutar el mismo esquema en Server Action.
4. Convertir montos a pesos enteros en el límite del servidor; rechazar decimales y no enviar floats a Prisma.
5. Invocar el servicio de Fase 4, mostrar conflicto humano y conservar valores introducidos.
6. Botones visibles “Cancelar” (vuelve sin guardar) y “Guardar reserva” primario; bloquear doble envío.
7. Tras éxito, redirigir al detalle aunque esa página inicialmente sea mínima.

#### Reglas de negocio involucradas

Validaciones de formulario, importes, fechas, estados y superposición.

#### Tests

- Test de Server Action/servicio con payload válido e inválido.
- Test de formulario: obligatorios, email opcional, seña mayor al total y loading.
- Smoke de alta de Consulta y de conflicto de Reservada (puede ser integración de componente en esta fase y E2E luego).

#### Validación manual

- Crear Consulta mínima; crear Reserva con todos los campos.
- Probar fechas adyacentes y una superposición.
- Confirmar mensajes en español, persistencia y que Cancelar no guarda.

#### Comandos

`npm run dev`, `npm run test:run`, `npm run lint`, `npm run typecheck`, `npm run build`

#### Criterios de aceptación

- [ ] Se puede guardar una reserva válida.
- [ ] Todos los campos y validaciones mínimas funcionan.
- [ ] Una confirmada solapada se rechaza con mensaje humano.
- [ ] Consulta solapada se permite.
- [ ] Guardar es inequívocamente la acción primaria.
- [ ] Checks pasan.

#### Commit sugerido

`feat(reservations): add reservation creation workflow`

**STOP. Esperar revisión humana y commit manual antes de continuar.**

---

### Fase 6 — Historial y detalle de reserva

#### Objetivo

Encontrar cualquier reserva y comprenderla sin editarla todavía.

#### Archivos/componentes involucrados

`/reservas`, `/reservas/[id]`, query params de filtro/búsqueda, tabla, cards de detalle, helpers de presentación.

#### Implementación

1. Listar por fecha descendente o con próximas primero de forma documentada y estable.
2. Implementar búsqueda simple por nombre, case-insensitive según soporte verificado del SQLite/driver; normalizar entrada y evitar construir SQL inseguro.
3. Implementar filtros Todas, Próximas, Finalizadas, Canceladas y Consultas mediante query params compartibles. Definir Próximas como estado Reservada y `checkOut > hoy civil local`.
4. Mostrar columnas: huésped, entrada, salida, noches, personas, estado, pago, total y “Ver”.
5. Crear detalle con cuatro cards y ocultar opcionales inexistentes de forma natural.
6. Añadir acciones visibles aún no activas o incorporar solo Volver; no simular una operación que no existe.

#### Reglas de negocio involucradas

- Noches derivadas, saldo derivado y etiquetas centralizadas.
- “Hoy” se calcula en zona local de la vivienda, documentada como `America/Argentina/Buenos_Aires`, sin convertir las fechas civiles a UTC.

#### Tests

- Queries de cada filtro y búsqueda.
- Cálculo/render de noches y saldo.
- Not-found para id inexistente.
- Empty states.

#### Validación manual

- Cargar varios casos desde el formulario, buscar por parte del nombre y recorrer filtros.
- Abrir detalle desde “Ver” y comprobar importes/fechas/opcionales.

#### Comandos

`npm run dev`, `npm run test:run`, `npm run lint`, `npm run typecheck`

#### Criterios de aceptación

- [ ] Tabla simple y legible con todas las columnas acordadas.
- [ ] Los cinco filtros y búsqueda por nombre funcionan.
- [ ] Detalle presenta todas las secciones y saldo correcto.
- [ ] Empty/not-found son humanos.
- [ ] Checks pasan.

#### Commit sugerido

`feat(reservations): add searchable history and reservation detail`

**STOP. Esperar revisión humana y commit manual antes de continuar.**

---

### Fase 7 — Edición, cancelación y eliminación

#### Objetivo

Completar el ciclo de vida de una reserva con acciones seguras y distinguibles.

#### Archivos/componentes involucrados

`/reservas/[id]/editar`, formulario reutilizado, Server Actions update/cancel/delete, diálogos de confirmación, detalle.

#### Implementación

1. Reutilizar campos y esquema del alta sin convertir el formulario en una abstracción genérica difícil de leer.
2. Precargar valores y actualizar mediante el servicio transaccional.
3. Volver a validar solapamiento al cambiar fechas/estado; excluir id actual.
4. Implementar “Cancelar reserva” como cambio explícito a Cancelada, conservando datos.
5. Implementar “Eliminar reserva” como hard delete con confirmación más severa.
6. Revalidar calendario, historial, detalle y balance; definir destino posterior (detalle para update/cancel, historial para delete).
7. Evitar cancelar de nuevo una cancelada y ocultar/deshabilitar acciones inválidas con explicación clara.

#### Reglas de negocio involucradas

Todas las transiciones descritas; cancelar libera fechas y excluir canceladas de ingreso.

#### Tests

- Editar sin cambiar fechas no choca consigo misma.
- Editar hacia un rango ocupado falla.
- Consulta -> Reservada valida conflicto.
- Cancelar conserva registro, libera fechas y quita ingreso.
- Eliminar borra solo el id indicado.
- Confirmaciones tienen textos distintos y cancelar el diálogo no muta.

#### Validación manual

- Ejecutar flujo Consulta -> Reservada -> Seña pagada -> Pagado completo -> Finalizada.
- Probar conflicto al confirmar, luego cancelar y reutilizar fechas.
- Comparar cancelación con eliminación.

#### Comandos

`npm run dev`, `npm run test:run`, `npm run lint`, `npm run typecheck`, `npm run build`

#### Criterios de aceptación

- [ ] Edición completa funciona y revalida reglas.
- [ ] Cancelar conserva historial y libera fechas.
- [ ] Eliminar requiere confirmación inequívoca.
- [ ] No hay conflicto consigo misma.
- [ ] Checks pasan.

#### Commit sugerido

`feat(reservations): add edit cancel and delete workflows`

**STOP. Esperar revisión humana y commit manual antes de continuar.**

---

### Fase 8 — Calendario multimes

#### Objetivo

Convertir `/` en la pantalla operativa principal con tres meses y rangos claros.

#### Archivos/componentes involucrados

FullCalendar React/Standard/Multi-Month, adaptador reserva-evento, consulta por rango, estilos y navegación al detalle.

#### Implementación

1. Hacer un spike acotado con tres meses, locale español, lunes como primer día y controles Anterior/Hoy/Siguiente.
2. Configurar `multiMonth` para abrir en el mes actual y mostrar ese mes más los dos siguientes, con máximo tres columnas en desktop. Anterior/Siguiente desplazan la ventana un mes; Hoy vuelve a anclarla en el mes actual. Permitir apilado responsive sin priorizar móvil.
3. Consultar solo reservas intersectadas con el rango visible y mapear `checkIn`/`checkOut` directamente a evento all-day con final exclusivo.
4. Mostrar solo apellido/nombre breve y estado; usar texto/icono/color y estilos suficientemente grandes.
5. Permitir múltiples consultas concurrentes visualmente sin sugerir que bloquean. Mostrar canceladas atenuadas y tachadas por defecto para conservar contexto histórico, con un control simple “Ocultar canceladas” si la vista queda cargada. El spike puede ajustar el estilo, pero no cambiar esta semántica silenciosamente.
6. Click de evento navega a `/reservas/[id]`.
7. No habilitar selección, edición por drag, recursos ni horarios.
8. Documentar resultado del spike y confirmar que Standard/MIT basta antes de consolidar dependencia.

#### Reglas de negocio involucradas

- Final exclusivo del rango.
- Estados y colores no determinan por sí solos significado.
- Consultas superpuestas deben poder coexistir.

#### Tests

- Adaptador conserva exactamente `start` y `end`.
- Query incluye eventos que cruzan límites del rango visible.
- Click construye ruta correcta.
- Test visual/manual de tres meses y varias consultas el mismo día.

#### Validación manual

- Ver tres meses en un monitor desktop común (incluido 1366×768 si es posible).
- Navegar anterior/siguiente, volver a Hoy y abrir cada estado.
- Verificar estadías adyacentes: una termina donde la otra comienza, sin pintar una noche extra.

#### Comandos

`npm run dev`, `npm run test:run`, `npm run lint`, `npm run typecheck`, `npm run build`

#### Criterios de aceptación

- [ ] Se ven tres meses simultáneos y legibles en desktop.
- [ ] Navegación y Hoy funcionan.
- [ ] La vista inicial es mes actual + dos siguientes y Anterior/Siguiente avanzan de a un mes.
- [ ] Rangos no ocupan check-out.
- [ ] Estados y consultas superpuestas se entienden.
- [ ] Click abre detalle.
- [ ] No se usa ninguna función Premium.

#### Commit sugerido

`feat(calendar): add three-month reservation calendar`

**STOP. Esperar revisión humana y commit manual antes de continuar.**

---

### Fase 9 — Gestión de gastos

#### Objetivo

Crear, editar y eliminar gastos desde Balance con el mínimo formulario posible.

#### Archivos/componentes involucrados

Sección/lista de gastos en `/balance`, modal o página de gasto, Server Actions y servicio de gastos.

#### Implementación

1. Añadir botón grande “Agregar gasto”.
2. Formulario de fecha, descripción y monto; Zod en cliente y servidor.
3. Listar gastos del período seleccionado, con Editar y Eliminar visibles.
4. Implementar edición y eliminación con confirmación; revalidar Balance.
5. No agregar categorías ni relación con reservas.

#### Reglas de negocio involucradas

- Fecha civil válida, descripción no vacía, monto entero en pesos mayor que cero.
- Gasto pertenece al mes de `date`.

#### Tests

- CRUD server-side válido e inválido.
- Límites de mes y año.
- Confirmación de eliminación y resultado vacío.

#### Validación manual

- Agregar ejemplos de impuesto, limpieza y reparación; editar uno y eliminar otro.
- Cambiar de mes y verificar pertenencia.

#### Comandos

`npm run dev`, `npm run test:run`, `npm run lint`, `npm run typecheck`

#### Criterios de aceptación

- [ ] Crear/editar/eliminar gasto funciona.
- [ ] Eliminar requiere confirmación.
- [ ] Solo aparecen los gastos del período correcto.
- [ ] No existen categorías.
- [ ] Checks pasan.

#### Commit sugerido

`feat(expenses): add simple expense management`

**STOP. Esperar revisión humana y commit manual antes de continuar.**

---

### Fase 10 — Balance mensual e histórico

#### Objetivo

Mostrar Ingresos, Gastos y Resultado de acuerdo con una única lógica probada.

#### Archivos/componentes involucrados

Queries/agregación de balance, selector de período, cards de cifras, lista de contribuciones y estados vacíos.

#### Implementación

1. Usar funciones de dominio de Fase 2 desde una única consulta/servicio de balance.
2. Abrir por defecto el mes actual local; permitir mes anterior/siguiente o selector simple y vista Histórica.
3. Mostrar tres cards grandes: Ingresos, Gastos, Resultado.
4. Debajo, mostrar desglose sencillo de reservas contadas y gastos para que las cifras sean auditables, sin dashboard adicional.
5. Recalcular después de cambios de estado, pago, fechas, total o cancelación.
6. Explicar en la UI de forma breve: “Ingresos: reservas pagadas completas, asignadas al mes de entrada”.

#### Reglas de negocio involucradas

- Solo PAID_FULL + RESERVED/COMPLETED.
- Contar exactamente total, no seña + total.
- Mes por check-in; cancelada/consulta excluidas.
- Resultado = ingresos - gastos.

#### Tests

- Casos unitarios ya definidos más integración con SQLite para mes, cruce de año e histórico.
- Cambio Seña pagada -> Pagado completo agrega exactamente total.
- Cancelar retira el ingreso; Finalizar lo conserva.
- Gasto genera resultado negativo cuando corresponde.

#### Validación manual

- Reproducir el ejemplo $500.000 total/$100.000 seña: primero $0 de ingreso, después exactamente $500.000.
- Cancelar y verificar exclusión; navegar meses e histórico.

#### Comandos

`npm run dev`, `npm run test:run`, `npm run lint`, `npm run typecheck`, `npm run build`

#### Criterios de aceptación

- [ ] Las tres cifras son correctas y auditables.
- [ ] La seña nunca se duplica ni cuenta por separado.
- [ ] Filtros mensual/histórico funcionan.
- [ ] Canceladas y consultas no generan ingreso.
- [ ] Checks pasan.

#### Commit sugerido

`feat(balance): add monthly and historical balance`

**STOP. Esperar revisión humana y commit manual antes de continuar.**

---

### Fase 11 — Pulido de UX, accesibilidad y errores

#### Objetivo

Hacer coherente y segura toda la experiencia para la usuaria final.

#### Archivos/componentes involucrados

Componentes UI compartidos, boundaries `loading`/`error`/`not-found`, toasts o mensajes, estilos responsive básicos.

#### Implementación

1. Auditar jerarquía, tamaño de blancos, contraste, foco y targets de click.
2. Unificar badges, formato de fecha/dinero y textos de acciones.
3. Añadir estados loading, empty, not-found y error donde falten.
4. Verificar doble envío, navegación atrás y conservación de formulario ante error de negocio.
5. Revisar todos los textos con una persona no técnica; eliminar jerga.
6. Probar 1366×768, 1920×1080 y un ancho reducido razonable.

#### Reglas de negocio involucradas

Los mensajes nunca deben revelar stack traces, códigos SQLite o nombres internos de enums.

#### Tests

- Tests de accesibilidad automatizados en pantallas clave si el costo es bajo.
- Componentes de confirmación y error.
- Regresión de navegación activa y labels.

#### Validación manual

- Recorrer todos los flujos usando teclado.
- Pedir a la usuaria o representante que complete alta, confirmación, pago, cancelación, gasto y balance sin instrucciones técnicas.

#### Comandos

`npm run dev`, `npm run test:run`, `npm run lint`, `npm run typecheck`, `npm run build`

#### Criterios de aceptación

- [ ] Acciones primarias y destructivas se distinguen claramente.
- [ ] Feedback de éxito/error/loading existe y está en español.
- [ ] Foco y teclado funcionan en flujos críticos.
- [ ] No hay dashboard cargado ni menús ocultos.
- [ ] Checks pasan.

#### Commit sugerido

`fix(ui): harden usability accessibility and feedback`

**STOP. Esperar revisión humana y commit manual antes de continuar.**

---

### Fase 12 — Backups SQLite seguros

#### Objetivo

Generar y retener snapshots consistentes sin copiar a ciegas un archivo SQLite vivo.

#### Archivos/componentes involucrados

Script Node de backup, configuración de paths/retención, tests con bases temporales, integración posterior con launcher.

#### Implementación

1. Elegir una capacidad SQLite disponible desde el driver: preferir Online Backup API si está expuesta y estable; como alternativa simple usar `VACUUM INTO` parametrizado mediante una conexión SQLite controlada.
2. Crear el snapshot hacia un nombre temporal nuevo en el mismo filesystem; al completar ejecutar `PRAGMA integrity_check` sobre el destino y luego renombrar atómicamente a su nombre final.
3. Usar dos nombres administrados por día: `reservas-YYYY-MM-DD-start.db` y `reservas-YYYY-MM-DD-shutdown.db`. No sobrescribir un snapshot válido; si se repite el arranque o cierre el mismo día, conservar el ya publicado. Si hay `.tmp` incompleto de un fallo anterior, validarlo/eliminarlo de forma acotada antes de reintentar.
4. Retención inicial: conservar snapshots de los últimos 30 días, con un máximo de uno de arranque y uno de cierre por día. Borrar solo archivos cuyo nombre cumpla exactamente el patrón administrado; nunca usar globs destructivos amplios.
5. Ejecutar el snapshot `start` al iniciar mediante el launcher, con máximo uno exitoso por día. En todo apagado correcto, intentar asegurar también el snapshot `shutdown` del día. El de arranque protege ante cierres abruptos y el de cierre reduce la pérdida posible del trabajo más reciente.
6. Si el backup falla, no borrar backups válidos y mostrar un aviso claro. Definir si el arranque continúa: recomendado continuar con advertencia visible y log local, salvo que no exista ningún backup válido.
7. Probar restauración a una base temporal y documentar el procedimiento; un backup no probado no se considera terminado.

SQLite garantiza que Online Backup produce una instantánea consistente y que `VACUUM INTO` produce un snapshot transaccional: [Online Backup API](https://www.sqlite.org/backup.html), [`VACUUM INTO`](https://www.sqlite.org/lang_vacuum.html). No usar `copy`, `cp` ni `fs.copyFile` sobre `app.db` mientras el servidor está activo. En modo WAL, `-wal` es parte del estado persistente y separarlo puede perder commits o corromper la copia: [WAL](https://www.sqlite.org/wal.html).

#### Reglas de negocio involucradas

- Datos reales no pueden reemplazarse durante un test.
- Un backup se publica solo después de completarse y validarse.
- Cerrar el navegador **no** detiene Next.js ni dispara shutdown; servidor y navegador son procesos distintos.

#### Tests

- Backup de base con datos y restauración exacta.
- Snapshot durante escrituras controladas es consistente.
- Máximo de un snapshot de arranque y uno de cierre por día; retención por 30 días.
- Destino incompleto no se publica; error no borra snapshots buenos.
- Paths con espacios en macOS y Windows.

#### Validación manual

- Ejecutar backup, abrir copia restaurada temporal y comparar reservas/gastos.
- Cerrar solo navegador y confirmar que `/api/health` sigue respondiendo.
- Detener correctamente el servidor y comprobar comportamiento configurado.

#### Comandos

`npm run backup` (a definir), `npm run test:run`, `npm run lint`, `npm run typecheck`

#### Criterios de aceptación

- [ ] Nunca se copia directamente una base activa.
- [ ] Snapshot pasa `integrity_check` antes de publicarse.
- [ ] Se conserva como máximo un snapshot de arranque y uno de cierre por día, solo para los últimos 30 días.
- [ ] Restauración fue probada.
- [ ] Cierre del navegador está documentado como distinto al del servidor.

#### Commit sugerido

`feat(backup): add verified daily SQLite snapshots`

**STOP. Esperar revisión humana y commit manual antes de continuar.**

---

### Fase 13 — Build local y launcher cross-platform

#### Objetivo

Abrir la build de producción con doble clic, esperar disponibilidad y lanzar el navegador.

#### Archivos/componentes involucrados

`next.config`, `GET /api/health`, launcher Node, wrappers `.cmd`/PowerShell y `.command`, documentación de instalación/operación.

#### Implementación

1. Evaluar `output: 'standalone'` para una distribución autocontenida de dependencias Next; copiar `public` y `.next/static` mediante un script Node cross-platform, no `cp`. Verificar explícitamente que la distribución incluya el motor nativo de Prisma correspondiente, `schema.prisma` y las migraciones necesarias para `prisma migrate deploy`, especialmente para Windows; no asumir que el trazado de Next los incorpora. Next documenta los requisitos del output: [standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output).
2. Crear `GET /api/health` liviano que compruebe servidor y acceso de lectura a SQLite, sin exponer datos.
3. Crear un launcher Node común: resolver directorios con `node:path`, ejecutar backup de arranque, iniciar servidor hijo en `127.0.0.1:3000`, sondear healthcheck con timeout, y abrir el navegador predeterminado solo cuando esté listo.
4. Manejar puerto ocupado: si healthcheck identifica esta app, abrirla sin iniciar otra; si es otro proceso, mostrar instrucción humana y salir sin matarlo.
5. Propagar `SIGINT`/`SIGTERM`, cerrar el hijo con gracia y ejecutar la política de backup de apagado. En Windows validar explícitamente el árbol de procesos; no asumir señales POSIX.
6. Windows: wrapper `.cmd` mínimo que invoque Node y un acceso directo `Reservas Casa.lnk` creado manualmente durante instalación. Mantener una consola visible/minimizable con mensaje “No cerrar mientras usa la aplicación”; Ctrl+C o un wrapper “Detener Reservas Casa” realiza cierre correcto. Evitar políticas de ejecución PowerShell salvo que una prueba demuestre que `.cmd` no alcanza.
7. macOS: wrapper `.command` equivalente para pruebas, más `npm run dev` para desarrollo.
8. Decidir distribución de Node tras prueba: v1 recomendada instala Node LTS una vez durante preparación del equipo; si eso resulta frágil, distribuir un runtime Node portable compatible junto a la build, sin adoptar Electron.
9. Explicar que cerrar la pestaña no detiene el servidor; la consola/acción Detener sí. No prometer backup por cierre de navegador.
10. Dejar inicio automático con Windows como opción posterior (acceso directo en Startup/Task Scheduler), desactivada por defecto.

#### Reglas de negocio involucradas

No iniciar dos instancias contra la misma base. Backup antes de uso y cierre controlado.

#### Tests

- Healthcheck sano/fallido.
- Launcher con inicio normal, timeout y puerto ocupado.
- Paths con espacios.
- Cierre limpia el proceso hijo.
- Build de producción lee/escribe la ubicación persistente, no una carpeta efímera de build.
- Distribución probada contiene los artefactos de Prisma y migraciones necesarios, sin depender del checkout de desarrollo.

#### Validación manual

- macOS: doble clic/invocación del wrapper y cierre correcto.
- Windows se valida de forma obligatoria en Fase 15, no se da por resuelto por funcionar en macOS.

#### Comandos

```text
npm run build
npm run start
npm run launch
npm run lint
npm run typecheck
npm run test:run
```

#### Criterios de aceptación

- [ ] Launcher espera healthcheck antes de abrir navegador.
- [ ] No arranca una segunda instancia ni mata procesos ajenos.
- [ ] Paths y scripts no dependen de shell Unix.
- [ ] Existe una forma explícita de detener el servidor.
- [ ] Cerrar navegador no se presenta como apagado.
- [ ] Build local de producción funciona.

#### Commit sugerido

`feat(local): add production build launcher and healthcheck`

**STOP. Esperar revisión humana y commit manual antes de continuar.**

---

### Fase 14 — Smoke tests de flujos críticos

#### Objetivo

Detectar regresiones reales con pocos tests end-to-end estables.

#### Archivos/componentes involucrados

Configuración Playwright, base aislada E2E, fixtures mínimas y tests de navegación.

#### Implementación

1. Configurar Playwright contra una base temporal migrada por suite; nunca usar `data/app.db`.
2. Crear solo tres o cuatro recorridos de alto valor.
3. Seleccionar por roles/labels en español, no por clases CSS.
4. Capturar trace/screenshot solo en fallo; mantener suite corta.

#### Reglas de negocio involucradas

Flujo WhatsApp/Consulta, confirmación con conflicto, pago/balance, cancelación/liberación y gasto.

#### Tests

1. Crear Consulta, verla en calendario/historial y abrir detalle.
2. Confirmar una reserva; impedir otra solapada; permitir una adyacente.
3. Marcar seña (balance $0), luego pago completo (balance total exacto), cancelar (ingreso excluido).
4. Agregar gasto y verificar resultado.

#### Validación manual

- Ejecutar E2E en Chromium y repetir manualmente el flujo principal en navegador predeterminado.

#### Comandos

`npm run test:e2e`, `npm run test:run`, `npm run lint`, `npm run typecheck`, `npm run build`

#### Criterios de aceptación

- [ ] E2E jamás toca datos reales.
- [ ] Los cuatro riesgos principales están cubiertos sin suite gigante.
- [ ] Tests son repetibles y no dependen del orden.
- [ ] Todos los checks pasan.

#### Commit sugerido

`test: add critical reservation and balance smoke flows`

**STOP. Esperar revisión humana y commit manual antes de continuar.**

---

### Fase 15 — Validación obligatoria en Windows 11 y cierre de v1

#### Objetivo

Demostrar el funcionamiento en la PC real antes de considerar terminada la v1.

#### Archivos/componentes involucrados

Documentación operativa, wrappers Windows, ajustes de paths/procesos descubiertos en prueba y checklist de entrega.

#### Implementación

1. Preparar la build desde un checkout limpio con `npm ci` y migraciones de producción (`prisma migrate deploy`), nunca `migrate dev` en el equipo final.
2. Instalar/copiar en una ruta sin privilegios de administrador y separar binarios de `data/`/`backups/`.
3. Crear acceso directo “Reservas Casa”, probar doble clic, espera, navegador y uso normal.
4. Reiniciar Windows, comprobar persistencia, zona horaria, formatos y que no aparece firewall al limitar a `127.0.0.1`.
5. Probar ruta con espacios, puerto ocupado, cierre incorrecto de consola y recuperación siguiente.
6. Crear datos de prueba, backup, restaurar en una copia controlada y verificar contenido.
7. Ejecutar checklist de flujos con la usuaria. Corregir solo bloqueos/regresiones; mejoras nuevas vuelven al backlog.
8. Documentar actualización manual: backup previo, reemplazo de build, `prisma migrate deploy`, healthcheck y rollback mediante copia de app + base respaldada.

#### Reglas de negocio involucradas

Todas; énfasis en fechas civiles, exclusividad, balance y durabilidad.

#### Tests

- Suite automática completa en Windows.
- Checklist manual en PC final.
- Recuperación tras cierre abrupto y restauración de backup.

#### Validación manual

- La usuaria realiza sin ayuda: abrir, crear Consulta, confirmar, registrar seña/pago, ver Balance, cargar gasto, cancelar y detener.

#### Comandos

```text
npm ci
npx prisma migrate deploy
npm run test:run
npm run test:e2e
npm run lint
npm run typecheck
npm run build
```

#### Criterios de aceptación

- [ ] Todos los comandos pasan en Windows 11.
- [ ] Acceso directo abre la app sin terminal técnica previa.
- [ ] Datos sobreviven reinicio y actualización controlada.
- [ ] Backup y restauración fueron demostrados.
- [ ] Cierre abrupto no corrompe la base; siguiente inicio informa/recupera de forma segura.
- [ ] La usuaria completa los flujos críticos.
- [ ] No queda un bloqueo conocido de datos o disponibilidad.

#### Commit sugerido

`docs(release): validate Windows 11 v1 operation`

**STOP. Esperar revisión humana y commit manual. La v1 solo se declara terminada después de esta revisión.**

## 9. Estrategia de testing consolidada

Pirámide pequeña y orientada a riesgo:

1. **Unitarios rápidos:** rango, estados bloqueantes, saldo, ingreso y balance. Son la mayoría.
2. **Integración SQLite:** migraciones, queries de conflicto, transacción concurrente, filtros y agregación.
3. **Componentes puntuales:** formulario, mensajes y confirmaciones.
4. **E2E mínimos:** cuatro flujos críticos de Fase 14.

Cada fase ejecuta sus checks; desde Fase 14, el gate antes de un commit candidato es:

```text
npm run lint
npm run typecheck
npm run test:run
npm run test:e2e
npm run build
```

No medir cobertura como objetivo aislado. Un caso nuevo se agrega cuando protege una regla o regresión plausible.

## 10. Desarrollo, ejecución local y operación

### Desarrollo

- macOS/Windows: Node LTS fijado + npm, `npm ci`, `npm run dev`.
- Migraciones de desarrollo: `npx prisma migrate dev` solo cuando el schema cambia y con revisión del SQL.
- Tests siempre usan base temporal.

### Ejecución final local

```text
Reservas Casa.lnk
  -> wrapper Windows
  -> launcher Node
  -> snapshot seguro de arranque
  -> servidor Next de producción en 127.0.0.1:3000
  -> espera GET /api/health
  -> navegador predeterminado
```

El servidor continúa aunque se cierre el navegador. El mecanismo de detención debe cerrar el proceso del servidor; el launcher intenta el snapshot de apagado, pero la protección no depende exclusivamente de él. El snapshot de arranque cubre cierres abruptos habituales y el de cierre conserva el trabajo reciente cuando el apagado es correcto.

No exponer `0.0.0.0` por defecto. No usar el servidor de desarrollo en la PC final. No ejecutar migraciones destructivas automáticamente sin backup y revisión.

## 11. Backup y recuperación

- Base primaria: `data/app.db` en disco local, nunca carpeta sincronizada/red mientras está abierta.
- Backups: `backups/reservas-YYYY-MM-DD-start.db` y `backups/reservas-YYYY-MM-DD-shutdown.db`, máximo uno de cada tipo por día y retención de los últimos 30 días.
- Método: Online Backup API o `VACUUM INTO`, validación `PRAGMA integrity_check`, publicación por rename.
- Momentos: arranque intenta asegurar el snapshot `start`; todo apagado correcto intenta asegurar el `shutdown`. Cierre de navegador no cuenta.
- Logs sin datos personales: fecha, resultado, archivo y error técnico acotado.
- Restauración siempre con servidor detenido: preservar la base actual con nombre de recuperación, validar snapshot elegido, copiar/reemplazar de forma controlada, iniciar y verificar healthcheck/conteos.
- Recomendación operativa adicional: copiar periódicamente la carpeta `backups/` a un medio externo o nube **cuando el servidor esté detenido**. Los backups en el mismo disco no protegen contra rotura o robo del equipo.

## 12. Checklist global de finalización v1

- [ ] La pantalla inicial muestra tres meses y abre detalles.
- [ ] Sidebar tiene exactamente cuatro opciones grandes.
- [ ] Se puede crear, ver, editar, cancelar y eliminar una reserva.
- [ ] Dos reservas bloqueantes solapadas no pueden persistir, incluso con solicitudes concurrentes.
- [ ] Check-out/check-in el mismo día está permitido.
- [ ] Consultas y canceladas no bloquean; finalizadas preservan ocupación histórica.
- [ ] Historial busca por nombre y ofrece los cinco filtros mínimos.
- [ ] Saldo se calcula y no está duplicado en base.
- [ ] Seña pagada aporta $0; pago completo aporta exactamente el total.
- [ ] Cancelada/Consulta no aportan ingreso.
- [ ] Balance mensual, histórico y gastos son correctos.
- [ ] Crear/editar/eliminar gastos funciona con confirmación.
- [ ] Errores son humanos y las acciones destructivas se distinguen.
- [ ] Lint, TypeScript, unitarios, integración, E2E y build pasan.
- [ ] Backups de arranque y cierre son consistentes, validados y restaurables, con retención por 30 días.
- [ ] Launcher y cierre controlado funcionan en macOS y Windows 11.
- [ ] La v1 fue probada en la PC Windows final con la usuaria.
- [ ] No se incorporó ninguna funcionalidad fuera del alcance.

## 13. Futura migración a Internet (no implementar en v1)

- **SQLite local -> base remota:** migrar Prisma a PostgreSQL u opción apropiada; convertir strings de fecha civil conscientemente (pueden seguir siendo `date`/texto según proveedor) y reemplazar la protección local de concurrencia por transacciones/constraints adecuadas al servidor.
- **localhost -> hosting:** separar configuración persistente de la build; Next puede ir a VPS o plataforma compatible. Vercel no debe usar un SQLite escribible local como almacenamiento durable.
- **Sin auth -> autenticación:** agregar login, sesión, autorización server-side y protección CSRF/origen según plataforma antes de exponer datos.
- **Backups locales -> backups servidor:** snapshots administrados del proveedor, retención y restauración probada.
- **Un proceso -> varios procesos:** retirar el mutex local y hacer que la base remota sea la autoridad concurrente.
- **Contabilidad por cobro:** si se requiere caja real por fecha, introducir `Payment` mediante migración y cambiar el balance; no reinterpretar la seña existente.

Estas posibilidades no justifican hoy abstracciones, adaptadores genéricos ni infraestructura adicional. El límite útil es mantener reglas puras, fechas/dinero explícitos, Prisma concentrado en servidor y configuración de paths fuera de componentes.

## 14. Mejoras posibles posteriores

- Inicio automático con Windows, opt-in y probado con el launcher.
- Exportación/impresión de reservas y balance.
- Botón de backup manual y asistente de restauración.
- Movimientos de pago con fecha si el negocio necesita flujo de caja.
- Recordatorios o integración WhatsApp, solo con requisitos concretos.
- Acceso remoto con autenticación y base administrada.

Ninguna de estas mejoras pertenece a la v1 ni debe adelantarse dentro de las fases anteriores.

## 15. Regla operativa para futuros agentes

Antes de implementar una fase:

1. Leer este documento completo y confirmar que la fase anterior está aprobada.
2. Trabajar únicamente en la fase indicada y preservar cambios existentes.
3. No ejecutar Git commit, no crear ramas y no adelantar la fase siguiente.
4. Ejecutar tests y validación proporcional a la fase.
5. Informar archivos cambiados, decisiones o desvíos y resultados de comandos.
6. Terminar con **STOP** y esperar revisión humana y commit manual.

Si una decisión descubierta invalida este plan, detenerse y proponer una edición explícita de este documento antes de continuar; no cambiar arquitectura o reglas de negocio silenciosamente.
