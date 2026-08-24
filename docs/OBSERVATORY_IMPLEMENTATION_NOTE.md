# Brain Observatory V1 — Implementation Note

Branch: `feat/brain-observatory-v1-20260824`

This implementation replaces the root card-grid cockpit with the Brain Observatory while preserving the existing server-side BFF and Brain backend contracts.

Runtime/BFF boundary:

- `src/lib/brain-upstream.ts` is unchanged.
- Vercel deployment OIDC remains the primary upstream authentication mechanism.
- server-only `BRAIN_API_KEY` remains fallback only.
- no Brain backend file, migration, Railway configuration or database behavior is changed.
- existing detailed operator routes remain available behind the new Observatory shell.

Verification authority is `.github/workflows/observatory-verify.yml` plus Vercel preview checks. The branch must remain unmerged until lint, TypeScript, structural verification, production build, live protected-BFF smoke and visual review are complete.
