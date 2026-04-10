# DIAGRAMA DE ARQUITECTURA - JORGE MINNESOTA

## Sistema de Gestión de Logística y Transporte

---

## 1. ARQUITECTURA GENERAL

```
+===========================================================================+
|                           USUARIOS DEL SISTEMA                             |
+===========================================================================+
|                                                                            |
|   [ADMIN]              [CARRIERS]            [CLIENTES]                    |
|   /admin               /carriers             /misviajes                    |
|   Panel completo       Portal transportistas Rastreo de envíos             |
|                                                                            |
+===========================================================================+


+===========================================================================+
|                              PÁGINAS (NEXT.JS)                             |
+===========================================================================+
|                                                                            |
|   /admin -----> Admin.js (Panel Principal)                                 |
|                    |                                                       |
|                    +---> Sidebar.js (Navegación)                           |
|                    +---> HeaderPanel.js (Cabecera)                         |
|                    +---> [Módulos dinámicos según selección]               |
|                                                                            |
|   /carriers --> carriers.js (Portal Carriers)                              |
|                    |                                                       |
|                    +---> FormViaje.js (Crear viajes)                       |
|                    +---> TablaViajes.js (Ver viajes)                       |
|                                                                            |
|   /misviajes -> misviajes.js (Portal Clientes)                             |
|                    |                                                       |
|                    +---> ConsultaMisViajes.js                              |
|                                                                            |
|   /rastreo ---> rastreo.js (Búsqueda pública)                              |
|                    |                                                       |
|                    +---> BuscaVehiculo.js                                  |
|                                                                            |
+===========================================================================+
```

---

## 2. MÓDULOS DEL PANEL ADMIN

```
+===========================================================================+
|                           SIDEBAR - NAVEGACIÓN                             |
+===========================================================================+

    CAJA                          GESTIÓN DE VIAJES
    +------------------------+    +------------------------+
    | - Cobro de Vehículo    |    | - Control de Viajes    |
    | - Salida Caja          |    | - Historial            |
    | - Entrada Caja         |    | - Choferes             |
    | - Corte del día        |    | - Empresas Transport.  |
    | - Corte Total          |    | - Regularización       |
    +------------------------+    +------------------------+

    REPORTES                      CATÁLOGOS
    +------------------------+    +------------------------+
    | - Reporte Ingresos     |    | - Clientes             |
    | - Movimientos          |    | - Vehículos            |
    | - Pendientes de pago   |    | - Estados y Precios    |
    +------------------------+    | - Usuarios             |
                                  +------------------------+

    COBRANZA
    +------------------------+
    | - Pagos Pendientes     |
    +------------------------+
```

---

## 3. FLUJO DE DATOS - VIAJES

```
+===========================================================================+
|                        CICLO DE VIDA DE UN VIAJE                           |
+===========================================================================+

    1. CREACIÓN (Carrier o Admin)
    +------------------------------------------------------------------+
    |                                                                   |
    |   FormViaje.js                                                    |
    |   +------------------+                                            |
    |   | Selecciona Chofer|---> Consulta: choferes (Firebase)          |
    |   | Agrega Vehículos |---> Consulta: province (Estados/Ciudades)  |
    |   | Asigna Precios   |---> Auto-calcula desde province.regions    |
    |   +------------------+                                            |
    |            |                                                      |
    |            v                                                      |
    |   +------------------+                                            |
    |   | FINALIZAR VIAJE  |                                            |
    |   +------------------+                                            |
    |            |                                                      |
    |            v                                                      |
    |   Guarda en: viajesPendientes/{numViaje}                          |
    |   Bloquea:   lotesEnTransito/{lote}                               |
    |   Actualiza: config/consecutivos.viajesPendientes                 |
    |                                                                   |
    +------------------------------------------------------------------+

    2. GESTIÓN (Admin)
    +------------------------------------------------------------------+
    |                                                                   |
    |   TablaViajes.js                                                  |
    |   +------------------+                                            |
    |   | Ver Pendientes   |---> Lee: viajesPendientes                  |
    |   | Editar Datos     |---> Actualiza: viajesPendientes/{id}       |
    |   | Asignar Cliente  |---> Actualiza: vehiculos[].clienteNombre   |
    |   +------------------+                                            |
    |                                                                   |
    +------------------------------------------------------------------+

    3. PAGO (Admin)
    +------------------------------------------------------------------+
    |                                                                   |
    |   TablaViajes.js -> ejecutarPago()                                |
    |   +------------------+                                            |
    |   | Validar Clientes |---> Todos deben tener clienteNombre        |
    |   | Capturar Estado  |---> estadoOrigen (modal)                   |
    |   | PAGAR FLETE      |                                            |
    |   +------------------+                                            |
    |            |                                                      |
    |            v                                                      |
    |   +------------------+                                            |
    |   | TRANSACCIÓN      |                                            |
    |   +------------------+                                            |
    |   | 1. Copia a viajesPagados/{numViaje}                           |
    |   | 2. Elimina de viajesPendientes/{numViaje}                     |
    |   | 3. Elimina lotesEnTransito/{lote} (cada uno)                  |
    |   | 4. Crea/Actualiza vehiculos/{lote} (cada uno)                 |
    |   +------------------+                                            |
    |            |                                                      |
    |            v                                                      |
    |   Imprime: HojaVerificacion.js (PDF)                              |
    |                                                                   |
    +------------------------------------------------------------------+
```

---

## 4. ESTRUCTURA DE DATOS (FIRESTORE)

```
+===========================================================================+
|                         COLECCIONES FIREBASE                               |
+===========================================================================+

    USUARIOS Y EMPRESAS
    +------------------------------------------------------------------+
    |                                                                   |
    |   users/{uid}                                                     |
    |   +---------------------------+                                   |
    |   | email: string             |                                   |
    |   | nombre: string            |                                   |
    |   | tipo: "admin" | "empresa" |                                   |
    |   | telefono: string          |                                   |
    |   | passwordPlana: string     | <-- SEGURIDAD: Eliminar          |
    |   +---------------------------+                                   |
    |                                                                   |
    |   empresas/{uid}                                                  |
    |   +---------------------------+                                   |
    |   | nombreEmpresa: string     |                                   |
    |   | taxId: string             |                                   |
    |   | emailAcceso: string       |                                   |
    |   | passwordAcceso: string    | <-- SEGURIDAD: Eliminar          |
    |   | telefonoEmpresa: string   |                                   |
    |   | direccion: string         |                                   |
    |   | folio: number             |                                   |
    |   +---------------------------+                                   |
    |                                                                   |
    +------------------------------------------------------------------+

    CHOFERES
    +------------------------------------------------------------------+
    |                                                                   |
    |   choferes/{id}                                                   |
    |   +---------------------------+                                   |
    |   | nombreChofer: string      |                                   |
    |   | telefonoChofer: string    |                                   |
    |   | empresaId: string         | --> Referencia a empresas/{uid}   |
    |   | empresaNombre: string     |                                   |
    |   | empresaLiderId: string    | --> Para subcontratados           |
    |   | empresaLiderNombre: string|                                   |
    |   +---------------------------+                                   |
    |                                                                   |
    +------------------------------------------------------------------+

    VIAJES
    +------------------------------------------------------------------+
    |                                                                   |
    |   viajesPendientes/{numViaje}                                     |
    |   +---------------------------+                                   |
    |   | numViaje: string          |                                   |
    |   | chofer: {                 |                                   |
    |   |   id, nombre, telefono,   |                                   |
    |   |   empresa, empresaLiderId |                                   |
    |   | }                         |                                   |
    |   | empresaId: string         |                                   |
    |   | empresaLiderId: string    |                                   |
    |   | estatus: "PENDIENTE"      |                                   |
    |   | fechaCreacion: timestamp  |                                   |
    |   | vehiculos: [              |                                   |
    |   |   { lote, marca, modelo,  |                                   |
    |   |     ciudad, estado,       |                                   |
    |   |     flete, storage,       |                                   |
    |   |     clienteNombre, ... }  |                                   |
    |   | ]                         |                                   |
    |   | resumenFinanciero: {      |                                   |
    |   |   totalFletes,            |                                   |
    |   |   totalSoloGastos,        |                                   |
    |   |   totalVehiculos          |                                   |
    |   | }                         |                                   |
    |   +---------------------------+                                   |
    |                                                                   |
    |   viajesPagados/{numViaje}                                        |
    |   +---------------------------+                                   |
    |   | (misma estructura)        |                                   |
    |   | + fechaPago: timestamp    |                                   |
    |   | + folioPago: string       |                                   |
    |   | + empresaLiquidada: string|                                   |
    |   | + estadoOrigen: string    |                                   |
    |   +---------------------------+                                   |
    |                                                                   |
    +------------------------------------------------------------------+

    VEHÍCULOS
    +------------------------------------------------------------------+
    |                                                                   |
    |   vehiculos/{lote}                                                |
    |   +---------------------------+                                   |
    |   | lote: string              |                                   |
    |   | marca: string             |                                   |
    |   | modelo: string            |                                   |
    |   | ciudad: string            |                                   |
    |   | estado: string            |                                   |
    |   | flete: number             |                                   |
    |   | clienteNombre: string     |                                   |
    |   | viajeAsignado: string     |                                   |
    |   | fechaPago: timestamp      |                                   |
    |   +---------------------------+                                   |
    |                                                                   |
    |   lotesEnTransito/{lote}                                          |
    |   +---------------------------+                                   |
    |   | viajeAsignado: string     |                                   |
    |   | choferNombre: string      |                                   |
    |   | fechaBloqueo: timestamp   |                                   |
    |   +---------------------------+                                   |
    |                                                                   |
    +------------------------------------------------------------------+

    CATÁLOGOS
    +------------------------------------------------------------------+
    |                                                                   |
    |   province/{id}                                                   |
    |   +---------------------------+                                   |
    |   | state: string             | Ej: "TX", "FL"                    |
    |   | regions: [                |                                   |
    |   |   { city: string,         |                                   |
    |   |     cost: number,         | Precio para chofer                |
    |   |     price: number }       | Precio para cliente               |
    |   | ]                         |                                   |
    |   +---------------------------+                                   |
    |                                                                   |
    |   clientes/{id}                                                   |
    |   +---------------------------+                                   |
    |   | nombre: string            |                                   |
    |   | telefono: string          |                                   |
    |   | email: string             |                                   |
    |   +---------------------------+                                   |
    |                                                                   |
    |   config/consecutivos                                             |
    |   +---------------------------+                                   |
    |   | viajesPendientes: number  |                                   |
    |   | empresas: number          |                                   |
    |   | choferes: number          |                                   |
    |   +---------------------------+                                   |
    |                                                                   |
    +------------------------------------------------------------------+
```

---

## 5. RELACIONES ENTRE ENTIDADES

```
+===========================================================================+
|                         DIAGRAMA DE RELACIONES                             |
+===========================================================================+

                              +-------------+
                              |   EMPRESA   |
                              | (empresas)  |
                              +------+------+
                                     |
                    +----------------+----------------+
                    |                                 |
                    v                                 v
             +-------------+                  +-------------+
             |   CHOFER    |                  |   CHOFER    |
             | empresaId   |                  |empresaLider |
             | (Propio)    |                  |(Subcontrat.)|
             +------+------+                  +------+------+
                    |                                 |
                    +----------------+----------------+
                                     |
                                     v
                              +-------------+
                              |   VIAJE     |
                              |(Pendiente)  |
                              +------+------+
                                     |
                    +----------------+----------------+
                    |                |                |
                    v                v                v
             +----------+     +----------+     +----------+
             | VEHÍCULO |     | VEHÍCULO |     | VEHÍCULO |
             |  (lote)  |     |  (lote)  |     |  (lote)  |
             +----+-----+     +----+-----+     +----+-----+
                  |                |                |
                  v                v                v
             +----------+     +----------+     +----------+
             | CLIENTE  |     | CLIENTE  |     | CLIENTE  |
             +----------+     +----------+     +----------+

                              === PAGO ===
                                   |
                                   v
                              +-------------+
                              |   VIAJE     |
                              |  (Pagado)   |
                              +-------------+
```

---

## 6. PROBLEMAS IDENTIFICADOS

```
+===========================================================================+
|                         PROBLEMAS Y SOLUCIONES                             |
+===========================================================================+

    PROBLEMA 1: MONOLITO EN ADMIN.JS
    +------------------------------------------------------------------+
    |   ACTUAL:                                                         |
    |   - 20+ imports estáticos                                         |
    |   - Switch con 20+ casos                                          |
    |   - Todo se carga al iniciar                                      |
    |                                                                   |
    |   SOLUCIÓN:                                                       |
    |   - Usar dynamic() de Next.js                                     |
    |   - Lazy loading por módulo                                       |
    |   - Reducción de bundle ~60%                                      |
    +------------------------------------------------------------------+

    PROBLEMA 2: CÓDIGO DUPLICADO
    +------------------------------------------------------------------+
    |   ACTUAL:                                                         |
    |   - FormViaje.js consulta choferes                                |
    |   - TablaViajes.js consulta choferes (DUPLICADO)                  |
    |   - FormChofer.js consulta empresas                               |
    |   - TablaChoferes.js consulta empresas (DUPLICADO)                |
    |                                                                   |
    |   SOLUCIÓN:                                                       |
    |   - Crear hooks: useChoferes(), useEmpresas()                     |
    |   - Centralizar lógica de consultas                               |
    |   - Reutilizar en todos los componentes                           |
    +------------------------------------------------------------------+

    PROBLEMA 3: SEGURIDAD
    +------------------------------------------------------------------+
    |   ACTUAL:                                                         |
    |   - Contraseñas en texto plano en Firestore                       |
    |   - Credenciales Firebase en frontend                             |
    |   - Sin validación server-side                                    |
    |                                                                   |
    |   SOLUCIÓN:                                                       |
    |   - Eliminar passwordPlana de Firestore                           |
    |   - Usar solo Firebase Auth                                       |
    |   - Implementar Security Rules estrictas                          |
    +------------------------------------------------------------------+

    PROBLEMA 4: FIREBASE V8
    +------------------------------------------------------------------+
    |   ACTUAL:                                                         |
    |   - import firebase from "firebase/app"                           |
    |   - Bundle grande (~200KB)                                        |
    |                                                                   |
    |   SOLUCIÓN:                                                       |
    |   - Migrar a Firebase v9+ modular                                 |
    |   - import { getFirestore } from "firebase/firestore"             |
    |   - Reducción de bundle ~30%                                      |
    +------------------------------------------------------------------+
```

---

## 7. ESTRUCTURA DE ARCHIVOS ACTUAL

```
jorgeminnesota24/
├── components/
│   ├── Layout/
│   │   ├── Sidebar.js          # Navegación lateral
│   │   ├── HeaderPanel.js      # Cabecera
│   │   └── Layout.js
│   │
│   ├── Viajes/
│   │   ├── FormViaje.js        # Crear viajes (carriers)
│   │   ├── TablaViajes.js      # Gestión viajes (admin)
│   │   ├── HojaVerificacion.js # PDF de verificación
│   │   ├── HojaChofer.js       # PDF para chofer
│   │   ├── ModalLiquidacion.js # Modal de pago (obsoleto)
│   │   ├── ReporteViajesPagados.js # Historial
│   │   ├── ViajesAnteriores.js # Regularización
│   │   └── Viajes.js           # Contenedor
│   │
│   ├── Empresas/
│   │   ├── FormEmpresa.js      # Crear/editar empresa
│   │   ├── TablaEmpresas.js    # Lista de empresas
│   │   └── Empresas.js         # Contenedor
│   │
│   ├── Choferes/
│   │   ├── FormChofer.js       # Crear/editar chofer
│   │   ├── TablaChoferes.js    # Lista de choferes
│   │   └── Choferes.js         # Contenedor
│   │
│   ├── Clientes/
│   │   ├── FormCliente.js
│   │   ├── TablaClientes.js
│   │   └── Clientes.js
│   │
│   ├── EstadosPrecios/
│   │   ├── FormEstadosPrecios.js
│   │   ├── TablaEstadoPrecios.js
│   │   └── EstadosPrecios.js
│   │
│   ├── SalidaVehiculo/         # Cobro de vehículos
│   ├── SalidaCaja/             # Salidas de caja
│   ├── EntradaCaja/            # Entradas de caja
│   ├── CorteDia/               # Corte diario
│   ├── CorteGeneral/           # Corte total
│   ├── Cobranza/               # Pagos pendientes
│   ├── Reports/                # Reportes varios
│   ├── Vehiculos/              # Gestión vehículos
│   ├── Users/                  # Gestión usuarios
│   └── Admin.js                # Componente principal
│
├── pages/
│   ├── admin.js                # Página admin
│   ├── carriers.js             # Portal carriers
│   ├── misviajes.js            # Portal clientes
│   ├── rastreo.js              # Búsqueda pública
│   ├── index.js                # Landing page
│   └── login.js                # Login
│
├── firebase/
│   └── firebaseIni.js          # Configuración Firebase
│
├── context/
│   └── auth.js                 # Context de autenticación
│
└── styles/
    └── globals.css
```

---

## 8. PLAN DE MEJORA RECOMENDADO

```
+===========================================================================+
|                          FASES DE MEJORA                                   |
+===========================================================================+

    FASE 1: LIMPIEZA (1-2 días)
    +------------------------------------------------------------------+
    | [ ] Eliminar código comentado                                     |
    | [ ] Eliminar componentes no usados                                |
    | [ ] Consolidar imports duplicados                                 |
    | [x] Quitar opciones del sidebar no funcionales                    |
    +------------------------------------------------------------------+

    FASE 2: HOOKS PERSONALIZADOS (3-5 días)
    +------------------------------------------------------------------+
    | [ ] useChoferes() - Consulta y cache de choferes                  |
    | [ ] useEmpresas() - Consulta y cache de empresas                  |
    | [ ] useViajes() - Consulta de viajes pendientes/pagados           |
    | [ ] useProvincias() - Estados y ciudades con precios              |
    +------------------------------------------------------------------+

    FASE 3: LAZY LOADING (2-3 días)
    +------------------------------------------------------------------+
    | [ ] Implementar dynamic() en Admin.js                             |
    | [ ] Separar chunks por módulo                                     |
    | [ ] Medir mejora de performance                                   |
    +------------------------------------------------------------------+

    FASE 4: SEGURIDAD (1-2 días)
    +------------------------------------------------------------------+
    | [ ] Eliminar passwordPlana de Firestore                           |
    | [ ] Revisar Firebase Security Rules                               |
    | [ ] Auditar permisos de colecciones                               |
    +------------------------------------------------------------------+

    FASE 5: FIREBASE V9 (1 semana - opcional)
    +------------------------------------------------------------------+
    | [ ] Migrar imports a modular                                      |
    | [ ] Actualizar todas las consultas                                |
    | [ ] Probar compatibilidad                                         |
    +------------------------------------------------------------------+
```

---

**Documento generado el:** Abril 2024
**Proyecto:** Jorge Minnesota - Sistema de Logística
**Versión:** 1.0

