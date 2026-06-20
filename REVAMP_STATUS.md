# Terminal Zero — Revamp Status

Tracks the transformation described in `TERMINAL_ZERO_REVAMP_HANDOFF.md`: from a
solo prop-style live-data simulator into a teacher-led, replay-and-synthetic,
AI-augmented training academy on owner-controlled infrastructure.

## Target architecture

| Concern            | Service                                   |
|--------------------|-------------------------------------------|
| Frontend           | Vercel (Next.js 14)                       |
| REST API           | **Vercel** (FastAPI on Fluid Compute) — moving off Railway |
| Engines + streaming + Redis | Hetzner VPS (Docker Compose) — when provisioned |
| App database       | Supabase Postgres                         |
| Auth / identity    | Firebase Auth (verified in the API layer) |
| Object storage     | Cloudflare R2 (Parquet + screenshots)     |
| Forecasting        | Kronos (self-hosted, MIT)                 |
| AI coach           | DeepSeek V4 Flash (OpenAI-compatible)     |
| Payments           | Paystack (school-level)                   |

### Hosting note: Railway → Vercel

The API is moving from Railway to Vercel. Vercel runs FastAPI as serverless
(Fluid Compute), which serves the **stateless REST API** well but **cannot** run
persistent WebSocket streaming or the infinite background loops. Those are gated
behind `ENABLE_BACKGROUND_WORKERS` (auto-off on Vercel via the `VERCEL` env) and
belong on the **persistent host** — Railway today, the VPS once provisioned.
Frontend `NEXT_PUBLIC_WS_URL` can keep pointing at the persistent host while
`NEXT_PUBLIC_API_URL` moves to Vercel.

## Phase status

- [x] **Phase 1 — Foundation** (this change)
- [ ] Phase 2 — Binance Vision ingestion → Parquet on R2 → DuckDB
- [ ] Phase 3 — Matching + replay engine (no look-ahead), replacing the Jesse core
- [ ] Phase 4 — School product: dashboards, profiles, paper allocation, Paystack
- [ ] Phase 5 — Kronos forecast worker + overlay + synthetic generator
- [ ] Phase 6 — DeepSeek coach worker + journal panel (paid-tier gated)
- [ ] Phase 7 — Cyan UI, training-objective screens, notifications, security pass

## Phase 1 — delivered

**Data model** (`backend/app/models/`, Alembic `007`)
- New tables: `schools`, `school_subscriptions`, `cohorts`, `students`,
  `scenarios`, `replay_sessions`.
- `users`: `firebase_uid` (unique), `display_name`, `role`
  (school_admin / instructor / student / solo_learner).
- Trading tables scoped under `student_id`; `orders` record `fee` + `slippage`.
- `journal_entries`: `forecast_snapshot` (JSONB), `coach_feedback`,
  `coach_status`.
- `paystack_ref` lives on `School` / `SchoolSubscription`, not the user.

**Auth — Firebase**
- `backend/app/core/firebase_auth.py` verifies Firebase ID tokens against
  Google's public certs (only the public project id needed; no service-account
  JSON for verification). Behind a swappable surface.
- `decode_access_token` routes Firebase tokens first, then legacy Supabase
  (ES256) / HS256. A Firebase UID maps deterministically to a Supabase user
  UUID (uuid5), so the hot path needs no DB round-trip.
- `POST /api/auth/firebase/sync` provisions/refreshes the matching Supabase row
  → satisfies Phase 1 acceptance ("sign up via Firebase, matching Supabase row").
- Frontend: `frontend/lib/firebase.ts` + a Firebase path in `authStore.ts`
  (priority: Firebase > Supabase > local). Activated by `NEXT_PUBLIC_FIREBASE_*`.

**Storage — R2**
- `backend/app/core/storage.py`: swappable `StorageBackend` (R2 via boto3, with
  a local-disk dev fallback). Replaces AWS S3.

**AWS stripped**
- Removed `AWS CONFIG.md`, `amplify.yml`, `infrastructure/AWS_DEPLOYMENT_PLAN.md`,
  and the ECS/ECR deploy scripts. `infrastructure/README.md` rewritten for the
  VPS. No AWS in the critical path.

**Infra / deploy**
- `backend/vercel.json` + `backend/api/index.py` — Vercel Python entrypoint.
- `docker-compose.vps.yml` — Hetzner VPS stack (API + Redis; Supabase external).
- Background tasks gated by `ENABLE_BACKGROUND_WORKERS`.

**Self-healing schema** — Railway's Dockerfile runs only `uvicorn` (no
`alembic upgrade`); the live schema is managed by `create_all`, which adds new
tables but not new columns. `init_db()` now also runs idempotent
`ADD COLUMN IF NOT EXISTS` so a deploy with new columns doesn't break the app.

## Needs credentials / provisioning (owner)

These are scaffolded and env-driven; provide creds to activate:
- **Firebase**: create project; set `FIREBASE_PROJECT_ID` (API) and
  `NEXT_PUBLIC_FIREBASE_*` (frontend).
- **Cloudflare R2**: bucket + keys → `R2_*`.
- **Vercel backend project**: import repo rooted at `backend/`, set env, deploy;
  then point `NEXT_PUBLIC_API_URL` at it.
- **Hetzner VPS**: when ready, `docker compose -f docker-compose.vps.yml up -d`.
- **DeepSeek / Kronos**: Phases 5–6.
- **Fresh Supabase PAT**: the one on file returns 401; needed for direct
  Management-API schema work.
