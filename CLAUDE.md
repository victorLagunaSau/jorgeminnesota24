# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev      # Start dev server (Next.js 12, http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run export   # Build + static export
```

No test framework or linter is configured.

## Architecture Overview

Vehicle logistics system for **Jorge Minnesota Logistic LLC**. Manages vehicles from auction purchase (IAA/Copart) through delivery, including trips, payments, drivers, and financial reports.

**Stack:** Next.js 12.3.1, React 17, Tailwind CSS 3 + DaisyUI 4, Firebase v7 (Auth, Firestore, Storage, Functions), Puppeteer (auction scraping), Framer Motion (animations), moment.js (dates)

**Firebase config:** Loaded from `NEXT_PUBLIC_FIREBASE_*` env vars in `firebase/firebaseIni.js`. Client-side only init (guarded by `typeof window`). No `next.config.js` — uses default Next.js 12 config. Additional server-side env vars: `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_ACCESS_TOKEN` (used in API routes only).

### Key Architectural Patterns

- **State management:** React Context API only (no Redux). Two context providers: `AuthContext` (`context/auth.js`) wraps the entire app in `_app.js`; `AdminDataContext` (`context/adminData.js`) wraps only the admin panel (scoped inside the admin page, not global) and provides real-time cached data for drivers/clients/companies via Firestore `onSnapshot`. Components outside the admin panel cannot use `useAdminData()`. AdminDataContext exposes lookup helpers: `getChoferById`, `getClienteById`, `getEmpresaById`, `getChoferByNombre`, `getClienteByNombre` (no `getEmpresaByNombre`).
- **Admin panel module routing:** `components/features/Admin.js` is a large switch statement (~30 cases) that renders the active module. This is client-side state routing (not URL-based) — there are no distinct URLs per admin module. `components/Layout/Sidebar.js` controls navigation by setting `selectedModule` state, which Admin.js switches on. To add a new admin module: (1) add the module name to `ADMIN_MODULES` in `constants/index.js`, (2) add a `case` in `Admin.js` `renderModule()`, (3) add a sidebar entry in `Sidebar.js`. **Note:** 18 module names are defined in `ADMIN_MODULES`; the remaining (~11, mostly análisis submodules like `estadoFinanciero`, `gastos`, `empleados`, `historialAnticipos`, `historialAutorizaciones`, and utility modules like `registroMasivoVehiculos`, `eliminaVehiculos`) use string literals directly in Sidebar.js and Admin.js.
- **Firebase services:** All Firestore CRUD is centralized in `services/firebaseService.js` (re-exported via `services/index.js`). Import from `services/` barrel export. Use it instead of direct Firestore calls. Key exports: `addDocument`, `updateDocument`, `setDocument` (with optional merge), `queryDocuments` (multi-where), `batchWrite`, `subscribeToDocument`, `subscribeToCollection`, and the raw `firestore` instance. Includes a **sequential ID system** (`getNextConsecutive`, `runTransactionWithConsecutive`, `updateConsecutive`) for generating incrementing IDs stored in the `config` collection under keys defined in `CONFIG_KEYS`. **Important:** `addDocument` auto-injects `createdAt` and `updateDocument` auto-injects `updatedAt` — don't add these manually in calling code. **Gotcha:** `CONFIG_KEYS` has inconsistent naming — most are camelCase but `"Viajes pagados"` has a space.
- **Constants as single source of truth:** `constants/index.js` exports all enums and config: collection names (`COLLECTIONS`), vehicle/trip statuses, payment methods, user roles (`USER_TYPES`), admin module names (`ADMIN_MODULES`), company info for receipts, field validation limits, and helper functions (`getStatusLabel`, `getStatusIndex`, `formatFirestoreTimestamp`). Use `formatFirestoreTimestamp` for all timestamp rendering — it handles both Firestore Timestamp objects and plain JS Dates. There is also a `utils/constants.js` with overlapping vehicle status definitions — prefer `constants/index.js` as the canonical source.
- **Custom hooks:** Located in `hooks/` (with barrel export via `hooks/index.js`) — `useFirestoreCollection` (real-time subscriptions), `useAuth`, `useAlert`, `usePagination`, `useCopyToClipboard`. Note: some components still implement their own Firestore listeners.
- **Utilities:** Shared helpers in `utils/index.js`. Audit logging via `utils/auditLog.js`.

### Component Organization

Components are organized into four top-level directories:

- **`components/features/`** — All admin panel modules, organized by domain:
  - `caja/` — Cash register: vehicle payments, entries/exits, daily/total cuts
  - `vehiculos/` — Vehicle CRUD, bulk registration, tracking, deletion
  - `viajes/` — Trip management, driver sheets, verification, liquidation, history
  - `analisis/` — Financial analysis, advance payments, authorizations, expenses (adminMaster only)
  - `choferes/`, `clientes/`, `empresas/` — Entity management (drivers, clients, carriers)
  - `cobranza/` — Collections and pending payments
  - `reportes/` — Income reports, collection reports, pending payment reports
  - `config/` — Users, state/price management, migration tools, ERC deletion
  - `solicitudes/` — Vehicle requests from clients
- **`components/ui/`** — Shared UI primitives: Alert, EmptyState, LoadingSpinner, Pagination, SearchBar, StatusBadge, StatusSteps, `buttons/`, `inputs/`, `modals/` (ConfirmModal)
- **`components/auth/`** — Login, registration, password recovery forms
- **`components/Layout/`** — Header, HeaderPanel, Sidebar, Footer, Layout wrapper
- **`components/marketing/`** — Landing page components (Hero, Pricing, Feature, Catalogo, Testimoni)

### Vehicle Status Pipeline

```
PR (Registered) -> IN (Loading) -> TR (In Transit) -> EB (In Brownsville) -> DS (Unloaded) -> EN (Delivered)
```

### Firestore Collections (key ones)

- `vehiculos` — vehicle inventory with status tracking
- `viajesPendientes` / `viajesPagados` — unpaid / paid trips
- `movimientos`, `entradasCaja`, `salidasCaja` — cash register movements
- `choferes`, `clientes`, `empresas` — entity data (cached in AdminDataContext)
- `solicitudesVehiculos` — client vehicle requests
- `lotesEnTransito` — lot tracking
- `auditLog` — audit trail entries
- `config` — system configuration and sequential IDs
- `tokensChofer` — FCM/push notification tokens for drivers
- `pagosNomina` — payroll payments

### Pages and Routing

- **Public:** `index` (landing), `login`, `solicitar` (client vehicle request), `rastreo` (tracking)
- **Admin panel:** `admin` (renders Admin.js module router)
- **Role-specific portals:** `carriers` + `loads` (empresa), `misviajes` (chofer), `portal` + `solicitar` (cliente)
- **API routes:** `api/scrape-vehicle` (Puppeteer auction scraper), `api/proxy-storage` (storage proxy), `api/send-whatsapp` (WhatsApp Business API messaging)
- **Maintenance scripts:** `scripts/` contains audit scripts (`auditActivos`, `auditDesync`, `auditPrecios`) and `rastrearLote` (lot tracking via Puppeteer)

### User Roles and Permissions

`USER_TYPES` has four values: `admin`, `empresa`, `chofer`, `cliente`. `adminMaster` is **not** a separate type — it's a boolean flag (`user.adminMaster === true`) on admin users that grants full system access including user management and análisis modules. Similarly, `user.caja === true` is a boolean flag that gates access to cash register features.

- `admin` — daily operations (cash register if `caja` flag set, vehicles, trips, reports); with `adminMaster` flag: full access
- `empresa` — carrier portal (`/carriers`, `/loads`)
- `chofer` — driver view (`/misviajes`)
- `cliente` — client portal (`/portal`, `/solicitar`)

## Code Conventions

- **Language mix:** Variables, UI text, and collection names are in Spanish. Framework/React patterns use English.
- **Styling:** Tailwind + DaisyUI classes directly in JSX. No CSS modules or styled-components. Custom DaisyUI theme `mytheme` defined in `tailwind.config.js` with brand primary color `#b40a0a` (dark red).
- **Components:** Functional components with hooks only. No class components.
- **Payment methods:** Cash, check, Zelle, card — all registered manually (no payment processor integration).
- **Printing:** Receipt/document printing uses `react-to-print`. Excel exports use `xlsx`.

## Known Issues to Be Aware Of

- `setup-master.js` and `clonar-usuario.js` pages have no auth protection
- `/api/scrape-vehicle` has no authentication or rate limiting
- No Firestore security rules file exists
- Payment writes in `PagoVehiculo.js` and `PagosPendientes.js` are not atomic (vehicle + movement written separately)
- UID `"BdRfEmYfd7ZLjWQHB06uuT6w2112"` is hardcoded in `PagoVehiculo.js` and `Vehiculos.js`
- Financial arithmetic uses floating point instead of integer cents
- `firebase` is v7 (legacy namespace API, not modular v9+). All new Firebase code must use the `import firebase from "firebase/app"` + `firebase.firestore()` pattern — do not use v9 modular imports
- Hardcoded name-based permission in `Sidebar.js`: `puedeVerAnticipos` checks if user name includes "olivia" or "cristela" to gate access to `historialAnticipos` and related sub-modules
- `tailwind.config.js` defines `boxShadow` at top-level `theme` (not `theme.extend`), which replaces all default Tailwind shadows with a custom set — adding new shadow utilities requires updating this config
