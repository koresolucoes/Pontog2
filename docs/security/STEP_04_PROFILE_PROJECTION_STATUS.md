# Step 04 — Profile Projection & Discovery Privacy Status

Date: 2026-09-05
Parent: #7 / #1
Architecture: #14

## Problem confirmed

`profiles` historically exposed a single wide row containing both discovery identity and sensitive/internal attributes. The old anonymous `SELECT true` policy made fields such as raw DOB, health status, exact coordinates, subscription expiration and suspension state reachable through the same table contract.

Several SECURITY DEFINER discovery/social RPCs also return raw DOB and/or exact lat/lng, so fixing table RLS alone is insufficient.

## Applied to production

### 04D — Profiles anonymous containment
Migration: `security_step_04d_profiles_anon_containment`

- anon now has zero privileges on `public.profiles`;
- authenticated privileges reduced to SELECT/INSERT/UPDATE;
- service_role retains privileged access;
- duplicate/public-role policies removed;
- canonical own INSERT/UPDATE policies use `(select auth.uid())`;
- temporary `profiles_select_authenticated_compat` remains `SELECT true` for authenticated users until frontend consumers migrate.

This is an intentional compatibility bridge, not the final privacy state.

### 04E — Public profile v1
Migration: `security_step_04e_public_profile_v1`

Created authenticated-only RPC `get_public_profile_v1(uuid)`.

Returns only an explicit public projection:
- identity/display fields;
- public media references;
- status text;
- derived age (never raw DOB);
- profile position/relationship/body presentation;
- identity/pronouns/orientation;
- looking-for/interests;
- hosting/verification/subscription display tier/private-album indicator.

Explicitly excluded:
- raw date of birth;
- HIV/health status;
- exact location/lat/lng;
- weight/height;
- social-network JSON;
- last_seen;
- subscription expiration;
- account status/suspension state;
- internal onboarding flags;
- exact check-in internals;
- other sensitive/internal columns.

Visibility enforcement:
- authenticated actor required;
- other profile must be active and not incognito;
- bidirectional blocks respected;
- target visibility/tribe rule respected;
- own profile may resolve through the contract.

Verified: anon EXECUTE=false; authenticated/service_role=true; fixed search_path.

### 04F — Nearby profiles v2
Migration: `security_step_04f_nearby_profiles_v2`

Created authenticated-only discovery RPC.

Privacy model:
- raw DOB replaced with derived age;
- exact lat/lng are never returned;
- location is rounded to a 2-decimal grid (~1 km scale);
- distance is calculated against the rounded grid point;
- only a coarse distance band is returned (`<1`, `1-3`, `3-5`, `5-10`, `10-25`, `25-50`, `50+ km`);
- banned/non-active and incognito profiles excluded;
- bidirectional blocks and visibility rules applied;
- caller-supplied limit/radius are clamped.

Verified: anon EXECUTE=false; authenticated/service_role=true; fixed search_path.

## Modular implementation

The `profiles` domain now has its first real module boundary:

- `modules/profiles/domain/public-profile.ts` — safe DTOs;
- `modules/profiles/application/queries.ts` — query contract/service;
- `modules/profiles/infrastructure/supabase-profile-read.repository.ts` — Supabase adapter;
- `modules/profiles/public.ts` — only intended external module boundary.

Consumers should use `profileQueries` rather than introducing new direct `supabase.from('profiles')` reads for other users.

`tsconfig.architecture.json` now typechecks `modules/**/*.ts`, so future module files are included in the architecture gate.

## Remaining migration — contract phase

1. Migrate other-profile detail reads to `profileQueries.getPublicProfile()`.
2. Migrate map/discovery reads to `profileQueries.getNearbyProfiles()` and adapt UI to approximate location + distance band.
3. Create safe v2 replacements for Popular/Agora/Winks/Profile Viewers RPCs that currently return raw DOB/exact location/sensitive fields.
4. Keep own-profile editing behind a dedicated self-profile contract.
5. Whitelist editable profile fields in the Profiles module; stop spreading the whole profile row back to Supabase.
6. Remove `profiles_select_authenticated_compat` and replace direct table SELECT with own-row-only access.
7. Only after UI migration, consider column-level UPDATE restrictions for protected/internal fields.

## Rollback

04D, 04E and 04F each have explicit rollback SQL under `docs/security/sql/`.
The v1/v2 RPCs are additive; rollback simply drops them while the compatibility SELECT remains in place.
