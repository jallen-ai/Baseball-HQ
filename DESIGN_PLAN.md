# Baseball HQ: design enhancement plan + sprint

Companion to the working prototype in [`/v2`](v2/). The prototype implements the
P0 items below so you and Kurt can compare it side by side with the current app.

- Current app: https://jallen-ai.github.io/Baseball-HQ/
- Redesign prototype: https://jallen-ai.github.io/Baseball-HQ/v2/

Both run on the same Supabase backend, so a kid sees the same data in either shell.

## The core diagnosis
The app today is a marketing landing page welded onto a daily tool. The full-screen
hero, the parent-facing value paragraph, and a flat menu of 5 modes plus up to 8
sub-tabs all render before the kid reaches the one thing they came to do. The fix is
not more polish, it is fewer decisions: lead with the daily action, collapse
navigation, and separate the parent surface from the kid surface.

## Prioritized enhancements

### P0 — ship first (all built in the prototype)
| # | Enhancement | Why | Effort |
|---|-------------|-----|--------|
| 1 | **Open straight to "Today"** with the mission and one gold CTA as the first thing on screen | Kills the "kids do not know what to do" problem in one move. The action is now above the fold on mobile | M |
| 2 | **Collapse navigation to 3 destinations (Today / Me / Team)** with a fixed bottom tab bar | Removes ~19 targets and the hidden horizontal scroll. Matches how kids use phone apps | M |
| 3 | **Remove the repeating hero;** replace with a slim persistent header (brand + level + XP + streak) | Reclaims a full screen of vertical space on every view | S |
| 4 | **Move parent tools behind the code** (gear icon in the header) | Parent settings, bonus XP, and reset no longer sit in the kid's main path | S |
| 5 | **Demote Arcade** from a top-level peer to a reward reached from Today | Reinforces that workouts, not games, are the main path | S |

### P1 — next
| # | Enhancement | Why | Effort |
|---|-------------|-----|--------|
| 6 | **Reserve the loudest visual treatment for the daily CTA only**; quiet nav and secondary cards | Creates real hierarchy so the one button that matters stands out | M |
| 7 | **Rewrite in-app copy for the youngest reader** (short, verb-first). Parent spec-sheet language lives in the parent zone | The first text a kid hits should not be written for adults | S |
| 8 | **Group "Me" into 4 clear sections** (Player Card / Rewards / Progress / Challenges) instead of 8 flat tabs | Everything about "how am I doing" in one predictable place | M |
| 9 | **Onboarding coach-mark on first run:** point at today's mission and the Complete button | Teaches the loop without a manual | S |

### P2 — later
| # | Enhancement | Why | Effort |
|---|-------------|-----|--------|
| 10 | Mission completion animation + pack-open moment as the emotional payoff | The dopamine beat that keeps kids coming back | M |
| 11 | Accessibility pass: contrast on gold-on-cream and gray labels, min 44px touch targets | Compliance and readability for the youngest users | M |
| 12 | Fix the layered hero text-shadow that garbles at narrow widths (now removed in v2) | Visual bug on the current app | S |

## Sprint plan: "Lead With The Action"

**Dates:** 2 weeks (solo/part-time). **Goal in one sentence:** *A kid opening Baseball HQ
lands on today's mission and can complete it without scrolling past anything, on a phone.*

Assumes ~18 focused hrs, planned to 75% (~27 hrs). Most P0 is already prototyped, so this
sprint is about hardening it into the primary experience and starting P1.

| Priority | Item | Est. | Notes |
|----------|------|------|-------|
| P0 | Promote the `/v2` shell to the primary experience; retire the hero + choose-your-path home | 3 hrs | Prototype exists; make it the default |
| P0 | Bottom tab bar Today/Me/Team hardened (active states, deep-link, back behavior) | 3 hrs | |
| P0 | Parent zone gated behind the code from the gear; verify no kid path exposes it | 2 hrs | |
| P0 | Arcade reached from Today, capped-XP messaging intact | 1 hr | |
| P1 | Visual hierarchy pass: one loud CTA, quieter everything-else | 4 hrs | |
| P1 | Copy rewrite for kid reading level across Today/Me | 3 hrs | |
| P1 | First-run coach-mark on the mission + Complete button | 3 hrs | |
| P2 (stretch) | Mission-complete animation + pack reveal | 4 hrs | Cut first if time runs short |

**Definition of done:** on a phone, the mission and its button are on screen with no
scroll; nav is 3 targets; parent tools are unreachable without the code; no console
errors; Kurt signs off comparing v2 against the current app.

**Risks:** (1) scope creep back toward "show everything" — hold the line on 3 destinations.
(2) Kid-testing gap — validate with 2 or 3 actual kids before calling it done, the whole
point is their comprehension, not ours.

## What the prototype does and does not do
- **Does:** real Today/Me/Team IA, slim header, parent behind the code, Arcade demoted,
  same live backend and data as the current app, the profile-image mobile bug fixed.
- **Does not yet:** the P1/P2 polish (copy rewrite, hierarchy pass, coach-mark, completion
  animation). It is a structural prototype for the side-by-side, not final art.
