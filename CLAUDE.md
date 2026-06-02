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

**Deployment:** Main app on **Vercel**. Auction scraper on a **Digital Ocean VPS** — code lives in a separate repo: `github.com/Nova-studia/vps-scraper`.

**Firebase config:** Loaded from `NEXT_PUBLIC_FIREBASE_*` env vars in `firebase/firebaseIni.js`. Client-side only init (guarded by `typeof window`). `next.config.js` sets `images.unoptimized = true` for static export compatibility. Additional server-side env vars: `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_ACCESS_TOKEN` (used in API routes only), `SCRAPER_URL` + `SCRAPER_API_KEY` (VPS scraper connection), `FCM_SERVER_KEY` (push notifications).

### Key Architectural Patterns

- **State management:** React Context API only (no Redux). Two context providers: `AuthContext` (`context/auth.js`) wraps the entire app in `_app.js`; `AdminDataContext` (`context/adminData.js`) wraps only the admin panel (scoped inside the admin page, not global) and provides real-time cached data for drivers/clients/companies via Firestore `onSnapshot`. Components outside the admin panel cannot use `useAdminData()`. AdminDataContext exposes lookup helpers: `getChoferById`, `getClienteById`, `getEmpresaById`, `getChoferByNombre`, `getClienteByNombre` (no `getEmpresaByNombre`).
- **Admin panel module routing:** `components/features/Admin.js` is a large switch statement (~30 cases) that renders the active module. This is client-side state routing (not URL-based) — there are no distinct URLs per admin module. `components/Layout/Sidebar.js` controls navigation by setting `selectedModule` state, which Admin.js switches on. To add a new admin module: (1) add the module name to `ADMIN_MODULES` in `constants/index.js`, (2) add a `case` in `Admin.js` `renderModule()`, (3) add a sidebar entry in `Sidebar.js`. **Note:** 18 module names are defined in `ADMIN_MODULES`; the remaining (~11, mostly análisis submodules like `estadoFinanciero`, `gastos`, `empleados`, `historialAnticipos`, `historialAutorizaciones`, and utility modules like `registroMasivoVehiculos`, `eliminaVehiculos`) use string literals directly in Sidebar.js and Admin.js.
- **Authorization system:** The `historialAutorizaciones` module (`components/features/analisis/HistorialAutorizaciones.js`) tracks pending authorizations for vehicle edits (`edicion`), deletions (`eliminacion`), and lot changes (`cambioLote`). It also appears in the header nav via `HeaderPanel.js` as a notification badge. This is an audit/approval workflow — not to be confused with auth/login.
- **Firebase services:** All Firestore CRUD is centralized in `services/firebaseService.js` (re-exported via `services/index.js`). Import from `services/` barrel export. Use it instead of direct Firestore calls. Key exports: `addDocument`, `updateDocument`, `deleteDocument`, `setDocument` (with optional merge), `getDocument`, `getCollection`, `queryDocuments` (multi-where), `batchWrite`, `subscribeToDocument`, `subscribeToCollection`, and the raw `firestore` instance. Includes a **sequential ID system** (`getNextConsecutive`, `runTransactionWithConsecutive`, `updateConsecutive`) for generating incrementing IDs stored in the `config` collection under keys defined in `CONFIG_KEYS`. **Important:** `addDocument` auto-injects `createdAt` and `updateDocument` auto-injects `updatedAt` — don't add these manually in calling code. **Gotcha:** `CONFIG_KEYS` has inconsistent naming — most are camelCase but `"Viajes pagados"` has a space.
- **Constants as single source of truth:** `constants/index.js` exports all enums and config: collection names (`COLLECTIONS`), vehicle/trip statuses, payment methods, user roles (`USER_TYPES`), admin module names (`ADMIN_MODULES`), company info for receipts, field validation limits, and helper functions (`getStatusLabel`, `getStatusIndex`, `formatFirestoreTimestamp`). Use `formatFirestoreTimestamp` for all timestamp rendering — it handles both Firestore Timestamp objects and plain JS Dates. There is also a `utils/constants.js` with overlapping vehicle status definitions — prefer `constants/index.js` as the canonical source. **Gotcha:** the `VEHICLE_STATUS` shape differs between the two files: `constants/index.js` uses objects `{ code, label }` while `utils/constants.js` uses plain strings (`"Registrado"`). Code importing from the wrong source will get a different data structure.
- **Admin impersonation:** `useAuth` exposes `startImpersonating(targetUserId)` (takes a user ID, not a user object), `stopImpersonating()`, `isImpersonating`, and `realUser` — a "View As" feature allowing admin users to see the app as another user. Added in the `Auths` commit.
- **Client lifecycle & dedup:** Client names are stored UPPERCASE and **denormalized by name** onto other docs — there is no FK by client ID, so a name change must be propagated everywhere. The `clientes` collection holds a mix of states distinguished by flags: pending self-registrations (`aprobado === false`), active clients (`activo !== false`), and merged-away duplicates (`activo === false`). Two flows in `components/features/clientes/`:
  - **Merge duplicates** (`FusionarClientes.js`, opened from `Clientes.js`): pick a principal + a duplicate, then `reasignarCampo`/`reasignarEnViajes` rewrite the duplicate's name → principal's name across `vehiculos` (field `cliente`), `solicitudesVehiculos` + `tokensCliente` (field `clienteNombre`), and `viajesPendientes`/`viajesPagados` (where the name lives **inside the `vehiculos` array** under keys `clienteNombre`/`clienteAlt`/`cliente`, not at doc level — these are read-modify-write, not a `where` query). Batches of 400 to respect Firestore limits. The duplicate doc is then marked `activo: false` (+ `fusionadoEn`/`fusionadoNombre`/`fusionadoFecha`) — a reversible soft-delete that leaves a trail, never a hard delete. `Clientes.js` filters out `activo === false` so merged dupes disappear from the list.
  - **Self-registration linking** (`ClientesNuevos.js`): public-portal sign-ups land in `clientes` with `aprobado: false`. Admin either approves (sets `aprobado: true`) or, when it matches an existing client (phone+name suggestion), links via `vincularCliente` — points the new Auth `users/{uid}.clienteIdOriginal` at the existing client doc, back-fills only empty fields on the existing doc (**never overwrites the canonical `cliente` name**, to preserve the name-based denormalization links), then deletes the temp registration doc (login falls back to `clienteIdOriginal`).
- **Custom hooks:** Located in `hooks/` (with barrel export via `hooks/index.js`) — `useFirestoreCollection` (real-time subscriptions), `useAuth`, `useAlert`, `usePagination`, `useCopyToClipboard`. Note: some components still implement their own Firestore listeners.
- **Utilities:** `utils/index.js` exports push notification helpers (`notificarCambioEstatus`, `notificarViajeAsignado`, `notificarCambioSolicitud`), numeric helpers (`parseNumberOrZero`, `formatCurrency`, `formatNumber`, `numberToWords`), date helpers (`formatFirestoreDate`, `formatDate`, `getTodayRange`), array utilities (`filterBySearch`, `sortByField`, `groupByField`), and validators (`isValidEmail`, `isValidPhone`, `isEmpty`). Note: `formatFirestoreDate` in utils is distinct from `formatFirestoreTimestamp` in constants — the latter handles Firestore Timestamp objects. Audit logging via `utils/auditLog.js`.

### Component Organization

- **`components/features/`** — All admin panel modules, organized by domain (caja, vehiculos, viajes, analisis, choferes, clientes, empresas, cobranza, reportes, config, solicitudes). The `analisis/` subdirectory is restricted to `adminMaster` users.
- **`components/ui/`** — Shared UI primitives (Alert, EmptyState, LoadingSpinner, Pagination, SearchBar, StatusBadge, StatusSteps, buttons, inputs, modals)
- **`components/auth/`** — Login, registration, password recovery
- **`components/Layout/`** — Header, HeaderPanel, Sidebar, Footer, Layout wrapper
- **`components/marketing/`** — Landing page components

### Status Pipelines

**Vehicle statuses** (`VEHICLE_STATUS` in constants):
```
PR (Registered) -> IN (Loading) -> TR (In Transit) -> EB (In Brownsville) -> DS (Unloaded) -> EN (Delivered)
```

**Trip statuses** (`TRIP_STATUS`): `PENDIENTE` → `VERIFICADO` → `PAGADO` (moves from `viajesPendientes` to `viajesPagados` collection on payment)

**Solicitud statuses** (`SOLICITUD_STATUS`): `pendiente` → `asignado` → `en_proceso` → `completado`

**Vehicle types** (`VEHICLE_TYPES`): A (ligero), B (mediano), C (pesado)

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
- **Role-specific portals:** `carriers` + `loads` + `carrier-mapa` (empresa), `misviajes` + `driver` + `driver-mapa` (chofer), `clients` + `solicitar` (cliente)
- **Other:** `privacy` (privacy policy page)
- **API routes:** `api/scrape-vehicle` (Puppeteer auction scraper), `api/proxy-storage` (storage proxy), `api/send-whatsapp` (WhatsApp Business API messaging), `api/send-push` (FCM push notifications to clients), `api/send-push-chofer` (FCM push notifications to drivers)
- **Maintenance scripts:** `scripts/` holds one-off data-fix/audit scripts (e.g. `corregirBinNips.js`, `auditChoferes.js`, `resetFolios.js`) that are written, run once against Firestore, then deleted — so the directory is usually empty. PDF output is generated in-app via `react-to-print`, not by standalone scripts. The `pdf/` directory is likewise scratch space (no tracked source).

### VPS Scraper (separate repo)

Standalone Express + Puppeteer microservice deployed on a Digital Ocean VPS. Vercel can't run Puppeteer (serverless limits), so auction scraping is offloaded here. **Source lives in a separate repo:** `github.com/Nova-studia/vps-scraper` — clone it if you need to touch the scraper.

```
Client → Vercel (/api/scrape-vehicle) → VPS (:4000/api/scrape) → bid.cars → response
```

Note: the `/solicitar` page calls the VPS **directly** at `https://jorgeminnesota.duckdns.org/api/scrape`, bypassing the Vercel proxy. The `x-api-key` is hardcoded client-side in `pages/solicitar.js`, so for that flow the key is effectively public.

- Express server, persistent browser instance, ephemeral contexts per request
- Requires `x-api-key` header matching `SCRAPER_API_KEY` env var
- The scraper repo has its own `CLAUDE.md` with setup/deployment instructions

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
- **Image uploads:** Vehicle photos go through `browser-image-compression` + `react-easy-crop` before uploading to Firebase Storage.
- **No `.env.example` file exists.** Required env vars must be inferred from this document (see Firebase config section above).

## Other Notes

- **README.md is outdated** — it's from the original landing page template and does not reflect the current app. Ignore it.
- **`Historial.md`** is a running audit/correction log (in Spanish) documenting data-integrity investigations and fixes (e.g. inconsistent `binNip` values with trailing spaces causing exact doc-ID lookups to fail). Consult it before touching `viajesPagados`/`vehiculos` reconciliation logic; it records which one-off scripts were already run.

## Known Issues to Be Aware Of

- `/api/scrape-vehicle` has no authentication or rate limiting
- No Firestore security rules file exists
- Payment writes in `PagoVehiculo.js` and `PagosPendientes.js` are not atomic (vehicle + movement written separately)
- UID `"BdRfEmYfd7ZLjWQHB06uuT6w2112"` is hardcoded in `PagoVehiculo.js` and `Vehiculos.js`
- Financial arithmetic uses floating point instead of integer cents
- `firebase` is v7 (legacy namespace API, not modular v9+). All new Firebase code must use the `import firebase from "firebase/app"` + `firebase.firestore()` pattern — do not use v9 modular imports
- Hardcoded name-based permission in `Sidebar.js`: `puedeVerAnticipos` checks if user name includes "olivia" or "cristela" to gate access to `historialAnticipos` and related sub-modules
- `tailwind.config.js` defines `boxShadow` at top-level `theme` (not `theme.extend`), which replaces all default Tailwind shadows with a custom set — adding new shadow utilities requires updating this config

## Mobile App (Capacitor)

The client portal (`/clients`, `/solicitar`) is wrapped as a native iOS/Android app using **Capacitor 8** in the `mobile/` directory.

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

All notification code is implemented. Helper functions `notificarCambioEstatus()`, `notificarViajeAsignado()`, and `notificarCambioSolicitud()` in `utils/index.js` call `/api/send-push` (clients) or `/api/send-push-chofer` (drivers). Notifications fire on vehicle status changes, trip assignments (to drivers via `/api/send-push-chofer`), and solicitud status changes across multiple components. Requires Apple Developer Account + APNs key + Firebase FCM setup to activate — push notifications only work on real devices, not the iOS simulator.

Token flow: client logs in → `clients.js` registers FCM token via Capacitor → saved to `tokensCliente` → `/api/send-push` looks up tokens by `clienteNombre` and sends via FCM legacy API.
