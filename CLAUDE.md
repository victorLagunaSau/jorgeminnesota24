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

**Stack:** Next.js 12.3.1, React 17, Tailwind CSS 3 + DaisyUI 4, Firebase v7 (Auth, Firestore, Storage), Puppeteer (auction scraping)

### Key Architectural Patterns

- **State management:** React Context API only (no Redux). `AuthContext` (auth state) and `AdminDataContext` (real-time cached data for drivers/clients/companies via Firestore `onSnapshot`).
- **Admin panel:** Single `components/features/Admin.js` acts as module router via a large switch statement (~28 cases). Sidebar navigation sets the active module.
- **Firebase services:** All Firestore CRUD is centralized in `services/firebaseService.js`. Use it instead of direct Firestore calls.
- **Utilities:** Shared helpers in `utils/index.js`. Audit logging via `utils/auditLog.js`.
- **Custom hooks:** `hooks/useFirestoreCollection.js` for real-time Firestore subscriptions (though many components still implement their own).

### Vehicle Status Pipeline

```
PR (Registered) -> IN (Loading) -> TR (In Transit) -> EB (In Brownsville) -> DS (Unloaded) -> EN (Delivered)
```

### Firestore Collections (key ones)

- `vehiculos` — vehicle inventory with status tracking
- `viajesPendientes` / `viajesPagados` — unpaid / paid trips
- `movimientos`, `entradasCaja`, `salidasCaja` — cash register movements
- `config` — system configuration and sequential IDs

### User Roles

- `adminMaster` — full system access including user management
- `admin` — daily operations (cash register, vehicles, trips, reports)
- `empresa` — carrier portal (`/carriers`, `/loads`)
- `chofer` — driver view (`/misviajes`)
- `cliente` — client portal (`/portal`, `/solicitar`)

## Code Conventions

- **Language mix:** Variables, UI text, and collection names are in Spanish. Framework/React patterns use English.
- **Styling:** Tailwind + DaisyUI classes directly in JSX. No CSS modules or styled-components.
- **Components:** Functional components with hooks only. No class components.
- **Payment methods:** Cash, check, Zelle, card — all registered manually (no payment processor integration).

## Known Issues to Be Aware Of

- `setup-master.js` and `clonar-usuario.js` pages have no auth protection
- `/api/scrape-vehicle` has no authentication or rate limiting
- No Firestore security rules file exists
- Payment writes in `PagoVehiculo.js` and `PagosPendientes.js` are not atomic (vehicle + movement written separately)
- UID `"BdRfEmYfd7ZLjWQHB06uuT6w2112"` is hardcoded in `PagoVehiculo.js` and `Vehiculos.js`
- Financial arithmetic uses floating point instead of integer cents
- `firebase` is v7 (legacy namespace API, not modular v9+)
