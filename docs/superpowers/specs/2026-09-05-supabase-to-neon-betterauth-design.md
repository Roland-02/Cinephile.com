# Migrating Cinephile.com off Supabase

**Date:** 2026-09-05
**Status:** Approved, not yet implemented

Two independent migrations, executed and verified separately: the database moves
to Neon, then authentication moves to better-auth. Conflating them makes any
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
Each of the two users signs up once with their existing email address, and the
email fallback re-links `login.auth_id` automatically, preserving their saved
films. **No bespoke user-migration script will be written.** The correct work is
to verify this path fires, which the acceptance test below does.

There are two users: one email + password, one Google OAuth.

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

# Phase 2 — Authentication to better-auth

## The runtime problem

better-auth is a TypeScript/Node library and cannot run inside Flask. There is
currently no Node server: `package.json` is Vite-only, with no express, hono or
next. better-auth therefore requires introducing a Node runtime.

This is **not** solved by rewriting the backend in Node. `recommendEngine.py` is
1,357 lines of scikit-learn/numpy/pandas; porting it is out of scope and a bad
trade.

## Architecture

A new `auth/` directory holds a small Hono service with its own `package.json`
and Dockerfile, hosting better-auth at `/api/auth/*` and connecting to the same
Neon database through a `pg.Pool`.

In `docker-compose.yaml` it is a second service that is **internal only**:
`expose: "8081"`, no published port, and no `SERVICE_FQDN_*` label. **Traefik
configuration is untouched.**

Flask gains a single reverse-proxy route:

```python
@app.route('/api/auth/<path:subpath>', methods=['GET', 'POST', 'OPTIONS'])
```

forwarding to `http://auth:8081/api/auth/<subpath>` over the internal Docker
network, passing through the request body, `Cookie` and `Authorization` headers,
and returning the upstream status, body and **all** `Set-Cookie` headers. The
last point needs care: `requests` collapses duplicate response headers, so the
proxy reads them via `raw.headers.get_all('Set-Cookie')`. `requests` is already a
dependency.

Flask matches more specific rules before the SPA catch-all at
`@app.route('/<path:path>')`, so no reordering is required.

This was chosen over exposing the Node service through its own Traefik path
router because it changes no routing topology — the piece most likely to take the
live site down — keeps a single exposed service, keeps session cookies
first-party with no SameSite or CORS complications, and is trivially revertible.
The cost is one proxy hop for auth requests only, which is immaterial at two
users.

better-auth's `BETTER_AUTH_URL` is set to the **public** site URL despite being
proxied, because it determines the token issuer, cookie domain and OAuth redirect
URIs.

## Database schema

better-auth's own tables are generated with:

```bash
npx @better-auth/cli@latest generate
npx @better-auth/cli@latest migrate
```

producing `user`, `session`, `account`, `verification`, and `jwks` (from the JWT
plugin). None collide with `login` or any existing application table. They live
in the same Neon database.

## Flask token verification

`server.py` already verifies tokens with `PyJWKClient` against a JWKS URL, so
this is a URL and claim swap rather than an architectural change. `PyJWT[crypto]`
stays.

better-auth's JWT plugin serves JWKS at **`/api/auth/jwks`** by default (not
`/.well-known/jwks.json`; `jwks.jwksPath` can override), and both issuer and
audience default to `BASE_URL`. Confirmed against current better-auth docs rather
than from memory.

The two URLs are deliberately split:

- **JWKS fetch** targets the internal address `http://auth:8081/api/auth/jwks`,
  so key retrieval never leaves the Docker network.
- **issuer and audience validation** use the public site URL, because that is
  what better-auth stamps into tokens.

The legacy HS256 branch and `SUPABASE_JWT_SECRET` are deleted once the
ES256/RS256 path is confirmed working. Note that `SUPABASE_JWT_SECRET` is already
empty in `.env` (the assignment carries only a trailing comment), so that branch
returns `None` today and is already dead code — removing it carries no risk.

### The email claim is load-bearing

`_authenticate()` passes `payload.get("email")` into `_get_or_create_local_user`,
and that email is what re-links each user's existing `login` row. If better-auth's
JWT payload does not carry `email`, the fallback cannot match and the migration
silently creates new empty user rows instead of preserving saved films.

Therefore: inspect a real issued token during implementation and confirm `email`
is present. If it is absent, add `jwt.definePayload` to include it. This is
verified before the acceptance test, not discovered by it.

`sub` maps to the better-auth user id by default, which is what `auth_id` stores.

## Client

`client/contexts/supabaseClient.js` is replaced by an `authClient.js` exporting a
better-auth React client. `getAccessToken` keeps its exact existing signature —
`async () => string | null` — so the axios interceptor and `window.fetch` wrapper
in `main.jsx` change only their import. That helper is the seam; only its
internals are swapped.

better-auth JWTs are short-lived (15 minutes by default), so `getAccessToken`
caches the token with its expiry rather than calling `/api/auth/token` on every
request.

**Six files change, not four.** The Supabase surface in use:

| File | Uses |
|---|---|
| `client/contexts/supabaseClient.js` | replaced wholesale |
| `client/contexts/SessionContext.jsx` | `getSession`, `onAuthStateChange` |
| `client/components/ProtectedRoute.jsx` | `getSession`, `onAuthStateChange` |
| `client/components/Navbar.jsx` | `getSession`, `onAuthStateChange`, `signOut` |
| `client/components/AuthModal.jsx` | `signUp`, `signInWithPassword`, `signInWithOAuth` |
| `client/main.jsx` | imports `getAccessToken` |

`onAuthStateChange` has no direct better-auth equivalent; it maps onto the
reactive `useSession` store. That is a small restructure in `SessionContext.jsx`
and `Navbar.jsx` rather than a line-for-line substitution.

`@supabase/supabase-js` is removed from `package.json`.

## Google OAuth

A new Google OAuth client is created with redirect URI
`https://<site>/api/auth/callback/google`, pointing at the application rather
than at Supabase. The old Supabase-era client is left in place until the
migration is confirmed, then removed.

## Environment variables

Retired: `SUPABASE_URL`, `SUPABASE_JWT_SECRET`, `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`. The two `VITE_*` values appear in **three** places —
`.env`, Dockerfile `ARG`s, and `docker-compose.yaml` `build.args` — and are
removed from all three.

Added: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, `AUTH_INTERNAL_URL`.

---

# Acceptance

Before the auth swap, each user's `login.user_id`, `login.email` and their row
counts in `loved_films` and `watchlist` are recorded. "Data intact" is then a
comparison against captured numbers rather than an impression.

After the swap:

1. The email + password user signs up with their existing email; the Google user
   signs in with Google.
2. `login.auth_id` is confirmed to have been rewritten to the new better-auth
   user id **on the existing row** — no new `login` row was inserted, and
   `user_id` is unchanged.
3. Loved films and watchlist match the counts captured beforehand.
4. Protected routes reject an absent or invalid token, and `/api/account/me`
   returns the correct identity.

## Rollback

Phase 1 rolls back by pointing `DB_*` at Supabase again. Phase 2 rolls back by
reverting the client bundle and the Flask JWKS configuration. The Supabase
project stays live throughout and is deleted only on explicit confirmation.

## Out of scope

- Onboarding Cinephile's deployment to deploykit. Provisioning uses the kit's
  `database` step only; this may be revisited afterwards as separate work.
- Porting `recommendEngine.py` to Node.
- Any change to Coolify or Traefik routing.
- `dist/index.html` is tracked in git despite `dist/` being gitignored. A
  pre-existing quirk, noted and left alone.
