# Women Safety BD — Frontend

A standalone **React + Vite + TypeScript** single-page application for the Women Safety
Bangladesh platform. It talks to the .NET 8 backend in [`../backend`](../backend) and is a
progressive web app (installable, offline-capable).

## Why a separate `frontend/`

The original UI shipped as vanilla-JS files inside the backend's `wwwroot/` and was tightly
coupled to the API host. This folder is a proper, independently buildable frontend with typed
API contracts, componentised pages and a dev proxy — while still supporting the
"backend serves the app" deployment model.

## Requirements

- Node.js 18+ (developed on Node 24) and npm.

## Getting started

```bash
cd frontend
npm install
cp .env.example .env.local   # optional; sensible defaults are built in
npm run dev                  # http://localhost:5173
```

During `npm run dev`, requests to `/api/*` are proxied to the backend
(`VITE_API_PROXY_TARGET`, default `https://localhost:5001`) so the browser sees a single
origin. Start the backend first:

```bash
cd ../backend/src/WomenSafety.Api
dotnet run
```

## Scripts

| Command             | Description                                       |
| ------------------- | ------------------------------------------------- |
| `npm run dev`       | Start the Vite dev server with API proxy          |
| `npm run build`     | Type-check (`tsc --noEmit`) and build to `dist/`  |
| `npm run preview`   | Serve the production build locally                |
| `npm run typecheck` | Type-check only                                   |

## Configuration

All variables must be prefixed with `VITE_` to reach the client bundle.

| Variable                 | Default                 | Purpose                                             |
| ------------------------ | ----------------------- | --------------------------------------------------- |
| `VITE_API_BASE_URL`      | `""` (same origin)      | API origin when the SPA is hosted separately        |
| `VITE_API_PROXY_TARGET`  | `https://localhost:5001`| Dev-server proxy target for `/api/*`                |

## Deployment

Two supported options:

1. **Backend hosts the app (same origin).** Build with `VITE_API_BASE_URL=""` (default) and
   copy `dist/` over `backend/src/WomenSafety.Api/wwwroot/`. The API client uses relative paths.
2. **Separate host.** Build with `VITE_API_BASE_URL=https://api.example.com`, serve the static
   `dist/` from any web server/CDN, and allow the SPA origin in the backend CORS policy
   (already `AllowAnyOrigin` by default).

## Project structure

```
src/
├─ main.tsx              App bootstrap (providers, router, service worker)
├─ App.tsx              Route table
├─ types.ts             API contract types (mirrors the backend DTOs)
├─ i18n/                English/Bangla strings + provider (t, lang, toggle)
├─ lib/
│  ├─ api.ts            Typed fetch wrapper: bearer token, auto token refresh
│  ├─ session.ts        Token/profile/installation-id storage
│  ├─ format.ts         Date/distance/bytes formatting, geolocation helper
│  ├─ hooks.ts          useAsync data-loading hook
│  └─ useUnreadCount.ts Notification badge polling
├─ context/
│  ├─ AuthContext.tsx   Login/register/OTP/logout + profile
│  └─ ToastContext.tsx  Transient notifications
├─ components/          Layout, Navbar, Footer, ProtectedRoute, UI primitives
└─ pages/               One component per route (public, auth, emergency, ops)
```

## Feature coverage

- **Public:** home, district/service directory (with nearby search via geolocation),
  safety tips & legal information, privacy-safe statistics, privacy explainer.
- **Auth:** password and OTP login, registration, profile & session management.
- **Emergency:** one-tap SOS with privacy modes, incident list/detail, status timeline,
  evidence upload, police referral creation, location trail.
- **Safety tools:** trusted contacts, trip check-ins, time-boxed live location sharing
  (public `#/track/:token` view), notification centre, privacy centre (consents, data
  export, deletion request).
- **Ops consoles:** responder console (claim & progress incidents) and moderator workbench
  (review queue, users, deletion requests) — role-gated.

### Design notes

- The platform **never contacts an emergency service on the user's behalf**; it only provides
  one-tap call shortcuts. The UI states this explicitly.
- Public statistics below the aggregation threshold are suppressed, matching the backend.

## PWA

`public/manifest.webmanifest` and `public/sw.js` provide an installable, offline-capable app.
The service worker is registered for production builds only.
