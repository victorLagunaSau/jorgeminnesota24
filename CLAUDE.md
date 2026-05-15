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

**Deployment:** Main app on **Vercel**. Auction scraper on a **Digital Ocean VPS** (see `vps-scraper/`).

**Firebase config:** Loaded from `NEXT_PUBLIC_FIREBASE_*` env vars in `firebase/firebaseIni.js`. Client-side only init (guarded by `typeof window`). `next.config.js` sets `images.unoptimized = true` for static export compatibility. Additional server-side env vars: `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_ACCESS_TOKEN` (used in API routes only), `SCRAPER_URL` + `SCRAPER_API_KEY` (VPS scraper connection), `FCM_SERVER_KEY` (push notifications).

### Key Architectural Patterns

- **State management:** React Context API only (no Redux). Two context providers: `AuthContext` (`context/auth.js`) wraps the entire app in `_app.js`; `AdminDataContext` (`context/adminData.js`) wraps only the admin panel (scoped inside the admin page, not global) and provides real-time cached data for drivers/clients/companies via Firestore `onSnapshot`. Components outside the admin panel cannot use `useAdminData()`. AdminDataContext exposes lookup helpers: `getChoferById`, `getClienteById`, `getEmpresaById`, `getChoferByNombre`, `getClienteByNombre` (no `getEmpresaByNombre`).
- **Admin panel module routing:** `components/features/Admin.js` is a large switch statement (~30 cases) that renders the active module. This is client-side state routing (not URL-based) — there are no distinct URLs per admin module. `components/Layout/Sidebar.js` controls navigation by setting `selectedModule` state, which Admin.js switches on. To add a new admin module: (1) add the module name to `ADMIN_MODULES` in `constants/index.js`, (2) add a `case` in `Admin.js` `renderModule()`, (3) add a sidebar entry in `Sidebar.js`. **Note:** 18 module names are defined in `ADMIN_MODULES`; the remaining (~11, mostly análisis submodules like `estadoFinanciero`, `gastos`, `empleados`, `historialAnticipos`, `historialAutorizaciones`, and utility modules like `registroMasivoVehiculos`, `eliminaVehiculos`) use string literals directly in Sidebar.js and Admin.js.
- **Authorization system:** The `historialAutorizaciones` module (`components/features/analisis/HistorialAutorizaciones.js`) tracks pending authorizations for vehicle edits (`edicion`), deletions (`eliminacion`), and lot changes (`cambioLote`). It also appears in the header nav via `HeaderPanel.js` as a notification badge. This is an audit/approval workflow — not to be confused with auth/login.
- **Firebase services:** All Firestore CRUD is centralized in `services/firebaseService.js` (re-exported via `services/index.js`). Import from `services/` barrel export. Use it instead of direct Firestore calls. Key exports: `addDocument`, `updateDocument`, `deleteDocument`, `setDocument` (with optional merge), `getDocument`, `getCollection`, `queryDocuments` (multi-where), `batchWrite`, `subscribeToDocument`, `subscribeToCollection`, and the raw `firestore` instance. Includes a **sequential ID system** (`getNextConsecutive`, `runTransactionWithConsecutive`, `updateConsecutive`) for generating incrementing IDs stored in the `config` collection under keys defined in `CONFIG_KEYS`. **Important:** `addDocument` auto-injects `createdAt` and `updateDocument` auto-injects `updatedAt` — don't add these manually in calling code. **Gotcha:** `CONFIG_KEYS` has inconsistent naming — most are camelCase but `"Viajes pagados"` has a space.
- **Constants as single source of truth:** `constants/index.js` exports all enums and config: collection names (`COLLECTIONS`), vehicle/trip statuses, payment methods, user roles (`USER_TYPES`), admin module names (`ADMIN_MODULES`), company info for receipts, field validation limits, and helper functions (`getStatusLabel`, `getStatusIndex`, `formatFirestoreTimestamp`). Use `formatFirestoreTimestamp` for all timestamp rendering — it handles both Firestore Timestamp objects and plain JS Dates. There is also a `utils/constants.js` with overlapping vehicle status definitions — prefer `constants/index.js` as the canonical source.
- **Custom hooks:** Located in `hooks/` (with barrel export via `hooks/index.js`) — `useFirestoreCollection` (real-time subscriptions), `useAuth`, `useAlert`, `usePagination`, `useCopyToClipboard`. Note: some components still implement their own Firestore listeners.
- **Utilities:** Shared helpers in `utils/index.js`. Audit logging via `utils/auditLog.js`.

### Component Organization

- **`components/features/`** — All admin panel modules, organized by domain (caja, vehiculos, viajes, analisis, choferes, clientes, empresas, cobranza, reportes, config, solicitudes). The `analisis/` subdirectory is restricted to `adminMaster` users.
- **`components/ui/`** — Shared UI primitives (Alert, EmptyState, LoadingSpinner, Pagination, SearchBar, StatusBadge, StatusSteps, buttons, inputs, modals)
- **`components/auth/`** — Login, registration, password recovery
- **`components/Layout/`** — Header, HeaderPanel, Sidebar, Footer, Layout wrapper
- **`components/marketing/`** — Landing page components

### Vehicle Status Pipeline

```
PR (Registered) -> IN (Loading) -> TR (In Transit) -> EB (In Brownsville) -> DS (Unloaded) -> EN (Delivered)
```

### Firestore Collections (key ones)

All collection names are in `COLLECTIONS` constant. Notable non-obvious ones:
- `viajesPendientes` / `viajesPagados` — unpaid vs paid trips (separate collections, not a status field)
- `movimientos`, `entradasCaja`, `salidasCaja` — three separate collections for cash register
- `tokensChofer` — temporary 6-char access codes for drivers (not FCM tokens)
- `tokensCliente` — FCM push notification tokens for clients (from Capacitor app)
- `auditLog` — audit trail entries (via `utils/auditLog.js`)
- `solicitudesVehiculos` — client vehicle requests from the solicitar portal
- `pagosNomina` — payroll payments for employees
- `lotesEnTransito` — lots/batches currently in transit
- `config` — system configuration and sequential ID counters

### Pages and Routing

- **Public:** `index` (landing), `login`, `solicitar` (client vehicle request), `rastreo` (tracking)
- **Admin panel:** `admin` (renders Admin.js module router)
- **Role-specific portals:** `carriers` + `loads` (empresa), `misviajes` (chofer), `clients` + `solicitar` (cliente)
- **API routes:** `api/scrape-vehicle` (Puppeteer auction scraper), `api/proxy-storage` (storage proxy), `api/send-whatsapp` (WhatsApp Business API messaging), `api/send-push` (FCM push notifications to clients), `api/send-push-chofer` (FCM push notifications to drivers)
- **Maintenance scripts:** `scripts/` contains `debugViajes.js` (trip debugging), `generarAnalisisPDF.js` (financial analysis PDF), `generarCobranzaPDF.js` (collections PDF), `generarComisionesPDF.js` (commissions PDF)

### VPS Scraper (`vps-scraper/`)

Standalone Express + Puppeteer microservice deployed on a Digital Ocean VPS. Vercel can't run Puppeteer (serverless limits), so auction scraping is offloaded here.

```
Client → Vercel (/api/scrape-vehicle) → VPS (:4000/api/scrape) → bid.cars → response
```

- `vps-scraper/server.js` — Express server, persistent browser instance, ephemeral contexts per request
- Requires `x-api-key` header matching `SCRAPER_API_KEY` env var
- Has its own `CLAUDE.md` with setup/deployment instructions

### User Roles and Permissions

`USER_TYPES` has four values: `admin`, `empresa`, `chofer`, `cliente`. `adminMaster` is **not** a separate type — it's a boolean flag (`user.adminMaster === true`) on admin users that grants full system access including user management and análisis modules. Similarly, `user.caja === true` is a boolean flag that gates access to cash register features.

- `admin` — daily operations (cash register if `caja` flag set, vehicles, trips, reports); with `adminMaster` flag: full access
- `empresa` — carrier portal (`/carriers`, `/loads`)
- `chofer` — driver view (`/misviajes`)
- `cliente` — client portal (`/clients`, `/solicitar`)

## Code Conventions

- **Language mix:** Variables, UI text, and collection names are in Spanish. Framework/React patterns use English.
- **Styling:** Tailwind + DaisyUI classes directly in JSX. No CSS modules or styled-components. Custom DaisyUI theme `mytheme` defined in `tailwind.config.js` with brand primary color `#b40a0a` (dark red).
- **Components:** Functional components with hooks only. No class components.
- **Payment methods:** Cash, check, Zelle, card — all registered manually (no payment processor integration).
- **Printing:** Receipt/document printing uses `react-to-print`. Excel exports use `xlsx`.

## Other Notes

- **README.md is outdated** — it's from the original landing page template and does not reflect the current app. Ignore it.

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

## Mobile App (Capacitor)

The client portal (`/clients`, `/solicitar`) is wrapped as a native iOS/Android app using **Capacitor 6** in the `mobile/` directory.

### Mobile Commands

```bash
cd mobile
bash build.sh           # Full pipeline: npm run export → copy to www/ → redirect index → cap sync
npx cap sync ios        # Sync web assets + plugins to iOS
npx cap open ios        # Open in Xcode
```

### Mobile Architecture

- **Config:** `mobile/capacitor.config.json` — `CapacitorHttp.enabled: false` is critical (enabling it breaks Firestore WebChannel streaming)
- **Build pipeline:** `mobile/build.sh` runs `npm run export` from root, copies `out/` to `mobile/www/`, replaces `index.html` with a redirect to `/clients.html`, then `cap sync`
- **iOS project:** `mobile/ios/App/App.xcodeproj` (Swift Package Manager, NOT xcworkspace)
- **Safe areas:** CSS classes `.safe-area-top` / `.safe-area-bottom` in `styles/tailwind.css` for Capacitor WebView notch handling. Applied to headers and page containers in `clients.js` and `solicitar.js`
- **Viewport:** `_document.js` has `maximum-scale=1.0, user-scalable=no` to prevent iOS auto-zoom on inputs
- **iOS auto-zoom fix:** `styles/tailwind.css` forces `font-size: 16px !important` on all inputs/selects/textareas

### Push Notifications (code ready, pending external setup)

All notification code is implemented. Helper functions `notificarCambioEstatus()` and `notificarCambioSolicitud()` in `utils/index.js` call `/api/send-push`. Notifications fire on vehicle status changes and solicitud status changes across multiple components. Requires Apple Developer Account + APNs key + Firebase FCM setup to activate — push notifications only work on real devices, not the iOS simulator.

Token flow: client logs in → `clients.js` registers FCM token via Capacitor → saved to `tokensCliente` → `/api/send-push` looks up tokens by `clienteNombre` and sends via FCM legacy API.
