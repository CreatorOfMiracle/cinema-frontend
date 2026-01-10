# Cinema — cashier cabinet (frontend)

Frontend repo:
- Next.js (React) + TypeScript + Tailwind + shadcn/ui + TanStack Query

## Quick start

Prereqs: Node.js 20+, `npm`.

1) Install deps
```bash
npm --prefix apps/web install
```

2) Run web app
```bash
npm run dev --prefix apps/web
```

Web: `http://localhost:3000`

## Config
- `apps/web/.env.local` (see `apps/web/.env.example`)

## API contract (backend)
Frontend ожидает REST-like API по `NEXT_PUBLIC_API_BASE_URL`:
- `GET /api/halls`
- `GET /api/sessions`
- `POST /api/sessions`
- `PUT /api/sessions/:id`
- `DELETE /api/sessions/:id`
- `GET /api/sessions/:id/bookings`
- `POST /api/bookings`
- `PUT /api/bookings/:id`
- `DELETE /api/bookings/:id`
- `POST /api/bookings/:id/move`
