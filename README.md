# brain-control-plane

Brain Control Plane — operator UI for the Brain cognitive runtime (Next.js).

Production: https://thebrain-sandy.vercel.app  
Runtime API (current): https://brain-api-live-production.up.railway.app

## Wire status

| Layer | Status |
|-------|--------|
| Live API (v0.5 in-memory) | Connected via fallback + CORS |
| Explicit env | Set `NEXT_PUBLIC_BRAIN_API_URL` on Vercel |
| API key auth (main / v0.8+) | Client ready — set `NEXT_PUBLIC_BRAIN_API_KEY` when Railway promotes |
| Organism layer UI | `/organism` + Cockpit panel (graceful when API lacks routes) |

## Local

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Vercel env (production)

1. `NEXT_PUBLIC_BRAIN_API_URL` = `https://brain-api-live-production.up.railway.app` (or new production base)
2. `NEXT_PUBLIC_BRAIN_API_KEY` = same value as Railway `BRAIN_API_KEY` (after promote)
3. Optional: `NEXT_PUBLIC_OPERATOR_ID`
4. Redeploy

## API client

- Base resolution: env → live Railway fallback (skips deprecated Railway hosts)
- Auth header: `X-Brain-Api-Key` when key is set
- Organism routes: `/organism/*` (404-safe until Railway is on current Brain main)
