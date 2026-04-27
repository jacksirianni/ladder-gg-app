# Production dry-run checklist

Last updated: 2026-04-24

Use this before inviting real friends to run a real league on
`https://ladder-gg-app.vercel.app`. Work through it once with at least one
trusted tester in addition to yourself. Report any failures back to
the project before shipping the link to a wider audience.

---

## 0. Environment

- [ ] Production deploy is on the latest commit on `main`. Check Vercel dashboard.
- [ ] Vercel env vars present: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `AUTH_SECRET`, `AUTH_URL` (set to the production URL).
- [ ] Neon database is reachable. Visit production, sign in, see no 500 errors.
- [ ] Custom domain (if any) resolves correctly. If not yet using one, the `*.vercel.app` URL is the public URL.

## 1. Public-facing surfaces (signed out)

- [ ] `/` renders without errors. Hero copy says "Run your gaming league end-to-end."
- [ ] No copy mentions "buy-in", "rake", "wager", "escrow", or "LADDER pays winners" anywhere on the landing page.
- [ ] Header shows "Sign in" and "Sign up" links.
- [ ] Footer has working `/legal/terms` and `/legal/privacy` links.
- [ ] `/legal/terms` loads, last-updated date is current, copy is consistent with the no-money-handling model.
- [ ] `/legal/privacy` loads, copy reflects what's actually collected (no analytics, no payments, etc.).
- [ ] `/dev/components` is reachable but is fine to keep public during early access (it's a design system showcase).
- [ ] Browser tab shows the violet "L" favicon.
- [ ] View page source on `/` and confirm meta tags: `<title>`, `<meta name="description">`, `og:title`, `og:description`.
- [ ] Visit a non-existent route like `/foo`. The 404 page renders with "Page not found." and a link home.

## 2. Auth

- [ ] `/signup` rejects an empty form, missing fields, weak passwords, missing 18+ checkbox, missing Terms checkbox — each shows an inline error.
- [ ] Successful signup with a fresh email → redirected to `/dashboard`.
- [ ] Header now shows the avatar (initials) and Sign out.
- [ ] `/account` shows email and display name from the signup form.
- [ ] Change password: wrong current password rejected, mismatched confirm rejected, valid change succeeds. Sign out and back in with the new password.
- [ ] `/signin` with wrong credentials shows "Invalid email or password."
- [ ] `/signin` with a duplicate-email signup attempt shows the field error on email.
- [ ] Avatar in the header links to `/account`.

## 3. League lifecycle (organizer)

- [ ] Create a free league (entry fee 0) with `teamSize=1`, `maxTeams=4`, payout preset Winner takes all. Add payment instructions and prize notes.
- [ ] After creation, you are on `/leagues/<slug>/manage`. State badge shows DRAFT.
- [ ] Cards show team size, max teams, entry fee, prize split. Payment instructions and prize notes both render.
- [ ] Click Publish. State flips to OPEN.
- [ ] Invite link box renders. Copy button shows "Copied!" briefly.
- [ ] Public page at `/leagues/<slug>` renders. State badge OPEN. Overview shows entry fee with "Organizer-managed" footer. Prize split says "Winner takes all". Prize notes and payment instructions render publicly.
- [ ] DRAFT public page (before publish) returns 404 — confirmed by trying it in incognito before publish.

## 4. Team registration (captain)

- [ ] In incognito or another browser, sign up as Captain B with a different email.
- [ ] Visit the invite link copied earlier. Form renders with team-name input. Captain shown as "you".
- [ ] Submit a team name. Land on the `/join/success` page. Team is PENDING. The success page shows the entry fee and a copy of the payment instructions.
- [ ] Visit `/leagues/<slug>` Teams tab. The team appears. The payment badge is **not** visible to other visitors (sign out in another tab to confirm).
- [ ] As Captain B, the payment badge IS visible on your own team's card.
- [ ] Try to register again with the same Captain B account. You're redirected to `/leagues/<slug>` (already have a team).
- [ ] Tamper with the `?token=` in the URL → 404.
- [ ] Visit `/leagues/<slug>` while signed out. No payment data is visible anywhere.

## 5. Payment status (organizer)

- [ ] As organizer on `/manage`, flip Captain B's team status PENDING → PAID. Tally updates ("1 paid · $0.00 collected" since fee is 0).
- [ ] Try other transitions: PAID → REFUNDED, REFUNDED → WAIVED, WAIVED → PENDING. All work.
- [ ] Register a second captain (Captain C). Mark them PAID or WAIVED.

## 6. Bracket and matches

- [ ] With 2+ teams marked PAID or WAIVED, "Start league (N teams)" button appears. Click it.
- [ ] State flips to IN_PROGRESS. Bracket appears on the public Overview tab.
- [ ] Matches tab lists the generated matches. R1 matches with both teams set show status "Awaiting result".
- [ ] As Captain B, click "Report result" on the relevant match. Modal opens with winner select.
- [ ] Submit a winner with optional score "3-1". Match flips to "Needs confirmation".
- [ ] As Captain C (the other captain in that match), open the match modal. See the report. Click Confirm result. Match flips to "Final" and the winner advances to the next round.
- [ ] If this was the final, league flips to COMPLETED and the winner callout renders at the top of the public page.

## 7. Disputes

- [ ] Set up a fresh in-progress league or use a remaining match in your current one. Have Captain X report a result.
- [ ] As Captain Y (the other captain), open the modal. Click **Dispute** instead of Confirm. Match flips to "Disputed".
- [ ] As organizer on `/manage`, the new "Disputes" section appears with the disputed match listed, including who reported and what.
- [ ] Pick a winner from the dropdown (could be the originally-reported team or the other one). Click Resolve. Match flips to ORGANIZER_DECIDED. Bracket advances. Modal shows "(resolved by organizer)" suffix.

## 8. Edge cases

- [ ] Cancel a DRAFT league. State flips to CANCELLED. Public page returns 404.
- [ ] Cancel an OPEN league. Same.
- [ ] Try to access another user's `/leagues/<slug>/manage` while signed in as a different user. 404.
- [ ] Try to access `/dashboard`, `/account`, `/leagues/new`, or `/leagues/<slug>/join` while signed out. Redirects to `/signin`.
- [ ] Resize window to narrow mobile width. Bracket should horizontal-scroll. Forms should stack vertically. No layout breaks.

## 9. Loading and error UX

- [ ] On a slow network throttle (DevTools), navigate to `/dashboard`, `/leagues/<slug>`, `/leagues/<slug>/manage`. Skeleton shows briefly during load.
- [ ] Trigger an error (e.g., temporarily break the database connection or visit a malformed URL). The error boundary renders with "Something went wrong" and a "Try again" button. The Try again button retries.

## 10. Sign-out and session expiry

- [ ] Sign out from the header. Cookie cleared. Refresh `/dashboard` → redirected to `/signin`.
- [ ] Sign in again with the same credentials. Land on `/dashboard`.

## 11. Mobile and a11y quick check

- [ ] On mobile (real device or DevTools mobile preset), all primary flows work: signup, signin, create league, register team, report match.
- [ ] Tab through any form (signup, signin, join, create league, change password, match modal). Every focusable element has a visible violet focus ring.
- [ ] Buttons and links have descriptive text. Avatar in header has `aria-label="Account"`.

## 12. Final go/no-go

- [ ] All boxes above checked.
- [ ] No console errors on any page (open DevTools Console while clicking through).
- [ ] No Vercel runtime errors in the deployment logs from the past hour.

If yes to all: ready to share the URL with friends.

If no: file a bug, fix, redeploy, repeat the relevant section.
