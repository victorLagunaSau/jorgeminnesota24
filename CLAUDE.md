# Jorge Minnesota Logistic LLC — Resumen del Proyecto

## Que es
Sistema web completo de logistica vehicular para **Jorge Minnesota Logistic LLC**. Gestiona el ciclo de vida completo de vehiculos desde subastas (IAA/Copart) hasta entrega al cliente, incluyendo viajes, cobros, choferes, y reportes financieros.

## Tech Stack
- **Frontend:** Next.js 12.3.1 + React 17 + Tailwind CSS 3 + DaisyUI 4
- **Backend/DB:** Firebase (Auth, Firestore, Storage)
- **Scraping:** Puppeteer (subastas IAA y Copart)
- **Extras:** Framer Motion, XLSX, React to Print, Moment.js
- **Sanitizacion:** App Electron independiente para importar datos historicos de Excel a Firebase

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
│   │   ├── viajes/       # CRUD viajes, tabla, hoja chofer, hoja verificacion, reporte pagados
│   │   ├── choferes/     # CRUD choferes
│   │   ├── clientes/     # CRUD clientes
│   │   ├── empresas/     # CRUD empresas/carriers
│   │   ├── reportes/     # Ingresos, movimientos, pendientes de pago
│   │   ├── cobranza/     # Modulo de cobranza
│   │   ├── analisis/     # Estado financiero, historial anticipos/autorizaciones
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
├── sanitizacion/         # <<< SUBDIRECTORIO INDEPENDIENTE >>>
│   ├── electron_main.js      # App Electron para importar historial
│   ├── electron_app.html     # UI de la app Electron
│   ├── ui.html               # UI alternativa
│   ├── sanitizar.js          # Limpieza masiva de Excel → JSON
│   ├── descargar_firebase.js # Descarga datos Firebase → JSON local
│   ├── importar_a_firebase.js# Importa JSON → Firebase
│   ├── analizar_cruce.js     # Analisis de cruce vehiculos Excel vs Firebase
│   ├── servidor.js           # Servidor local para la UI
│   ├── corregir_excel.js     # Correcciones al Excel
│   ├── exportar_choferes.js  # Exporta choferes
│   └── [archivos .json/.xlsx]# Datos exportados y de trabajo
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
- **Analisis:** Estado financiero, historial de anticipos, historial de autorizaciones
- **Cobranza:** Seguimiento de cobros y deudas pendientes

## State Management
- **React Context API** (sin Redux)
- `AuthContext` — estado de autenticacion y usuario actual
- `AdminDataContext` — cache compartido de choferes, clientes, empresas (suscripciones real-time)
- Custom hooks para logica reutilizable
- Firestore como fuente de verdad con listeners en tiempo real (onSnapshot)

## Metodos de Pago Soportados
Efectivo, cheque, Zelle, tarjeta (sin integracion con procesador, se registra manualmente)

## Sanitizacion (subdirectorio)
Herramientas independientes para migrar datos historicos de un Excel (JML.xlsx) a Firebase:
- **App Electron** (`npm start`): UI visual para cruzar viajes del Excel con vehiculos en Firebase, asignar choferes, y exportar viajes listos para importar
- **sanitizar.js**: Limpieza automatica del Excel crudo, genera JSON limpio y reporte de errores
- **descargar_firebase.js** (`npm run descargar`): Descarga datos actuales de Firebase para trabajar offline
- **importar_a_firebase.js**: Sube los viajes procesados a Firebase
- **analizar_cruce.js**: Analisis de coincidencias entre Excel y Firebase

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
- Subdirectorio `sanitizacion/` contiene herramientas de migracion de datos historicos
