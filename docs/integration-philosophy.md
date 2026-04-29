# Integration philosophy

LADDER's contract with its users for any current or future external-data
integration. This document is normative — when in doubt, the rules below
override product instincts.

---

## The six rules

These hold across every integration we'll ever build.

1. **Manual confirm/dispute is always sufficient to resolve a match.**
   No external system can block a captain from confirming.

2. **No auto-confirmation, ever.**
   Even with a perfect API match, the human still clicks Confirm.

3. **No scraping in production.**
   We may use scraping in research to evaluate viability of a future
   official integration, but never to power a feature.

4. **Integrations are additive.**
   If Tracker.gg goes down, every existing flow keeps working.

5. **Evidence is content, not credential.**
   A captain submitting a Tracker URL is asserting "this is the match";
   we display it, we don't authenticate the assertion.

6. **No required game-account login.**
   Captains can play on LADDER without ever linking an external account.

---

## Where each rule lives in the codebase

- **Rule 1 / 2** — `app/leagues/[slug]/actions.ts` (`confirmMatchAction`,
  `disputeMatchAction`) and `app/leagues/[slug]/manage/actions.ts`
  (`resolveDisputeAction`). These never call external systems.

- **Rule 3** — there's no scraping code anywhere. New integrations must
  go through documented APIs only. If you find yourself parsing HTML
  from a third-party site, stop.

- **Rule 4** — `MatchEvidence` and `UserExternalProfile` are both
  display-only models. Neither has any background fetch logic, cron, or
  external dependency. Removing all of them would not break the core
  match flow.

- **Rule 5** — `lib/league-access.ts` and `lib/match-format.ts` make
  decisions only from internal data. Evidence is rendered in the UI but
  never fed into access checks, validation, or winner derivation.

- **Rule 6** — `User` has no required external-platform fields. The
  signup flow doesn't ask for any game account.

---

## Evidence model

Anyone involved in a match (reporter, disputer, organizer) can attach
evidence:

- **SCREENSHOT** — URL to image-hosted scoreboard
- **VOD_LINK** — YouTube / Twitch / similar
- **REPLAY_CODE** — game-internal replay ID (Overwatch, Smash, RL, etc.)
- **MATCH_LINK** — Tracker.gg / OP.gg / Blitz / similar aggregator URL
- **PROFILE_LINK** — same but for a player profile, not a match
- **NOTE** — free-form text

Cap of 6 per match per submitter (enforced server-side at action layer).

External URLs render as links with `rel="noopener noreferrer nofollow"`
and `target="_blank"`. Never embedded as `<img>` or `<iframe>`. Never
fetched server-side.

---

## External profiles

A user can list one entry per platform (BattleTag, Tracker.gg, Steam,
Riot ID, Epic, Xbox, PSN, Nintendo, Other). Stored as either an
`identifier` (BattleTag-style) or a `url`, plus an optional `label`.

Display only. We never call any platform's API to verify the entry
resolves to a real account.

---

## Game support snapshot (v1.7)

Match format defaults are encoded in `lib/match-format.ts` under
`GAME_PRESETS`. The chip clicks on the create-league form hydrate
`matchFormat`, `rules`, and `mapPool`.

| Game | Match format | API path today |
|---|---|---|
| Overwatch 2 | BO3 | none viable (no public OW match API) |
| Super Smash Bros Ultimate | BO3 | none |
| Rocket League | BO5 | Psyonix API exists, gated |
| Valorant | BO3 | Riot RSO required for useful data |
| CS2 | BO3 | Steam Web API has limited data |
| League of Legends | BO3 | Riot API |
| FIFA / 2K / Madden / NHL | SINGLE_SCORE | none |
| Mario Kart 8 Deluxe | FREEFORM | none |
| Fortnite | FREEFORM | Epic API gated |
| Call of Duty | BO5 | none |

The takeaway: **most games we support have no realistic API path**.
v1.7's evidence system is the real answer for these — not a placeholder
for a future API.

---

## Future API integration ladder

```
v1.7   evidence system (no API)              ← shipped
v1.8   improved upload UX (Vercel Blob for screenshots)
v1.9   selective per-game enrichment via approved API keys
v2.x   tournament-tier integrations (Riot RSO, etc.)
```

Each step requires:
- explicit approval from the maintainer
- ToS review
- fallback path if API is down (rule 4)
- opt-in per league or per user (rule 6)
- never auto-confirm (rule 2)

---

## Things we will never build

- Scraping of any third-party site in production
- Auto-confirmation based on third-party data
- Cheat detection / suspicious-activity flags from external stats
- Embedded `<iframe>` or `<img>` of external content
- Required game-account OAuth
- Real-time stats sync
- "Verified" badges without an actual verification source
- Auto-corroboration that overrides manual flow
