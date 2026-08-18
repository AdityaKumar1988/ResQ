# Smart EMS — Backend

Standalone Node.js + Express + PostgreSQL + Socket.IO service for the Smart EMS
platform. Ships with Docker Compose for zero-config local development.

## Stack

- Node.js 20+, Express 4
- PostgreSQL 16 (PostGIS image for future geo work)
- Knex.js migrations & seeds
- Socket.IO 4 for realtime dispatch / driver GPS
- JWT access + refresh tokens, bcrypt password hashing
- Zod input validation, Helmet + CORS + rate limiting
- Pino structured logging, morgan request logs
- Dockerfile + docker-compose.yml

## Quick start (Docker)

```bash
cd server
cp .env.example .env
docker compose up --build
```

The API is available at `http://localhost:4000`. Migrations and seed data
run automatically inside the container.

## Quick start (local)

```bash
cd server
cp .env.example .env
npm install
# start a local Postgres separately, then:
npm run migrate
npm run seed
npm run dev
```

## API surface

All routes are under `/api`. Authenticated routes require
`Authorization: Bearer <accessToken>`.

| Method | Path                             | Roles                   |
| ------ | -------------------------------- | ----------------------- |
| POST   | `/api/auth/register`             | public                  |
| POST   | `/api/auth/login`                | public                  |
| POST   | `/api/auth/refresh`              | public                  |
| GET    | `/api/auth/me`                   | any                     |
| GET    | `/api/users`                     | admin                   |
| PATCH  | `/api/users/:id/role`            | admin                   |
| GET    | `/api/drivers`                   | any                     |
| GET    | `/api/drivers/me`                | any                     |
| POST   | `/api/drivers/me/location`       | driver                  |
| PATCH  | `/api/drivers/me/status`         | driver                  |
| GET    | `/api/vehicles`                  | any                     |
| POST   | `/api/vehicles`                  | admin, dispatcher       |
| PATCH  | `/api/vehicles/:id`              | admin, dispatcher       |
| DELETE | `/api/vehicles/:id`              | admin                   |
| GET    | `/api/hospitals`                 | any                     |
| PATCH  | `/api/hospitals/:id/beds`        | admin, dispatcher       |
| GET    | `/api/incidents`                 | any                     |
| GET    | `/api/incidents/:id`             | any                     |
| POST   | `/api/incidents`                 | any                     |
| POST   | `/api/incidents/:id/assign`      | admin, dispatcher       |
| PATCH  | `/api/incidents/:id/status`      | any (driver/dispatcher) |
| GET    | `/api/dispatch/recommend/:incId` | admin, dispatcher       |
| GET    | `/api/analytics/overview`        | admin, dispatcher       |
| GET    | `/api/analytics/sla`             | admin, dispatcher       |
| GET    | `/api/notifications`             | any                     |
| POST   | `/api/notifications/:id/read`    | any                     |

Health check: `GET /health`.

## Realtime (Socket.IO)

Connect with `auth: { token: accessToken }`. Rooms:

- `role:dispatcher`, `role:admin` — receive `incident:*`, `fleet:*`,
  `driver:location`, `driver:status` events.
- `user:<userId>` — direct-to-driver `incident:new` on assignment.

Client emits: `driver:location { lat, lng, heading }`.

## Seed accounts

| Role       | Email                | Password     |
| ---------- | -------------------- | ------------ |
| admin      | admin@ems.local      | admin1234    |
| dispatcher | dispatch@ems.local   | dispatch1234 |
| driver     | driver1..8@ems.local | driver1234   |
| citizen    | citizen@ems.local    | citizen1234  |

## Project layout

```
server/
  src/
    app.js            # Express app factory
    index.js          # HTTP + Socket.IO bootstrap
    config.js         # env config
    db.js             # Knex instance
    logger.js         # Pino logger
    socket.js         # Socket.IO setup + emitters
    middleware/       # auth, error, audit
    modules/
      auth/           # register, login, refresh, me
      users/          # admin user management
      drivers/        # roster, location, status
      vehicles/       # fleet CRUD
      hospitals/      # roster, beds
      incidents/      # CRUD + timeline + assign
      dispatch/       # recommendation engine
      analytics/      # KPIs, SLA
      notifications/  # inbox
    utils/            # jwt, password, geo, validate
  migrations/         # Knex migrations
  seeds/              # Knex seed data
  Dockerfile
  docker-compose.yml
  knexfile.js
  package.json
```

## Frontend integration

The React frontend consumes this API via `VITE_API_URL` (default
`http://localhost:4000`) and connects Socket.IO to the same origin. All
mock service shapes in `src/lib/ems/*` mirror the JSON returned here, so
swapping is a straight wire-up in the next turn.
