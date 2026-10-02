# Women Safety Bangladesh — নারী নিরাপত্তা

A privacy-first safety platform for Bangladesh: emergency SOS, trusted contacts, offline
incident reporting, a district safety directory and privacy-safe public statistics.

The repository contains two independently buildable parts:

| Path       | Stack                                        | Description                                   |
| ---------- | -------------------------------------------- | --------------------------------------------- |
| `backend/` | .NET 8 · Clean Architecture · SQLite · JWT   | REST API, emergency cascade, offline sync     |
| `frontend/`| React · Vite · TypeScript                    | Installable PWA client for the API            |

## Quick start

**1. Backend**

```bash
cd backend/src/WomenSafety.Api
dotnet run            # https://localhost:5001
```

**2. Frontend**

```bash
cd frontend
npm install
npm run dev           # http://localhost:5173 (proxies /api to the backend)
```

See [`frontend/README.md`](frontend/README.md) for configuration and deployment options.

## Principles

- **No false promises:** the platform never claims to contact an emergency service; it only
  offers one-tap call shortcuts and discloses which integrations are real
  (`GET /api/public/capabilities`).
- **Privacy by default:** public statistics are aggregated and suppressed below a minimum
  bucket size; exact locations are only ever exposed through owner-scoped routes.
- **Offline-first:** clients may queue emergencies locally and sync idempotently later.

## License

Internal / educational project.
