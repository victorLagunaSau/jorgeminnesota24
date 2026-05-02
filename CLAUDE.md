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

**Firebase config:** Loaded from `NEXT_PUBLIC_FIREBASE_*` env vars in `firebase/firebaseIni.js`. Client-side only init (guarded by `typeof window`). No `next.config.js` — uses default Next.js 12 config.

### Key Architectural Patterns

- **State management:** React Context API only (no Redux). Two context providers: `AuthContext` (`context/auth.js`) wraps the entire app; `AdminDataContext` (`context/adminData.js`) wraps only the admin panel and provides real-time cached data for drivers/clients/companies via Firestore `onSnapshot`. AdminDataContext also exposes lookup helpers: `getChoferById`, `getClienteById`, `getEmpresaById`, `getChoferByNombre`, `getClienteByNombre`.
- **Admin panel module routing:** `components/features/Admin.js` is a large switch statement (~30 cases) that renders the active module. `components/Layout/Sidebar.js` controls navigation by setting `selectedModule` state, which Admin.js switches on. **Note:** only ~19 module names are defined in `ADMIN_MODULES` in `constants/index.js`; the remaining (~11, mostly análisis submodules like `estadoFinanciero`, `gastos`, `empleados`, `historialAnticipos`, `historialAutorizaciones`, and utility modules like `registroMasivoVehiculos`, `eliminaVehiculos`) use string literals directly in Sidebar.js and Admin.js.
- **Firebase services:** All Firestore CRUD is centralized in `services/firebaseService.js` (re-exported via `services/index.js`). Import from `services/` barrel export. Use it instead of direct Firestore calls. Includes a **sequential ID system** (`getNextConsecutive`, `runTransactionWithConsecutive`) for generating incrementing IDs stored in the `config` collection.
- **Constants as single source of truth:** `constants/index.js` exports all enums and config: collection names (`COLLECTIONS`), vehicle/trip statuses, payment methods, user roles (`USER_TYPES`), admin module names (`ADMIN_MODULES`), company info for receipts, field validation limits, and helper functions like `getStatusLabel`. There is also a `utils/constants.js` with overlapping vehicle status definitions — prefer `constants/index.js` as the canonical source.
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
- **`components/ui/`** — Shared UI primitives: Alert, EmptyState, LoadingSpinner, Pagination, SearchBar, StatusBadge, StatusSteps, ConfirmModal, buttons, inputs
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

### Pages and Routing

- **Public:** `index` (landing), `login`, `solicitar` (client vehicle request), `rastreo` (tracking)
- **Admin panel:** `admin` (renders Admin.js module router)
- **Role-specific portals:** `carriers` + `loads` (empresa), `misviajes` (chofer), `portal` + `solicitar` (cliente)
- **API routes:** `api/scrape-vehicle` (Puppeteer auction scraper), `api/proxy-storage` (storage proxy)
- **Maintenance scripts:** `scripts/` contains audit scripts (`auditActivos`, `auditDesync`, `auditPrecios`) and `rastrearLote` (lot tracking via Puppeteer)

### User Roles

- `adminMaster` — full system access including user management and análisis modules
- `admin` — daily operations (cash register, vehicles, trips, reports)
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
- `firebase` is v7 (legacy namespace API, not modular v9+)
