# System Design — Society Maintenance Tracker

## 1. Complaint History Data Model

The lifecycle is modeled with two tables: `Complaint` (current, mutable
state) and `ComplaintHistory` (append-only audit log). `Complaint` holds
exactly the fields needed for filtering and display today — `status`,
`priority`, `isClosed`, `resolvedAt`. `ComplaintHistory` is a separate,
insert-only table where each row is a snapshot: the status and priority
*at that point*, an optional note, the actor's user ID, and a timestamp.

This split matters for two reasons. First, querying "all open complaints"
or "complaints by category" stays a single indexed lookup on `Complaint`
rather than a window-function query over history. Second, the audit trail
is immutable by construction — history rows are never updated or deleted,
only appended, so the resident-facing timeline and any future compliance
export are simply `ORDER BY createdAt ASC` over `ComplaintHistory WHERE
complaintId = ?`.

Every mutation to a complaint's status or priority happens inside a single
`prisma.$transaction`: the `Complaint.update` and the corresponding
`ComplaintHistory.create` commit together or not at all. This guarantees
the invariant that the latest history row's `status`/`priority` always
matches the live `Complaint` row — there is no window where one has
advanced and the other hasn't, even under concurrent admin requests or a
mid-request crash. The very first history row ("Complaint raised") is
created in the same transaction as complaint creation, so a complaint can
never exist without at least one history entry.

Once `status` transitions to `RESOLVED`, `isClosed` is set `true` in the
same update. All further mutation attempts on that complaint are rejected
server-side (checked at the top of `updateComplaint`) rather than merely
hidden in the UI, so the lock can't be bypassed by a direct API call.

## 2. Overdue Detection

Overdue status is a **derived**, not stored, property. `lib/overdue.ts`
exports `isOverdue(complaint, thresholdDays)`, which compares
`Date.now() - complaint.createdAt` against `OVERDUE_THRESHOLD_DAYS`
(env-configurable, defaulting to 3) and returns `false` immediately if the
complaint is already `RESOLVED`.

This was a deliberate choice over a cron job that flips an `isOverdue`
boolean column. A stored flag requires a scheduler, introduces staleness
between cron runs, and creates a second source of truth that can drift
from the actual age of the complaint (e.g., if the threshold config
changes, every existing row would need a backfill). Computing it at
read-time means changing `OVERDUE_THRESHOLD_DAYS` takes effect instantly
across the whole system with zero migration, and there's never a
stale-flag bug to debug. The tradeoff — a small amount of per-request
computation — is negligible at society scale (dozens to low hundreds of
open complaints), and the admin dashboard query already fetches
`createdAt` and `status` as part of the normal list query, so no extra
DB round-trip is needed.

`sortForAdminView` layers on top: overdue complaints are bucketed first,
then sorted by priority (HIGH → LOW), then by recency — so the admin's
highest-risk items are always at the top without a separate "overdue"
view or duplicated query logic.

## 3. Photo Handling

Photo upload is abstracted behind `lib/upload.ts::uploadComplaintPhoto`,
which the `POST /api/complaints` route calls with the raw `File` from a
`multipart/form-data` submission. In production, this forwards the file to
Cloudinary's unsigned upload endpoint using an upload preset (credentials
never touch the client — the preset restricts what can be uploaded) and
returns the resulting `secure_url`, which is stored as a plain string on
`Complaint.photoUrl`. Locally, or when Cloudinary env vars are absent, the
same function returns a deterministic mock path so the full flow (form →
API → DB → display) can be exercised without external dependencies.

Storing only the resulting URL (not binary data) keeps `Complaint` rows
small and lets the DB stay purely relational — the image itself lives on
a CDN designed for that purpose, and the app never needs to stream binary
data through its own server.

## 4. Notification Flow

Two triggers fire notifications, both via a thin `lib/email.ts` wrapper
around Resend:

1. **Status change** — inside `updateComplaint`, after the DB transaction
   commits successfully, if `status` actually changed, `sendStatusChangeEmail`
   is called with the resident's email, the new status, and any admin note.
2. **Important notice** — inside `createNotice`, if `isImportant` is true,
   all resident emails are fetched and `sendImportantNoticeEmail` is
   called once with the full recipient list (not one call per resident,
   to stay within provider batch limits and reduce latency).

Both senders wrap their Resend call in a `try/catch` that only logs on
failure — email delivery is treated as best-effort and must never roll
back or block the underlying database transaction, since the complaint
update or notice creation is the source of truth regardless of whether
the email succeeds.
