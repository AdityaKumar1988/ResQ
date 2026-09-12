<div align="center">

# 🚑 ResQ — Emergency Operations Platform

### Mission-Critical Emergency Medical Services Dispatch & Fleet Telemetry System

[![Node.js](https://img.shields.io/badge/Node.js-20.x_LTS-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.19-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16.x-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Knex.js](https://img.shields.io/badge/Knex.js-3.1-D25B34?style=for-the-badge&logo=knexdotjs&logoColor=white)](https://knexjs.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)
[![TanStack Query](https://img.shields.io/badge/TanStack_Query-5.101-FF4154?style=for-the-badge&logo=reactquery&logoColor=white)](https://tanstack.com/query)
[![Docker](https://img.shields.io/badge/Docker-Compose_Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Tests](https://img.shields.io/badge/Vitest-21_Passed-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)

<br />

```
  ____                 ___  
 |  _ \  ___  ___     / _ \ 
 | |_) |/ _ \/ __|   | | | |
 |  _ <|  __/\__ \_  | |_| |
 |_| \_\\___||___(_)  \__\_\
                            
 Real-Time Emergency Dispatch · Fleet Telemetry · Concurrency-Safe Routing
```

<p align="center">
  <b>ResQ</b> is a production-engineered, full-stack emergency medical services (EMS) coordination platform.<br />
  It bridges citizens in critical distress, 911/emergency medical dispatchers, and field ambulance drivers through an ACID-compliant transactional backend, real-time bidirectional WebSocket telemetry, and an automated multi-factor ambulance recommendation engine.
</p>

[Explore System Architecture](#%EF%B8%8F-system-architecture) •
[Concurrency & Locking](#-concurrency-safe-ambulance-assignment) •
[State Machine](#-incident-state-machine) •
[API Reference](#-api-reference) •
[Quick Start](#-installation--local-setup)

</div>

---

## 📑 Table of Contents

- [🚨 Overview](#-overview)
- [🎯 Problem Statement](#-problem-statement)
- [✨ Key Features](#-key-features)
  - [🚨 Emergency Incident Lifecycle](#-emergency-incident-lifecycle)
  - [🚑 Multi-Factor Ambulance Recommendation Engine](#-multi-factor-ambulance-recommendation-engine)
  - [🔒 Concurrency-Safe Ambulance Assignment](#-concurrency-safe-ambulance-assignment)
  - [📍 Real-Time GPS Tracking & Live Tactical Map](#-real-time-gps-tracking--live-tactical-map)
  - [⚡ Bi-Directional WebSocket Telemetry](#-bi-directional-websocket-telemetry)
  - [🔔 Scoped Real-Time Notification System](#-scoped-real-time-notification-system)
  - [🔐 Authentication & Role-Based Access Control (RBAC)](#-authentication--role-based-access-control-rbac)
  - [🛡️ Runtime Validation (Zod vs TypeScript)](#%EF%B8%8F-runtime-validation-zod-vs-typescript)
- [🗄️ Database Architecture](#%EF%B8%8F-database-architecture)
- [🏗️ System Architecture](#%EF%B8%8F-system-architecture)
- [🔄 End-to-End Mission Workflow](#-end-to-end-mission-workflow)
- [🧠 Important Engineering Decisions](#-important-engineering-decisions)
- [📊 Incident State Machine](#-incident-state-machine)
- [📈 Reliability & Failure Handling](#-reliability--failure-handling)
- [⏱️ SLA Tracking & Performance Analytics](#%EF%B8%8F-sla-tracking--performance-analytics)
- [📝 Auditability & Mission Timelines](#-auditability--mission-timelines)
- [🧰 Tech Stack](#-tech-stack)
- [📁 Project Structure](#-project-structure)
- [🔌 API Reference](#-api-reference)
- [⚡ Socket.IO Event Reference](#-socketio-event-reference)
- [🚀 Installation & Local Setup](#-installation--local-setup)
- [🌐 Deployment Architecture](#-deployment-architecture)
- [📸 Screenshots](#-screenshots)
- [🎥 Demo](#-demo)
- [👨‍💻 Engineering Highlights & Contribution](#-engineering-highlights--contribution)
- [🧪 Example Scenario Walkthrough](#-example-scenario-walkthrough)
- [⚠️ Limitations](#%EF%B8%8F-limitations)
- [🔮 Future Improvements](#-future-improvements)
- [📚 Learning Outcomes](#-learning-outcomes)
- [👤 Author](#-author)

---

## 🚨 Overview

In life-or-death medical emergencies, the single most critical factor is **response latency**. Traditional emergency dispatch systems often suffer from fragmented communication, phone-based manual relaying, dispatch race conditions, and lack of live situational telemetry.

**ResQ** replaces manual dispatch friction with an automated, reactive emergency response platform. Designed as a vertical-slice, event-driven distributed system, ResQ provides:

- **Zero Dual-Dispatch Guarantee**: Multiple dispatchers operating simultaneously cannot double-assign an ambulance due to strict PostgreSQL row-level pessimistic locking (`SELECT FOR UPDATE`).
- **Data-Driven Unit Recommendation**: Automatically ranks available fleet units using a multi-factor scoring function balancing distance, estimated response time, responder ratings, and active mission load.
- **Sub-Second Telemetry Synchronization**: Continuous GPS streaming over Socket.IO updates tactical Leaflet maps with dynamic vehicle headings, status indicators, and SLA countdowns.
- **Complete End-to-End Lifecycle Enforcement**: Authoritative finite state machine guards transitions from `reported` through `patient_loaded` to `completed`, guaranteeing consistent fleet inventory states.

### Target Personas

| Role | Operational Responsibility | Portal Route | Primary Capabilities |
| :--- | :--- | :--- | :--- |
| **Citizen** | Emergency Reporting & Patient Tracking | `/citizen` | One-click geolocation reporting, live responder map, driver call sign/phone display, mission status updates. |
| **Dispatcher** | Command Center Fleet Triage | `/dispatch` | Interactive tactical Leaflet map, live incident feed with SLA timers, automated ambulance recommendation cards, manual override. |
| **Driver** | Field Navigation & Mission Execution | `/driver` | Live mission alert queue, turn-by-turn stage advancement (`accepted` &rarr; `completed`), real-time GPS beacon streaming, shift toggle. |
| **Administrator** | Governance, Infrastructure & Fleet CRUD | `/admin` | Dynamic user management, hospital bed availability tracking, fleet vehicle provisioning, platform audit logs. |

---

## 🎯 Problem Statement

When a cardiac arrest or major trauma occurs, emergency response coordinates four asynchronous actors under extreme time pressure:

```
┌─────────┐      1. Create Emergency       ┌────────────┐
│ Citizen │ ─────────────────────────────> │ Dispatcher │
└─────────┘                                └─────┬──────┘
     ▲                                           │ 2. Automated Scoring
     │ 5. Real-Time Tracking                     ▼    & Row-Locked Assignment
     │                                     ┌────────────┐
     └──────────────────────────────────── │   Driver   │ <─────── Unit Assigned
               4. GPS Beacon Pings         └─────┬──────┘
                                                 │ 3. State Progression
                                                 ▼
                                           ┌────────────┐
                                           │  Hospital  │ (Bed Allocation & Handover)
                                           └────────────┘
```

### The Technical Challenges Solved by ResQ:
1. **The Double-Assignment Race Condition**: In high-load scenarios, two dispatchers clicking "Assign" on the same closest ambulance at the exact same millisecond can create duplicate missions and stranded patients.
2. **Stale Coordinates & Blind Routing**: Dispatchers cannot make informed decisions without sub-second updates on ambulance availability, heading, and live location.
3. **Invalid Out-of-Order Lifecycle Transitions**: A driver cannot transition an incident directly from `reported` to `completed`, bypass patient loading, or edit a cancelled incident.
4. **Cache Drift in SPAs**: Dispatchers, drivers, and citizens must see synchronized state without requiring manual page refreshes.

---

## ✨ Key Features

### 🚨 Emergency Incident Lifecycle
Citizens can report emergencies with automated browser coordinate detection (with fallback to regional operations center coordinates: `12.9692° N, 79.1559° E`). Incidents are categorized by emergency type (`cardiac`, `trauma`, `stroke`, `respiratory`, `obstetric`, `pediatric`, `psychiatric`, `burn`, `other`) and assigned strict triage priorities (`P1`, `P2`, `P3`, `P4`) with deterministic SLA response targets.

### 🚑 Multi-Factor Ambulance Recommendation Engine
Rather than simply assigning the closest vehicle as the crow flies, ResQ implements an algorithmic scoring engine in `server/src/modules/dispatch/routes.js` that evaluates all active, unassigned units:

$$\text{Distance (km)} = \text{haversineKm}(\text{driverLoc}, \text{incidentLoc})$$

$$\text{ETA (min)} = \max\left(1, \operatorname{round}\left(\frac{\text{Distance}}{42\text{ km/h}} \times 60\right)\right)$$

$$\text{Score} = 100 - (\text{Distance} \times 8) - (\text{Workload} \times 5) + ((\text{Rating} - 4.5) \times 20) - (\text{ETA} \times 1.5)$$

- **Availability Gate**: Only ambulances where `drivers.status = 'available'`, `vehicles.status = 'available'`, and `drivers.location_lat IS NOT NULL` are considered.
- **Distance & Travel Time Penalties**: Heavy penalties for distant units (`-8 pts/km`, `-1.5 pts/min ETA`).
- **Workload Balance**: Penalizes drivers currently managing existing active missions (`-5 pts/active mission`).
- **Service Rating Multiplier**: Rewards highly rated drivers (`+20 pts` per rating point above 4.5).
- **Top 5 Ranking**: Results are sorted descending by score and served to dispatchers in sub-15ms queries.

### 🔒 Concurrency-Safe Ambulance Assignment
The core dispatch transaction (`POST /api/incidents/:id/assign`) is strictly protected against concurrency anomalies using PostgreSQL row-level exclusive locks:

```
Dispatcher A (Thread 1)                          Dispatcher B (Thread 2)
      │                                                │
      ├─────── BEGIN TRANSACTION                       ├─────── BEGIN TRANSACTION
      │                                                │
      ├─────── SELECT * FROM incidents                 │
      │        WHERE id = $1 FOR UPDATE                │
      │        (Acquires Row Lock)                     │
      │                                                ├─────── SELECT * FROM incidents
      ├─────── SELECT * FROM drivers                   │        WHERE id = $1 FOR UPDATE
      │        WHERE id = $2 FOR UPDATE                │        (BLOCKED - WAITING FOR LOCK)
      │        (Acquires Driver Lock)                  │        ┆
      │                                                │        ┆
      ├─────── Status == 'available' [PASS]            │        ┆
      ├─────── UPDATE incidents SET status='assigned'  │        ┆
      ├─────── UPDATE drivers SET status='busy'        │        ┆
      ├─────── COMMIT TRANSACTION                      │        ┆
      │        (Releases Locks)                        │        ┆
      ▼                                                │        ▼
   200 OK                                              ├─────── (Unblocked, Reads Locked Row)
                                                       ├─────── Status == 'busy' [FAIL]
                                                       ├─────── ROLLBACK TRANSACTION
                                                       ▼
                                                    409 Conflict: AMBULANCE_UNAVAILABLE
```

#### How the Implementation Works:
1. **Pessimistic Locking**: `trx("incidents").where({ id }).forUpdate().first()` locks the incident. If already assigned (`status !== 'reported' || driver_id !== null`), it immediately aborts with `409 INCIDENT_ALREADY_ASSIGNED`.
2. **Resource Locking**: `trx("drivers").where({ id }).forUpdate().first()` and `trx("vehicles").where({ id }).forUpdate().first()` exclusively lock the target driver and vehicle.
3. **Double-Check Invariant**: Verifies `driver.status === 'available'`, `driver.missions_active === 0`, and checks that no other active incident has this driver or vehicle bound.
4. **Atomic Mutation**: Updates the incident, updates the driver (`status = 'busy'`, `missions_active = missions_active + 1`), updates the vehicle (`status = 'busy'`), and records an immutable audit entry in `incident_events`.
5. **Post-Commit Emission**: WebSockets (`incident:assigned`, `driver:status`, `fleet:updated`) and persistent notifications are emitted **only after the database transaction successfully commits**.

### 📍 Real-Time GPS Tracking & Live Tactical Map
- **High-Accuracy Beacon**: The driver console captures device coordinates using `navigator.geolocation.watchPosition` with `{ enableHighAccuracy: true, maximumAge: 5000 }`.
- **Telemetry Ingestion**: Dispatches `POST /api/drivers/me/location`, updating `drivers.location_lat`, `drivers.location_lng`, `drivers.heading`, and appending a historical record to `driver_locations`.
- **WebSocket Streaming**: Emits `driver:location` with heading and ISO timestamp to dispatchers, admins, and the citizen assigned to that specific mission.
- **Client Throttling**: Frontend `SocketProvider` enforces `LOCATION_THROTTLE_MS = 2000` to prevent redundant React re-renders while keeping the Leaflet map smoothly animated.
- **Leaflet Tactical Map**: Features custom OKLCH priority markers, pulsing emergency alert rings, heading-rotated ambulance SVGs (`transform: rotate(${heading}deg)`), and hospital markers.

### ⚡ Bi-Directional WebSocket Telemetry
- **Handshake Authentication**: Socket.IO connections require a valid JWT passed in `socket.handshake.auth.token`, verified via `verifyAccess()`.
- **Room Isolation**: Sockets automatically join role-scoped rooms (`role:dispatcher`, `role:admin`, `role:driver`, `role:citizen`) and user-scoped rooms (`user:<userId>`).
- **Targeted Dispatch**: Citizens only receive GPS coordinates and status updates for the ambulance assigned to their specific incident.

### 🔔 Scoped Real-Time Notification System
- **Persistence & Delivery**: Every notification is stored in the PostgreSQL `notifications` table and pushed directly to the recipient's socket room (`user:${userId}`).
- **Role Broadcasts**: System-wide notifications (`notifyRole`) create persistent database rows for all users matching that role and broadcast to the role channel.
- **Inbox Management**: Dedicated endpoints allow users to fetch notifications, mark single items as read, or mark all as read.

### 🔐 Authentication & Role-Based Access Control (RBAC)
- **Dual-Token JWT**:
  - **Access Token**: Short-lived (15 minutes), stateless signature containing `{ sub, role, email }`.
  - **Refresh Token**: Long-lived (30 days), stored securely and verified against the database.
- **Silent Token Rotation**: The frontend API client (`src/lib/api/client.ts`) intercepts HTTP 401 responses, pauses incoming concurrent requests into a queue (`refreshQueue`), calls `POST /api/auth/refresh`, updates the in-memory token store, and replays the original requests transparently.
- **Bcrypt Password Security**: Passwords salted and hashed with 10 rounds.
- **Brute-Force Throttle**: Dedicated `express-rate-limit` guard on `/api/auth/*` restricting clients to **10 requests per minute**.
- **Server-Side Role Guard**: `requireRole('admin', 'dispatcher')` strictly enforces API boundaries regardless of client-side routing.

### 🛡️ Runtime Validation (Zod vs TypeScript)
While TypeScript guarantees type safety during compilation, it is completely erased at runtime. ResQ uses **Zod** as a zero-trust runtime perimeter on both backend and frontend:
- Strips unauthorized unexpected fields from payloads.
- Enforces strict UUID schemas on path parameters and entity IDs.
- Validates international E.164 phone formats using regex: `/^\+?[0-9\s\-()]{7,20}$/`.
- Sanitizes request bodies before business logic or Knex queries execute.

---

## 🗄️ Database Architecture

ResQ utilizes **PostgreSQL 16** managed through **Knex.js** migrations with UUID primary keys (`pgcrypto` extension) and relational constraints.

```
                           ┌──────────────────────────────┐
                           │            users             │
                           ├──────────────────────────────┤
                           │ id (UUID, PK)                │
                           │ email (VARCHAR, UNIQUE)      │
                           │ password_hash (VARCHAR)      │
                           │ name (VARCHAR)               │
                           │ phone (VARCHAR)              │
                           │ role (ENUM)                  │
                           │ created_at / updated_at      │
                           └──────────────┬───────────────┘
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  │ 1:1 (user_id)                                 │ 1:N (user_id)
                  ▼                                               ▼
┌──────────────────────────────────┐            ┌──────────────────────────────────┐
│             drivers              │            │          notifications           │
├──────────────────────────────────┤            ├──────────────────────────────────┤
│ id (UUID, PK)                    │            │ id (UUID, PK)                    │
│ user_id (UUID, FK -> users)      │            │ user_id (UUID, FK -> users)      │
│ vehicle_id (UUID, FK -> vehicles)│            │ kind (VARCHAR)                   │
│ call_sign (VARCHAR, UNIQUE)      │            │ title (VARCHAR)                  │
│ rating (DECIMAL, 3,2)            │            │ body (TEXT)                      │
│ missions_completed (INT)         │            │ data (JSONB)                     │
│ missions_active (INT)            │            │ read_at (TIMESTAMP)              │
│ avg_response_sec (INT)           │            │ created_at (TIMESTAMP)           │
│ status (VARCHAR)                 │            └──────────────────────────────────┘
│ location_lat / location_lng      │
│ heading (DECIMAL, 6,2)           │
│ last_ping_at (TIMESTAMP)         │
└───────────────┬──────────────────┘
                │
                ├──────────────────────────────────────────────────┐
                │ 1:N (driver_id)                                  │ 1:1 (vehicle_id)
                ▼                                                  ▼
┌──────────────────────────────────┐            ┌──────────────────────────────────┐
│         driver_locations         │            │             vehicles             │
├──────────────────────────────────┤            ├──────────────────────────────────┤
│ id (BIGSERIAL, PK)               │            │ id (UUID, PK)                    │
│ driver_id (UUID, FK -> drivers)  │            │ plate (VARCHAR, UNIQUE)          │
│ lat (DECIMAL, 10,6)              │            │ model (VARCHAR)                  │
│ lng (DECIMAL, 10,6)              │            │ type (ALS | BLS | ICU | MICU)    │
│ heading (DECIMAL, 6,2)           │            │ status (VARCHAR)                 │
│ created_at (TIMESTAMP)           │            │ created_at / updated_at          │
└──────────────────────────────────┘            └──────────────────────────────────┘
                ▲
                │ 1:N (driver_id)
┌───────────────┴──────────────────────────────────────────────────────────────────┐
│                                    incidents                                     │
├──────────────────────────────────────────────────────────────────────────────────┤
│ id (UUID, PK)                                                                    │
│ code (VARCHAR, UNIQUE) — e.g. INC-2151                                           │
│ priority (P1 | P2 | P3 | P4)                                                     │
│ type (cardiac | trauma | stroke | respiratory | obstetric | pediatric | ...)     │
│ status (reported | assigned | accepted | en_route | arrived | loaded | ...)      │
│ lat / lng (DECIMAL, 10,6)                                                        │
│ address (VARCHAR) · notes (TEXT)                                                 │
│ citizen_name (VARCHAR) · citizen_phone (VARCHAR)                                 │
│ citizen_user_id (UUID, FK -> users)                                              │
│ driver_id (UUID, FK -> drivers)                                                  │
│ vehicle_id (UUID, FK -> vehicles)                                                │
│ hospital_id (UUID, FK -> hospitals)                                              │
│ sla_seconds (INT)                                                                │
│ reported_at / assigned_at / completed_at                                         │
└───────────────┬──────────────────────────────────────────────────────────────────┘
                │
                ├──────────────────────────────────┐
                │ 1:N (incident_id)                │ N:1 (hospital_id)
                ▼                                  ▼
┌──────────────────────────────────┐    ┌──────────────────────────────────┐
│         incident_events          │    │            hospitals             │
├──────────────────────────────────┤    ├──────────────────────────────────┤
│ id (BIGSERIAL, PK)               │    │ id (UUID, PK)                    │
│ incident_id (UUID, FK)           │    │ name (VARCHAR)                   │
│ status (VARCHAR)                 │    │ lat / lng (DECIMAL, 10,6)        │
│ actor_id (UUID)                  │    │ beds (INT)                       │
│ actor_name (VARCHAR)             │    │ beds_available (INT)             │
│ note (TEXT)                      │    │ created_at / updated_at          │
│ created_at (TIMESTAMP)           │    └──────────────────────────────────┘
└──────────────────────────────────┘
```

### Key Relational Constraints & Indexes:
- `drivers_vehicle_id_unique`: Partial unique index (`WHERE vehicle_id IS NOT NULL`) guaranteeing one ambulance cannot be driven by two active drivers.
- `drivers_user_id_unique`: Strict 1-to-1 mapping between a driver profile and authentication account.
- `incidents(status, priority)`: Composite index optimizing high-frequency dispatcher filtering.
- `driver_locations(driver_id, created_at)`: Composite index for fast temporal trajectory lookups.

---

## 🏗️ System Architecture

ResQ is built as a cohesive full-stack architecture running React 19 on Vite & Nitro paired with an Express and Socket.IO core.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENT TIER (BROWSER)                                │
│                                                                                        │
│  Citizen Portal            Dispatcher Console         Driver Console      Admin Panel  │
│    (/citizen)                  (/dispatch)               (/driver)          (/admin)   │
│                                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │                    TanStack React Query Cache (Server State)                     │  │
│  └────────────────────────────────────────┬─────────────────────────────────────────┘  │
│                     ▲                     │                    ▲                       │
│      Optimistic UI  │                     │ REST (Native fetch)│ Socket Telemetry      │
│      Invalidations  │                     ▼                    │ Listeners             │
│  ┌──────────────────┴──────────────────────────────────────────┴─────────────────────┐  │
│  │                     SocketProvider & HTTP Client Middleware                      │  │
│  └────────────────────────────────────────┬─────────────────────────────────────────┘  │
└───────────────────────────────────────────┼────────────────────────────────────────────┘
                                            │ HTTP / WebSockets (Port 4000)
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   API & TELEMETRY TIER                                 │
│                                                                                        │
│   Node.js HTTP Server ─── Express App Factory (app.js) ─── Socket.IO Server (socket.js) │
│                                   │                                                    │
│   ┌───────────────────────────────┴────────────────────────────────┐                   │
│   │                       Global Middleware Chain                  │                   │
│   │  Helmet (Security Headers) · CORS · Compression · Pino Logger  │                   │
│   │  express-rate-limit (300 req/min global, 10 req/min on /auth)  │                   │
│   └───────────────────────────────┬────────────────────────────────┘                   │
│                                   ▼                                                    │
│   ┌────────────────────────────────────────────────────────────────┐                   │
│   │                      Domain Feature Modules                    │                   │
│   │  /auth · /users · /drivers · /vehicles · /hospitals            │                   │
│   │  /incidents (State Machine) · /dispatch (Scoring) · /analytics │                   │
│   └───────────────┬────────────────────────────────┬───────────────┘                   │
│                   │                                │                                   │
│                   ▼                                ▼                                   │
│   ┌───────────────────────────────┐┌───────────────────────────────┐                   │
│   │  authenticate & requireRole   ││       validate(ZodSchema)     │                   │
│   └───────────────┬───────────────┘└───────────────┬───────────────┘                   │
│                   └───────────────┬────────────────┘                                   │
│                                   ▼                                                    │
│   ┌────────────────────────────────────────────────────────────────┐                   │
│   │                     Transaction Manager (ACID)                 │                   │
│   │               Knex.js Connection Pool (min: 2, max: 10)        │                   │
│   │               SELECT ... FOR UPDATE (Row Locking)              │                   │
│   └───────────────────────────────┬────────────────────────────────┘                   │
└───────────────────────────────────┼────────────────────────────────────────────────────┘
                                    │ SQL (Port 5432)
                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                     DATA TIER                                          │
│                                                                                        │
│                           PostgreSQL 16 Relational Engine                              │
│            Tables: users, vehicles, drivers, driver_locations, hospitals,              │
│                    incidents, incident_events, notifications, audit_logs               │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 End-to-End Mission Workflow

```mermaid
sequenceDiagram
    autonumber
    actor C as Citizen
    participant FE as React Client
    participant API as Express API
    participant DB as PostgreSQL (ACID)
    participant WS as Socket.IO Server
    actor D as Dispatcher
    actor DRV as Ambulance Driver

    Note over C,API: 1. Incident Creation
    C->>FE: Click "Request Ambulance"
    FE->>API: POST /api/incidents (priority, coords, type)
    API->>DB: BEGIN Transaction
    API->>DB: Insert into 'incidents' (code INC-XXXX, SLA)
    API->>DB: Insert into 'incident_events'
    API->>DB: COMMIT
    API->>WS: emit.incidentCreated()
    WS-->>D: Event 'incident:created' (Feed Updated + Toast)
    API-->>FE: 201 Created

    Note over D,API: 2. Recommendation & Assignment
    D->>FE: Inspect Incident in Feed
    FE->>API: GET /api/dispatch/recommend/:id
    API->>DB: Query available drivers & vehicles
    API-->>FE: Ranked Top 5 recommendations (Score, Distance, ETA)
    D->>FE: Click "Dispatch Unit"
    FE->>API: POST /api/incidents/:id/assign { driverId }
    API->>DB: BEGIN Transaction
    API->>DB: SELECT * FROM incidents FOR UPDATE
    API->>DB: SELECT * FROM drivers FOR UPDATE
    API->>DB: SELECT * FROM vehicles FOR UPDATE
    API->>DB: Update incident -> 'assigned', driver -> 'busy'
    API->>DB: Increment driver missions_active
    API->>DB: Insert 'assigned' event into incident_events
    API->>DB: COMMIT
    API->>WS: emit.incidentAssigned(), emit.driverStatusChanged()
    WS-->>DRV: Event 'incident:new' (Mission Card Alert)
    WS-->>C: Event 'incident:assigned' (Driver Call Sign & Phone)
    API-->>FE: 200 OK

    Note over DRV,C: 3. Driver Execution & GPS Streaming
    DRV->>FE: Advance Stage: Accepted -> En Route -> Arrived
    FE->>API: PATCH /api/incidents/:id/status { status }
    API->>DB: Validate state transition & update DB
    API->>WS: emit.incidentUpdated()
    WS-->>C: Live status banner updated
    loop Geolocation Watcher (Every 2-5s)
        DRV->>API: POST /api/drivers/me/location { lat, lng, heading }
        API->>DB: Update driver coords & insert into driver_locations
        API->>WS: emit.driverLocation()
        WS-->>C: Live Map Ambulance Marker Moves
        WS-->>D: Tactical Map Marker Moves
    end

    Note over DRV,API: 4. Hospital Handover & Completion
    DRV->>FE: Status -> Patient Loaded -> At Hospital -> Completed
    FE->>API: PATCH /api/incidents/:id/status { status: 'completed' }
    API->>DB: BEGIN Transaction
    API->>DB: Set incident status='completed', completed_at=NOW()
    API->>DB: Set driver status='available', missions_completed++
    API->>DB: Reset vehicle status='available'
    API->>DB: COMMIT
    API->>WS: emit.incidentUpdated(), emit.driverStatusChanged()
    WS-->>D: SLA Met Metric Updated
    WS-->>C: "Mission Completed" Screen
```

---

## 🧠 Important Engineering Decisions

### 1. PostgreSQL vs NoSQL
- **Decision:** Use PostgreSQL with relational constraints and transactional integrity.
- **Why:** Emergency dispatch requires immediate consistency. Double-booking an ambulance or dropping an assignment due to eventual consistency is unacceptable in medical emergencies.
- **Trade-off:** Requires explicit schema migrations and connection pool management compared to schema-less document databases.

### 2. Pessimistic Row Locking (`SELECT FOR UPDATE`) vs Optimistic Locking
- **Decision:** Execute assignments inside an explicit database transaction using `knex("incidents").forUpdate()` and `knex("drivers").forUpdate()`.
- **Why:** High contention on available ambulances during disaster scenarios causes high abort rates with optimistic version checking. Pessimistic locking cleanly serializes concurrent dispatchers, rejecting the second attempt cleanly with HTTP 409.
- **Trade-off:** Row locks hold connections open slightly longer; mitigated by keeping transactions strictly constrained to validation, updates, and inserts without external network I/O.

### 3. Native Dual-Token JWT with In-Flight Request Queueing
- **Decision:** 15-minute access tokens with 30-day refresh tokens managed by an in-memory client queue.
- **Why:** Short-lived tokens minimize vulnerability windows. The in-flight queue ensures that when 5 concurrent API requests fail with 401 simultaneously on token expiry, only *one* network request is made to `/auth/refresh`, and all pending requests replay seamlessly upon success.
- **Trade-off:** In-memory tokens reset on hard browser reloads, requiring an initial session restoration handshake.

### 4. Knex.js Query Builder vs Heavy ORMs (Prisma / TypeORM)
- **Decision:** Built on Knex.js with explicit SQL statements.
- **Why:** Complete control over raw PostgreSQL syntax (`FOR UPDATE`, `GREATEST(missions_active - 1, 0)`, `EXTRACT(EPOCH FROM ...)`), predictable connection pooling, and zero hidden query generation overhead.
- **Trade-off:** Requires writing manual schema migrations and normalizer utilities.

### 5. Haversine Formula with Static Speed vs External Routing APIs
- **Decision:** Server calculates direct spherical distance using the Haversine formula assuming an average urban emergency response speed of 42 km/h.
- **Why:** Guarantees sub-millisecond calculation latency with zero external API rate limits, costs, or third-party outages during incident triage.
- **Trade-off:** Does not account for real-time traffic jams, one-way streets, or road network topography.

---

## 📊 Incident State Machine

Incident progression is governed by an authoritative backend transition graph defined in `server/src/modules/incidents/constants.js`. Jumps between non-adjacent states or modifications to terminal states are rejected with **409 Conflict**.

```
                           ┌──────────────┐
                           │   reported   │
                           └──────┬───────┘
                                  │
                                  ▼
                           ┌──────────────┐
                           │   assigned   │
                           └──────┬───────┘
                                  │
                                  ▼
                           ┌──────────────┐
                           │   accepted   │
                           └──────┬───────┘
                                  │
                                  ▼
                           ┌──────────────┐
               ┌───────────┤   en_route   ├───────────┐
               │           └──────┬───────┘           │
               │                  │                   │
               │                  ▼                   │
               │           ┌──────────────┐           │
               │           │   arrived    │           │
               │           └──────┬───────┘           │
               │                  │                   │
               │                  ▼                   │
               │           ┌──────────────┐           │
               │           │patient_loaded│           │
               │           └──────┬───────┘           │
               │                  │                   │
               │                  ▼                   │
               │           ┌──────────────┐           │
               │           │ at_hospital  │           │
               │           └──────┬───────┘           │
               │                  │                   │
               ▼                  ▼                   ▼
      ┌─────────────────┐  ┌──────────────┐  ┌─────────────────┐
      │    cancelled    │  │  completed   │  │    cancelled    │
      │ (TERMINAL STATE)│  │(TERMINAL ST.)│  │ (TERMINAL STATE)│
      └─────────────────┘  └──────────────┘  └─────────────────┘
```

### State Transition & Fleet Synchronization Rules:

| From State | Allowed Next States | Driver Status Set To | Vehicle Status Set To | Active Mission Counter |
| :--- | :--- | :--- | :--- | :--- |
| `reported` | `assigned`, `cancelled` | `busy` | `busy` | `+1` (on assign) |
| `assigned` | `accepted`, `cancelled` | `busy` | `busy` | Unchanged |
| `accepted` | `en_route`, `cancelled` | `busy` | `busy` | Unchanged |
| `en_route` | `arrived`, `cancelled` | `en_route` | `en_route` | Unchanged |
| `arrived` | `patient_loaded`, `cancelled` | `busy` | `busy` | Unchanged |
| `patient_loaded` | `at_hospital`, `cancelled` | `busy` | `busy` | Unchanged |
| `at_hospital` | `completed`, `cancelled` | `at_hospital` | `at_hospital` | Unchanged |
| **`completed`** | **None (Terminal)** | `available` | `available` | `GREATEST(count - 1, 0)` & `completed++` |
| **`cancelled`** | **None (Terminal)** | `available` | `available` | `GREATEST(count - 1, 0)` |

---

## 📈 Reliability & Failure Handling

| Failure Mode | Detection Point | Handling Strategy & System Behavior | Status Code |
| :--- | :--- | :--- | :---: |
| **Double Dispatch Contention** | `incidents/routes.js` | Row lock detects incident is assigned or driver is busy; transaction rolls back. UI displays toast alert and refreshes fleet queries. | `409 Conflict` |
| **Expired Access Token** | `middleware/auth.js` | API client intercepts 401, pauses queue, refreshes via `/api/auth/refresh`, and transparently replays original request. | `401 Unauthorized` |
| **Invalid State Transition** | `incidents/routes.js` | Validated against `ALLOWED_TRANSITIONS`; rejects out-of-order jumps (e.g. `reported` &rarr; `completed`). | `409 Conflict` |
| **Tampered Input Payload** | `utils/validate.js` | Zod schema rejects malformed UUIDs, invalid coordinates, or bad enums with flattened field messages. | `400 Bad Request` |
| **Insufficient Privilege** | `middleware/auth.js` | Role guard rejects unauthorized role operations (e.g. Citizen calling Dispatcher API). | `403 Forbidden` |
| **Database Disconnection** | `/health` route | `SELECT 1` ping fails; health endpoint returns unhealthy; container orchestrators trigger restart. | `503 Service Unavailable` |
| **Socket Disconnection** | `src/lib/socket.ts` | Exponential backoff auto-reconnect (5 attempts, 2s to 10s delay). Resubscribes with dynamic token. | Transparent |

---

## ⏱️ SLA Tracking & Performance Analytics

Every reported emergency is bound to a strict Service Level Agreement based on clinical triage severity:

| Priority | Description | Target Response SLA | Stored Column (`incidents`) |
| :---: | :--- | :---: | :---: |
| **P1** | Critical / Immediate Life Threat (e.g. Cardiac Arrest, Severe Trauma) | **8 Minutes (480s)** | `sla_seconds = 480` |
| **P2** | Urgent / Emergent (e.g. Suspected Stroke, Severe Respiratory) | **15 Minutes (900s)** | `sla_seconds = 900` |
| **P3** | Semi-Urgent (e.g. Controlled Bleeding, Pediatric Fracture) | **30 Minutes (1800s)** | `sla_seconds = 1800` |
| **P4** | Non-Urgent / Routine Medical Transport | **60 Minutes (3600s)** | `sla_seconds = 3600` |

### SLA Compliance Metric Engine
The `/api/analytics/overview` endpoint calculates operational health in real-time directly in SQL:
```sql
AVG(EXTRACT(EPOCH FROM (assigned_at - reported_at))) AS avg_resp_seconds,
COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (assigned_at - reported_at)) <= sla_seconds) AS sla_met,
COUNT(*) AS total_with_sla
```
Calculates compliance as $\frac{\text{sla\_met}}{\text{total\_with\_sla}} \times 100\%$ across selectable time horizons (`24h`, `7d`, `30d`, `90d`).

---

## 📝 Auditability & Mission Timelines

ResQ maintains two separate, purpose-built auditing mechanisms:

1. **Incident Event Timeline (`incident_events` table):**
   - Tracks the operational lifecycle of a specific emergency mission.
   - Records every state change (`reported`, `assigned`, `accepted`, `completed`), actor ID, actor name, and human notes.
   - Publicly consumable by authorized dispatchers and the citizen reporting that incident.
2. **Platform Security Audit Log (`audit_logs` table):**
   - System-wide security tracking for administrative actions.
   - Records `actor_id`, `actor_role`, `action`, target URI (`${req.method} ${req.originalUrl}`), IP address, and creation timestamp via the `audit()` Express middleware.

---

## 🧰 Tech Stack

| Domain | Technology | Purpose in ResQ |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 19.2** | Modern component rendering with concurrent features and hooks |
| **Router & Server Engine** | **TanStack Router / Start** | File-based client routing with type-safe route parameters |
| **Server State Management**| **TanStack Query 5.101** | Query caching, optimistic updates, and WebSocket-driven invalidation |
| **Mapping & GIS** | **Leaflet 1.9** | Interactive tactical mapping with custom OKLCH markers and rotated ambulance icons |
| **Styling & UI Kit** | **Tailwind CSS 4.2 + Radix UI** | Responsive dark-mode tactical command dashboard with accessible primitives |
| **Backend Runtime** | **Node.js 20 LTS (ES Modules)**| Asynchronous backend runtime with native ES module support |
| **Web Framework** | **Express 4.19** | REST API routing and vertical slice modular architecture |
| **Database Engine** | **PostgreSQL 16 (PostGIS image)**| Relational persistence, UUID keys, pgcrypto, and row-level locking |
| **Query Builder** | **Knex.js 3.1** | Parameterized SQL builder, migration management, and connection pooling |
| **Real-Time WebSockets** | **Socket.IO 4.8** | Authenticated bi-directional event transport and room-based pub/sub |
| **Authentication** | **JSON Web Tokens + Bcrypt**| Stateless 15m access tokens, 30d refresh tokens, and salted hashing |
| **Runtime Validation** | **Zod 3.24** | Zero-trust request body, parameter, and query schema validation |
| **Security & Headers** | **Helmet + CORS + Rate Limit**| Secure HTTP response headers, origin whitelisting, and brute-force throttling |
| **Logging** | **Pino 9.3 + Morgan** | Structured JSON logging with pino-pretty formatting in development |
| **Testing** | **Vitest 4.1** | Fast unit and integration testing suite for state machines and concurrency |
| **Containerization** | **Docker & Docker Compose** | Multi-stage Node Alpine build and orchestrated PostgreSQL/PostGIS stack |

---

## 📁 Project Structure

```
sentinel-aid-grid-main/
├── .github/
│   └── workflows/
│       └── ci.yml                 # GitHub Actions CI (lint, typecheck, test, build)
├── public/                        # Static assets & favicons
├── server/                        # Express + PostgreSQL + Socket.IO Backend
│   ├── migrations/
│   │   ├── 20260710_000_init.js   # Core schema: users, vehicles, drivers, incidents, etc.
│   │   └── 20260814_001_driver_constraints.js # Driver uniqueness & vehicle constraints
│   ├── seeds/
│   │   └── 001_seed.js            # Vellore hospitals, ambulance fleet, admin/dispatch accounts
│   ├── src/
│   │   ├── middleware/
│   │   │   ├── audit.js           # Security audit log middleware
│   │   │   ├── auth.js            # JWT authenticate & requireRole guards
│   │   │   └── error.js           # Centralized 4-argument error handler & 404 catcher
│   │   ├── modules/
│   │   │   ├── analytics/         # KPI summaries & SLA compliance endpoints
│   │   │   ├── auth/              # Registration, login, silent refresh, /me
│   │   │   ├── dispatch/          # Multi-factor ambulance recommendation engine
│   │   │   ├── drivers/           # Driver roster, GPS telemetry ingestion, shift toggle
│   │   │   ├── hospitals/         # Hospital bed capacity tracking
│   │   │   ├── incidents/         # Incident CRUD, state machine & row-locked assignment
│   │   │   ├── notifications/     # Persistent notification store & user inbox
│   │   │   ├── users/             # Admin staff creation & role management
│   │   │   └── vehicles/          # Ambulance fleet CRUD
│   │   ├── utils/
│   │   │   ├── asyncHandler.js    # Express async route wrapper
│   │   │   ├── geo.js             # Haversine distance & ETA formulas
│   │   │   ├── httpError.js       # Custom structured HTTP error class
│   │   │   ├── jwt.js             # Sign and verify access/refresh tokens
│   │   │   ├── password.js        # Bcrypt hash and verify utilities
│   │   │   ├── phone.js           # E.164 international phone number validation
│   │   │   └── validate.js        # Zod middleware wrapper
│   │   ├── app.js                 # Express application factory & route mounting
│   │   ├── config.js              # Environment variable parser with typed defaults
│   │   ├── db.js                  # Knex PostgreSQL connection pool singleton
│   │   ├── index.js               # HTTP listener, Socket.IO attachment & graceful shutdown
│   │   ├── logger.js              # Pino logger configuration
│   │   └── socket.js              # Socket.IO handshake auth, room setup & event emitters
│   ├── .dockerignore
│   ├── .env.example               # Backend environment variable template
│   ├── Dockerfile                 # Multi-stage production container build
│   ├── docker-compose.yml         # PostGIS 16 + API orchestration
│   ├── knexfile.js                # Database connection configuration for Knex CLI
│   └── package.json               # Backend dependencies & npm scripts
├── src/                           # React 19 Frontend
│   ├── __tests__/                 # Vitest test suite
│   │   ├── auth-context.test.tsx  # Session restoration and login testing
│   │   ├── concurrency.test.ts    # Competing dispatcher race condition simulation
│   │   ├── notifications.test.ts  # Notification inbox & read state tests
│   │   ├── phone-validation.test.ts # International phone format tests
│   │   ├── state-machine.test.ts  # Authoritative transition matrix tests
│   │   └── use-incidents.test.tsx # TanStack Query hook tests
│   ├── components/
│   │   ├── auth/                  # ProtectedRoute & RoleGuard navigation components
│   │   ├── ems/                   # EMS core operational interfaces
│   │   │   ├── admin/             # Admin console for users, fleet & hospital beds
│   │   │   ├── analytics/         # Real-time SLA charts & KPI metric cards
│   │   │   ├── citizen/           # Citizen emergency reporting & live tracking
│   │   │   ├── driver/            # Driver mission queue, action cards & beacon
│   │   │   ├── FleetPanel.tsx     # Live ambulance status side panel
│   │   │   ├── IncidentFeed.tsx   # Triage list with countdown SLA progress bars
│   │   │   ├── LiveMap.tsx        # Leaflet tactical map with custom SVG markers
│   │   │   ├── NotificationCenter.tsx # Slide-out notification inbox
│   │   │   └── SelectedIncidentPanel.tsx # Dispatch recommendations & assignment modal
│   │   ├── providers/
│   │   │   └── SocketProvider.tsx # Socket.IO client provider & TanStack Query sync
│   │   └── ui/                    # Accessible UI component library (Radix UI)
│   ├── hooks/                     # Custom React hooks (incidents, drivers, vehicles)
│   ├── lib/
│   │   ├── api/                   # Typed API client modules (client.ts, auth.ts, etc.)
│   │   ├── ems/                   # Geospatial utilities, constants & mock shapes
│   │   ├── auth-context.tsx       # AuthProvider context & session management
│   │   ├── queryKeys.ts           # Centralized TanStack Query cache key factory
│   │   ├── socket.ts              # Socket.IO client singleton configuration
│   │   └── token-store.ts         # In-memory access token & refresh token storage
│   ├── routes/                    # File-based TanStack routes
│   │   ├── __root.tsx             # Root layout with QueryClientProvider & Toaster
│   │   ├── index.tsx              # Public landing page
│   │   ├── login.tsx              # Unified login & registration portal
│   │   ├── citizen.tsx            # Protected citizen portal route
│   │   ├── dispatch.tsx           # Protected dispatcher command center route
│   │   ├── driver.tsx             # Protected driver navigation route
│   │   ├── admin.tsx              # Protected administrator console route
│   │   ├── analytics.tsx          # Standalone analytics route
│   │   ├── fleet.tsx              # Standalone fleet registry route
│   │   └── incidents.tsx          # Standalone incident registry route
│   ├── styles.css                 # Global CSS & Tailwind styles
│   └── start.ts                   # Application bootstrap
├── .env.example                   # Frontend environment variable template
├── package.json                   # Frontend dependencies & npm scripts
├── tsconfig.json                  # TypeScript compiler configuration
├── vite.config.ts                 # Vite bundler configuration
└── vitest.config.ts               # Vitest runner configuration
```

---

## 🔌 API Reference

All backend API routes are prefixed under `/api`. Authenticated endpoints require a standard `Authorization: Bearer <accessToken>` HTTP header.

| Method | Endpoint | Description | Auth / Role Requirement |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/auth/register` | Register a new `citizen` or `driver` account | Public |
| **POST** | `/api/auth/login` | Authenticate with email/password; returns access & refresh tokens | Public |
| **POST** | `/api/auth/refresh` | Exchange valid refresh token for a new token pair | Public |
| **GET** | `/api/auth/me` | Fetch authenticated user's profile | Authenticated (Any) |
| **GET** | `/api/users` | List all registered users | `admin` |
| **POST** | `/api/users` | Provision a new `dispatcher` or `admin` account | `admin` |
| **PATCH** | `/api/users/:id/role` | Elevate or modify a user's system role | `admin` |
| **GET** | `/api/incidents` | Fetch active/filtered incidents (role-scoped) | Authenticated (Any) |
| **GET** | `/api/incidents/:id` | Fetch incident details and full timeline audit log | Authenticated (Any) |
| **POST** | `/api/incidents` | Report a new emergency incident | Authenticated (Any) |
| **POST** | `/api/incidents/:id/assign`| **Assign ambulance using row-level pessimistic locking** | `dispatcher`, `admin` |
| **PATCH** | `/api/incidents/:id/status`| Transition incident through state machine | `driver`, `dispatcher`, `admin` |
| **GET** | `/api/dispatch/recommend/:incidentId` | Algorithmic ranking of top 5 available ambulances | `dispatcher`, `admin` |
| **GET** | `/api/drivers` | Fetch all drivers with vehicle and user joins | Authenticated (Any) |
| **GET** | `/api/drivers/me` | Fetch driver profile for currently logged-in user | Authenticated (Any) |
| **POST** | `/api/drivers/me/location` | Stream GPS coordinates, heading, and ping time | `driver` |
| **PATCH** | `/api/drivers/me/status` | Update shift status (`available` &harr; `offline`) | `driver` |
| **GET** | `/api/vehicles` | Fetch ambulance fleet registry | Authenticated (Any) |
| **POST** | `/api/vehicles` | Register a new ambulance vehicle | `dispatcher`, `admin` |
| **PATCH** | `/api/vehicles/:id` | Modify vehicle status or model details | `dispatcher`, `admin` |
| **DELETE** | `/api/vehicles/:id` | Decommission vehicle from fleet | `admin` |
| **GET** | `/api/hospitals` | List all hospitals and bed capacities | Authenticated (Any) |
| **PATCH** | `/api/hospitals/:id/beds` | Update available hospital bed counts | `dispatcher`, `admin` |
| **GET** | `/api/analytics/overview` | Fetch SLA compliance %, average response time, counts | `dispatcher`, `admin` |
| **GET** | `/api/analytics/sla` | Fetch average response times grouped by priority | `dispatcher`, `admin` |
| **GET** | `/api/notifications` | Fetch user's notification inbox | Authenticated (Any) |
| **POST** | `/api/notifications/:id/read` | Mark individual notification as read | Authenticated (Any) |
| **POST** | `/api/notifications/read-all` | Mark all notifications as read | Authenticated (Any) |
| **GET** | `/health` | Verify API health and database connectivity | Public |

---

## ⚡ Socket.IO Event Reference

Real-time communication is powered by Socket.IO with JWT authentication and room-based privacy scoping:

| Event Name | Direction | Payload Structure | Target Audience | Trigger Scenario |
| :--- | :---: | :--- | :--- | :--- |
| `incident:created` | Server &rarr; Client | Complete `Incident` object | `role:dispatcher`, `role:admin`, `user:<citizenId>` | Citizen reports an emergency |
| `incident:assigned` | Server &rarr; Client | Updated `Incident` with driver ID | `role:dispatcher`, `role:admin`, `user:<citizenId>`, `user:<driverId>` | Ambulance successfully assigned |
| `incident:new` | Server &rarr; Client | `Incident` object | `user:<driverUserId>` | Dedicated driver alert on new mission assignment |
| `incident:updated` | Server &rarr; Client | Updated `Incident` object | `role:dispatcher`, `role:admin`, `user:<citizenId>`, `user:<driverId>` | Stage advanced (`en_route`, `arrived`, etc.) |
| `driver:location` | Client &rarr; Server | `{ lat, lng, heading }` | API Gateway | Driver geolocation watcher emits coordinates |
| `driver:location` | Server &rarr; Client | `{ driverId, lat, lng, heading, at }`| `role:dispatcher`, `role:admin`, `user:<citizenId>` | Telemetry relayed to tactical maps |
| `driver:status` | Server &rarr; Client | Updated `Driver` object | Global (`io.emit`) | Driver status changes (`busy`, `available`, `offline`)|
| `fleet:updated` | Server &rarr; Client | Updated `Vehicle` object | Global (`io.emit`) | Vehicle status or fleet record modified |
| `notification:created`| Server &rarr; Client | `Notification` record | `user:<userId>` | New persistent notification saved for user |
| `role:notification` | Server &rarr; Client | `{ kind, title, body, data }` | `role:<role>` | System-wide broadcast to specific staff role |

---

## 🚀 Installation & Local Setup

### Prerequisites
- **Node.js**: `v20.x` or higher
- **PostgreSQL**: `v16.x` (or Docker installed)
- **Package Manager**: `npm`

---

### Option A: Zero-Config Docker Setup (Recommended for Backend)

The fastest way to spin up the PostgreSQL database and backend API:

```bash
# 1. Clone repository
git clone https://github.com/AdityaKumar1988/smart-ems.git
cd smart-ems/server

# 2. Configure environment
cp .env.example .env

# 3. Start PostgreSQL and API containers
docker compose up --build
```
The backend API and health checks will be live at `http://localhost:4000`. Migrations run automatically on container boot.

---

### Option B: Native Local Setup

#### 1. Setup Backend (`server/`)
```bash
# Navigate to backend directory
cd server

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Ensure local PostgreSQL is running with credentials matching DATABASE_URL in .env:
# postgres://ems:ems@localhost:5432/smart_ems

# Run database migrations
npm run migrate

# Seed reference hospitals, fleet vehicles, and administrator accounts
npm run seed

# Start development server with nodemon
npm run dev
```
Backend runs on: **`http://localhost:4000`**

#### 2. Setup Frontend (Root directory)
```bash
# Open a new terminal and navigate to the project root
cd ..

# Install frontend dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start Vite development server
npm run dev
```
Frontend runs on: **`http://localhost:8080`**

---

### 🔑 Seed Accounts Available Immediately

The database seed (`server/seeds/001_seed.js`) automatically provisions initial operational accounts:

| Role | Email Address | Password | Operational Access |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@ems.local` | `admin1234` | Full access to `/admin`, `/dispatch`, `/analytics` |
| **Dispatcher** | `dispatch@ems.local` | `dispatch1234` | Access to Command Center `/dispatch`, `/incidents` |
| **Citizen** | *Create via Register tab* | *(min 8 chars)* | Access to Emergency Intake `/citizen` |
| **Driver** | *Create via Register tab* | *(min 8 chars)* | Binds to available fleet ambulance; access to `/driver` |

---

## 🌐 Deployment Architecture

ResQ is architected for containerized cloud deployment across standard platforms (AWS ECS, DigitalOcean App Platform, Render, or GCP Cloud Run):

```
                                  INTERNET
                                     │
                 ┌───────────────────┴───────────────────┐
                 │ HTTPS (Port 443) / WSS                │
                 ▼                                       ▼
    ┌─────────────────────────┐             ┌─────────────────────────┐
    │     Frontend Client     │             │     Backend API & WS    │
    │   (Vite / Nitro / Edge) │             │    (Node 20 Container)  │
    │  VITE_API_URL: /api     │             │    PORT: 4000           │
    │  VITE_SOCKET_URL        │ ──────────> │    CORS_ORIGIN: Client  │
    └─────────────────────────┘             └────────────┬────────────┘
                                                         │
                                                         ▼
                                            ┌─────────────────────────┐
                                            │   Managed PostgreSQL    │
                                            │      (PostGIS 16)       │
                                            │  Connection Pooling     │
                                            └─────────────────────────┘
```

- **Containerization**: `server/Dockerfile` uses a multi-stage Alpine build that prunes dev dependencies, sets `NODE_ENV=production`, configures an unprivileged user, and executes container health checks against `/health`.
- **CI/CD Pipeline**: GitHub Actions (`.github/workflows/ci.yml`) executes on every pull request and push to `main`, validating:
  1. Frontend linting (`npm run lint`), TypeScript check (`npx tsc --noEmit`), unit tests (`npm run test`), and production compilation (`npm run build`).
  2. Backend linting and Docker configuration validation (`docker compose config`).
- **Cloud Note**: While Render or cloud managed services can host this stack, zero vendor lock-in exists; standard environment variables govern all bindings.

---

## 📸 Screenshots

<div align="center">

### Command Center Dispatcher Console (`/dispatch`)
<!-- Add screenshot here: Tactical Leaflet map with pulsing emergency markers, SLA timers, and recommendation panel -->
*Live incident feed with countdown SLA bars, active ambulance tracking, and multi-factor recommendation engine.*

### Field Responder Console (`/driver`)
<!-- Add screenshot here: Driver mobile interface with stage advancement buttons and real-time telemetry -->
*High-contrast mobile interface with one-tap state progression, turn-by-turn routing, and GPS beacon streaming.*

### Citizen Emergency Portal (`/citizen`)
<!-- Add screenshot here: Citizen intake form and live ambulance ETA map -->
*Instant emergency request interface with real-time responder call sign, distance in km, and live map tracking.*

### Administration & Fleet Console (`/admin`)
<!-- Add screenshot here: User management, vehicle fleet CRUD, and hospital bed availability -->
*Governance panel for dynamic staff provisioning, ambulance maintenance toggles, and regional hospital bed capacity.*

</div>

---

## 🎥 Demo

> **Live Demonstration Video:** *Demo coming soon*  
> To test the system locally right now, follow the [Quick Start Guide](#-installation--local-setup) and use the provided seed credentials.

---

## 👨‍💻 Engineering Highlights & Contribution

Key technical systems designed, implemented, and verified in this codebase:

1. **ACID Concurrency Engine (`server/src/modules/incidents/routes.js`)**:
   - Engineered PostgreSQL row-level pessimistic locking (`SELECT FOR UPDATE`) across three interdependent tables (`incidents`, `drivers`, `vehicles`) inside a single Knex transaction.
   - Guaranteed zero double-dispatch race conditions when multiple dispatchers compete for the same ambulance.
2. **Multi-Factor Recommendation Algorithm (`server/src/modules/dispatch/routes.js`)**:
   - Developed the mathematical composite scoring function incorporating Haversine distance, speed-adjusted ETA, active workload penalties, and driver performance ratings.
3. **Bi-Directional Telemetry Gateway (`server/src/socket.js` & `src/lib/socket.ts`)**:
   - Implemented JWT-authenticated WebSocket handshakes with role/user room scoping and client-side throttle buffers (`LOCATION_THROTTLE_MS = 2000`).
4. **Resilient Dual-Token Authentication (`src/lib/api/client.ts` & `src/lib/auth-context.tsx`)**:
   - Built a native fetch client featuring silent token rotation and an in-flight request queue that prevents multiple refresh storms.
5. **Authoritative State Machine (`server/src/modules/incidents/constants.js`)**:
   - Designed the strict transition matrix and vehicle synchronization engine, backed by automated Vitest test coverage (`concurrency.test.ts`, `state-machine.test.ts`).

---

## 🧪 Example Scenario Walkthrough

### Scenario: Severe P1 Cardiac Emergency

1. **Intake (00:00)**: Citizen reports a cardiac emergency at CMC Hospital Main Gate, Vellore (`12.9249° N, 79.1350° E`). The backend assigns sequential code **INC-2151**, sets priority **P1** with an **8-minute (480s) SLA**, commits the record, and broadcasts `incident:created` via Socket.IO.
2. **Triage (00:15)**: Dispatcher sees `INC-2151` appear with a red pulsing beacon and SLA countdown bar. Clicking the incident calls `/api/dispatch/recommend/INC-2151`.
3. **Recommendation (00:16)**: The algorithm scores `MEDIC 410` (Mercedes Sprinter, ALS) at 94.2 pts (1.2 km away, ~2 min ETA, 4.9 rating, 0 active missions) as the top choice.
4. **Concurrency Lock (00:20)**: Dispatcher clicks "Assign". A database transaction acquires row locks on `INC-2151`, driver `MEDIC 410`, and vehicle `EMS-4471`. State updates to `assigned`, driver updates to `busy`, and the transaction commits. A competing dispatcher clicking assign 50ms later receives **HTTP 409 Conflict**.
5. **Field Telemetry (00:30 - 04:00)**: The driver console chimes with a mission alert. The driver clicks "Accept", then "En Route". The browser's geolocation API streams GPS coordinates every 2-5 seconds. The citizen's map renders `MEDIC 410` closing in with real-time ETA and call sign details.
6. **Handover & Handshake (06:30)**: Driver marks `arrived` &rarr; `patient_loaded` &rarr; `at_hospital` &rarr; `completed`. The backend sets the incident to `completed`, releases the driver and ambulance back to `available` status, decrements the active mission counter, and logs a 100% SLA compliance score in analytics.

---

## ⚠️ Limitations

- **Geodesic Distance (Haversine)**: Distance and ETA calculations use great-circle spherical distance rather than actual road topology or live traffic feeds (e.g. Google Directions or OSRM).
- **Single-Node Socket.IO**: WebSockets operate on a single Node server instance without a Redis adapter or Redis Streams message bus, meaning horizontal multi-instance clustering requires enabling sticky sessions and Redis pub/sub.
- **Simulated Speed Average**: ETA relies on a fixed average emergency response speed of 42 km/h rather than dynamic road speed limits.
- **In-Memory Token Queue**: Access tokens are kept in JavaScript memory, which is secure against XSS persistence but resets on hard browser refreshes.

---

## 🔮 Future Improvements

- [ ] **Road-Aware Routing Engine**: Integrate OpenStreetMap / OSRM or Mapbox Directions API for turn-by-turn road routing and traffic-aware ETA calculation.
- [ ] **PostGIS Spatial Queries**: Migrate spatial queries from application-level Haversine math to native PostGIS geometry types (`ST_DWithin`, `ST_Distance`).
- [ ] **Redis Pub/Sub Socket Adapter**: Enable horizontal scaling of backend API instances using `@socket.io/redis-adapter`.
- [ ] **SMS / Push Integration**: Integrate Twilio for SMS alerts and Web Push (FCM / APNs) for field responder notifications when devices are locked.
- [ ] **Offline PWA Capabilities**: Service Worker caching for driver navigation during temporary network drops in transit dead zones.

---

## 📚 Learning Outcomes

Building and auditing ResQ demonstrates deep mastery of core software engineering disciplines:

- **ACID Transactions & Row-Level Locking**: Preventing race conditions through pessimistic serialization (`SELECT FOR UPDATE`) rather than relying solely on application-layer flags.
- **Event-Driven Architecture**: Decoupling REST request lifecycles from real-time WebSocket side effects.
- **Dual-Token Security**: Engineering silent token rotation with in-flight queue management to prevent 401 cascading failures.
- **Authoritative State Machines**: Eliminating corrupted domain states through strict transition matrices and relational constraints.
- **Server-State Synchronization**: Coordinating TanStack Query cache invalidations with WebSocket events to achieve seamless, zero-refresh UI updates.
- **Multi-Factor Ranking**: Implementing domain-specific scoring algorithms that balance geographic proximity with operational workload.

---

## ⭐ Project Highlights

```
  🚑 Intelligent Dispatch      🔒 Concurrency Safety        ⚡ Real-Time Telemetry
  Multi-factor ranking         PostgreSQL row-level         Sub-second WebSocket
  balancing distance, ETA,     locks (SELECT FOR UPDATE)    streaming of GPS coordinates
  workload, and rating.        prevent duplicate runs.      and incident updates.

  📍 Tactical Mapping          🗄️ Relational Integrity      🔐 Secure Dual-Token RBAC
  Interactive Leaflet maps     PostgreSQL 16 engine         15m JWT access + 30d refresh
  with heading-rotated icons   with Knex migrations,        with silent rotation and
  and SLA countdown rings.     UUIDs, and audit logging.    rate-limited auth routes.
```

---

## 👤 Author

**Aditya Kumar**
- **GitHub**: [@AdityaKumar1988](https://github.com/AdityaKumar1988)
- **Repository**: [https://github.com/AdityaKumar1988/smart-ems](https://github.com/AdityaKumar1988/smart-ems)
- **Email**: [adityakrjha1988@gmail.com](mailto:adityakrjha1988@gmail.com)

---

<div align="center">
  <sub>Built with engineering rigor for mission-critical emergency response. Powered by React 19, Express, PostgreSQL, and Socket.IO.</sub>
</div>
