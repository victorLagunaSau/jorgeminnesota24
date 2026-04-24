# Jorge Minnesota Logistic LLC — Resumen del Proyecto

## Que es
Sistema web completo de logistica vehicular para **Jorge Minnesota Logistic LLC**. Gestiona el ciclo de vida completo de vehiculos desde subastas (IAA/Copart) hasta entrega al cliente, incluyendo viajes, cobros, choferes, y reportes financieros.

## Tech Stack
- **Frontend:** Next.js 12.3.1 + React 17 + Tailwind CSS 3 + DaisyUI 4
- **Backend/DB:** Firebase (Auth, Firestore, Storage)
- **Scraping:** Puppeteer (subastas IAA y Copart)
- **Extras:** Framer Motion, XLSX, React to Print, Moment.js
- **Importacion Historial:** Componente web integrado para importar datos historicos de Excel a Firebase

## Estructura del Proyecto

```
/jorgeminnesota24/
├── pages/
│   ├── index.js          # Landing page marketing
│   ├── login.js          # Login
│   ├── admin.js          # Dashboard admin (modulos: caja, reportes, gestion, config, analisis)
│   ├── carriers.js       # Portal empresa/carrier (crear viajes)
│   ├── portal.js         # Portal cliente (rastrear vehiculos)
│   ├── solicitar.js      # Solicitar vehiculos de subastas
│   ├── misviajes.js      # Vista chofer (sus viajes asignados)
│   ├── rastreo.js        # Rastreo publico de vehiculos
│   ├── loads.js          # Gestion de solicitudes/loads
│   ├── clonar-usuario.js # Clonar permisos de usuario
│   ├── setup-master.js   # Setup admin master
│   └── api/
│       └── scrape-vehicle.js  # API scraping IAA/Copart con Puppeteer
│
├── components/
│   ├── auth/             # Login, Registro, Recuperar contrasena
│   ├── features/
│   │   ├── Admin.js      # Componente maestro del panel admin
│   │   ├── caja/         # SalidaVehiculo, EntradaCaja, SalidaCaja, CorteDia, CorteTotal, Recibo, PagoAdelantado
│   │   ├── vehiculos/    # CRUD vehiculos, registro masivo, rastreo, entrega
│   │   ├── viajes/       # CRUD viajes, tabla, hoja chofer, hoja verificacion, reporte pagados, viajes anteriores, importar historial
│   │   ├── choferes/     # CRUD choferes
│   │   ├── clientes/     # CRUD clientes
│   │   ├── empresas/     # CRUD empresas/carriers
│   │   ├── reportes/     # Ingresos, movimientos, pendientes de pago
│   │   ├── cobranza/     # Modulo de cobranza
│   │   ├── analisis/     # Estado financiero, historial anticipos/autorizaciones, fletes fiados
│   │   ├── config/       # Estados/precios, usuarios, movimientos, solicitudes
│   │   └── solicitudes/  # Solicitudes de vehiculos desde clientes
│   ├── marketing/        # Hero, Feature, Catalogo, SEO
│   ├── Layout/           # Layout, Header, HeaderPanel, Sidebar
│   └── ui/               # Alert, StatusBadge, SearchBar, Pagination, modals
│
├── context/
│   ├── auth.js           # AuthProvider (login/logout/signup, estado usuario)
│   └── adminData.js      # AdminDataProvider (cache choferes, clientes, empresas)
│
├── hooks/                # useAuth, useAlert, usePagination, useFirestoreCollection, useCopyToClipboard
├── firebase/             # firebaseIni.js (inicializacion Firebase)
├── services/             # firebaseService.js (CRUD generico Firestore)
├── utils/                # Utilidades numeros/strings/fechas, auditLog, constants
├── constants/            # Constantes globales (colecciones, estatus, etc)
│
└── .env.local            # Config Firebase (NUNCA commitear)
```

## Roles de Usuario
| Rol | Acceso | Descripcion |
|-----|--------|-------------|
| `adminMaster` | Todo | Control total del sistema, gestion de usuarios |
| `admin` | Panel admin | Operaciones diarias: caja, vehiculos, viajes, reportes |
| `empresa` | /carriers, /loads | Carriers/transportistas: crear y gestionar viajes |
| `chofer` | /misviajes | Choferes: ver sus viajes asignados |
| `cliente` | /portal, /solicitar | Clientes: rastrear vehiculos, solicitar de subastas |

## Colecciones Firestore
| Coleccion | Proposito |
|-----------|-----------|
| `users` | Cuentas con roles y permisos |
| `vehiculos` | Inventario vehicular con estatus |
| `viajesPendientes` | Viajes sin pagar |
| `viajesPagados` | Viajes completados/pagados |
| `choferes` | Datos maestros de choferes |
| `clientes` | Datos maestros de clientes |
| `empresas` | Datos maestros de empresas/carriers |
| `movimientos` | Movimientos de caja |
| `entradasCaja` | Depositos a caja |
| `salidasCaja` | Retiros de caja |
| `solicitudesVehiculos` | Solicitudes de vehiculos por clientes |
| `lotesEnTransito` | Lotes en transito |
| `tokensChofer` | Tokens de autenticacion chofer |
| `auditLog` | Registro de auditoria |
| `config` | Configuracion y consecutivos |
| `province` | Datos geograficos |

## Pipeline de Estatus de Vehiculo
```
PR (Registrado) → IN (Cargando) → TR (En Viaje) → EB (En Brownsville) → DS (Descargado) → EN (Entregado)
```

## Flujo Principal del Negocio
```
1. Cliente busca vehiculo en subasta (IAA/Copart) via /solicitar
2. API scrape-vehicle extrae datos del vehiculo automaticamente
3. Cliente solicita el vehiculo → solicitudesVehiculos
4. Admin aprueba y registra vehiculo → vehiculos (estatus PR)
5. Admin/Empresa crea viaje, asigna chofer y vehiculos → viajesPendientes
6. Vehiculo avanza por el pipeline: PR → IN → TR → EB → DS → EN
7. Cliente rastrea en tiempo real via /portal
8. Al entregar, se cobra en caja → movimientos
9. Viaje se marca pagado → viajesPagados
10. Corte de caja diario para reconciliacion
```

## Modulos del Admin
- **Caja:** Salida vehiculo (cobro), pagos adelantados, entradas/salidas de caja, corte dia, corte total, recibos
- **Reportes:** Ingresos, movimientos, pendientes de pago
- **Gestion:** CRUD de clientes, choferes, empresas, vehiculos, viajes
- **Config:** Estados y precios por ruta, usuarios (solo adminMaster), movimientos, solicitudes
- **Analisis:** Estado financiero, historial de anticipos, historial de autorizaciones, fletes fiados
- **Cobranza:** Seguimiento de cobros y deudas pendientes

## State Management
- **React Context API** (sin Redux)
- `AuthContext` — estado de autenticacion y usuario actual
- `AdminDataContext` — cache compartido de choferes, clientes, empresas (suscripciones real-time)
- Custom hooks para logica reutilizable
- Firestore como fuente de verdad con listeners en tiempo real (onSnapshot)

## Metodos de Pago Soportados
Efectivo, cheque, Zelle, tarjeta (sin integracion con procesador, se registra manualmente)

## Importacion de Historial
La funcionalidad de importar datos historicos de Excel ahora esta integrada directamente en la app web:
- **ImportarHistorial.js** (`components/features/viajes/`): Componente que permite cargar un Excel, cruzar viajes con vehiculos existentes en Firebase, asignar choferes, y subir viajes pagados directamente desde el panel admin
- Reemplaza la antigua app Electron de sanitizacion (subdirectorio `sanitizacion/` fue removido)

## Convenciones de Codigo
- Idioma del codigo: mezcla espanol/ingles (variables y UI en espanol, framework en ingles)
- Componentes React funcionales con hooks
- Estilos con clases de Tailwind + DaisyUI directamente en JSX
- Servicios Firebase centralizados en `services/firebaseService.js`
- Utilidades compartidas en `utils/index.js`

---

## Historial de Cambios Importantes

### 2026-04-23
- Creacion de este archivo de resumen
- Estado actual: branch `nova`
- La app esta funcional con todos los modulos operativos

### 2026-04-24
- Removido subdirectorio `sanitizacion/` (app Electron de migracion) — funcionalidad reemplazada por `ImportarHistorial.js` integrado en la web
- Nuevo componente `FletesFlados.js` en analisis: muestra vehiculos con flete fiado (pendientes de cobro de flete)
- Nuevo componente `ImportarHistorial.js` en viajes: importacion de historial de viajes desde Excel a Firebase directamente en el panel admin
- Nuevo modulo `viajesAnteriores` en Admin.js: consulta de viajes pagados historicos
- Actualizaciones en: cobranza, clientes (fechas y fiados), abonos/anticipos, control de viajes, modulos clickeables en sidebar

---

## Mejoras Pendientes (analisis 2026-04-24)

### CRITICO — Seguridad y Estabilidad
1. **Remover/proteger `setup-master.js` y `clonar-usuario.js`** — accesibles sin auth, credenciales hardcodeadas
2. **Autenticar API `/api/scrape-vehicle`** — sin verificacion de tokens ni rate limiting
3. **Crear Firestore Security Rules** — no existe `firestore.rules`, la BD esta abierta
4. **Hacer escrituras atomicas en pagos** — `PagoVehiculo.js:91-164` y `PagosPendientes.js:59-142` escriben vehiculo y movimiento por separado
5. **Agregar Error Boundaries** — un error en cualquier modulo tumba todo el panel admin
6. **Fix memory leak en `Header.js:25-46`** — `removeEventListener` recibe funcion nueva

### ALTO — Mantenibilidad
7. **Quitar UID hardcodeado** `"BdRfEmYfd7ZLjWQHB06uuT6w2112"` de `PagoVehiculo.js:66` y `Vehiculos.js:27`
8. **Race condition en lotes** — `FormViaje.js:251-295` usa check-then-write, necesita transaccion
9. **Dividir componentes gigantes** — `TablaViajes.js` (1345 lineas), `ReporteViajesPagados.js` (1221), `FormViaje.js` (970)
10. **Refactorizar `Admin.js` switch (28 cases)** — usar moduleMap
11. **Actualizar dependencias** — firebase@7→9, react@17→18, next@12→14, quitar moment.js
12. **Mover `puppeteer` a devDependencies** — agrega ~150MB al bundle

### MEDIO — Logica de Negocio
13. **Aritmetica en centavos** — `PagoVehiculo.js:43-62`, `CorteDia.js:220-253` acumulan errores de punto flotante
14. **Migrar campos legacy** — unificar `saldoFiado` vs `pagoTotalPendiente`
15. **Validar transiciones de estatus** — vehiculo puede saltar estados sin restriccion
16. **Estandarizar `useFirestoreCollection`** — 27 componentes reimplementan suscripciones
17. **SSG en marketing** — agregar `getStaticProps` en `pages/index.js`
18. **Dynamic imports** — usar `next/dynamic` para modulos del admin
19. **Audit log no debe fallar silenciosamente** — `utils/auditLog.js:11-27`
20. **Headers de seguridad** — agregar CSP, HSTS, X-Frame-Options en `next.config.js`

### BAJO — Deuda Tecnica
21. Crear hook `useModal()` (patron duplicado en 39 componentes)
22. `generateId()` usa `Date.now()` — cambiar a `crypto.randomUUID()`
23. Memoizar Sidebar con `React.memo` y `useCallback`
24. Agregar accesibilidad (ARIA labels, navegacion por teclado)
25. Subir requisito de contraseña a 12+ caracteres
