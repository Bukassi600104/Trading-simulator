# Terminal Zero - Deployment Guide

## Architecture Overview

```
                    Internet
                       |
              +--------+--------+
              |                 |
         [Vercel]          [Railway]
      Next.js static     FastAPI Backend
                               |
                    +----------+----------+
                    |                     |
             [Supabase]           [Upstash Redis]
           PostgreSQL + Auth        Caching / PubSub
```

**Services:**
- **Frontend** - Next.js static export hosted on Vercel
- **Backend API** - FastAPI on Railway (Docker)
- **Auth** - Supabase Auth (JWT-based)
- **Database** - Supabase PostgreSQL
- **Cache / PubSub** - Upstash Redis

## Prerequisites

- [Supabase](https://supabase.com) account (free tier)
- [Railway](https://railway.app) account (free tier / Hobby)
- [Vercel](https://vercel.com) account (free tier)
- [Upstash](https://upstash.com) account (free tier)
- Docker and Docker Compose (local development)
- Node.js 20+ and npm
- Python 3.11+

## Local Development

### Quick Start

```bash
# 1. Copy environment file
cp .env.example .env
# Edit .env with your Supabase project credentials

# 2. Start core services
docker-compose up

# 3. Start with dev tools (pgAdmin + Redis Commander)
docker-compose --profile tools up

# 4. Access services
#    Frontend:        http://localhost:3000
#    API:             http://localhost:8000
#    API Docs:        http://localhost:8000/docs
#    Health Check:    http://localhost:8000/health
#    pgAdmin:         http://localhost:5050
#    Redis Commander: http://localhost:8081
```

### Running Individual Services

```bash
# Backend only
docker-compose up api db redis

# Frontend only (requires API running)
docker-compose up web

# Worker only
docker-compose up worker db redis
```

## 1. Supabase Setup

### Create Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project
2. Note the following from Project Settings > API:
   - **Project URL** (`SUPABASE_URL`)
   - **anon public key** (`SUPABASE_ANON_KEY`)
   - **service_role secret key** (`SUPABASE_SERVICE_ROLE_KEY`)
3. From Project Settings > API > JWT Settings:
   - **JWT Secret** (`SUPABASE_JWT_SECRET`)

### Database Migrations

Run Alembic migrations against Supabase PostgreSQL:

```bash
# Get the connection string from Supabase Dashboard > Settings > Database
# Format: postgresql+asyncpg://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

cd backend
DATABASE_URL="your-supabase-connection-string" alembic upgrade head
```

### Auth Configuration

In Supabase Dashboard > Authentication > Settings:
- Enable Email provider
- Set Site URL to your Vercel frontend URL
- Add redirect URLs for your domain

## 2. Upstash Redis Setup

1. Go to [console.upstash.com](https://console.upstash.com) and create a new Redis database
2. Copy the Redis URL (TLS): `rediss://default:xxx@your-endpoint.upstash.io:6379`
3. This will be used as `REDIS_URL` in Railway

## 3. Railway Backend Deployment

### Setup

1. Go to [railway.app](https://railway.app) and create a new project
2. Connect your GitHub repository
3. Railway will detect `railway.json` and use `backend/Dockerfile`

### Environment Variables

Set these in Railway > Service > Variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Supabase PostgreSQL connection string |
| `REDIS_URL` | Upstash Redis URL |
| `SECRET_KEY` | Random 64-char secret |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `SUPABASE_JWT_SECRET` | Supabase JWT secret |
| `CORS_ORIGINS` | Your Vercel frontend URL |
| `ENVIRONMENT` | `production` |
| `DEBUG` | `false` |
| `PAYSTACK_SECRET_KEY` | (optional) Paystack key for payments |

### Deploy

Railway auto-deploys on push to `main`. The health check at `/health` verifies database and Redis connectivity.

```bash
# Verify deployment
curl https://your-railway-url.railway.app/health
```

## 4. Vercel Frontend Deployment

### Setup

1. Go to [vercel.com](https://vercel.com) and import the GitHub repository
2. Set the **Root Directory** to `frontend`
3. Vercel will detect `vercel.json` configuration

### Environment Variables

Set these in Vercel > Project > Settings > Environment Variables:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | Railway backend URL (e.g., `https://your-app.railway.app`) |
| `NEXT_PUBLIC_WS_URL` | Railway WebSocket URL (e.g., `wss://your-app.railway.app`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key |

### Install Command Override

Set the install command to:
```
npm ci --legacy-peer-deps
```

### Deploy

Vercel auto-deploys on push to `main`. The build output is a static export in the `out/` directory.

## CI/CD Pipeline

### Branch Strategy

| Branch | Workflow | Action |
|--------|----------|--------|
| PR | `ci.yml` | Lint, type-check, test, build |
| `main` | Auto-deploy | Railway (backend) + Vercel (frontend) |

### Required GitHub Secrets

None required for CI. Railway and Vercel handle deployments via their own GitHub integrations.

## Health Check

```bash
curl https://your-api-url/health
```

Returns:
```json
{
  "status": "healthy",
  "service": "terminal-zero-api",
  "version": "0.2.0",
  "environment": "production",
  "checks": {
    "database": "connected",
    "redis": "connected"
  }
}
```

Status codes: `200` = all systems healthy, `503` = one or more systems degraded.

## Troubleshooting

### Railway Container Failing

1. Check Railway logs in the dashboard
2. Verify all environment variables are set
3. Ensure `backend/Dockerfile` builds successfully locally: `docker build -f backend/Dockerfile backend`

### Database Connection Issues

1. Verify the Supabase connection string uses `postgresql+asyncpg://` scheme
2. Check that connection pooling is enabled in Supabase (port 6543)
3. Ensure the database password has no unescaped special characters in the URL

### Frontend Build Failures

1. Ensure `--legacy-peer-deps` is used for npm install
2. Verify all `NEXT_PUBLIC_*` env vars are set in Vercel
3. Check build logs: `npm run build` should succeed locally

### WebSocket Issues

1. Railway supports WebSocket connections natively
2. Ensure `NEXT_PUBLIC_WS_URL` uses `wss://` (not `ws://`) in production
3. Check CORS_ORIGINS includes your Vercel domain
