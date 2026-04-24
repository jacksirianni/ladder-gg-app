# Prisma migrations

## Initial `User` table (M0, synced via `db push`)

The `User` table was synced to Neon via `npx prisma db push`, not `prisma migrate dev --name init`.

**Why:** repeated `prisma migrate dev` attempts hung silently on macOS because the project was living on an iCloud-synced Desktop folder. iCloud's sync daemon intercepted Prisma's schema-engine IPC and prevented the command from completing. Once Desktop was detached from iCloud Drive, `prisma db push` completed instantly and reported that the schema was already in sync (one of the earlier hung attempts had actually written the table before stalling on the report step).

We chose not to reset Neon just to generate a cosmetic `init` migration file, since the `User` table held no data worth preserving either way.

## Migration history begins in M2

The first versioned migration will be created in **M2 Auth**, when we add NextAuth adapter tables (`Account`, `Session`, `VerificationToken`) and any extensions to `User`.

At that point we'll baseline the existing `User` table so Prisma doesn't try to recreate it. Two reasonable options:

- `prisma migrate diff` → produce a single SQL file capturing the current schema, then `prisma migrate resolve --applied <migration_name>` to mark it applied without re-running.
- Run `prisma migrate dev --name add_auth_tables` and respond to its interactive baseline prompt.

Pick whichever Prisma's docs recommend at that point. Either yields the same end state.

## Conventions going forward

- One migration per logical feature (e.g. `add_auth_tables`, `add_league_lifecycle`, `add_team_registration`).
- Never edit an applied migration SQL file.
- Production migrations will run via `prisma migrate deploy` on Vercel, wired into the build pipeline in M9a per the build spec.
- Name migrations imperatively: `add_*`, `rename_*`, `drop_*`, `backfill_*`.
