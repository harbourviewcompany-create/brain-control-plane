# brain-control-plane

Brain Control Plane — operator UI for the Brain cognitive runtime (Next.js).

Production: https://thebrain-sandy.vercel.app

## Security model (BFF)

The browser talks **only** to same-origin `/api/brain/*`.

Next.js route handlers proxy to the Railway Brain API and attach `X-Brain-Api-Key` from **server-only** env:

| Variable | Scope | Purpose |
|----------|--------|--------|
| `BRAIN_API_URL` | Server | Upstream base (no trailing slash) |
| `BRAIN_API_KEY` | Server | Optional until Railway is keyed |
| `NEXT_PUBLIC_OPERATOR_ID` | Public | Operator label only |

**Do not** set `NEXT_PUBLIC_BRAIN_API_KEY`. That would put the secret in the client bundle.

Default upstream if `BRAIN_API_URL` is unset: `https://brain-api-live-production.up.railway.app`.

## Local

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Vercel

1. Set `BRAIN_API_URL` (and `BRAIN_API_KEY` after Railway promote).
2. Redeploy.
3. Confirm TopBar shows **API live** and base ` /api/brain `.
