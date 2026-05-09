# DealPilot AI Vercel Deployment Guide

This project is prepared for a Vercel-first hosted hackathon demo.

The repo uses Vercel Services:

- `frontend/` serves the Next.js dashboard at `/`
- `backend/main.py` serves the FastAPI app at `/server`

The normal backend routes keep their internal paths. For example:

```text
Hosted URL: /server/api/demo/full-run
Backend route: /api/demo/full-run
```

## Files Used For Vercel

```text
vercel.json
backend/main.py
frontend/
backend/
.vercelignore
```

`reference-repos/`, local virtual environments, logs, cache files, and secrets are excluded from deployment.

## Vercel Project Settings

In the Vercel dashboard:

- Framework preset: `Services`
- Root directory: repository root
- Build from GitHub repository

The root `vercel.json` defines both services:

```json
{
  "experimentalServices": {
    "web": {
      "entrypoint": "frontend",
      "routePrefix": "/"
    },
    "api": {
      "entrypoint": "backend/main.py",
      "routePrefix": "/server"
    }
  }
}
```

## Environment Variables

For public judging, keep live integrations disabled:

```env
APIFY_LIVE_MODE=false
GEMINI_LIVE_MODE=false
ZYND_ENABLED=false
SUPERPLANE_ENABLED=false
WORKFLOW_EVENTS_ENABLED=true
```

For same-origin Vercel Services calls, set:

```env
NEXT_PUBLIC_API_BASE_URL=/server
FRONTEND_ORIGINS=https://your-vercel-app.vercel.app
```

Optional Apify variables can be set but should remain disabled for the public judging link:

```env
APIFY_API_TOKEN=
APIFY_ACTOR_ID=
APIFY_DEFAULT_SOURCE=olx
APIFY_OLX_ACTOR_ID=
APIFY_EBAY_ACTOR_ID=
APIFY_FACEBOOK_ACTOR_ID=
APIFY_GOOGLE_ACTOR_ID=
APIFY_MAX_ITEMS=10
APIFY_MAX_TOTAL_CHARGE_USD=1.00
APIFY_CACHE_ENABLED=true
APIFY_CACHE_TTL_MINUTES=1440
```

## Hosted Checks

After deployment, test:

```powershell
Invoke-RestMethod https://your-vercel-app.vercel.app/server/health
Invoke-RestMethod https://your-vercel-app.vercel.app/server/api/apify/status
Invoke-RestMethod https://your-vercel-app.vercel.app/server/api/zynd/status
Invoke-RestMethod https://your-vercel-app.vercel.app/server/api/superplane/status
Invoke-RestMethod https://your-vercel-app.vercel.app/server/api/superplane/canvas
```

Then open:

```text
https://your-vercel-app.vercel.app
```

Run the mock demo and confirm the hosted proof panel shows:

- Apify live mode: `false`
- Gemini live mode: `false`
- Zynd called: `false`
- Superplane called: `false`
- Superplane canvas steps visible

## Optional Controlled Live Apify Run

Only do this after the hosted mock demo is stable:

1. Set the Apify token and actor IDs in Vercel.
2. Set `APIFY_LIVE_MODE=true`.
3. In the UI, enable live Apify.
4. Check the credit confirmation box.
5. Use `max_items=10`.
6. Run one search.
7. Set `APIFY_LIVE_MODE=false` again.

Do not run repeated live tests without checking the cache and audit status.

## Originality And Reference Repos

The deployed app uses DealPilot's own source code. Reference repositories under `reference-repos/` are excluded from Git and Vercel deployment. They should not be submitted as copied implementation.
