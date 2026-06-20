# Terminal Zero — Infrastructure

Terminal Zero runs on infrastructure the owner controls. There is **no AWS** in
the stack.

## Target topology

```
                         Internet
                            |
            +---------------+----------------+
            |                                |
        [Vercel]                       [Hetzner VPS]
   Next.js frontend           Docker Compose:
                                - FastAPI API
                                - Matching / replay / synthetic engines
                                - Kronos forecast worker
                                - DeepSeek coach worker
                                - Redis (cache + pub/sub)
            |                                |
     [Supabase Postgres]              [Cloudflare R2]
     relational app data           Parquet historicals
                                    + trade screenshots

Identity: Firebase Auth (verified in the API layer, mapped to Supabase rows).
```

| Concern            | Service                          |
|--------------------|----------------------------------|
| Frontend hosting   | Vercel                           |
| API + engines + workers + Redis | Hetzner VPS (Docker Compose) |
| App database       | Supabase Postgres (self-hostable later) |
| Auth / identity    | Firebase Auth                    |
| Object storage     | Cloudflare R2 (S3-compatible)    |
| Historical candles | Parquet on R2, queried with DuckDB |
| Payments           | Paystack (billed at school level)|

## Directories

```
infrastructure/
├── docker/        # Production Dockerfiles for VPS services
└── scripts/       # VPS deploy helpers
```

## Deploying the VPS stack

The VPS runs everything except the frontend via Docker Compose:

```bash
# on the VPS, from the repo root
cp .env.example .env          # fill in Supabase, Firebase, R2, Redis, Paystack
docker compose -f docker-compose.vps.yml up -d --build
```

Coolify is optional for a deploy dashboard on top of the same Compose file.

## Cost posture

The only fixed cost is the VPS. Supabase, R2, Vercel, and Firebase start on free
tiers; the LLM coach (DeepSeek) is pay-per-use and gated to paid school tiers.

## Migrating from the current managed setup

The live deployment currently runs the API on Railway with Supabase + Upstash
Redis. Moving to the Hetzner VPS is a redeploy of the same containers against the
same Supabase database — no schema rewrite is required. Point DNS / the Vercel
`NEXT_PUBLIC_API_URL` at the VPS once it is up.
