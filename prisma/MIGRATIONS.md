# Prisma migrations

## Schema sync approach through M2

Through M2 Auth, we have been syncing the Prisma schema to Neon via `npx prisma db push` rather than running versioned migrations with `prisma migrate dev`.

**Why:**

1. **Initial `User` table (M0)** was synced via `db push` because repeated `prisma migrate dev` attempts hung silently on macOS due to the project living on an iCloud-synced Desktop folder. iCloud's sync daemon was intercepting Prisma's schema-engine IPC. Once Desktop was detached from iCloud Drive, `db push` completed instantly.

2. **NextAuth adapter tables (M2)** — `Account`, `Session`, `VerificationToken`, plus `User.emailVerified` — were added via a second `db push` rather than running `prisma migrate dev --name add_auth_tables`. Reason: we would have needed to first generate a baseline init migration for the existing `User` table and `prisma migrate resolve --applied` it, since the DB was already in use. That's three extra CLI commands up front for cosmetic history, and the user chose pragmatism.

## When versioned migrations begin

The first versioned migration will be created once the schema stabilizes enough that versioned history adds real operational value — most likely **M3 or later** (league lifecycle, team registration, etc.). At that point we'll do this once:

1. Generate a baseline SQL capturing the current full schema:
   ```
   mkdir -p prisma/migrations/<ts>_baseline
   npx prisma migrate diff \
     --from-empty \
     --to-schema-datamodel prisma/schema.prisma \
     --script > prisma/migrations/<ts>_baseline/migration.sql
   ```
2. Mark it as already applied (the tables already exist in Neon):
   ```
   npx prisma migrate resolve --applied <ts>_baseline
   ```
3. From then on, every schema change goes through `npx prisma migrate dev --name <description>`.

## Conventions going forward

- One migration per logical feature (e.g. `add_league_lifecycle`, `add_team_registration`).
- Never edit an applied migration SQL file.
- Production migrations will run via `prisma migrate deploy` on Vercel, wired into the build pipeline in M9a per the build spec.
- Name migrations imperatively: `add_*`, `rename_*`, `drop_*`, `backfill_*`.
