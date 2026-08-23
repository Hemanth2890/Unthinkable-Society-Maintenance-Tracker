# Society Maintenance Tracker

A role-based maintenance complaint tracker for apartment societies, built with
Next.js 14 (App Router), Prisma, NextAuth, and Tailwind/shadcn-style components.

Residents raise complaints with photos and track full status history. Admins
manage priority and status through a clear workflow, see overdue complaints
surfaced automatically, post pinned notices, and view a dashboard summary.
Residents get emailed on status changes and important notices.

## Tech Stack
- Next.js 14 (App Router, Server Actions)
- TypeScript (strict)
- PostgreSQL + Prisma ORM
- NextAuth.js (credentials provider, role-based: ADMIN / RESIDENT)
- Tailwind CSS + shadcn-style components + Lucide icons
- Resend (email notifications)
- Cloudinary (photo uploads — mocked locally if env vars are absent)

## Project Structure

```
app/
  api/
    auth/[...nextauth]/route.ts   NextAuth handler
    register/route.ts             Resident self-registration
    complaints/route.ts           GET (list+filter) / POST (create)
    complaints/[id]/route.ts      GET single complaint detail
    notices/route.ts              GET notice board
  actions/
    complaint.ts                  Server actions: updateComplaint, createNotice
  (dashboard)/
    layout.tsx                    Shared authenticated shell + sign-out
    admin/page.tsx                Admin dashboard
    resident/page.tsx             Resident dashboard
  login/page.tsx
  register/page.tsx
  redirect/page.tsx               Post-login role router
components/
  complaint/                      StatusTimeline, NewComplaintForm, filters, admin row
  NoticeBoard.tsx, NoticeComposer.tsx, SignOutButton.tsx
  ui/                             Minimal shadcn-style primitives
lib/
  auth.ts, prisma.ts, overdue.ts, email.ts, upload.ts, utils.ts
prisma/
  schema.prisma, seed.ts
```

## Setup

1. Install dependencies
   ```bash
   npm install
   ```

2. Copy environment variables and fill in your own values
   ```bash
   cp .env.example .env
   ```
   At minimum set `DATABASE_URL` and `NEXTAUTH_SECRET`
   (`openssl rand -base64 32`). `RESEND_API_KEY` and Cloudinary vars can be
   left blank in development — emails will log to console and photo
   uploads will use a mock local path.

3. Push schema and seed demo data
   ```bash
   npx prisma migrate dev --name init
   npx prisma db seed
   ```
   This creates:
   - Admin: `admin@society.app` / `password123`
   - Resident: `resident@society.app` / `password123`
   - Resident 2: `resident2@society.app` / `password123`
   - One sample complaint and two sample notices.

4. Run locally
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000` — you'll be redirected to `/login`.

## Deployment (Vercel)

1. Push the repo to GitHub.
2. Import into Vercel.
3. Provision a Postgres database (Neon, Supabase, or Railway all have free
   tiers) and set `DATABASE_URL` in Vercel's Environment Variables.
4. Set `NEXTAUTH_URL` to your deployed URL, `NEXTAUTH_SECRET`, and
   `RESEND_API_KEY` / `EMAIL_FROM`.
5. Run `npx prisma migrate deploy` against the production database (via a
   one-off Vercel build command or locally with the production
   `DATABASE_URL`) before first use.

## Database Schema

| Model              | Purpose                                                               |
|---------------------|------------------------------------------------------------------------|
| `User`               | Residents and admins, role-tagged, optional flat number             |
| `Complaint`          | Live state: category, description, photo, status, priority, isClosed |
| `ComplaintHistory`   | Append-only audit log: every status/priority change, actor, note, timestamp |
| `Notice`             | Notice board entries, `isImportant` flag for pinning                 |

Relations:
- `User 1—N Complaint` (as resident, via `residentId`)
- `User 1—N ComplaintHistory` (as actor, via `actorId`)
- `Complaint 1—N ComplaintHistory` (cascade delete)
- `User 1—N Notice` (as author, via `authorId`)

Indexes on `Complaint.status`, `Complaint.category`, `Complaint.createdAt`,
`ComplaintHistory.complaintId`, and `Notice(isImportant, createdAt)` support
the primary filter and sort paths used by the admin dashboard and notice
board.

## API Overview

| Route                              | Method | Auth      | Description |
|-------------------------------------|--------|-----------|--------------|
| `/api/register`                     | POST   | Public    | Create a RESIDENT account: `{ name, email, password, flatNumber? }` |
| `/api/auth/[...nextauth]`           | GET/POST | Public  | NextAuth credentials sign-in/session |
| `/api/complaints`                   | GET    | Any       | List complaints. Residents see only their own. Query params: `status`, `category`, `from`, `to` |
| `/api/complaints`                   | POST   | Resident  | Create a complaint. `multipart/form-data`: `category`, `description`, `photo?` |
| `/api/complaints/:id`               | GET    | Any       | Full complaint detail with ordered history. Residents restricted to own complaint |
| `/api/notices`                      | GET    | Any       | List notices, pinned (`isImportant`) first, then newest first |
| Server Action `updateComplaint`     | —      | Admin     | `{ complaintId, status?, priority?, note? }`. Writes history row in the same transaction as the status/priority update; rejects further edits once `RESOLVED`; emails resident on status change |
| Server Action `createNotice`        | —      | Admin     | `{ title, body, isImportant }`. Emails all residents if `isImportant` |

## Overdue Threshold

Configured via `OVERDUE_THRESHOLD_DAYS` (default `3`). Computed dynamically
at read time in `lib/overdue.ts` — never stored as a column — so changing
the threshold takes effect immediately with no backfill. See
`SYSTEM_DESIGN.md` for the full rationale.

## Notes on Mocked Integrations

- **Photo upload**: `lib/upload.ts` calls Cloudinary's unsigned upload API
  when `CLOUDINARY_URL` is set; otherwise it returns a deterministic mock
  path so the full create-complaint flow works end-to-end locally without
  external credentials.
- **Email**: `lib/email.ts` wraps Resend. If `RESEND_API_KEY` is unset, the
  Resend SDK call will fail and is caught — logged to console, never
  blocking the underlying database transaction.
