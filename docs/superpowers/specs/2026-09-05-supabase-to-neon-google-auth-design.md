# Migrating Cinephile.com off Supabase

**Date:** 2026-09-05
**Status:** Implemented locally; production cutover pending

Two independent migrations, executed and verified separately: the database moves
to Neon, then authentication moves to Google. Conflating them makes any
failure ambiguous about its cause, so Phase 1 ends with a fully working site
still authenticating against Supabase.

## Current state

- **Frontend:** React 18 + Vite in `client/`, auth via `@supabase/supabase-js`.
- **Backend:** Flask in `server/server.py` (742 lines), recommendation logic in
  `server/recommendEngine.py` (1,357 lines of numpy/pandas/scikit-learn).
  Database access is psycopg2 via `DB_*` environment variables.
- **Packaging:** one multi-stage Dockerfile — node:20 builds the Vite bundle,
  python:3.13 serves it. Flask serves the built SPA itself, so today the
  application has exactly one origin and one exposed port.
- **Deployment:** a hand-rolled `docker-compose.yaml` on the shared Coolify VPS.
  Cinephile is not onboarded to deploykit and will not be as part of this work.
- **Database:** Supabase Postgres 17.6 in eu-west-1. Seven tables in `public`,
  plus one function. `films` is 29,825 rows / 24 MB; everything else is small.

### Why no user migration is needed

`public.login` is the application's own user table, and the data model is
already decoupled from Supabase Auth:

```
login(user_id PK varchar(100), email UNIQUE, auth_id TEXT UNIQUE, role)
```

Every application table (`loved_films`, `watchlist`, `liked_cast`,
`liked_attributes`, `recommended_film_interactions`) has a foreign key to
`login(user_id)`. Nothing references `auth.users`; the only foreign keys into
`auth.*` belong to Supabase's own internal tables. `login.auth_id` is the single
bridge to whichever identity provider is in use.

`_get_or_create_local_user()` in `server.py` resolves a user by `auth_id` first,
then falls back to matching on **email and backfilling `auth_id`**. That fallback
was written for the Clerk-to-Supabase migration — this application has already
survived one auth provider change through exactly this mechanism.

The consequence is that no user records and no password hashes need migrating.
Each user signs in once with their existing Google account, and the email
fallback re-links `login.auth_id` automatically, preserving their saved films. **No bespoke user-migration script will be written.** The correct work is
to verify this path fires, which the acceptance test below does.

The `login` table holds **three** rows, not two: the third,
`diagtest_1782864076@example.com`, is a diagnostic artifact. The two real
accounts are `wobowizard2@gmail.com` and `asharena2003@gmail.com`, both still
carrying Clerk-era `user_3...` ids.

`asharena2003@gmail.com` has **`auth_id` = NULL** — that account never signed in
under Supabase and is still a pure Clerk-era row. It also holds the only real
saved data in the database (1 loved film, 1 liked attribute). The email fallback
is therefore not a convenience for that user; it is the only thing standing
between them and data loss. The fallback query has no `auth_id` predicate, so a
NULL row does match and is backfilled.

## Constraints

- The Supabase project is the rollback. It is not deleted until the migration is
  confirmed working end to end.
- `.env` is backed up and a fresh dump taken before any destructive step.
- Supabase credentials are rotated once the migration is complete.
- No commit or push without showing the diff first.
- No change to the Coolify/Traefik routing topology.

---

# Phase 1 — Database to Neon

## Provisioning

Provisioned with deploykit's `database` step alone. This is a provisioning-only
use of the kit: Cinephile's deployment remains hand-rolled, and no Coolify app,
server, DNS or CI/CD resource is created or touched.

```bash
DRY_RUN=1 ~/Projects/deploykit/deploy.sh -C ~/Projects/Cinephile.com database
~/Projects/deploykit/deploy.sh -C ~/Projects/Cinephile.com database
```

Running the step on its own skips `step_preflight`, which is the only place
`COOLIFY_URL` and `COOLIFY_TOKEN` are required. Every other setting has a
default in `lib/common.sh`, so Cinephile's `deploy.env` holds only the Neon keys:

```
WITH_DATABASE=1
NEON_API_KEY=...
NEON_ORG_ID=...
NEON_PROJECT_NAME=cinephile
NEON_REGION=aws-eu-central-1
NEON_MIN_CU=0.25
NEON_MAX_CU=2
NEON_POOLED=0
```

`NEON_REGION` must be set explicitly. Neon region ids carry a cloud prefix, so
Supabase's bare `eu-west-1` is invalid — but more importantly **`aws-eu-west-1`
is not available to this Neon organization at all**. The API permits only
`aws-eu-central-1` and `aws-eu-west-2` in the EU. Frankfurt was chosen to
co-locate with the shared Coolify VPS and with SpotifyApp's existing Neon
project: app-to-database latency is what matters at runtime, and proximity to
the retired Supabase region buys nothing once the one-time restore is done.

`NEON_POOLED=0` selects the direct endpoint rather than the PgBouncer pooler.
Cinephile opens and closes a psycopg2 connection per request and holds no session
state, so transaction pooling would be safe in principle, but the boot-time load
of all 29,825 `films` rows belongs on the direct endpoint and direct is the
reversible default.

`SCHEMA_FILE` is deliberately left unset. The dump below is `CREATE TABLE`-based
and not idempotent, so wiring it in as deploykit's schema file would fail on any
re-run. The restore stays a separate, inspectable step.

Provisioning writes `.deploy-secrets/db.env` containing `DB_HOST`, `DB_PORT`,
`DB_USER`, `DB_PASSWORD`, `DB_DATABASE`, `DB_SSLMODE` and `DATABASE_URL` — the
exact shape `create_db_connection()` already reads — plus a
`neon_created_by_us.txt` ownership marker that `teardown.sh database` requires
before it will delete anything.

**Postgres version:** the project lands on Neon's default — confirmed in practice
as PostgreSQL 18.6, with `C.UTF-8` collation under the builtin provider.
deploykit's create call sets no `pg_version` field, so pinning 17 to match the
17.6 source is not available through this provisioning path — it would mean
either patching the kit or provisioning by hand, neither of which is worth it
here. The version jump is safe: the dump is taken with pg_dump 18.3, which is the
supported way to move 17.6 into an 18 target, and the schema uses no features
affected by the 17-to-18 change. Accepted deliberately rather than by omission.

### Prerequisite: gitignore

`.gitignore` currently covers neither `deploy.env` nor `.deploy-secrets/`, and
both will hold live Neon credentials. Both entries are added **before** either
file is created.

## Dump

```bash
pg_dump --schema=public --no-owner --no-privileges --no-acl \
        --format=plain --file=cinephile_public.sql "$SUPABASE_CONN"
```

`--schema=public` is required, not merely tidy: `supabase_vault` exists in the
source and has no counterpart on Neon, so a whole-database dump fails on it.

Schema *and* data are dumped. Unlike SpotifyApp, Cinephile has no `init_db()` —
the schema exists only inside the database, so a data-only dump would restore
into nothing.

Before restoring, the dump is inspected to confirm it contains all seven tables,
the one `public` function, and the sequences, indexes and foreign keys.

Local `pg_dump` is 18.3, the source is 17.6, and the Neon target is 18 — the
dumping tool matches the target major version, which is the supported direction.

## Row-level security

All seven tables have RLS **enabled with zero policies**. That configuration
denies all access to any non-owner role; it works today only because the
application connects as the table owner.

**Decision: drop RLS on restore.** Zero policies protect nothing, so keeping it
buys no security while preserving a trap in which a future role change silently
returns zero rows instead of raising an error. After restore:

```sql
ALTER TABLE <each of the 7> DISABLE ROW LEVEL SECURITY;
```

Verified by asserting no row of `pg_class` for these tables has
`relrowsecurity = true`.

## Restore and verification

Restored over the direct host with `psql -v ON_ERROR_STOP=1`.

Verification is row counts **and** content checksums, with `COLLATE "C"` forced
on both sides:

```sql
SELECT md5(string_agg(t::text, '|' ORDER BY t::text COLLATE "C")) FROM <table> t;
```

The collation pin is necessary because Supabase is `en_US.UTF-8` (ICU) and Neon
is `C.UTF-8` (builtin); without it `string_agg(... ORDER BY <text>)` orders
differently on each side and reports false mismatches.

**The collation difference is a checksum artifact only, not a behavioural
change.** There is no SQL `ORDER BY` anywhere in `server.py` or
`recommendEngine.py` — verified by grep. All ordering the application performs
happens in pandas, in process, and is unaffected by database collation.

## Cutover

`DB_*` in `.env` and in the Coolify environment are pointed at Neon. Auth stays
on Supabase.

**Phase 1 exit criterion:** the site is fully exercised — browse, filter,
shuffle, open a film, sign in, view loved films and watchlist, add and remove a
watchlist entry — and works completely, with auth still on Supabase. Any problem
found here is a database problem, which is the entire point of stopping at this
line.

---

# Phase 2 — Authentication to Google

## Why not better-auth

The original plan was better-auth behind a Node sidecar. That was abandoned
during implementation: better-auth is a TypeScript library with no Python port,
so it requires a Node runtime, a second container, a second dependency tree and a
Flask reverse proxy — a large permanent cost for one feature in a Flask + React
codebase. `better-auth/react` does not avoid this; it is an HTTP client whose
`baseURL` must point at a better-auth **server**, which is Node-only.

Two facts made a much smaller design possible:

1. `server.py` already verifies bearer tokens with `PyJWKClient` against a JWKS
   URL — the standard OIDC mechanism. Any OIDC issuer drops into that seam.
2. **Both real users are Gmail accounts** (`wobowizard2@gmail.com`,
   `asharena2003@gmail.com`). Google alone covers 100% of the user base.

So Google *is* the identity provider. Google owns passwords, 2FA and account
recovery; this application stores no credentials and manages no sign-in flow.
No new runtime, no new container, no new service, and no third-party SaaS beyond
Google itself.

## Architecture

```
browser --(Google Identity Services)--> Google
browser --POST /api/auth/google {credential}--> Flask
Flask   --verify RS256 against Google JWKS--> issue app session token
browser --Authorization: Bearer <app token>--> Flask (all later requests)
```

Google ID tokens last only an hour, which would mean an hourly re-prompt. Flask
therefore verifies Google's token **once** at sign-in and issues its own
30-day session token, which is what every subsequent request carries.

## Flask

`_verify_supabase_token` is replaced by three functions:

- `_verify_google_id_token(credential)` — verifies RS256 against
  `https://www.googleapis.com/oauth2/v3/certs` with `audience=GOOGLE_CLIENT_ID`.
  It additionally checks `iss` (PyJWT does not, and Google uses two spellings)
  and **rejects an unverified email**, so an unverified address can never match a
  `login` row.
- `_issue_app_token(auth_id, email)` — HS256, signed with `APP_JWT_SECRET`,
  `iss`/`aud` of `cinephile`, 30-day expiry.
- `_verify_app_token(token)` — verifies the above.

One new route, `POST /api/auth/google`, added to `PUBLIC_API_PATHS` because
sign-in cannot itself require a session. `_authenticate` now calls
`_verify_app_token`; everything downstream of it is unchanged.

`_get_or_create_local_user` is **not modified**. Its auth_id-then-email
resolution carried users through Clerk to Supabase and now carries them to
Google; `auth_id` is the only column that changes.

The legacy HS256 branch and `SUPABASE_JWT_SECRET` are deleted. That branch was
already dead: `SUPABASE_JWT_SECRET` was empty, so it returned `None` on every
call.

## Client

`supabaseClient.js` is replaced by `authClient.js`, which loads Google Identity
Services, renders Google's button, exchanges the credential for the app token,
and stores it in `localStorage`. `getAccessToken` keeps its exact signature
(`async () => string | null`), so `main.jsx` changes only its import.

`onAuthChange` replaces Supabase's `onAuthStateChange` as a small subscriber set.

Six files: `authClient.js` (new), `SessionContext.jsx`, `ProtectedRoute.jsx`,
`Navbar.jsx`, `AuthModal.jsx`, `main.jsx`. `supabaseClient.js` is deleted and
`@supabase/supabase-js` removed from `package.json`.

`AuthModal` loses its email/password form entirely — there is no password to
collect. Eight now-dead CSS rules were removed with it.

## Google configuration

Google Identity Services uses **Authorized JavaScript origins**, not redirect
URIs, because there is no redirect leg. The OAuth client needs the site origin
(and `http://localhost:8080` for local work) listed there.

## Environment variables

Added: `GOOGLE_CLIENT_ID`, `VITE_GOOGLE_CLIENT_ID` (same value, not secret),
`APP_JWT_SECRET` (server-only).

Retired: `SUPABASE_URL`, `SUPABASE_JWT_SECRET`, `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY` — removed from `.env`, the Dockerfile `ARG`s and
`docker-compose.yaml` `build.args`.

## What is given up

No password reset, email verification, session revocation or rate limiting —
better-auth would have supplied these. With Google as the provider, the first two
are Google's problem and do not apply. Session revocation and rate limiting would
have to be built if ever needed; with two users they are not.

Sign-in is Google-only. Adding another provider later means either a second OIDC
issuer in the same seam or a hosted provider — the token-verification seam is
provider-agnostic, so that change is contained.

# Acceptance

Before the auth swap, each user's `login.user_id`, `login.email` and their row
counts in `loved_films` and `watchlist` are recorded. "Data intact" is then a
comparison against captured numbers rather than an impression.

After the swap:

1. Both users sign in with Google using their existing Gmail addresses.
2. `login.auth_id` is confirmed to have been rewritten to the Google subject id
   **on the existing row** — no new `login` row was inserted, and `user_id` is
   unchanged.
3. Loved films, liked attributes and watchlist match the counts captured
   beforehand.
4. Protected routes reject an absent or invalid token, and `/api/account/me`
   returns the correct identity.

**Verified locally.** Signing in with a new subject id against
`asharena2003@gmail.com` left `user_id` as `user_3F0GDJ0QuAxKJVMWmdIA8YhDHVA`,
backfilled `auth_id`, returned the loved film `tt3060492`, and kept the `login`
row count at 3. All table checksums still match the original Supabase source.
The row was then reset to NULL so the real sign-in performs the real re-link.

## Rollback

Phase 1 rolls back by pointing `DB_*` at Supabase again. Phase 2 rolls back by
reverting the commit: the Supabase client, its env vars and the old token
verification return together. The Supabase
project stays live throughout and is deleted only on explicit confirmation.

## Out of scope

- Onboarding Cinephile's deployment to deploykit. Provisioning uses the kit's
  `database` step only; this may be revisited afterwards as separate work.
- Porting `recommendEngine.py` to Node — the reason a Node backend was never
  on the table.
- Email + password sign-in. Both users are Gmail accounts, so Google covers them
  entirely.
- Any change to Coolify or Traefik routing.
- `dist/index.html` is tracked in git despite `dist/` being gitignored. A
  pre-existing quirk, noted and left alone.
