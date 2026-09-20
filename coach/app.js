/* Coach HQ prototype. Vanilla JS, single state object, re-render on change. */
(function () {
  const D = window.COACH_DATA;
  const STORE_KEY = "coachhq.v2";
  const $ = (sel, root) => (root || document).querySelector(sel);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const skill = (id) => D.SKILLS.find((s) => s.id === id) || { id, label: id, group: "" };
  const label = (id) => skill(id).label;
  const uid = () => Math.random().toString(36).slice(2, 9);
  const clone = (o) => JSON.parse(JSON.stringify(o));

  /* ---------- State ---------- */
  function freshState() {
    return {
      team: Object.assign({ mode: "inseason" }, clone(D.TEAM)),
      players: clone(D.PLAYERS).map(normalizePlayer),
      posts: clone(D.POSTS),
      practice: null,
      lineup: null,
      role: "coach",
      view: "home",
      activePlayer: null,
      learnTab: "age",
      guideId: D.TEAM.ageGroup,
      drillFilter: "",
      playerEditing: false,
      welcomed: false,
      coach: freshCoach(),
    };
  }
  function freshCoach() {
    return { onboarded: false, name: "", ageGroup: D.TEAM.ageGroup, teamLevel: "rec_mixed", experience: "first", worries: [], progress: {}, cardsRead: [] };
  }
  function normalizePlayer(p) {
    return Object.assign({ offseasonFocus: [], coachNote: "", log: {}, xp: 0 }, p);
  }
  let S = load() || freshState();
  S.players = S.players.map(normalizePlayer);
  S.coach = Object.assign(freshCoach(), S.coach || {});
  if (!S.practice) S.practice = generatePractice({});
  if (!S.lineup) S.lineup = generateLineup();

  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { /* storage may be unavailable */ } }
  function load() { try { const raw = localStorage.getItem(STORE_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }
  function set(patch) { Object.assign(S, patch); save(); render(); }
  function player(id) { return S.players.find((p) => p.id === id); }
  function progress(id) { if (!S.coach.progress[id]) { S.coach.progress[id] = true; save(); toast("Call-up path: " + (D.COACH_ACTIONS.find((a) => a.id === id) || {}).label); } }
  function coachDone() { return D.COACH_ACTIONS.filter((a) => S.coach.progress[a.id]).length; }
  function coachLevel() { const n = coachDone(); let cur = D.COACH_LEVELS[0], next = null; D.COACH_LEVELS.forEach((l) => { if (n >= l.at) cur = l; else if (!next) next = l; }); return { cur, next, n }; }
  const inArtifact = !!(window.claude && typeof window.claude.use === "function");
  function guide() { return D.AGE_GUIDES.find((g) => g.id === S.team.ageGroup) || D.AGE_GUIDES[2]; }
  function ageRange() { const g = guide(); const m = g.ages.match(/(\d+)\D+(\d+)/); return m ? [+m[1], +m[2]] : [9, 10]; }
  function drillsFor(skillId, opts) {
    const [lo, hi] = ageRange();
    const o = opts || {};
    return D.DRILLS.filter((d) => d.skills.includes(skillId) && d.ages[0] <= hi && d.ages[1] >= lo && (!o.group || d.group === o.group || d.group === "any"));
  }
  function teamNeeds() {
    const counts = {};
    S.players.forEach((p) => {
      p.growth.forEach((g) => { counts[g] = (counts[g] || 0) + 1; });
      if (S.team.mode === "offseason") p.offseasonFocus.forEach((g) => { counts[g] = (counts[g] || 0) + 1.5; });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([id, n]) => ({ id, n }));
  }
  function watchers(skills, limit) {
    return S.players.filter((p) => p.growth.some((g) => skills.includes(g)) || p.offseasonFocus.some((g) => skills.includes(g))).slice(0, limit || 4);
  }

  /* ---------- Generators ---------- */
  function generatePractice(opts) {
    const minutes = opts.minutes || (S.practice && S.practice.minutes) || S.team.practiceMinutes;
    const needs = teamNeeds();
    const focus = (opts.focus && opts.focus.length ? opts.focus : (S.practice && !opts.reset ? S.practice.focus : needs.slice(0, 3).map((n) => n.id))).slice(0, 3);
    while (focus.length < 3) { const next = needs.find((n) => !focus.includes(n.id)); if (!next) break; focus.push(next.id); }
    const seed = opts.seed != null ? opts.seed : Math.floor(Math.random() * 1000);
    const pick = (list, i) => list.length ? list[(seed + i) % list.length] : null;
    const alloc = { warm: 0.1, throw: 0.13, stations: 0.45, game: 0.24, huddle: 0.08 };
    const m = (k) => Math.max(5, Math.round(minutes * alloc[k] / 5) * 5);
    const stationTotal = m("stations");
    const stationEach = Math.max(8, Math.round(stationTotal / 3));
    const stations = focus.map((sk, i) => {
      const d = pick(drillsFor(sk, { group: "small" }), i) || pick(drillsFor(sk), i) || D.DRILLS.find((x) => x.skills.includes(sk));
      return { skill: sk, drillId: d ? d.id : null, minutes: stationEach };
    });
    const gamePool = D.DRILLS.filter((d) => d.group === "team" && d.skills.some((s) => focus.includes(s)) && !["d_dynamic_warmup", "d_throw_progression", "d_loud_team", "d_reset_routine", "d_focus_freeze"].includes(d.id));
    const game = pick(gamePool.length ? gamePool : D.DRILLS.filter((d) => d.id === "d_situational_scrim" || d.id === "d_knockout"), 1);
    const gentleKid = S.players.filter((p) => p.intakeDone && p.motivation === "gentle");
    const award = pick(gentleKid.length ? gentleKid : S.players, 2);
    const mindset = focus.some((f) => f.startsWith("mind_")) ? null : pick(D.DRILLS.filter((d) => ["d_reset_routine", "d_loud_team", "d_focus_freeze"].includes(d.id)), 3);
    return {
      id: uid(), minutes, focus, seed,
      when: S.team.nextPractice,
      blocks: [
        { key: "warm", title: "Arrive and move", minutes: m("warm"), drillId: "d_dynamic_warmup", note: "Start on time even if three kids are here. The rest will hurry." },
        { key: "throw", title: "Throwing progression", minutes: m("throw"), drillId: "d_throw_progression", note: "Partners by arm strength, not by friendship. Rotate partners weekly." },
        { key: "stations", title: "Stations by team need", minutes: stationTotal, stations, note: "Three groups, " + stationEach + " minutes each, rotate on the whistle. " + (S.team.helpers ? S.team.helpers + " parent helpers plus you covers all three." : "Recruit two parents at the fence to run a station.") },
        { key: "game", title: "Team game", minutes: m("game"), drillId: game ? game.id : "d_situational_scrim", note: "Score execution, not runs. Coaches play too." },
        { key: "huddle", title: "Huddle", minutes: m("huddle"), award: award ? award.id : null, mindsetId: mindset ? mindset.id : null, note: "Take a knee at eye level. One thing we did well, one thing to work on, one award. Under three minutes." },
      ],
    };
  }

  function playerPlan(p) {
    const g = guide();
    const focusOrder = [...p.offseasonFocus, ...p.growth.filter((x) => !p.offseasonFocus.includes(x))].slice(0, 3);
    const focus = focusOrder.map((sk) => {
      const practice = drillsFor(sk)[0] || D.DRILLS.find((d) => d.skills.includes(sk));
      const home = (D.HOME_DRILLS[sk] || [])[0];
      return { skill: sk, practice, home, offseason: p.offseasonFocus.includes(sk) };
    });
    const leanOn = p.strengths.map((sk) => {
      const s = skill(sk);
      if (s.group === "Mindset") return `${p.name} is strong at ${s.label.toLowerCase()}. Use it: make them the example when the team needs it, and say so.`;
      return `${p.name} is strong at ${s.label.toLowerCase()}. Make them the demo at that station and pair them with a kid working on it.`;
    });
    const mot = D.MOTIVATION[p.motivation] || D.MOTIVATION.balanced;
    const fun = p.fun.map((f) => (D.FUN.find((x) => x.id === f) || {}).label).filter(Boolean);
    const missions = focusOrder.flatMap((sk) => (D.HOME_DRILLS[sk] || []).slice(0, 2).map((h) => Object.assign({ skill: sk }, h)));
    return { focus, leanOn, mot, fun, missions, guide: g };
  }

  function generateLineup() {
    const innings = 6;
    const P = S.players.slice();
    const n = P.length;
    const posList = D.POSITIONS.slice(0, Math.min(9, n));
    const benchN = Math.max(0, n - posList.length);
    const bench = {}, infield = {}, pitched = {}, caught = {}, played = {}, lastBench = {};
    P.forEach((p) => { bench[p.id] = 0; infield[p.id] = 0; pitched[p.id] = 0; caught[p.id] = 0; played[p.id] = {}; lastBench[p.id] = -5; });
    const grid = {};
    P.forEach((p) => { grid[p.id] = []; });
    const rot = Math.floor(Math.random() * n);
    for (let inn = 0; inn < innings; inn++) {
      const order = P.slice(rot).concat(P.slice(0, rot));
      const benchSorted = order.filter((p) => lastBench[p.id] !== inn - 1).sort((a, b) => bench[a.id] - bench[b.id] || lastBench[a.id] - lastBench[b.id]);
      const sitting = benchSorted.slice(0, benchN).map((p) => p.id);
      sitting.forEach((id) => { bench[id]++; lastBench[id] = inn; grid[id][inn] = "Bench"; });
      let avail = P.filter((p) => !sitting.includes(p.id));
      const assign = (pos, p) => { grid[p.id][inn] = pos; played[p.id][pos] = (played[p.id][pos] || 0) + 1; if (D.INFIELD.includes(pos)) infield[p.id]++; avail = avail.filter((x) => x.id !== p.id); };
      const wants = (pos) => avail.filter((p) => p.prefer.includes(pos) && !p.avoid.includes(pos));
      // Pitcher: share innings among kids who want it, 2 innings max each.
      if (posList.includes("P")) {
        let c = wants("P").filter((p) => pitched[p.id] < 2).sort((a, b) => pitched[a.id] - pitched[b.id]);
        if (!c.length) c = avail.filter((p) => !p.avoid.includes("P")).sort((a, b) => pitched[a.id] - pitched[b.id]);
        const pick = c[0]; pitched[pick.id]++; assign("P", pick);
      }
      if (posList.includes("C")) {
        // Catcher: whoever wants it, but no more than 3 innings so the gear gets shared.
        let c = wants("C").filter((p) => caught[p.id] < 3).sort((a, b) => caught[a.id] - caught[b.id]);
        if (!c.length) c = avail.filter((p) => !p.avoid.includes("C")).sort((a, b) => caught[a.id] - caught[b.id]);
        const pick = c[0]; caught[pick.id]++; assign("C", pick);
      }
      const rest = posList.filter((x) => x !== "P" && x !== "C");
      // Fill infield first so infield balance is honored, then outfield.
      rest.sort((a, b) => (D.INFIELD.includes(b) ? 1 : 0) - (D.INFIELD.includes(a) ? 1 : 0)).forEach((pos) => {
        if (!avail.length) return;
        const scored = avail.map((p) => {
          let s = 0;
          if (p.prefer.includes(pos)) s += 4;
          if (p.avoid.includes(pos)) s -= 100;
          if (played[p.id][pos]) s -= 2 * played[p.id][pos];
          if (D.INFIELD.includes(pos)) s += (2 - infield[p.id]) * 1.5;
          else s += infield[p.id] * 0.5;
          s += Math.random() * 0.5;
          return { p, s };
        }).sort((a, b) => b.s - a.s);
        assign(pos, scored[0].p);
      });
      avail.forEach((p) => { grid[p.id][inn] = "Bench"; bench[p.id]++; lastBench[p.id] = inn; });
    }
    const batScore = (p) => (p.strengths.includes("hit_contact") ? 2 : 0) + (p.strengths.includes("hit_discipline") ? 2 : 0) + (p.strengths.includes("hit_power") ? 1.5 : 0) + (p.strengths.includes("mind_conf") ? 1 : 0) + (p.strengths.includes("run_base") ? 1 : 0) + Math.random();
    const batting = P.slice().sort((a, b) => batScore(b) - batScore(a)).map((p) => p.id);
    return { innings, grid, batting, generatedAt: Date.now() };
  }

  /* ---------- AI (optional, via the viewer's Claude account) ---------- */
  const AI = { sample: null, ready: false, busy: false };
  async function initAI() {
    try {
      if (window.claude && typeof window.claude.use === "function") {
        AI.sample = await window.claude.use("sample");
      }
    } catch (e) { AI.sample = null; }
    AI.ready = true;
    render();
  }
  function teamContext() {
    const g = guide();
    const roster = S.players.map((p) => `${p.name} (#${p.number}, age ${p.age}): strong at ${p.strengths.map(label).join(", ") || "not set"}; working on ${p.growth.map(label).join(", ") || "not set"}; goal: "${p.goal || "not set"}"; coached best by: ${(D.MOTIVATION[p.motivation] || {}).label}; positions: ${p.prefer.join("/") || "any"}${p.avoid.length ? ", avoids " + p.avoid.join("/") : ""}${p.parentNote ? "; parent note: " + p.parentNote : ""}`).join("\n");
    return `You are Coach HQ, an assistant for a volunteer youth baseball coach. Be concrete, warm, and brief. Use plain language a busy parent coach can act on tonight. No em-dashes.\n\nTeam: ${S.team.name}, ${g.label} (${g.ages} year olds), ${S.team.season}, ${S.team.mode === "offseason" ? "off-season" : "in season"}. Practices are ${S.team.practiceMinutes} minutes.\nAge group guidance: attention span ${g.attention}. They can: ${g.canDo.join("; ")}. Not yet: ${g.notYet.join("; ")}. The one thing: ${g.oneThing}\n\nRoster:\n${roster}\n`;
  }
  async function runAI(prompt, outEl, btn) {
    if (!AI.sample || AI.busy) return;
    AI.busy = true; if (btn) btn.disabled = true;
    outEl.textContent = "Thinking...";
    try {
      const { text } = await AI.sample(prompt, { onText: ({ text }) => { outEl.textContent = text; } });
      outEl.textContent = text;
    } catch (e) {
      const code = e && e.code;
      outEl.textContent = e && e.text ? e.text : "";
      if (code === "not_granted") { AI.sample = null; toast("AI assistant is off for this view."); render(); }
      else if (code === "rate_limited") toast("Too many requests. Give it a minute.");
      else if (code !== "cancelled") toast("The assistant could not answer that one.");
    } finally { AI.busy = false; if (btn) btn.disabled = false; }
  }
  function aiBox(id, placeholder, promptBuilder, opts) {
    if (!AI.sample) return "";
    const o = opts || {};
    return `<div class="ai" data-ai="${id}">
      <div class="row between"><span class="eyebrow">Ask Coach HQ</span><span class="pill gold">AI</span></div>
      <p class="small muted mt">${esc(o.intro || "Grounded in this roster, the age group, and what each kid asked to work on.")}</p>
      <div class="ai-tools">
        ${o.fixed ? "" : `<input type="text" id="ai-q-${id}" placeholder="${esc(placeholder)}" aria-label="Question">`}
        <button class="btn primary sm" data-act="ai" data-id="${id}">${esc(o.buttonLabel || "Ask")}</button>
      </div>
      <div class="out" id="ai-out-${id}"></div>
      <div class="ai-note">Uses your Claude account. Answers stream in; the first one may take a moment.</div>
    </div>`;
  }
  const aiPrompts = {};

  /* ---------- Rendering ---------- */
  const NAV = [
    { id: "home", label: "Home", ico: "⌂" },
    { id: "team", label: "Team", ico: "☰" },
    { id: "practice", label: "Practice", ico: "◷" },
    { id: "game", label: "Game day", ico: "◈" },
    { id: "learn", label: "Learn", ico: "✎" },
  ];
  function render() {
    const app = $("#app");
    const isCoach = S.role === "coach";
    app.innerHTML = `
      <div class="shell">
        <header class="topbar">
          <div class="brand"><div class="brand-mark">HQ</div><div><div class="brand-name">Coach HQ</div><div class="brand-sub">Level Up Athletics</div></div></div>
          <div class="team-chip"><b>${esc(S.team.name)}</b><span class="muted">·</span><span>${esc(guide().label)} ${esc(guide().ages)}</span></div>
          <div class="topbar-right">
            <div class="role-switch" role="group" aria-label="View as">
              <button data-act="role" data-role="coach" aria-pressed="${isCoach}">Coach</button>
              <button data-act="role" data-role="player" aria-pressed="${!isCoach}">Player</button>
            </div>
            <button class="link" data-act="roadmap">About</button>
          </div>
        </header>
        <div class="body${isCoach && !S.coach.onboarded ? " solo" : ""}">
          ${isCoach && !S.coach.onboarded ? "" : isCoach ? `<aside class="rail"><nav class="nav" aria-label="Sections">${NAV.map((n) => `<button data-act="nav" data-view="${n.id}" aria-current="${S.view === n.id ? "page" : "false"}"><span class="ico">${n.ico}</span>${n.label}</button>`).join("")}</nav>
            <div class="rail-foot"><b>${esc(coachLevel().cur.label)}</b> · ${coachDone()}/${D.COACH_ACTIONS.length} on the call-up path<br>${esc(S.team.coachName)} · ${esc(S.team.season)}<br>${S.players.length} players · ${S.players.filter((p) => p.intakeDone).length} player cards done<br><button class="link" style="color:inherit;background:none;border:0;padding:0;text-decoration:underline;cursor:pointer;margin-top:6px" data-act="reset">Reset demo data</button></div></aside>` : `<aside class="rail"><div class="eyebrow" style="padding:0 12px 8px">Players</div><nav class="nav">${S.players.map((p) => `<button data-act="pick-player" data-id="${p.id}" aria-current="${S.activePlayer === p.id ? "page" : "false"}"><span class="ico num">${p.number}</span>${esc(p.name)}${p.intakeDone ? "" : ' <span class="pill line" style="margin-left:auto">new</span>'}</button>`).join("")}</nav></aside>`}
          <main id="main">${isCoach ? (S.coach.onboarded ? renderCoach() : renderOnboarding()) : renderPlayerMode()}</main>
        </div>
        ${isCoach && S.coach.onboarded ? `<nav class="tabbar" aria-label="Sections">${NAV.map((n) => `<button data-act="nav" data-view="${n.id}" aria-current="${S.view === n.id ? "page" : "false"}"><span class="ico">${n.ico}</span>${n.label}</button>`).join("")}</nav>` : ""}
      </div>
      <div id="modal-root"></div>
      <div id="toast-root"></div>`;
    if (!S.welcomed && S.coach.onboarded) openWelcome();
    startAnimations();
  }

  /* ---------- Coach onboarding ---------- */
  function renderOnboarding() {
    const d = S.obDraft || (S.obDraft = { name: S.coach.name || "", ageGroup: S.coach.ageGroup || S.team.ageGroup, teamLevel: S.coach.teamLevel, experience: S.coach.experience, worries: S.coach.worries.slice() });
    const choice = (key, list) => `<div class="choices">${list.map((x) => `<button class="choice" data-act="ob-set" data-key="${key}" data-val="${x.id}" aria-pressed="${d[key] === x.id}"><b>${esc(x.label)}${x.ages ? ` <span class="muted">${esc(x.ages)}</span>` : ""}</b><span>${esc(x.desc || x.oneThing || "")}</span></button>`).join("")}</div>`;
    return `<div class="intake">
      <div class="row between"><span class="pill gold">Coach setup</span><span class="small muted">3 minutes</span></div>
      <div class="big mt">Let's make you a better coach this season.</div>
      <p class="muted">Five questions. The answers shape the advice you get, the practices this app builds, and what it asks of you each week.</p>
      <div class="q"><div class="qt">1. What should the kids call you?</div><input type="text" id="ob-name" value="${esc(d.name)}" placeholder="Coach Kurt" data-ob="name"></div>
      <div class="q"><div class="qt">2. Who are you coaching?</div><div class="qs">Pick the age group. This sets the ceiling on everything.</div>${choice("ageGroup", D.AGE_GUIDES)}</div>
      <div class="q"><div class="qt">3. What kind of team?</div>${choice("teamLevel", D.TEAM_LEVELS)}</div>
      <div class="q"><div class="qt">4. How much have you coached?</div>${choice("experience", D.COACH_EXPERIENCE)}</div>
      <div class="q"><div class="qt">5. What worries you most?</div><div class="qs">Pick up to 3. Be honest, this is where the help goes.</div><div class="chips mt">${D.WORRIES.map((w) => `<button class="chip" data-act="ob-toggle" data-val="${w.id}" aria-pressed="${d.worries.includes(w.id)}">${esc(w.label)}</button>`).join("")}</div></div>
      <div class="row mt-lg" style="justify-content:space-between"><button class="btn ghost" data-act="ob-skip">Skip, use the demo coach</button><button class="btn lg primary" data-act="ob-save">Build my game plan</button></div>
    </div>`;
  }
  function renderGamePlan() {
    const c = S.coach, g = guide();
    const lvl = D.TEAM_LEVELS.find((x) => x.id === c.teamLevel) || D.TEAM_LEVELS[1];
    const ex = D.COACH_EXPERIENCE.find((x) => x.id === c.experience) || D.COACH_EXPERIENCE[0];
    const worries = c.worries.map((id) => D.WORRIES.find((w) => w.id === id)).filter(Boolean);
    const L = coachLevel();
    const pct = Math.round(L.n / D.COACH_ACTIONS.length * 100);
    return `<div class="card navy gameplan">
      <div class="spread"><div><div class="eyebrow">Your coaching game plan</div><h2 style="font-size:28px">${esc(c.name || "Coach")}, ${esc(g.label)} ${esc(g.ages)}, ${esc(lvl.label.toLowerCase())}</h2></div>
        <div class="levelbox"><div class="eyebrow">Call-up path</div><div class="lv">${esc(L.cur.label)}</div><div class="track"><div class="fill" style="width:${pct}%"></div></div><div class="small muted">${L.n} of ${D.COACH_ACTIONS.length} done${L.next ? ` · ${L.next.at - L.n} more to ${esc(L.next.label)}` : " · top of the ladder"}</div></div></div>
      <div class="grid c2 mt-lg">
        <div><div class="eyebrow">The one thing about ${esc(g.label)}</div><p class="mt">${esc(g.oneThing)}</p></div>
        <div><div class="eyebrow">${esc(lvl.label)}</div><p class="mt">${esc(lvl.advice)}</p></div>
        <div><div class="eyebrow">${esc(ex.label)}</div><p class="mt">${esc(ex.advice)}</p></div>
        <div><div class="eyebrow">Your first practice</div><p class="mt">${esc(lvl.firstPractice)}</p></div>
      </div>
      ${worries.length ? `<div class="eyebrow mt-lg">What you said worries you, and what to do about it this week</div>
      <div class="stack mt">${worries.map((w) => { const pb = D.PLAYBOOK.find((x) => x.id === w.playbook); return `<div class="worry"><div><b>${esc(w.label)}</b><div class="small">${esc(w.action)}</div></div><div class="row">${w.id === "mechanics" ? `<button class="btn sm" data-act="demo-open" data-skill="thr_mech">Throwing breakdown</button>` : ""}${pb ? `<button class="btn sm" data-act="open-card" data-id="${pb.id}">Read: ${esc(pb.title)}</button>` : ""}</div></div>`; }).join("")}</div>` : ""}
      <details class="mt-lg"><summary class="eyebrow" style="cursor:pointer">Call-up checklist</summary><ul class="list check mt" style="columns:1">${D.COACH_ACTIONS.map((a) => `<li style="${c.progress[a.id] ? "" : "opacity:.6"}">${c.progress[a.id] ? "" : "<span class='muted'>(not yet) </span>"}${esc(a.label)}</li>`).join("")}</ul></details>
      <div class="row mt" style="justify-content:flex-end"><button class="link" style="color:inherit;background:none;border:0;padding:0;text-decoration:underline;cursor:pointer;opacity:.8" data-act="ob-redo">Redo setup</button></div>
    </div>`;
  }

  /* ---------- Skill demo: real video plus an animated breakdown ---------- */
  const DEMO = { fixed: null, tick: 0 };
  function renderSkillDemo(skillId) {
    const demo = D.SKILL_DEMOS[skillId]; if (!demo) return "";
    const vids = D.VIDEOS.filter((v) => v.skill === skillId);
    const primary = vids.find((v) => v.primary) || vids[0];
    const drill = D.DRILLS.find((d) => d.id === demo.drill);
    const videoCard = (v, big) => big && !inArtifact
      ? `<div class="video-embed"><iframe src="https://www.youtube-nocookie.com/embed/${v.yt}" title="${esc(v.title)}" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe></div><p class="small mt"><b>${esc(v.title)}</b> · ${esc(v.by)} · ${esc(v.minutes)} min<br><span class="muted">${esc(v.why)}</span></p>`
      : `<a class="video-link ${big ? "big" : ""}" href="https://www.youtube.com/watch?v=${v.yt}" target="_blank" rel="noopener"><span class="play">▶</span><span><b>${esc(v.title)}</b><br><span class="small muted">${esc(v.by)} · ${esc(v.minutes)} min · opens on YouTube</span>${big ? `<br><span class="small">${esc(v.why)}</span>` : ""}</span></a>`;
    return `<div class="demo">
      <div class="demo-anim">
        <div class="eyebrow">Animated breakdown</div>
        <canvas class="throw-canvas" width="400" height="300" aria-label="Animated throwing mechanics"></canvas>
        <div class="phases">${demo.phases.map((ph, i) => `<button class="phase" data-act="demo-phase" data-i="${i}" aria-pressed="${DEMO.fixed === i}">${esc(ph.label)}</button>`).join("")}<button class="phase" data-act="demo-auto" aria-pressed="${DEMO.fixed === null}">Play all</button></div>
        <div class="demo-caption card" style="background:var(--surface-2)">${demoCaption(demo, DEMO.fixed == null ? 0 : DEMO.fixed)}</div>
      </div>
      <div class="demo-side">
        <div class="eyebrow">Watch a real one</div>
        ${videoCard(primary, true)}
        ${vids.filter((v) => v !== primary).map((v) => videoCard(v, false)).join("")}
        ${drill ? `<div class="eyebrow mt-lg">Then run it</div><p class="small mt"><b>${esc(drill.name)}</b>: ${esc(drill.setup)}</p><div class="cues">${drill.cues.map((c) => `<div class="cue">${esc(c)}</div>`).join("")}</div>` : ""}
        <p class="small muted mt">${esc(demo.intro)}</p>
      </div>
    </div>`;
  }
  function demoCaption(demo, i) {
    const ph = demo.phases[i];
    return `<h4>${esc(ph.label)}</h4><div class="cue mt">${esc(ph.cue)}</div><p class="small mt">${esc(ph.detail)}</p><p class="small mt"><b>Common mistake:</b> ${esc(ph.mistake)}<br><b>Say:</b> ${esc(ph.say)}</p>`;
  }
  function openSkillDemo(skillId) {
    const demo = D.SKILL_DEMOS[skillId]; if (!demo) return;
    DEMO.fixed = null;
    $("#modal-root").innerHTML = `<div class="modal" data-act="close-modal"><div class="box wide" data-stop><button class="x" data-act="close-modal" aria-label="Close">×</button><div class="eyebrow">Skill demo</div><h2 class="mt mb">${esc(demo.title)}</h2>${renderSkillDemo(skillId)}</div></div>`;
    startAnimations();
  }
  /* Keyframes for the thrower, side view, target to the right. Coordinates in a 400 x 300 box. */
  const THROW_POSES = [
    { head: [200, 98], neck: [200, 120], hip: [200, 190], elT: [178, 152], hdT: [212, 142], elG: [224, 154], hdG: [214, 140], knB: [188, 230], ftB: [180, 270], knF: [214, 230], ftF: [222, 270] },
    { head: [188, 96], neck: [190, 118], hip: [195, 190], elT: [148, 118], hdT: [138, 88], elG: [236, 118], hdG: [278, 116], knB: [174, 230], ftB: [162, 270], knF: [236, 235], ftF: [262, 270] },
    { head: [214, 98], neck: [212, 120], hip: [206, 192], elT: [222, 92], hdT: [190, 72], elG: [226, 150], hdG: [210, 142], knB: [180, 232], ftB: [166, 270], knF: [246, 235], ftF: [272, 270] },
    { head: [250, 122], neck: [242, 142], hip: [222, 196], elT: [270, 168], hdT: [258, 208], elG: [226, 168], hdG: [214, 162], knB: [238, 216], ftB: [230, 246], knF: [256, 236], ftF: [272, 270] },
  ];
  const ANIM = { raf: null };
  function startAnimations() {
    if (ANIM.raf) { cancelAnimationFrame(ANIM.raf); ANIM.raf = null; }
    const canvases = [...document.querySelectorAll("canvas.throw-canvas")];
    if (!canvases.length) return;
    const demo = D.SKILL_DEMOS.thr_mech;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const HOLD = 1300, TWEEN = 650, CYCLE = (HOLD + TWEEN) * 4;
    const ease = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    let lastPhase = -1;
    const t0 = performance.now();
    function pose(now) {
      const el = Math.max(0, now - t0);
      if (DEMO.fixed != null) return { i: DEMO.fixed, t: 0, ball: (el % 1400) / 1400 };
      if (reduce) { const i = Math.floor((el / 2000) % 4); return { i, t: 0, ball: (el % 2000) / 2000 }; }
      const m = el % CYCLE; const i = Math.min(3, Math.floor(m / (HOLD + TWEEN))); const within = m % (HOLD + TWEEN);
      const t = within < HOLD ? 0 : ease((within - HOLD) / TWEEN);
      return { i, t, ball: within < HOLD ? within / HOLD : 1 };
    }
    function frame(now) {
      const st = pose(now);
      if (st.i !== lastPhase) { lastPhase = st.i; document.querySelectorAll(".demo-caption").forEach((el) => { el.innerHTML = demoCaption(demo, st.i); }); if (DEMO.fixed == null) document.querySelectorAll(".phases .phase[data-i]").forEach((b) => { b.classList.toggle("live", +b.dataset.i === st.i); }); }
      const A = THROW_POSES[st.i], B = THROW_POSES[(st.i + 1) % 4];
      const P = {}; Object.keys(A).forEach((k) => { P[k] = lerp(A[k], B[k], st.t); });
      canvases.forEach((cv) => draw(cv, P, st));
      ANIM.raf = requestAnimationFrame(frame);
    }
    function draw(cv, P, st) {
      const ctx = cv.getContext("2d"); const cs = getComputedStyle(document.documentElement);
      const ink = cs.getPropertyValue("--ink").trim() || "#111", gold = cs.getPropertyValue("--gold").trim() || "#ffc72c", muted = cs.getPropertyValue("--muted").trim() || "#888", surface = cs.getPropertyValue("--surface").trim() || "#fff", warn = cs.getPropertyValue("--warn").trim() || "#c2410c";
      ctx.clearRect(0, 0, 400, 300);
      // ground, step line, target
      ctx.strokeStyle = muted; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(20, 272); ctx.lineTo(380, 272); ctx.stroke();
      ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(180, 276); ctx.lineTo(372, 276); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = gold; ctx.beginPath(); ctx.arc(378, 112, 13, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(378, 112, 13, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = muted; ctx.font = "700 11px Barlow Condensed, Arial Narrow, sans-serif"; ctx.textAlign = "center"; ctx.fillText("TARGET", 378, 142); ctx.fillText("STEP ON THE LINE", 276, 292);
      // body
      const seg = (a, b, w) => { ctx.strokeStyle = ink; ctx.lineWidth = w || 7; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); };
      seg(P.hip, P.knB); seg(P.knB, P.ftB); seg(P.hip, P.knF); seg(P.knF, P.ftF);
      seg(P.neck, P.hip, 9);
      seg(P.neck, P.elG, 6); seg(P.elG, P.hdG, 6);
      seg(P.neck, P.elT, 6); seg(P.elT, P.hdT, 6);
      ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(P.head[0], P.head[1], 14, 0, Math.PI * 2); ctx.fill();
      // glove
      ctx.fillStyle = gold; ctx.beginPath(); ctx.arc(P.hdG[0], P.hdG[1], 10, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.stroke();
      // elbow-height guide during the T
      if (st.i === 1) { ctx.strokeStyle = warn; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(130, P.neck[1]); ctx.lineTo(290, P.neck[1]); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = warn; ctx.textAlign = "left"; ctx.fillText("ELBOW AT SHOULDER HEIGHT", 120, P.neck[1] - 8); }
      // ball
      let ball = P.hdT;
      if (st.i === 3) { const rel = [286, 118]; ball = lerp(rel, [366, 110], Math.min(1, st.ball * 1.15)); }
      else if (st.i === 2 && st.t > 0.8) { ball = lerp(P.hdT, [286, 118], (st.t - 0.8) / 0.2); }
      ctx.fillStyle = surface; ctx.beginPath(); ctx.arc(ball[0], ball[1], 6.5, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = warn; ctx.lineWidth = 2; ctx.stroke();
      // phase label
      ctx.fillStyle = ink; ctx.textAlign = "left"; ctx.font = "800 14px Barlow Condensed, Arial Narrow, sans-serif"; ctx.fillText(demo.phases[st.i].label.toUpperCase(), 16, 26);
      ctx.fillStyle = muted; ctx.font = "600 12px Barlow, Arial, sans-serif"; ctx.fillText(demo.phases[st.i].cue, 16, 44);
    }
    ANIM.raf = requestAnimationFrame(frame);
  }

  function renderCoach() {
    switch (S.view) {
      case "team": return renderTeam();
      case "practice": return renderPractice();
      case "game": return renderGame();
      case "learn": return renderLearn();
      default: return renderHome();
    }
  }

  /* ---------- Home ---------- */
  function renderHome() {
    const g = guide();
    const needs = teamNeeds();
    const done = S.players.filter((p) => p.intakeDone);
    const goals = done.filter((p) => p.goal);
    const maxN = needs.length ? needs[0].n : 1;
    const off = S.team.mode === "offseason";
    return `
      <div class="page-head">
        <div><div class="eyebrow">${esc(S.team.season)} · ${off ? "Off-season" : "In season"}</div><h1>${esc(S.team.name)}</h1>
        <p class="sub">${off ? "Off-season mode: the plan leans on what each kid asked to work on and what you flagged as their focus." : `Next practice ${esc(S.team.nextPractice)}. Next game ${esc(S.team.nextGame)}.`}</p></div>
        <div class="head-actions">
          <button class="btn" data-act="mode">${off ? "Switch to in-season" : "Switch to off-season"}</button>
          <button class="btn primary lg" data-act="nav" data-view="practice">Build this week's practice</button>
        </div>
      </div>
      ${renderGamePlan()}
      <div class="grid c3 mt">
        <div class="card"><div class="stat"><div class="v num">${S.players.length}</div><div class="l">Players</div></div><p class="small muted mt">${esc(g.label)}, ages ${esc(g.ages)}</p></div>
        <div class="card"><div class="stat"><div class="v num">${done.length}<span class="muted" style="font-size:18px">/${S.players.length}</span></div><div class="l">Player cards done</div></div><p class="small muted mt">${done.length < S.players.length ? `Waiting on ${S.players.filter((p) => !p.intakeDone).map((p) => p.name).join(", ")}. <button class="link" style="color:inherit;background:none;border:0;padding:0;text-decoration:underline;cursor:pointer" data-act="remind">Send a reminder</button>` : "Everyone has told you what they want to work on."}</p></div>
        <div class="card"><div class="stat"><div class="v">${esc(S.practice.minutes)}<span class="muted" style="font-size:18px"> min</span></div><div class="l">This week's plan</div></div><p class="small muted mt">Focus: ${S.practice.focus.map(label).join(", ")}</p></div>
      </div>
      <div class="grid c2 mt">
        <div class="card">
          <div class="spread"><h3>What the kids asked to work on</h3><span class="pill line">from their player cards</span></div>
          <p class="small muted mt">In their own words. Read these before every practice.</p>
          <ul class="list mt">${goals.map((p) => `<li><b>${esc(p.name)}:</b> "${esc(p.goal)}" <span class="pill ${p.motivation}">${esc(D.MOTIVATION[p.motivation].short)}</span></li>`).join("")}</ul>
          ${S.players.some((p) => !p.intakeDone) ? `<p class="small muted mt">${S.players.filter((p) => !p.intakeDone).map((p) => p.name).join(" and ")} have not filled out a card yet.</p>` : ""}
        </div>
        <div class="card">
          <div class="spread"><h3>Team needs</h3><span class="small muted">how many kids picked it</span></div>
          <p class="small muted mt">Growth areas across the roster${off ? ", weighted by off-season focus" : ""}. The top three become this week's stations.</p>
          <div class="bars mt">${needs.slice(0, 6).map((n) => `<div class="bar"><span>${esc(label(n.id))}</span><span class="num muted">${Math.round(n.n * 10) / 10}</span><div class="track"><div class="fill" style="width:${Math.round(n.n / maxN * 100)}%"></div></div></div>`).join("")}</div>
        </div>
      </div>
      <div class="grid c2 mt">
        <div class="card navy">
          <div class="eyebrow">Coaching ${esc(g.label)}: the one thing</div>
          <h3 class="mt" style="font-size:22px">${esc(g.oneThing)}</h3>
          <p class="small mt muted">Attention span ${esc(g.attention)}. Session length ${esc(g.session)}.</p>
          <div class="mt"><button class="btn sm" style="background:var(--gold);color:var(--gold-ink);border:0" data-act="learn-tab" data-tab="age">Read the age guide</button></div>
        </div>
        <div class="card">
          <h3>Before Tuesday</h3>
          <ul class="list check mt">
            <li>Say each kid's one cue out loud on the drive over. <button class="link" style="color:inherit;background:none;border:0;padding:0;text-decoration:underline;cursor:pointer" data-act="nav" data-view="team">Open the roster</button></li>
            <li>Confirm two parent helpers for stations.</li>
            <li>Award at the huddle goes to ${esc((player(S.practice.blocks[4].award) || {}).name || "someone quiet")} this week. Effort, not talent.</li>
            <li>Share the practice plan with families. <button class="link" style="color:inherit;background:none;border:0;padding:0;text-decoration:underline;cursor:pointer" data-act="nav" data-view="practice">Practice</button></li>
          </ul>
        </div>
      </div>
      <div class="mt">${aiBox("home", "How do I handle Diego cheering for himself and nobody else?", null)}</div>
      ${AI.ready && !AI.sample ? `<p class="small muted mt">The AI assistant lights up when this page is opened inside Claude with an account that allows it. Everything else here runs on the rules engine.</p>` : ""}
      <div class="card mt">
        <div class="spread"><h3>Team feed</h3><button class="btn sm" data-act="focus-compose">Post an update</button></div>
        ${renderFeed(true)}
      </div>`;
  }
  aiPrompts.home = () => teamContext() + `\nThe coach asks: ${$("#ai-q-home").value.trim() || "What should I focus on at Tuesday's practice and why?"}\n\nAnswer in under 180 words. Name specific kids from the roster when it helps.`;

  function renderFeed(withCompose) {
    return `
      ${withCompose ? `<div class="row mt" style="align-items:stretch"><input type="text" id="compose" placeholder="${S.role === "coach" ? "Message the team's families" : "Reply to the coach"}" aria-label="Message"><button class="btn sm" data-act="post">Send</button></div>` : ""}
      <div class="mt">${S.posts.slice().reverse().map((m) => `<div class="post"><div class="avatar ${m.role}">${esc(m.from[0])}</div><div><span class="who">${esc(m.from)}</span><span class="when">${esc(m.when)}</span><div class="txt">${esc(m.text)}</div>${m.attachment ? `<div class="att">📎 ${esc(m.attachment.label)}</div>` : ""}</div></div>`).join("")}</div>`;
  }

  /* ---------- Team ---------- */
  function renderTeam() {
    if (S.activePlayer && player(S.activePlayer)) return renderPlayerDetail(player(S.activePlayer));
    return `
      <div class="page-head">
        <div><div class="eyebrow">Roster</div><h1>The team</h1><p class="sub">Tap a player to see how they want to be coached, what they asked to work on, and their personal plan.</p></div>
        <div class="head-actions"><button class="btn" data-act="role" data-role="player">Open the player side</button></div>
      </div>
      <div class="roster">${S.players.map((p) => `
        <div class="card player-card ${p.intakeDone ? "" : "incomplete"}" data-act="open-player" data-id="${p.id}" role="button" tabindex="0">
          <div class="jersey num">${p.number}</div>
          <div>
            <div class="spread"><span class="name">${esc(p.name)}</span>${p.intakeDone ? `<span class="pill ${p.motivation}">${esc(D.MOTIVATION[p.motivation].label)}</span>` : `<span class="pill line">card not done</span>`}</div>
            ${p.intakeDone ? `<div class="chips mt" style="gap:4px">${p.growth.map((g) => `<span class="chip tiny warn static">${esc(label(g))}</span>`).join("")}${p.offseasonFocus.length ? `<span class="chip tiny gold static">off-season focus set</span>` : ""}</div><div class="goal">"${esc(p.goal)}"</div>` : `<div class="goal muted">Waiting on their player card. You can fill it in for them from the player side.</div>`}
          </div>
        </div>`).join("")}
      </div>`;
  }

  function renderPlayerDetail(p) {
    const plan = playerPlan(p);
    const mot = plan.mot;
    const off = S.team.mode === "offseason";
    return `
      <div class="page-head">
        <div><button class="link" style="color:var(--muted);background:none;border:0;padding:0;cursor:pointer;text-decoration:underline" data-act="close-player">← Roster</button>
          <div class="row mt" style="align-items:center"><div class="jersey num">${p.number}</div><div><h1 style="margin:0">${esc(p.name)}</h1><div class="small muted">Age ${p.age} · ${p.prefer.length ? "wants " + p.prefer.join(", ") : "no position preference yet"}${p.avoid.length ? " · avoids " + p.avoid.join(", ") : ""}</div></div></div></div>
        <div class="head-actions">
          <button class="btn" data-act="view-as-player" data-id="${p.id}">See their side</button>
          <button class="btn" data-act="print">Print plan</button>
          <button class="btn primary" data-act="share-plan" data-id="${p.id}">Share plan with family</button>
        </div>
      </div>
      ${!p.intakeDone ? `<div class="card" style="border-color:var(--warn)"><b>${esc(p.name)} has not filled out a player card.</b> <span class="muted">The plan below is a placeholder until they do. </span><button class="btn sm" data-act="view-as-player" data-id="${p.id}">Fill it in together</button></div>` : ""}
      <div class="grid c2 mt">
        <div class="card">
          <div class="eyebrow">In their words</div>
          <h2 class="mt" style="font-size:24px">"${esc(p.goal || "No goal yet")}"</h2>
          <div class="divider"></div>
          <div class="eyebrow">Strong at</div><div class="chips mt">${p.strengths.map((s) => `<span class="chip good static">${esc(label(s))}</span>`).join("") || '<span class="muted small">not set</span>'}</div>
          <div class="eyebrow mt">Wants to work on</div><div class="chips mt">${p.growth.map((s) => `<span class="chip warn static">${esc(label(s))}</span>`).join("") || '<span class="muted small">not set</span>'}</div>
          <div class="eyebrow mt">Practice is fun when</div><div class="chips mt">${plan.fun.map((f) => `<span class="chip static">${esc(f)}</span>`).join("") || '<span class="muted small">not set</span>'}</div>
          ${p.parentNote ? `<div class="divider"></div><div class="eyebrow">Parent note</div><p class="mt small">${esc(p.parentNote)}</p>` : ""}
        </div>
        <div class="card navy">
          <div class="spread"><div class="eyebrow">How to coach ${esc(p.name)}</div><span class="pill gold">${esc(mot.label)}</span></div>
          <p class="mt" style="font-size:16px">${esc(mot.coach)}</p>
          <div class="eyebrow mt">Say this</div>
          <ul class="list mt">${mot.say.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
          <div class="eyebrow mt">Avoid</div><p class="small mt">${esc(mot.avoid)}</p>
        </div>
      </div>
      <div class="card mt">
        <div class="spread"><h3>${off ? "Off-season focus" : "Coach's focus for " + esc(p.name)}</h3><span class="small muted">pick 1 or 2 of their growth areas to prioritize</span></div>
        <p class="small muted mt">What you pick here moves to the top of ${esc(p.name)}'s at-home plan and gets extra weight in the team's station planning${off ? "" : " once you switch to off-season"}.</p>
        <div class="chips mt">${p.growth.map((g) => `<button class="chip" data-act="toggle-focus" data-id="${p.id}" data-skill="${g}" aria-pressed="${p.offseasonFocus.includes(g)}">${p.offseasonFocus.includes(g) ? "★ " : ""}${esc(label(g))}</button>`).join("") || '<span class="muted small">Growth areas come from the player card.</span>'}</div>
        <label class="field mt">Coach note (private)<textarea id="coach-note" data-id="${p.id}" placeholder="What you have noticed. Only you see this.">${esc(p.coachNote)}</textarea></label>
      </div>
      <div class="card mt">
        <div class="spread"><h3>${esc(p.name)}'s development plan</h3><span class="pill line">generated from the card</span></div>
        <div class="eyebrow mt">Lean on</div>
        <ul class="list mt">${plan.leanOn.map((t) => `<li>${esc(t)}</li>`).join("") || "<li class='muted'>Set strengths on the player card first.</li>"}</ul>
        <div class="eyebrow mt-lg">Three focus areas</div>
        <div class="grid c3 mt">${plan.focus.map((f, i) => `
          <div class="card" style="background:var(--surface-2)">
            <div class="spread"><span class="chip warn static">${esc(label(f.skill))}</span>${f.offseason ? '<span class="pill gold">focus</span>' : ""}</div>
            ${f.practice ? `<div class="eyebrow mt">At practice</div><h4>${esc(f.practice.name)}</h4><div class="cue">${esc(f.practice.cues[0])}</div><p class="small muted mt">${esc(p.motivation === "push" ? f.practice.push : p.motivation === "gentle" ? f.practice.gentle : f.practice.twist)}</p>` : ""}
            ${f.home ? `<div class="eyebrow mt">At home</div><h4>${esc(f.home.name)}</h4><p class="small">${esc(f.home.reps)} · <span class="muted">${esc(f.home.need)}</span></p>` : ""}
          </div>`).join("")}</div>
        <div class="eyebrow mt-lg">Home missions (earn Level Up XP)</div>
        <div class="stack mt">${plan.missions.slice(0, 4).map((m) => `<div class="mission"><div><b>${esc(m.name)}</b><div class="small muted">${esc(m.reps)}</div></div><div class="xp num">+${m.xp} XP</div></div>`).join("")}</div>
        <div class="eyebrow mt-lg">Check-in</div>
        <p class="mt small">In three weeks, ask ${esc(p.name)}: "How close are you to ${esc((p.goal || "your goal").toLowerCase())}?" Then have them re-rate their card.</p>
      </div>
      <div class="mt">${aiBox("player", "", null, { fixed: true, buttonLabel: "Personalize with AI", intro: `Write a one-page plan for ${p.name} in a voice you could read to their parent, using the card, the motivation style, and the age guide.` })}</div>`;
  }
  aiPrompts.player = () => {
    const p = player(S.activePlayer);
    const plan = playerPlan(p);
    return teamContext() + `\nWrite a development plan for ${p.name} that the coach can hand to the parent. Structure: a two-sentence opener in the kid's own goal; "Lean on" (their strengths, one line each); "Three focus areas" with one practice drill and one at-home drill each (use these: ${plan.focus.map((f) => `${label(f.skill)}: practice "${f.practice ? f.practice.name : ""}", home "${f.home ? f.home.name : ""}"`).join("; ")}); "How ${p.name} likes to be coached" (motivation style: ${plan.mot.label}; ${plan.mot.coach}); "This week's home missions" (three, with reps). Under 320 words. Warm, specific, no jargon, no em-dashes.`;
  };

  /* ---------- Practice ---------- */
  function renderPractice() {
    const pr = S.practice;
    const needs = teamNeeds();
    const options = D.SKILLS.filter((s) => needs.some((n) => n.id === s.id) || pr.focus.includes(s.id));
    let clock = 0;
    const blocksHtml = pr.blocks.map((b) => {
      const start = clock; clock += b.minutes;
      const drill = b.drillId ? D.DRILLS.find((d) => d.id === b.drillId) : null;
      let body = "";
      if (b.key === "stations") {
        body = `<div class="stations">${b.stations.map((st, i) => {
          const d = D.DRILLS.find((x) => x.id === st.drillId);
          const w = watchers([st.skill], 4);
          return `<div class="station"><div class="st-label">Station ${i + 1} · ${esc(label(st.skill))}</div>
            ${d ? `<h4>${esc(d.name)}</h4><p class="small muted">${esc(d.setup)}</p><div class="cues">${d.cues.slice(0, 2).map((c) => `<div class="cue">${esc(c)}</div>`).join("")}</div><div class="twist"><b>Twist</b>${esc(d.twist)}</div>` : "<p class='muted small'>No drill in the library for this yet.</p>"}
            <div class="watch"><span class="lbl">Watch</span>${w.map((p) => `<span class="chip tiny static ${p.motivation === "push" ? "warn" : p.motivation === "gentle" ? "good" : "info"}" title="${esc(D.MOTIVATION[p.motivation].label)}">${esc(p.name)}</span>`).join("") || '<span class="muted small">no one flagged this</span>'}</div>
            ${d ? `<p class="small mt"><b>Push:</b> ${esc(d.push)}<br><b>Ease off:</b> ${esc(d.gentle)}</p>` : ""}
            <div class="block-tools"><button class="btn sm" data-act="swap-station" data-i="${i}">Swap drill</button></div>
          </div>`;
        }).join("")}</div>`;
      } else if (b.key === "huddle") {
        const a = player(b.award);
        const m = b.mindsetId ? D.DRILLS.find((d) => d.id === b.mindsetId) : null;
        body = `<ul class="list mt"><li>One thing we did well: let a player say it.</li><li>One thing to work on: name this week's focus, ${esc(pr.focus.map(label).join(" and ").toLowerCase())}.</li><li>Award: <b>${esc(a ? a.name : "a quiet kid")}</b>, for effort. ${a && a.motivation === "gentle" ? "Tell them beforehand so it is not a surprise in front of everyone." : ""}</li>${m ? `<li>Sixty seconds on <b>${esc(m.name)}</b>: ${esc(m.cues[0])}.</li>` : ""}</ul>`;
      } else if (drill) {
        const w = watchers(drill.skills, 4);
        const demoSkill = drill.skills.find((sk) => D.SKILL_DEMOS[sk]);
        body = `<p class="setup">${esc(drill.setup)}</p><div class="cues">${drill.cues.map((c) => `<div class="cue">${esc(c)}</div>`).join("")}</div><div class="twist"><b>Twist</b>${esc(drill.twist)}</div>
          ${w.length ? `<div class="watch"><span class="lbl">Watch</span>${w.map((p) => `<span class="chip tiny static ${p.motivation === "push" ? "warn" : p.motivation === "gentle" ? "good" : "info"}">${esc(p.name)}</span>`).join("")}</div>` : ""}
          ${demoSkill ? `<div class="block-tools"><button class="btn sm" data-act="demo-open" data-skill="${demoSkill}">▶ Watch the breakdown</button></div>` : ""}`;
      }
      return `<div class="plan-block"><div class="time num">${start}<small>${b.minutes} min</small></div><div><h3>${esc(b.title)}${drill && b.key !== "stations" ? ` <span class="muted" style="font-weight:400;font-size:16px">${esc(drill.name)}</span>` : ""}</h3><p class="small muted">${esc(b.note)}</p>${body}</div></div>`;
    }).join("");
    return `
      <div class="page-head">
        <div><div class="eyebrow">${esc(pr.when)}</div><h1>This week's practice</h1><p class="sub">Built from the roster's growth areas and the ${esc(guide().label)} age guide. Stations, not lines. Every block has a twist so the reps come from fun.</p></div>
        <div class="head-actions"><button class="btn" data-act="print">Print</button><button class="btn" data-act="regen-practice">Regenerate</button><button class="btn primary" data-act="share-practice">Share with families</button></div>
      </div>
      <div class="card">
        <div class="field-row c3">
          <label class="field">Length<select id="pr-minutes">${[60, 75, 90].map((m) => `<option value="${m}" ${pr.minutes === m ? "selected" : ""}>${m} minutes</option>`).join("")}</select></label>
          <div class="field"><span>Focus (pick three)</span><div class="chips">${options.map((s) => `<button class="chip" data-act="toggle-practice-focus" data-skill="${s.id}" aria-pressed="${pr.focus.includes(s.id)}">${esc(s.label)}</button>`).join("")}</div></div>
        </div>
      </div>
      <div class="card mt">
        <div class="row between"><div class="row"><span class="chip gold static">${pr.minutes} min</span>${pr.focus.map((f) => `<span class="chip warn static">${esc(label(f))}</span>`).join("")}</div><span class="small muted">Watch chips: <span class="chip tiny warn static">push</span> <span class="chip tiny info static">mix</span> <span class="chip tiny good static">calm</span></span></div>
        <div class="mt">${blocksHtml}</div>
      </div>
      <div class="mt">${aiBox("practice", "Turn this into a 75 minute plan with only one helper", null, { intro: "Rewrite or adapt this plan. It knows the blocks above and every kid on the roster." })}</div>`;
  }
  aiPrompts.practice = () => {
    const pr = S.practice;
    const plan = pr.blocks.map((b) => `${b.title} (${b.minutes} min): ${b.key === "stations" ? b.stations.map((st) => `${label(st.skill)} via ${(D.DRILLS.find((d) => d.id === st.drillId) || {}).name}`).join("; ") : (D.DRILLS.find((d) => d.id === b.drillId) || {}).name || ""}`).join("\n");
    return teamContext() + `\nCurrent practice plan (${pr.minutes} min):\n${plan}\n\nThe coach asks: ${$("#ai-q-practice").value.trim() || "Tighten this plan and tell me what to say to each kid at their station."}\n\nAnswer in under 250 words, as a plan the coach can read from a phone at the field.`;
  };

  /* ---------- Game day ---------- */
  function renderGame() {
    const L = S.lineup;
    const inn = Array.from({ length: L.innings }, (_, i) => i);
    const stats = S.players.map((p) => { const row = L.grid[p.id] || []; return { p, bench: row.filter((x) => x === "Bench").length, inf: row.filter((x) => D.INFIELD.includes(x)).length, pitch: row.filter((x) => x === "P").length }; });
    const maxBench = Math.max(...stats.map((s) => s.bench));
    const flags = stats.filter((s) => s.inf === 0 || s.bench > Math.ceil(L.innings * Math.max(0, S.players.length - 9) / S.players.length) + 0);
    return `
      <div class="page-head">
        <div><div class="eyebrow">${esc(S.team.nextGame)}</div><h1>Game day lineup</h1><p class="sub">Fair rotation across ${L.innings} innings. Everyone plays infield, nobody sits twice in a row, preferred positions honored where they fit. Edit any cell.</p></div>
        <div class="head-actions"><button class="btn" data-act="print">Print</button><button class="btn primary" data-act="regen-lineup">Regenerate</button></div>
      </div>
      <div class="card">
        <div class="lineup-wrap"><table class="lineup">
          <thead><tr><th style="text-align:left">Player</th>${inn.map((i) => `<th>Inn ${i + 1}</th>`).join("")}<th>Sat</th><th>IF</th></tr></thead>
          <tbody>${S.players.map((p) => { const st = stats.find((s) => s.p.id === p.id); return `<tr><td class="name">${esc(p.name)}<small>${p.prefer.join(", ") || "any"}${p.avoid.length ? " · no " + p.avoid.join(", ") : ""}</small></td>${inn.map((i) => { const v = (L.grid[p.id] || [])[i] || "Bench"; const cls = v === "Bench" ? "bench" : p.avoid.includes(v) ? "avoid" : p.prefer.includes(v) ? "pref" : ""; return `<td class="${cls}"><select data-act="cell" data-id="${p.id}" data-inn="${i}" aria-label="${esc(p.name)} inning ${i + 1}">${["Bench"].concat(D.POSITIONS).map((pos) => `<option ${pos === v ? "selected" : ""}>${pos}</option>`).join("")}</select></td>`; }).join("")}<td class="num">${st.bench}</td><td class="num">${st.inf}</td></tr>`; }).join("")}</tbody>
        </table></div>
        <div class="legend"><span><i class="pref"></i>preferred</span><span><i class="avoid"></i>asked not to</span><span><i class="bench"></i>sitting</span><span>Sat: innings on the bench · IF: infield innings</span></div>
        ${flags.length ? `<p class="small mt" style="color:var(--warn)"><b>Check:</b> ${flags.map((f) => `${f.p.name} (${f.inf === 0 ? "no infield" : "sits " + f.bench})`).join(", ")}.</p>` : `<p class="small mt" style="color:var(--good)"><b>Fair:</b> nobody sits more than ${maxBench} inning${maxBench === 1 ? "" : "s"}, everyone plays infield.</p>`}
      </div>
      <div class="grid c2 mt">
        <div class="card"><h3>Batting order</h3><p class="small muted mt">Everyone bats. Contact and discipline at the top, power in the middle, and it rotates every game.</p><div class="batting mt">${L.batting.map((id, i) => { const p = player(id); return `<div><b class="num">${i + 1}</b>${esc(p.name)}<span class="muted small" style="margin-left:auto">#${p.number}</span></div>`; }).join("")}</div></div>
        <div class="card">
          <h3>Pitching and arm care</h3>
          <div class="mt">${stats.filter((s) => s.pitch).map((s) => `<div class="mission"><div><b>${esc(s.p.name)}</b><div class="small muted">${s.pitch} inning${s.pitch > 1 ? "s" : ""} · wants ${s.p.prefer.includes("P") ? "to pitch" : "any"} · ${esc(D.MOTIVATION[s.p.motivation].label)}</div></div><div class="small">pitch count ____</div></div>`).join("")}</div>
          <p class="small muted mt">Write the league pitch limit here before the game and stop before it, not at it. Sore is not hurt, but elbow pain is always a stop.</p>
          <div class="divider"></div>
          <h4>Before first pitch</h4>
          <ul class="list mt small">${S.players.filter((p) => p.intakeDone && (p.motivation === "gentle" || p.growth.includes("mind_resil") || p.growth.includes("mind_conf"))).slice(0, 4).map((p) => `<li><b>${esc(p.name)}:</b> ${esc(D.MOTIVATION[p.motivation].say[0])}</li>`).join("")}</ul>
        </div>
      </div>`;
  }

  /* ---------- Learn ---------- */
  function renderLearn() {
    const tabs = [["age", "Age guide"], ["video", "Skill demos"], ["playbook", "Playbook"], ["drills", "Drill library"], ["roadmap", "Roadmap"]];
    let body = "";
    if (S.learnTab === "age") {
      const g = D.AGE_GUIDES.find((x) => x.id === S.guideId) || guide();
      body = `<div class="guide-tabs mb">${D.AGE_GUIDES.map((x) => `<button class="chip" data-act="guide" data-id="${x.id}" aria-pressed="${x.id === g.id}">${esc(x.label)} <span class="muted">${esc(x.ages)}</span></button>`).join("")}</div>
        <div class="card navy"><div class="eyebrow">${esc(g.label)}, ages ${esc(g.ages)} · the one thing</div><h2 class="mt">${esc(g.oneThing)}</h2><p class="mt small muted">Attention span: ${esc(g.attention)}. Session: ${esc(g.session)}.</p></div>
        <div class="grid c2 mt">
          <div class="card"><h3>They can</h3><ul class="list check mt">${g.canDo.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
          <div class="card"><h3>Not yet, and that is normal</h3><ul class="list x mt">${g.notYet.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
          <div class="card"><h3>Shape of a practice</h3><ul class="list mt">${g.shape.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
          <div class="card"><h3>Tell the parents</h3><ul class="list mt">${g.parents.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
          <div class="card" style="border-color:var(--bad)"><h3>Do not</h3><ul class="list x mt">${g.donts.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
        </div>`;
    } else if (S.learnTab === "video") {
      body = `<div class="card"><div class="spread"><h3>${esc(D.SKILL_DEMOS.thr_mech.title)}</h3><span class="pill gold">demo</span></div><p class="small muted mt">One skill, three ways: an animated breakdown you can step through at the field, a real video from a coach who teaches kids, and the drill to run afterward. More skills follow the same pattern on the roadmap.</p><div class="mt">${renderSkillDemo("thr_mech")}</div></div>`;
    } else if (S.learnTab === "playbook") {
      body = `<p class="muted mb" style="max-width:62ch">Short, situational lessons. Read one before practice, try the "try this" that night.</p><div class="stack">${D.PLAYBOOK.map((c) => `<details class="card play-card" data-card="${c.id}" ${S.openCard === c.id ? "open" : ""}><summary><div class="tag">${esc(c.tag)}</div><h3>${esc(c.title)}</h3><p class="hook">${esc(c.hook)}</p></summary><ul class="list mt">${c.body.map((b) => `<li>${esc(b)}</li>`).join("")}</ul><div class="try"><b>Try this</b>${esc(c.tryThis)}</div></details>`).join("")}</div>`;
    } else if (S.learnTab === "drills") {
      const f = S.drillFilter;
      const list = D.DRILLS.filter((d) => !f || d.skills.includes(f));
      body = `<div class="chips mb"><button class="chip" data-act="drill-filter" data-skill="" aria-pressed="${!f}">All</button>${D.SKILLS.map((s) => `<button class="chip" data-act="drill-filter" data-skill="${s.id}" aria-pressed="${f === s.id}">${esc(s.label)}</button>`).join("")}</div>
        <div class="grid c2">${list.map((d) => `<div class="card"><div class="spread"><h3>${esc(d.name)}</h3><span class="small muted">ages ${d.ages[0]}-${d.ages[1]} · ${d.minutes} min</span></div><div class="chips mt">${d.skills.map((s) => `<span class="chip tiny static">${esc(label(s))}</span>`).join("")}${d.skills.some((sk) => D.SKILL_DEMOS[sk]) ? `<button class="chip gold" data-act="demo-open" data-skill="${d.skills.find((sk) => D.SKILL_DEMOS[sk])}">▶ Breakdown and video</button>` : ""}</div><p class="small mt">${esc(d.setup)}</p><div class="cues">${d.cues.map((c) => `<div class="cue">${esc(c)}</div>`).join("")}</div><div class="twist"><b>Twist</b>${esc(d.twist)}</div><p class="small mt"><b>Push:</b> ${esc(d.push)}<br><b>Ease off:</b> ${esc(d.gentle)}</p></div>`).join("")}</div>`;
    } else {
      body = renderRoadmap();
    }
    return `
      <div class="page-head"><div><div class="eyebrow">Learn</div><h1>Coach's corner</h1><p class="sub">Just-in-time coaching knowledge. Nothing here takes more than three minutes to read.</p></div></div>
      <div class="chips mb" style="margin-bottom:16px">${tabs.map(([id, l]) => `<button class="chip" data-act="learn-tab" data-tab="${id}" aria-pressed="${S.learnTab === id}">${l}</button>`).join("")}</div>
      ${body}`;
  }

  function renderRoadmap() {
    return `<div class="roadmap">
      <div class="card"><h3>What this prototype tests</h3><p class="mt">Coaches are the biggest lever on whether a kid loves or quits a sport. Most are volunteer parents who were never taught to coach. Coach HQ raises the floor with tools, not courses: a practice built for this roster, a plan per kid written from the kid's own goals, and a lineup nobody argues about.</p>
      <p class="mt">The kid side matters as much as the coach side. Kids author their own goals, get an at-home plan with drills and videos, earn Level Up XP for doing it, and the coach sees what each kid asked for and marks the off-season priorities.</p></div>
      <div class="card mt"><h3>MVP (built here)</h3><table class="mt"><thead><tr><th>#</th><th>Feature</th><th>Why it is in the MVP</th></tr></thead><tbody>
        <tr><td>0</td><td>Coach onboarding: age group, team level, experience, worries, then a personal game plan and a call-up path</td><td>The job to be done is making the coach better. Advice has to be specific to who they coach</td></tr>
        <tr><td>1</td><td>Team and roster with age group</td><td>Everything keys off age group and roster size</td></tr>
        <tr><td>2</td><td>Player card: strengths, growth areas, goal, motivation style, positions</td><td>The personalization signal, authored by the kid</td></tr>
        <tr><td>3</td><td>Kid's own plan: at-home drills, video lookup, XP missions</td><td>Kids drive their own development between practices and in the off-season</td></tr>
        <tr><td>4</td><td>Practice planner: age-matched stations from team needs, editable, printable</td><td>The weekly hook</td></tr>
        <tr><td>5</td><td>Per-kid development plan and coach's off-season focus</td><td>What a parent can be handed; what the coach prioritizes</td></tr>
        <tr><td>6</td><td>Age group guide</td><td>Fixes adult expectations on kids</td></tr>
        <tr><td>7</td><td>Game day lineup with fair rotation</td><td>Removes the parent conflict</td></tr>
        <tr><td>8</td><td>Playbook, drill library, and a skill demo (throwing) with an animated breakdown and real video</td><td>Just-in-time learning beats a course; a coach needs to see it, not read it</td></tr>
        <tr><td>9</td><td>Team feed, share plans with families</td><td>The communication layer</td></tr>
        <tr><td>10</td><td>AI assistant grounded in the roster (when the viewer's account allows it)</td><td>Personalized coaching help; the rules engine is the fallback</td></tr>
      </tbody></table></div>
      <div class="card mt"><h3>Roadmap</h3><table class="mt"><thead><tr><th>Next</th><th>Later</th></tr></thead><tbody>
        <tr><td>Coach awards XP straight from the plan into the kid app</td><td>Season arc: 10-week progression, not one practice at a time</td></tr>
        <tr><td>Real drill videos, coach-contributed drill exchange</td><td>Light in-game tracking a parent can keep (pitches, innings, at bats)</td></tr>
        <tr><td>Kid re-rates their card every 3 weeks, plan updates, progress shown</td><td>Multi-sport taxonomy: soccer, basketball, softball</td></tr>
        <tr><td>Pre-practice brief: one screen of who to watch and what to say</td><td>League view: coach onboarding and quality signals</td></tr>
        <tr><td>Supabase backend on the existing project, RLS by team</td><td>Coach certification track with playbook badges</td></tr>
      </tbody></table></div>
      <div class="card mt"><h3>Riskiest assumptions</h3><ol style="margin:8px 0 0 18px;padding:0;display:flex;flex-direction:column;gap:6px"><li>Coaches will spend 10 minutes on setup to get a plan.</li><li>Kids and parents will fill out the player card.</li><li>Generated plans are good enough to run as-is.</li><li>Motivation style is a useful signal, not a label that boxes kids in.</li></ol></div>
      <div class="card mt"><h3>Questions for you</h3><ol style="margin:8px 0 0 18px;padding:0;display:flex;flex-direction:column;gap:6px"><li>Could you get to a practice plan without being told how?</li><li>Would you run it as-is? What would you change first?</li><li>Would you hand a kid's plan to their parent?</li><li>Does "how they like to be coached" feel useful or like a label?</li><li>What is missing that would make you open this before every practice?</li></ol></div>
    </div>`;
  }

  /* ---------- Player mode ---------- */
  function renderPlayerMode() {
    const p = player(S.activePlayer);
    if (!p) {
      return `<div class="page-head"><div><div class="eyebrow">Player side</div><h1>Who are you?</h1><p class="sub">This is what a kid (with a parent) sees. Pick a player to fill out their card or see their plan.</p></div></div>
        <div class="roster">${S.players.map((x) => `<div class="card player-card ${x.intakeDone ? "" : "incomplete"}" data-act="pick-player" data-id="${x.id}" role="button" tabindex="0"><div class="jersey num">${x.number}</div><div><span class="name">${esc(x.name)}</span><div class="goal ${x.intakeDone ? "" : "muted"}">${x.intakeDone ? '"' + esc(x.goal) + '"' : "Card not filled out yet"}</div></div></div>`).join("")}</div>`;
    }
    if (!p.intakeDone || S.playerEditing) return renderIntake(p);
    return renderMyPlan(p);
  }

  function renderIntake(p) {
    const draft = S.draft && S.draft.id === p.id ? S.draft : (S.draft = { id: p.id, strengths: p.strengths.slice(), growth: p.growth.slice(), goal: p.goal, motivation: p.motivation, prefer: p.prefer.slice(), avoid: p.avoid.slice(), fun: p.fun.slice(), parentNote: p.parentNote });
    const groups = [...new Set(D.SKILLS.map((s) => s.group))];
    const skillChips = (key, max) => groups.map((g) => `<div class="mt"><div class="eyebrow" style="font-size:11px">${esc(g)}</div><div class="chips" style="margin-top:4px">${D.SKILLS.filter((s) => s.group === g).map((s) => `<button class="chip" data-act="draft-toggle" data-key="${key}" data-val="${s.id}" data-max="${max}" aria-pressed="${draft[key].includes(s.id)}">${esc(s.label)}</button>`).join("")}</div></div>`).join("");
    return `<div class="intake">
      <div class="row between"><button class="link" style="color:var(--muted);background:none;border:0;padding:0;cursor:pointer;text-decoration:underline" data-act="pick-player" data-id="">← Players</button><span class="pill line">Player card</span></div>
      <div class="big mt">${esc(p.name)}, what do you want to work on?</div>
      <p class="muted">Your coach reads this. Be honest, there are no wrong answers. Takes three minutes.</p>
      <div class="q"><div class="qt">1. What are you already good at?</div><div class="qs">Pick up to 3. Your coach will use these.</div>${skillChips("strengths", 3)}</div>
      <div class="q"><div class="qt">2. What do you want to get better at?</div><div class="qs">Pick up to 3. This becomes your plan.</div>${skillChips("growth", 3)}</div>
      <div class="q"><div class="qt">3. If you could do one thing in a game this season, what is it?</div><div class="qs">In your own words.</div><input type="text" id="draft-goal" value="${esc(draft.goal)}" placeholder="Catch a fly ball in a real game" data-draft="goal"></div>
      <div class="q"><div class="qt">4. How do you like your coach to coach you?</div><div class="qs">Pick the one that sounds most like you.</div><div class="moto">${Object.values(D.MOTIVATION).map((m) => `<button data-act="draft-set" data-key="motivation" data-val="${m.id}" aria-pressed="${draft.motivation === m.id}"><b>${esc(m.label)}</b><span>${esc(m.kid)}</span></button>`).join("")}</div></div>
      <div class="q"><div class="qt">5. Positions</div><div class="qs">Where do you want to play? Anywhere you really do not want to?</div>
        <div class="eyebrow mt" style="font-size:11px">I want to play</div><div class="chips" style="margin-top:4px">${D.POSITIONS.map((x) => `<button class="chip" data-act="draft-toggle" data-key="prefer" data-val="${x}" data-max="3" aria-pressed="${draft.prefer.includes(x)}">${x}</button>`).join("")}</div>
        <div class="eyebrow mt" style="font-size:11px">Please not</div><div class="chips" style="margin-top:4px">${D.POSITIONS.map((x) => `<button class="chip" data-act="draft-toggle" data-key="avoid" data-val="${x}" data-max="3" aria-pressed="${draft.avoid.includes(x)}">${x}</button>`).join("")}</div></div>
      <div class="q"><div class="qt">6. Practice is the most fun when...</div><div class="qs">Pick any.</div><div class="chips mt">${D.FUN.map((f) => `<button class="chip" data-act="draft-toggle" data-key="fun" data-val="${f.id}" data-max="8" aria-pressed="${draft.fun.includes(f.id)}">${esc(f.label)}</button>`).join("")}</div></div>
      <div class="q"><div class="qt">7. Parents: anything the coach should know?</div><div class="qs">Optional. Only the coach sees it.</div><textarea id="draft-note" data-draft="parentNote" placeholder="Nervous at the plate since getting hit last year.">${esc(draft.parentNote)}</textarea></div>
      <div class="row mt-lg" style="justify-content:flex-end"><button class="btn lg primary" data-act="save-intake" data-id="${p.id}">Save my card</button></div>
      <p class="small muted mt">Nothing leaves this browser in the prototype. In the real app this goes to the coach and builds your plan.</p>
    </div>`;
  }

  function renderMyPlan(p) {
    const plan = playerPlan(p);
    const logged = Object.keys(p.log).length;
    const focusIds = plan.focus.map((f) => f.skill);
    const off = S.team.mode === "offseason";
    return `
      <div class="page-head">
        <div><button class="link" style="color:var(--muted);background:none;border:0;padding:0;cursor:pointer;text-decoration:underline" data-act="pick-player" data-id="">← Players</button><div class="eyebrow mt">${esc(S.team.name)} · #${p.number}</div><h1>${esc(p.name)}'s plan</h1><p class="sub">Your goal: <b>"${esc(p.goal)}"</b></p></div>
        <div class="head-actions"><button class="btn" data-act="edit-card">Edit my card</button></div>
      </div>
      <div class="grid c3">
        <div class="card"><div class="stat"><div class="v num" style="color:var(--warn)">${p.xp}</div><div class="l">XP earned here</div></div><p class="small muted mt">Adds to your Level Up career XP.</p></div>
        <div class="card"><div class="stat"><div class="v num">${logged}</div><div class="l">Missions done</div></div><p class="small muted mt">${logged ? "Keep the streak going." : "Log your first one below."}</p></div>
        <div class="card"><div class="stat"><div class="v" style="font-size:20px;padding-top:6px">${esc(D.MOTIVATION[p.motivation].label)}</div><div class="l">How you like to be coached</div></div><p class="small muted mt">Coach knows. Change it any time.</p></div>
      </div>
      ${p.offseasonFocus.length ? `<div class="card navy mt"><div class="eyebrow">Coach ${esc(S.team.coachName.replace("Coach ", ""))} says focus on</div><div class="chips mt">${p.offseasonFocus.map((s) => `<span class="chip gold static">★ ${esc(label(s))}</span>`).join("")}</div><p class="small mt muted">${off ? "This is your off-season priority. The missions for it are at the top." : "These are first on your list."}</p></div>` : ""}
      <div class="mt-lg"><div class="spread"><h2>Your missions</h2><span class="small muted">do them at home, log them here, earn XP</span></div></div>
      ${plan.focus.map((f) => {
        const homes = D.HOME_DRILLS[f.skill] || [];
        return `<div class="card mt">
          <div class="spread"><h3>${esc(label(f.skill))}${f.offseason ? ' <span class="pill gold">coach focus</span>' : ""}</h3>${D.SKILL_DEMOS[f.skill] ? `<button class="btn sm" data-act="demo-open" data-skill="${f.skill}">▶ Watch how</button>` : `<span class="small muted">${esc(skill(f.skill).group)}</span>`}</div>
          ${homes.map((h) => { const key = f.skill + ":" + h.name; const done = p.log[key]; return `<div class="card mt" style="background:var(--surface-2)">
            <div class="spread"><h4>${esc(h.name)}</h4><span class="xp num" style="font-family:var(--font-display);font-weight:800;color:var(--warn)">+${h.xp} XP</span></div>
            <p class="small mt"><b>You need:</b> ${esc(h.need)}</p>
            <p class="small"><b>Do:</b> ${esc(h.reps)}</p>
            <p class="small mt">${esc(h.how)}</p>
            <div class="cue mt">${esc(h.cue)}</div>
            <div class="row mt"><a class="btn sm" href="https://www.youtube.com/results?search_query=${encodeURIComponent(h.video)}" target="_blank" rel="noopener">▶ Find a video</a><button class="btn sm ${done ? "" : "primary"}" data-act="log" data-id="${p.id}" data-key="${esc(key)}" data-xp="${h.xp}">${done ? "Done " + done + "×, log again" : "I did it"}</button></div>
          </div>`; }).join("")}
        </div>`;
      }).join("")}
      <div class="grid c2 mt-lg">
        <div class="card"><h3>What you are good at</h3><div class="chips mt">${p.strengths.map((s) => `<span class="chip good static">${esc(label(s))}</span>`).join("")}</div><p class="small muted mt">Coach may ask you to show a teammate.</p></div>
        <div class="card"><h3>From the coach</h3>${renderFeed(false)}<div class="row mt" style="align-items:stretch"><input type="text" id="compose" placeholder="Reply to the coach" aria-label="Message"><button class="btn sm" data-act="post">Send</button></div></div>
      </div>
      <div class="mt">${aiBox("kid", "How do I stop being scared of the ball?", null, { intro: `Ask a question about your plan or a drill. The answer is for ${p.name}, in kid words.` })}</div>`;
  }
  aiPrompts.kid = () => {
    const p = player(S.activePlayer);
    return teamContext() + `\nYou are now talking directly to ${p.name}, age ${p.age}. Use short sentences a ${p.age}-year-old reads easily. Be encouraging in the "${D.MOTIVATION[p.motivation].label}" style. Their question: ${$("#ai-q-kid").value.trim() || "What should I practice this week?"}\n\nAnswer in under 120 words.`;
  };

  /* ---------- Modals and toasts ---------- */
  function openWelcome() {
    $("#modal-root").innerHTML = `<div class="modal" data-act="close-modal"><div class="box" data-stop>
      <button class="x" data-act="close-modal" aria-label="Close">×</button>
      <div class="eyebrow">Prototype</div><h2 class="mt">Coach HQ</h2>
      <p class="mt">You are <b>Coach Kurt</b> of the <b>Northbrook Spartans</b>, a 9-10U team with eleven kids. Nine of them have filled out their player card.</p>
      <p class="mt">Three things to try:</p>
      <ol style="margin:8px 0 0 18px;padding:0;display:flex;flex-direction:column;gap:6px"><li><b>Practice:</b> the plan is already built from what the kids asked to work on. Swap a station, change the focus, share it.</li><li><b>Team:</b> open Jaylen or Caleb. See how they want to be coached, star an off-season focus.</li><li><b>Player:</b> switch to the player side (top right), pick Avery, fill out a card, then do a mission.</li><li><b>Learn:</b> open Skill demos for the throwing breakdown and video, or tap "Throwing breakdown" in your game plan.</li></ol>
      <p class="small muted mt">Everything is stored in this browser only. "About this prototype" (top right) has the MVP scope and roadmap.</p>
      <div class="row mt-lg" style="justify-content:flex-end"><button class="btn primary" data-act="close-modal">Let's go</button></div>
    </div></div>`;
  }
  function openRoadmap() {
    $("#modal-root").innerHTML = `<div class="modal" data-act="close-modal"><div class="box" data-stop><button class="x" data-act="close-modal" aria-label="Close">×</button><div class="eyebrow">About this prototype</div><h2 class="mt mb">Scope and roadmap</h2>${renderRoadmap()}<div class="row mt" style="justify-content:flex-end"><button class="btn sm" data-act="reset">Reset demo data</button></div></div></div>`;
  }
  let toastTimer;
  function toast(msg) {
    const r = $("#toast-root"); if (!r) return;
    r.innerHTML = `<div class="toast">${esc(msg)}</div>`;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { r.innerHTML = ""; }, 2600);
  }
  function now() { const d = new Date(); return d.toLocaleDateString(undefined, { weekday: "short" }) + " " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }); }

  /* ---------- Events ---------- */
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-act]");
    if (!t) return;
    if (t.hasAttribute("data-stop")) return;
    if (t.dataset.act === "close-modal" && e.target.closest("[data-stop]") && !e.target.closest("button[data-act='close-modal']")) return;
    const act = t.dataset.act;
    const id = t.dataset.id;
    switch (act) {
      case "nav": set({ view: t.dataset.view, activePlayer: null }); window.scrollTo(0, 0); break;
      case "role": set({ role: t.dataset.role, activePlayer: null, playerEditing: false, view: t.dataset.role === "coach" ? S.view : S.view }); window.scrollTo(0, 0); break;
      case "roadmap": openRoadmap(); break;
      case "close-modal": if (!S.welcomed && S.coach.onboarded) { S.welcomed = true; save(); } $("#modal-root").innerHTML = ""; DEMO.fixed = null; startAnimations(); break;
      case "ob-set": syncOb(); S.obDraft[t.dataset.key] = t.dataset.val; render(); break;
      case "ob-toggle": { syncOb(); const arr = S.obDraft.worries; const v = t.dataset.val; const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else { if (arr.length >= 3) { toast("Pick up to 3"); return; } arr.push(v); } render(); break; }
      case "ob-skip": S.obDraft = { name: "Coach Kurt", ageGroup: "minors", teamLevel: "rec_mixed", experience: "first", worries: ["attention", "meltdowns", "parents"] }; /* falls through */
      case "ob-save": { if (act === "ob-save") syncOb(); const d = S.obDraft; const nm = (d.name || "").trim() || "Coach"; Object.assign(S.coach, { onboarded: true, name: nm, ageGroup: d.ageGroup, teamLevel: d.teamLevel, experience: d.experience, worries: d.worries.slice() }); S.team.ageGroup = d.ageGroup; S.team.coachName = /^coach/i.test(nm) ? nm : "Coach " + nm; S.coach.progress.onboard = true; S.obDraft = null; S.view = "home"; S.activePlayer = null; S.practice = generatePractice({ reset: true, minutes: S.practice.minutes, seed: S.practice.seed }); S.lineup = generateLineup(); save(); render(); window.scrollTo(0, 0); break; }
      case "ob-redo": S.coach.onboarded = false; S.obDraft = null; save(); render(); window.scrollTo(0, 0); break;
      case "open-card": progressCard(id); set({ view: "learn", learnTab: "playbook", openCard: id, activePlayer: null }); $("#modal-root").innerHTML = ""; setTimeout(() => { const el = document.querySelector(`[data-card="${id}"]`); if (el) el.scrollIntoView({ block: "start" }); }, 0); break;
      case "demo-open": progress("video"); openSkillDemo(t.dataset.skill); break;
      case "demo-phase": DEMO.fixed = +t.dataset.i; document.querySelectorAll(".phases .phase").forEach((b) => { b.setAttribute("aria-pressed", b.dataset.i != null && +b.dataset.i === DEMO.fixed); b.classList.remove("live"); }); document.querySelectorAll(".demo-caption").forEach((el) => { el.innerHTML = demoCaption(D.SKILL_DEMOS.thr_mech, DEMO.fixed); }); break;
      case "demo-auto": DEMO.fixed = null; document.querySelectorAll(".phases .phase").forEach((b) => { b.setAttribute("aria-pressed", b.dataset.i == null); }); break;
      case "reset": if (confirm("Reset the demo to its starting data?")) { try { localStorage.removeItem(STORE_KEY); } catch (x) {} S = freshState(); S.practice = generatePractice({}); S.lineup = generateLineup(); save(); $("#modal-root").innerHTML = ""; render(); toast("Demo reset"); } break;
      case "mode": S.team.mode = S.team.mode === "offseason" ? "inseason" : "offseason"; S.practice = generatePractice({ reset: true, seed: S.practice.seed }); save(); render(); toast(S.team.mode === "offseason" ? "Off-season mode: kids' goals and your focus picks drive the plan" : "In-season mode"); break;
      case "remind": S.posts.push({ id: uid(), from: S.team.coachName, role: "coach", when: now(), text: `Reminder: ${S.players.filter((p) => !p.intakeDone).map((p) => p.name).join(" and ")} still need to fill out the player card. Three minutes, and it shapes what we do Tuesday.`, attachment: { label: "Player card link" } }); save(); render(); toast("Reminder posted to the team feed"); break;
      case "focus-compose": { const c = $("#compose"); if (c) c.focus(); break; }
      case "post": { const c = $("#compose"); const txt = c && c.value.trim(); if (!txt) return; const p = S.role === "player" ? player(S.activePlayer) : null; S.posts.push({ id: uid(), from: p ? `${p.name}'s family` : S.team.coachName, role: p ? "parent" : "coach", when: now(), text: txt, attachment: null }); save(); render(); toast("Sent"); break; }
      case "open-player": if (player(id).intakeDone) progress("card"); set({ activePlayer: id, view: "team" }); window.scrollTo(0, 0); break;
      case "close-player": set({ activePlayer: null }); break;
      case "view-as-player": set({ role: "player", activePlayer: id, playerEditing: !player(id).intakeDone, draft: null }); window.scrollTo(0, 0); break;
      case "pick-player": set({ activePlayer: id || null, playerEditing: false, draft: null }); window.scrollTo(0, 0); break;
      case "edit-card": set({ playerEditing: true, draft: null }); window.scrollTo(0, 0); break;
      case "toggle-focus": { const p = player(id); const sk = t.dataset.skill; const i = p.offseasonFocus.indexOf(sk); if (i >= 0) p.offseasonFocus.splice(i, 1); else { if (p.offseasonFocus.length >= 2) p.offseasonFocus.shift(); p.offseasonFocus.push(sk); progress("focus"); } save(); render(); break; }
      case "share-plan": { const p = player(id); S.posts.push({ id: uid(), from: S.team.coachName, role: "coach", when: now(), text: `${p.name}'s development plan is ready. Three focus areas, home missions with XP, and how ${p.name} likes to be coached. Ask them about their goal: "${p.goal}".`, attachment: { label: `${p.name}'s plan` } }); save(); progress("share"); toast(`Shared with ${p.name}'s family`); break; }
      case "share-practice": S.posts.push({ id: uid(), from: S.team.coachName, role: "coach", when: now(), text: `Practice plan for ${S.team.nextPractice} is up. Focus this week: ${S.practice.focus.map(label).join(", ").toLowerCase()}. Two parent helpers needed for stations, reply if you can.`, attachment: { label: `Practice plan · ${S.practice.minutes} min` } }); save(); progress("practice"); toast("Practice plan shared with families"); break;
      case "print": if (S.view === "practice") progress("practice"); window.print(); break;
      case "regen-practice": S.practice = generatePractice({ focus: S.practice.focus, minutes: S.practice.minutes, seed: S.practice.seed + 1 }); save(); render(); toast("New plan, same focus"); break;
      case "toggle-practice-focus": { const sk = t.dataset.skill; let f = S.practice.focus.slice(); const i = f.indexOf(sk); if (i >= 0) f.splice(i, 1); else { if (f.length >= 3) f.shift(); f.push(sk); } S.practice = generatePractice({ focus: f, minutes: S.practice.minutes, seed: S.practice.seed }); save(); render(); break; }
      case "swap-station": { const i = +t.dataset.i; const st = S.practice.blocks[2].stations[i]; const pool = drillsFor(st.skill); if (pool.length > 1) { const idx = pool.findIndex((d) => d.id === st.drillId); st.drillId = pool[(idx + 1) % pool.length].id; save(); render(); } else toast("Only one drill in the library for that yet"); break; }
      case "regen-lineup": S.lineup = generateLineup(); save(); render(); toast("New rotation"); break;
      case "learn-tab": if (t.dataset.tab === "age") progress("ageGuide"); set({ view: "learn", learnTab: t.dataset.tab, activePlayer: null, openCard: null }); window.scrollTo(0, 0); break;
      case "guide": set({ guideId: id }); break;
      case "drill-filter": set({ drillFilter: t.dataset.skill }); break;
      case "draft-toggle": { const k = t.dataset.key, v = t.dataset.val, max = +t.dataset.max; const arr = S.draft[k]; const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else { if (arr.length >= max) { toast(`Pick up to ${max}`); return; } arr.push(v); } if (k === "prefer") S.draft.avoid = S.draft.avoid.filter((x) => x !== v); if (k === "avoid") S.draft.prefer = S.draft.prefer.filter((x) => x !== v); syncDraftText(); render(); break; }
      case "draft-set": S.draft[t.dataset.key] = t.dataset.val; syncDraftText(); render(); break;
      case "save-intake": { syncDraftText(); const p = player(id); const d = S.draft; if (!d.growth.length || !d.goal.trim()) { toast("Pick at least one thing to work on and write your goal"); return; } Object.assign(p, { strengths: d.strengths, growth: d.growth, goal: d.goal.trim(), motivation: d.motivation, prefer: d.prefer, avoid: d.avoid, fun: d.fun, parentNote: d.parentNote, intakeDone: true }); p.offseasonFocus = p.offseasonFocus.filter((x) => p.growth.includes(x)); S.draft = null; S.playerEditing = false; S.practice = generatePractice({ reset: true, minutes: S.practice.minutes, seed: S.practice.seed }); S.lineup = generateLineup(); save(); render(); toast("Card saved. Your plan is ready."); window.scrollTo(0, 0); break; }
      case "log": { const p = player(id); const k = t.dataset.key; p.log[k] = (p.log[k] || 0) + 1; p.xp += +t.dataset.xp; save(); render(); toast(`+${t.dataset.xp} XP. Nice.`); break; }
      case "ai": { const key = t.dataset.id; const out = $("#ai-out-" + key); const build = aiPrompts[key]; if (out && build) runAI(build(), out, t); break; }
    }
  });
  document.addEventListener("change", (e) => {
    const t = e.target;
    if (t.matches("#pr-minutes")) { S.practice = generatePractice({ focus: S.practice.focus, minutes: +t.value, seed: S.practice.seed }); save(); render(); }
    if (t.matches("select[data-act='cell']")) { const id = t.dataset.id, inn = +t.dataset.inn; S.lineup.grid[id][inn] = t.value; save(); render(); }
    if (t.matches("#coach-note")) { player(t.dataset.id).coachNote = t.value; save(); }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.matches("#compose")) { const b = e.target.parentElement.querySelector("[data-act='post']"); if (b) b.click(); }
    if (e.key === "Enter" && e.target.matches("input[id^='ai-q-']")) { const b = e.target.parentElement.querySelector("[data-act='ai']"); if (b) b.click(); }
    if (e.key === "Enter" && e.target.matches("[role='button']")) e.target.click();
    if (e.key === "Escape") { const m = $("#modal-root"); if (m && m.innerHTML) { if (!S.welcomed) { S.welcomed = true; save(); } m.innerHTML = ""; } }
  });
  function syncOb() { const n = $("#ob-name"); if (n && S.obDraft) S.obDraft.name = n.value; }
  function progressCard(id) { if (!S.coach.cardsRead.includes(id)) { S.coach.cardsRead.push(id); save(); } if (S.coach.cardsRead.length >= 3) progress("playbook"); }
  document.addEventListener("toggle", (e) => { const d = e.target; if (d && d.matches && d.matches("details.play-card") && d.open) progressCard(d.dataset.card); }, true);
  function syncDraftText() { const g = $("#draft-goal"); const n = $("#draft-note"); if (g) S.draft.goal = g.value; if (n) S.draft.parentNote = n.value; }

  render();
  initAI();
  // Installable: register the service worker when served over http(s). The single-file artifact skips this.
  try { if ("serviceWorker" in navigator && /^https?:/.test(location.protocol) && !window.claude) navigator.serviceWorker.register("sw.js?v=3").catch(() => {}); } catch (e) { /* not available */ }
})();
