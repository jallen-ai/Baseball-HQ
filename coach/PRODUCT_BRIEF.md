# Coach HQ: product brief and prototype scope

Companion to the working prototype in this folder. Built as an expansion of Level Up
Athletics (the kid-facing gamified training app) for the coach side of the same team.

## The problem in one paragraph

The coach decides whether a kid loves or quits the sport, and most youth coaches are
volunteer parents who have never been taught how to coach. They know the game well enough.
What they do not know is what a 9-year-old can realistically do, how to run a practice
that is not one long line, how to talk to the kid who shuts down after an error, and how
to make a team of eleven different personalities feel like each of them is getting better.
The information exists (Positive Coaching Alliance, Little League's coach resources,
YouTube) but it is generic, long, and disconnected from *this* roster on *this* Tuesday.

## Who has this problem

| Persona | Situation | What they do today |
|---|---|---|
| **The eager parent coach** (primary) | Volunteered because nobody else would. Knows baseball, has never coached. 2 practices a week, 60-90 min each. | Googles "9U baseball practice plan" on the drive over. Runs batting practice with one hitter and ten kids standing around. |
| **The experienced coach** | Coached for years, mostly by feel. Wants to individualize but has no system. | Keeps notes in Notes app. Treats every kid the same because it is easier. |
| **The kid** | Wants to get better at *something specific* and wants practice to be fun. Rarely asked. | Says "I don't know" when asked what they want to work on. |
| **The parent (non-coach)** | Wants to know what their kid is working on and how to help at home. | Texts the coach. Gets nothing back or a group text. |

## Jobs to be done

- When I am planning tomorrow's practice, I want a plan matched to my kids' ages and
  what they actually need, so nobody stands in a line and everyone leaves better.
- When I am about to talk to a kid who just struck out, I want to know how *this* kid
  is best motivated, so I do not make it worse.
- When a parent asks what their kid should work on, I want to hand them something
  personal and concrete, so they trust me and help at home.
- When I am filling out a lineup, I want fair playing time and positions that make
  sense, so no parent corners me after the game.
- When my kid signs up for a team, I want the coach to know what they are working on
  and what makes them tick, so the season is not one-size-fits-all.

## The theory we are testing

Coaches are the highest-leverage point in a kid's sports experience. If we can raise the
floor of coaching quality with tooling (not certification courses), kids stay in the
sport longer and the Level Up loop (train, level up, get called up) closes: what the
kid grinds on at home is what the coach works on at practice.

### Riskiest assumptions, in order

1. **Coaches will do 10 minutes of setup** (roster, age group) to get a plan. If they will
   not, nothing else matters. Cheapest test: hand this prototype to 3 volunteer coaches
   and watch whether they reach a generated practice plan without help.
2. **Kids and parents will fill out the intake.** The personalization depends on it.
   Test: send the intake link to one real team and measure completion in 48 hours.
3. **Generated plans are good enough to run as-is.** A plan that needs heavy editing
   will get abandoned. Test: coach runs one generated plan and rates it afterward.
4. **Motivation style is a real, useful signal** and not a label that pigeonholes kids.
   Test: ask coaches after two weeks whether it changed how they talked to a kid.

## MVP: what the prototype implements

Prioritized. P0 is in the prototype and working. P1 is designed and partially present.
P2 is roadmap.

### P0: the loop that has to work

| # | Feature | Why it is P0 | Status |
|---|---|---|---|
| 0 | **Coach onboarding**: age group, team level, coaching experience, top worries. Produces a personal game plan (age ceiling, level advice, first practice, one action per worry) and a call-up path that tracks the coaching behaviors we want | The job to be done is making the coach better. Advice has to be specific to who they coach, and progress has to be visible or the coach never comes back | Built |
| 1 | **Team and roster** with age group and season length | Everything else keys off age group and roster size | Built |
| 2 | **Player profiles** (strengths, growth areas, goal, motivation style, positions, what makes it fun) | The personalization signal. Without it this is a generic drill site | Built |
| 3 | **Player and parent intake** (the kid-facing form that fills the profile) | Kids should author their own goals. Doubles as the first communication touch | Built |
| 4 | **Practice planner**: age-matched, station-based plan generated from the roster's growth areas, editable, printable | The most frequent job. This is the weekly hook | Built |
| 5 | **Personalized development plan per kid** with 3 focus drills, coaching approach, and home missions that feed Level Up XP | The thing a parent can be handed. Closes the loop with the kid app | Built |
| 6 | **Age group guide**: what kids can and cannot do at this age, practice shape, what to tell parents | Corrects the biggest mistake volunteer coaches make: adult expectations on kids | Built |
| 7 | **Game day lineup**: fair rotation across innings honoring preferred and avoided positions | "Maximize the roster." Removes the parent conflict nobody wants | Built |

### P1: makes it a habit

| # | Feature | Why | Status |
|---|---|---|---|
| 8 | **Coach playbook**: short, situational lessons (the kid who melts down, quiet kids, praise ratio, running a huddle) | Just-in-time learning beats a course | Built (12 cards) |
| 8b | **Skill demo, throwing mechanics**: an animated four-checkpoint breakdown drawn in-app (grip, T, step, finish) with the cue, common mistake, and what to say for each, plus real video | A coach has to see it, not read it. The animation works everywhere, including where video embeds are blocked; the video is the real thing | Built for throwing; other skills follow the same pattern |
| 9 | **Team feed**: announcements, share the practice plan and each kid's plan with parents | The communication tool. Keeps parents inside the loop | Built (local, simulated replies) |
| 10 | **AI assistant** grounded in the roster: ask a coaching question, rewrite a plan in your voice, get a per-kid approach | Personalized learning at scale. Rules engine is the fallback so the product never depends on it | Built where the viewer's Claude account allows it; hidden otherwise |
| 11 | **Pre-practice brief**: a one-screen "who to watch and what to say" card for each session | Turns profiles into on-field behavior | Partial (inside each practice block) |
| 12 | **Coach awards into Level Up XP** from the coach app | The reward loop already exists in the kid app; the coach should trigger it from the plan | Roadmap |

### P2: the platform

- Season arc: plan a 10-week progression, not one practice at a time.
- Drill video library and a coach-contributed drill exchange.
- In-game tracking that is light enough for a parent to keep (at bats, pitches, innings played).
- Progress check-ins: kid re-rates strengths and growth areas every 3 weeks, plan updates.
- Multi-sport: soccer, basketball, softball with the same taxonomy and generators.
- League admin view: coach quality signals across a league, onboarding for new coaches.
- Coach certification track: short modules that unlock playbook badges (gamify the coach too).
- Real backend: the prototype keeps state in the browser. Production uses the existing
  Supabase project with a `teams` to `players` to `plans` model and RLS by team.

## Video sources used in the demo

Verified on YouTube on 2026-09-20. All three are linked from the throwing demo; the first
is embedded when the app is served from its own folder.

- How to Teach Young Kids to Throw, Step by Step, by Coach Dan Blewett: https://www.youtube.com/watch?v=R0A_qFdt5jY
- Baseball Factory Coaching Tip 02: Throwing Mechanics: https://www.youtube.com/watch?v=MDzvD-3neaU
- Youth Baseball Essentials: Simple Throwing Progressions, by Dominate The Diamond: https://www.youtube.com/watch?v=LtzwCrthlTY

For production, either license or produce original clips. The animated breakdown is
original and can be extended to every skill in the taxonomy.

## What was deliberately left out of the prototype

- Authentication and multi-device sync. Local state with a reset is enough for feedback.
- Scheduling and calendar. Every league already has TeamSnap or GameChanger for this.
- Chat. The feed is one-way announcements plus a simulated reply, on purpose.
- Anything that requires a real drill video.

## Questions to ask whoever gives feedback tonight

1. Open the app cold. Can you get to a practice plan without being told how?
2. Would you run the generated plan as-is? What would you change first?
3. Look at one kid's plan. Would you hand it to that kid's parent?
4. Does the "how they like to be coached" signal feel useful or like a label?
5. What is missing that would make you open this before every practice?

## Data model (prototype)

```
team      { id, name, ageGroup, season, practiceMinutes, coachName, coaches }
player    { id, name, number, age, strengths[3], growth[3], goal, motivation,
            prefer[], avoid[], fun[], parentNote, intakeDone }
skill     { id, label, group }                 taxonomy shared with the kid app
drill     { id, name, skills[], ages[min,max], minutes, setup, cues[], twist,
            push, gentle }
ageGuide  { id, label, ages, attention, session, canDo[], notYet[], shape[],
            parents[], donts[], oneThing }
practice  { id, date, minutes, focus[], blocks[{ title, minutes, drill, cues,
            watch[] }] }
lineup    { innings, grid[playerId][inning] = position, batting[] }
post      { id, from, role, when, text, attachment }
```
