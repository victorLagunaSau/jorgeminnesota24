# Jorge Minnesota Logistic LLC - Contexto de Aplicación

> **Uso:** Comparte este archivo al inicio de cada sesión con Claude para obtener contexto inmediato.

---

## Stack Tecnológico

- **Framework:** Next.js 12.3.1 + React 17.0.2
- **Backend:** Firebase (Auth, Firestore, Storage, Functions)
- **Estilos:** Tailwind CSS 3.1.8 + DaisyUI 4.4.21
- **Extras:** Puppeteer (scraping), xlsx, moment, react-to-print

---

## Arquitectura General

```
pages/                    # Rutas de la app
├── index.js             # Landing pública
├── login.js             # Autenticación
├── admin.js             # Panel administrativo (principal)
├── portal.js            # Portal clientes
├── solicitar.js         # Solicitud de vehículos (cliente)
├── carriers.js          # Portal transportistas
├── rastreo.js           # Rastreo público
├── misviajes.js         # Vista chofer
├── loads.js             # Gestión cargas
└── api/scrape-vehicle.js # API scraping subastas

components/
├── auth/                # Login, registro, recuperar contraseña
├── features/            # Módulos principales
│   ├── caja/           # 21 componentes - cobros, cortes, recibos
│   ├── viajes/         # Crear, gestionar, liquidar viajes
│   ├── vehiculos/      # Registro, tabla, rastreo, edición
│   ├── clientes/       # CRUD clientes
│   ├── choferes/       # CRUD choferes
│   ├── empresas/       # CRUD transportistas
│   ├── reportes/       # Movimientos, cobros, pendientes
│   ├── cobranza/       # Pagos pendientes
│   └── config/         # Precios, usuarios, limpieza datos
├── Layout/              # Header, Sidebar, Footer
├── marketing/           # Landing page sections
└── ui/                  # Botones, inputs, modales reutilizables

context/
├── auth.js              # AuthProvider - sesión global
└── adminData.js         # AdminDataProvider - cache de datos

hooks/
├── useAuth.js           # Autenticación y permisos
├── useFirestoreCollection.js # Suscripción real-time
├── useAlert.js          # Sistema de alertas
├── usePagination.js     # Paginación
└── useCopyToClipboard.js

services/
└── firebaseService.js   # CRUD, batch, transacciones, consecutivos

firebase/
└── firebaseIni.js       # Configuración Firebase
```

---

## Colecciones Firestore

| Colección | Descripción |
|-----------|-------------|
| `users` | Cuentas de usuario con tipo y permisos |
| `vehiculos` | Catálogo de vehículos (lote, VIN, estado, cliente) |
| `viajesPendientes` | Viajes activos |
| `viajesPagados` | Viajes completados/pagados |
| `choferes` | Datos de choferes |
| `clientes` | Datos de clientes |
| `empresas` | Empresas transportistas |
| `movimientos` | Historial de movimientos |
| `entradasCaja` | Ingresos de caja |
| `salidasCaja` | Egresos de caja |
| `solicitudesVehiculos` | Solicitudes de clientes |
| `lotesEnTransito` | Lotes en viaje |
| `province` | Estados/rutas con precios |
| `config` | Consecutivos y configuración |

---

## Tipos de Usuario (RBAC)

| Tipo | Acceso | Página Principal |
|------|--------|------------------|
| `adminMaster` | Total (gestión usuarios) | `/admin` |
| `admin` | Panel administrativo | `/admin` |
| `empresa` | Portal transportistas | `/carriers` |
| `cliente` | Portal clientes | `/portal`, `/solicitar` |
| `chofer` | Ver mis viajes | `/misviajes` |

---

## Estados de Vehículo

| Código | Estado | Descripción |
|--------|--------|-------------|
| `PR` | Registrado | Vehículo registrado en sistema |
| `IN` | Cargando | En proceso de carga |
| `TR` | En Viaje | En tránsito |
| `EB` | En Brownsville | Llegó a Brownsville |
| `DS` | Descargado | Descargado del transporte |
| `EN` | Entregado | Entregado al cliente |

---

## Módulos del Panel Admin

### 1. CAJA (`components/features/caja/`)
- `SalidaVehiculo.js` - Cobro de vehículos
- `EntradaCaja.js` - Registrar ingresos
- `SalidaCaja.js` - Registrar egresos
- `CorteDia.js` - Corte diario
- `CorteTotal.js` - Corte general
- `ReciboPago.js` - Generar recibos

### 2. VIAJES (`components/features/viajes/`)
- `FormViaje.js` - Crear nuevo viaje
- `TablaViajes.js` - Listado de viajes
- `HojaVerificacion.js` - Verificar datos
- `HojaChofer.js` - Info del chofer
- `ModalLiquidacion.js` - Liquidar viaje
- `ViajesAnteriores.js` - Histórico

### 3. VEHICULOS (`components/features/vehiculos/`)
- `Vehiculos.js` - Gestión principal
- `VehiculosTable.js` - Tabla con filtros
- `FormDatosVehiculo.js` - Registro
- `FormEditarVehiculo.js` - Edición
- `RegistroMasivoVehiculos.js` - Carga Excel
- `Rastreo.js` - Seguimiento

### 4. REPORTES (`components/features/reportes/`)
- `Reports.js` - Movimientos
- `ReporteCobros.js` - Ingresos
- `ReportPendientesPago.js` - Pendientes

### 5. CONFIG (`components/features/config/`)
- `EstadosPrecios.js` - Precios por ruta
- `Users.js` - Gestión usuarios (AdminMaster)
- `EliminarMovimientosERC.js` - Limpieza

---

## Flujos Principales

### Crear Viaje
```
FormViaje → Validar → Generar folio → Verificar vehículos →
Crear en viajesPendientes → Actualizar estado vehículos (TR) → Imprimir
```

### Cobrar Vehículo
```
Buscar lote → Cargar datos viaje/cliente → Ingresar cobro →
Crear en salidasCaja → Actualizar vehículo (EN) → Generar recibo
```

### Solicitar Vehículo (Cliente)
```
Ingresar lote → API scrape bid.cars (IAA/Copart) →
Mostrar datos → Confirmar → Crear solicitud
```

---

## Servicios Firebase (`services/firebaseService.js`)

```javascript
// CRUD básico
getDocument(collection, docId)
getCollection(collection, options)
addDocument(collection, data)
updateDocument(collection, docId, data)
deleteDocument(collection, docId)

// Batch y transacciones
batchWrite(operations)
runTransactionWithConsecutive(configKey, callback)

// Real-time
subscribeToCollection(collection, callback, options)
subscribeToDocument(collection, docId, callback)

// Consecutivos (folios)
getNextConsecutive(configKey)
updateConsecutive(configKey, value)
```

---

## Archivos Clave por Tarea

| Si necesitas... | Revisa estos archivos |
|-----------------|----------------------|
| Modificar login/auth | `context/auth.js`, `hooks/useAuth.js`, `components/auth/` |
| Cambiar flujo de cobros | `components/features/caja/SalidaVehiculo.js` |
| Modificar creación viajes | `components/features/viajes/FormViaje.js` |
| Cambiar tabla vehículos | `components/features/vehiculos/VehiculosTable.js` |
| Agregar campo a vehículo | `FormDatosVehiculo.js`, `FormEditarVehiculo.js` |
| Modificar portal cliente | `pages/portal.js`, `pages/solicitar.js` |
| Cambiar menú lateral | `components/Layout/Sidebar.js` |
| Modificar scraping | `pages/api/scrape-vehicle.js` |
| Ajustar estilos/tema | `tailwind.config.js` |
| Cambiar operaciones DB | `services/firebaseService.js` |

---

## Cómo Usar Este Archivo

1. Al iniciar nueva conversación con Claude, escribe:
   ```
   Lee .claude/CONTEXT.md para entender mi app
   ```

2. Luego indica el módulo:
   ```
   Trabajemos en [CAJA/VIAJES/VEHICULOS/etc]
   ```

3. Describe tu tarea específica.

---

## Notas Importantes

- **Firebase Project:** `jorgeminnesota-bd031`
- **Color primario:** `#b40a0a` (rojo)
- **Consecutivos:** Se manejan en `config.consecutivos`
- **Impresión:** Usa `react-to-print` para recibos
- **Branch actual:** `nova` (main branch: `main`)
