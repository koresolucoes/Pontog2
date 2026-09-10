# PontoG Admin — Extraction Contract

Tracking: #87, #88, #89, #90, #91, #92, #93

## Decision

The administrative surface is an independent product and will be fully removed from `Pontog2` after cutover.

`PontoG-Admin` owns the administrative frontend, Admin authentication/MFA/RBAC, Admin-specific BFF/server routes, audit orchestration and administrative adapters/contracts.

`Pontog2` remains the Consumer application. Shared Postgres/Supabase domain primitives may remain shared until a future Platform extraction, but the Admin product must not require a Consumer deployment to evolve or rollback.

## Legacy code that must leave Pontog2

### Frontend
- `pages/Admin/**`
- `stores/adminStore.ts`
- Admin routing/imports from `App.tsx`

Current Admin surfaces include:
- Dashboard
- Users
- Plans
- Payments
- Reports / moderation
- Venues
- Venue Claims
- B2B / Ads
- News
- Audit Logs
- Settings

### Admin server/BFF
- `api/admin-login.ts`
- `api/admin/_totp.ts`
- `api/admin/_utils.ts`
- `api/admin/accounts.ts`
- `api/admin/audit-logs.ts`
- `api/admin/grant-subscription.ts`
- `api/admin/mass-import*.ts`
- `api/admin/media-upload.ts`
- `api/admin/mfa/**`
- `api/admin/news.ts`
- `api/admin/payments.ts`
- `api/admin/plans.ts`
- `api/admin/reports.ts`
- `api/admin/settings.ts`
- `api/admin/stats.ts`
- `api/admin/venue-claims.ts`
- any additional Admin-only endpoint found during M0

## Explicit non-goals

Do not copy the current implementation as-is.

The new Admin must not inherit:
- Zustand-persisted Admin auth token/boolean as proof of authentication;
- direct privileged Supabase Data API writes from the browser;
- the monolithic `B2BManagerView.tsx` architecture;
- non-atomic wallet adjustment/refund logic;
- audit state in `localStorage` or process memory for critical actions;
- fake KPI fallbacks;
- plain comparison of `password_hash` to submitted password;
- legacy API-key login as a normal authentication path.

## Target boundary

```text
Admin Browser
    |
    v
PontoG-Admin BFF
    |
    +--> authenticate Admin identity
    +--> enforce MFA/AAL2
    +--> resolve RBAC/capabilities
    +--> validate request contract
    |
    v
Domain command/query
    |
    v
Supabase / Postgres RPC / ledger
    |
    v
Persistent audit trail
```

FINANCIAL and PRIVILEGED operations are server-only.

## Proposed repository shape

```text
PontoG-Admin/
├── src/
│   ├── app/
│   ├── auth/
│   ├── layouts/
│   ├── features/
│   │   ├── dashboard/
│   │   ├── users/
│   │   ├── venues/
│   │   ├── claims/
│   │   ├── moderation/
│   │   ├── ads/
│   │   ├── finance/
│   │   ├── reports/
│   │   ├── news/
│   │   ├── audit/
│   │   └── settings/
│   ├── services/
│   ├── contracts/
│   ├── ui/
│   └── types/
├── api/
│   └── admin/
├── server/
│   ├── auth/
│   ├── authorization/
│   ├── audit/
│   └── adapters/
└── tests/
```

## Migration order

1. **A0 Bootstrap** — repo, shell, CI, preview deployment.
2. **A1 Auth** — canonical identity, mandatory MFA, server-side RBAC.
3. **A2 Claims** — first vertical slice from queue through atomic decision and audit.
4. **A3 Core Operations** — users, venues, moderation, news, media/imports.
5. **A4 B2B / Ads** — server-backed queries and commands; no browser writes.
6. **A5 Finance** — payments, plans, atomic adjustments/refunds/reconciliation.
7. **A6 Audit / Analytics / Settings** — persistent audit, trustworthy KPIs, settings.
8. **A7 Cutover** — production deploy, reversible redirect/feature flag, E2E smoke.
9. **A8 Legacy removal** — remove Admin frontend/store/API from `Pontog2`.

## First vertical slice: Claims

Claim is the architecture proof because it exercises identity, RBAC, privileged data, workflow, atomic mutation and audit without starting with wallet risk.

```text
Admin queue
  -> claim detail
  -> evidence
  -> approve/reject
  -> process_venue_claim
  -> ownership state
  -> persistent audit
  -> response/status
```

The slice is not complete until all stages operate from the new repository.

## Existing domain primitives to preserve

The current database/security work already defines useful canonical primitives that should be reused instead of reimplemented in UI code:
- `process_venue_claim`
- `ensure_b2b_wallet`
- `create_b2b_campaign_atomic`
- `set_b2b_campaign_status`
- `settle_wallet_topup`
- payment-effect idempotency
- campaign metrics dedupe/antifraud

These are domain/platform capabilities, not Admin UI implementation details.

## Cutover rule

Until A7 succeeds, `/admin` inside `Pontog2` remains the rollback fallback. No destructive database migration is required to activate the new Admin.

After A7 is proven and stable, A8 removes the legacy code from `Pontog2`.

## Definition of Done

- `PontoG-Admin` deploys independently.
- Admin auth/MFA/RBAC are server-enforced.
- Zero FINANCIAL/PRIVILEGED browser writes.
- Admin audit is persistent and fail-closed for critical commands.
- No fake financial/analytics values.
- `Pontog2` contains no Admin UI, Admin auth store or Admin-only BFF/API code.
- Consumer deploys do not deploy Admin and Admin deploys do not deploy Consumer.
