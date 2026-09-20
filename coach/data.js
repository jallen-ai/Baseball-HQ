/* Coach HQ content layer. Sport: baseball. Everything here is data, not logic. */
window.COACH_DATA = (function () {

  /* ---------- Skills taxonomy (shared idea with the kid app's Skill Lab) ---------- */
  const SKILLS = [
    { id: "hit_contact",    label: "Making contact",          group: "Hitting" },
    { id: "hit_power",      label: "Hitting with power",      group: "Hitting" },
    { id: "hit_discipline", label: "Plate discipline",        group: "Hitting" },
    { id: "fld_ground",     label: "Ground balls",            group: "Fielding" },
    { id: "fld_fly",        label: "Fly balls",               group: "Fielding" },
    { id: "fld_catch",      label: "Catching throws",         group: "Fielding" },
    { id: "thr_acc",        label: "Throwing accuracy",       group: "Throwing" },
    { id: "thr_mech",       label: "Arm strength and mechanics", group: "Throwing" },
    { id: "pit_strikes",    label: "Throwing strikes",        group: "Pitching" },
    { id: "run_base",       label: "Baserunning",             group: "Running" },
    { id: "iq_game",        label: "Knowing where to throw",  group: "Game IQ" },
    { id: "mind_conf",      label: "Confidence at the plate", group: "Mindset" },
    { id: "mind_focus",     label: "Staying focused",         group: "Mindset" },
    { id: "mind_resil",     label: "Bouncing back from mistakes", group: "Mindset" },
    { id: "mind_team",      label: "Being a loud teammate",   group: "Mindset" },
  ];

  /* ---------- Motivation styles ---------- */
  const MOTIVATION = {
    push: {
      id: "push", label: "Challenge me", short: "Push",
      kid: "I like it when the coach pushes me and sets a high bar.",
      coach: "Give a number to beat and say it out loud. Raise the bar the moment they clear it. Direct correction lands fine, as long as it comes with the next challenge.",
      say: ["\"Last time you got 6 of 10. Beat it.\"", "\"That was good. Now do it with a runner on.\"", "\"You are ready for the harder version.\""],
      avoid: "Empty praise. They can tell, and it makes them trust you less.",
    },
    balanced: {
      id: "balanced", label: "Mix it up", short: "Mix",
      kid: "Push me sometimes, but I need to hear what I did right too.",
      coach: "Lead with one specific thing they did well, then one thing to try. Alternate hard reps with easy wins. Check in with a question, not a verdict.",
      say: ["\"Your feet were perfect. Now let us get the glove out front.\"", "\"What did you feel on that one?\"", "\"Two more, then you pick the next drill.\""],
      avoid: "Long stretches of correction with no win in between.",
    },
    gentle: {
      id: "gentle", label: "Keep it calm", short: "Calm",
      kid: "I do my best when the coach is patient and encouraging.",
      coach: "Quiet voice, close proximity, one cue at a time. Praise effort before result. Correct privately, never across the field. Let them succeed on an easy rep before you raise difficulty.",
      say: ["\"I saw you keep trying. That is the whole thing.\"", "\"Let us do one easy one together.\"", "\"You do not have to get it today.\""],
      avoid: "Calling them out in front of the group, even to praise. Volume reads as anger to this kid.",
    },
  };

  const FUN = [
    { id: "compete", label: "Competitions" },
    { id: "games",   label: "Games with a score" },
    { id: "friends", label: "Working with friends" },
    { id: "coach1",  label: "One-on-one time with coach" },
    { id: "music",   label: "Music and energy" },
    { id: "hit",     label: "Hitting, lots of it" },
    { id: "lead",    label: "Leading a group" },
    { id: "quiet",   label: "Quiet reps, no pressure" },
  ];

  const POSITIONS = ["P", "C", "1B", "2B", "SS", "3B", "LF", "CF", "RF"];
  const INFIELD = ["P", "C", "1B", "2B", "SS", "3B"];

  /* ---------- Age group guides ---------- */
  const AGE_GUIDES = [
    {
      id: "tball", label: "T-Ball", ages: "4 to 6",
      attention: "3 to 5 minutes per activity", session: "45 to 60 minutes",
      oneThing: "Every kid touches a ball every 30 seconds. If they are standing, you have lost them.",
      canDo: ["Hit a ball off a tee most of the time", "Run to a base when told which one", "Catch a rolled ball with two hands", "Throw overhand in the general direction"],
      notYet: ["Track a thrown ball in the air", "Know where to throw without being told", "Wait in a line longer than 90 seconds", "Care about the score"],
      shape: ["Warm-up game (5)", "Four tiny stations, 5 min each (20)", "Everyone hits, everyone runs (15)", "Silly game to finish (5)"],
      parents: ["The goal this season is: wants to come back next year", "Crying is normal, leaving is normal, we do not push", "Please cheer effort, not outcomes"],
      donts: ["Do not run batting practice with one hitter and 10 fielders", "Do not correct mechanics beyond one cue", "Do not keep score in a way the kids can see"],
    },
    {
      id: "coachpitch", label: "Coach Pitch", ages: "7 to 8",
      attention: "5 to 8 minutes per activity", session: "60 to 75 minutes",
      oneThing: "They can learn real mechanics now, but only one cue at a time and only through repetition, not explanation.",
      canDo: ["Hit a slow, consistent pitch", "Field a ground ball hit right at them", "Throw to first with some accuracy", "Understand force outs at first", "Remember a two-step instruction"],
      notYet: ["Catch a fly ball reliably (fear is normal)", "Turn a double play", "Read a batter to position themselves", "Regulate frustration without help"],
      shape: ["Dynamic warm-up with a ball (8)", "Throwing progression, partners (10)", "Three stations, 10 min each (30)", "Small-sided game (15)", "Huddle and award (5)"],
      parents: ["We rotate positions on purpose, nobody owns shortstop", "Fly balls are scary at this age, we teach it with soft balls first", "Your kid will strike out a lot; that is the plan working"],
      donts: ["Do not specialize positions", "Do not stack the lineup to win", "Do not explain for more than 20 seconds before they move"],
    },
    {
      id: "minors", label: "Minors", ages: "9 to 10",
      attention: "8 to 12 minutes per activity", session: "75 to 90 minutes",
      oneThing: "This is the age kids decide whether they are \"a baseball player.\" Confidence built now sticks. So does embarrassment.",
      canDo: ["Kid pitch: throw strikes roughly half the time", "Field and throw across the infield", "Catch fly balls with a running start", "Understand outs, tagging up, lead-offs", "Hold a three-step instruction", "Compete and care about winning"],
      notYet: ["Consistent mechanics under game pressure", "Hit a good pitcher's fastball with power", "Manage a bad inning without a spiral", "Self-correct without a cue"],
      shape: ["Dynamic warm-up (8)", "Throwing progression with a target (10)", "Three stations by team need, 12 min each (36)", "Competitive team game (18)", "Huddle: one thing each (5)"],
      parents: ["Pitching is shared; your kid will pitch and will walk people", "We track effort and a personal goal, not batting average", "Ask your kid what their focus is this week; they should know"],
      donts: ["Do not let the best pitcher throw every inning", "Do not yell mechanics from the dugout mid at-bat", "Do not run the same practice twice"],
    },
    {
      id: "majors", label: "Majors", ages: "11 to 12",
      attention: "12 to 15 minutes per activity", session: "90 minutes",
      oneThing: "They are ready for real strategy and real feedback. They are also 12, and half of them are deciding whether to quit before high school.",
      canDo: ["Situational defense: cutoffs, relays, bunt coverage", "Read pitchers, take a pitch on purpose", "Steal with a jump", "Own a role on the team", "Give and take peer feedback"],
      notYet: ["Consistency across a growth spurt (mechanics reset)", "Emotional control in a close game", "Separate self-worth from performance"],
      shape: ["Warm-up with purpose (10)", "Throwing program, arm care (10)", "Two focused stations, 15 min each (30)", "Situational scrimmage (30)", "Huddle with a player leading (10)"],
      parents: ["Playing time is earned by effort and attitude, not just talent", "Arm care rules are non-negotiable", "Growth spurts wreck mechanics for a while; be patient"],
      donts: ["Do not treat them like little kids in the huddle", "Do not treat them like adults after a loss", "Do not skip arm care to save time"],
    },
    {
      id: "juniors", label: "Juniors", ages: "13 to 14",
      attention: "15 to 20 minutes per activity", session: "90 to 120 minutes",
      oneThing: "Coach the person first. They want to be treated as athletes and they want you to notice when something is off.",
      canDo: ["Full-size field, real leads and pick-offs", "Position-specific work", "Self-directed warm-ups", "Video review", "Lead a drill for younger kids"],
      notYet: ["Consistency of motivation (social life competes)", "Injury awareness without adult guidance"],
      shape: ["Player-led warm-up (10)", "Arm care and throwing (15)", "Position groups (30)", "Live at-bats and situations (40)", "Debrief (10)"],
      parents: ["We will talk to your athlete directly first", "Rest days are part of the program", "Playing time conversations happen with the player in the room"],
      donts: ["Do not run practices they could run themselves", "Do not ignore a kid who has gone quiet"],
    },
  ];

  /* ---------- Drill library ---------- */
  /* ages: [min, max]. minutes: suggested. group: "small" (3 to 5 kids), "any", "team". */
  const DRILLS = [
    {
      id: "d_wall_ball", name: "Wall ball ladder", skills: ["fld_ground", "fld_catch"], ages: [5, 12], minutes: 8, group: "any",
      setup: "Each kid with a tennis ball facing a wall or fence, 10 feet away.",
      cues: ["Glove out front, see the ball into it", "Feet moving before the ball arrives"],
      twist: "Ladder: 5 two-handed, then 5 one-handed, then 5 backhand. First to finish the ladder picks the next drill.",
      push: "Move back 3 steps each time they clear a level.", gentle: "Start with a roll, not a bounce, and stay next to them for the first 5.",
    },
    {
      id: "d_four_corners", name: "Four corners throwing", skills: ["thr_acc", "fld_catch", "iq_game"], ages: [7, 14], minutes: 10, group: "small",
      setup: "Four kids on the corners of a square, 40 to 60 feet apart. One ball, throw around the square.",
      cues: ["Step to your target", "Throw to the chest, catch with two hands", "Call the name before you throw"],
      twist: "Count throws in a row without a drop. Beat the team record and it goes on the board.",
      push: "Switch direction on the whistle, then add a second ball.", gentle: "Bring the corners in to 30 feet and use a softer ball until the streak reaches 10.",
    },
    {
      id: "d_tee_contact", name: "Tee contact challenge", skills: ["hit_contact"], ages: [5, 14], minutes: 10, group: "small",
      setup: "Tee into a net or fence. Three tee heights and three ball positions (inside, middle, outside).",
      cues: ["Eyes on the ball until the bat gets there", "Hit the top half of the ball", "Quiet head"],
      twist: "9-box bingo: hit a line drive from each of the 9 tee positions to fill the card.",
      push: "Line drives only count if they go through the middle of the net.", gentle: "Any contact fills a box. Celebrate the first line drive loudly.",
    },
    {
      id: "d_front_toss", name: "Front toss, two-strike mode", skills: ["hit_contact", "hit_discipline", "mind_conf"], ages: [8, 14], minutes: 12, group: "small",
      setup: "Coach behind an L-screen 15 feet away tossing underhand. 3 hitters, 3 shaggers, rotate.",
      cues: ["Load early, land soft", "See it up, let it go; see it down, hit it", "Short to the ball"],
      twist: "Every hitter starts 0 and 2. A strikeout is fine, a swing at a bad toss costs the group a lap.",
      push: "Mix speeds and call the location before the toss.", gentle: "Toss only strikes for the first round so they get 5 in a row before the count matters.",
    },
    {
      id: "d_power_line", name: "Power line hitting", skills: ["hit_power"], ages: [9, 14], minutes: 10, group: "small",
      setup: "Tee at the front of the plate. Cones at 60, 90, 120 feet in the outfield.",
      cues: ["Back foot turns, hips lead", "Finish high", "Swing through the ball, not to it"],
      twist: "Each cone is a point value. 5 swings, total your score, try to beat it next round.",
      push: "Move the tee to the outside corner. Points only count for the opposite field.", gentle: "Score anything past the first cone. Contact first, distance comes later.",
    },
    {
      id: "d_ground_triangle", name: "Ground ball triangle", skills: ["fld_ground", "thr_acc"], ages: [7, 14], minutes: 12, group: "small",
      setup: "Coach hits or rolls from home. Fielder at short, receiver at first, feeder behind the coach.",
      cues: ["Right, left, field: get the feet moving early", "Glove on the ground, then come up", "Throw through the chest"],
      twist: "Team goal of 15 clean plays in a row. Miss one and the counter resets, but the coach eats a push-up.",
      push: "Hit it harder and to the backhand side.", gentle: "Roll it straight at them until they have 5 clean, then add a step to the side.",
    },
    {
      id: "d_fly_fear", name: "Fly ball fear-killer", skills: ["fld_fly"], ages: [6, 10], minutes: 10, group: "small",
      setup: "Tennis balls or soft training balls. Coach tosses high from 15 feet. Progress to a fungo.",
      cues: ["Thumbs together above your eyes", "Move your feet under it, do not reach", "Catch it in front of your face, not over it"],
      twist: "Bucket challenge: a caught ball goes in the bucket, fill the bucket before the song ends.",
      push: "Move to real baseballs and add a crow hop throw after the catch.", gentle: "Stay on tennis balls the whole time. A ball that touches the glove counts.",
    },
    {
      id: "d_fly_drop", name: "Drop step and go", skills: ["fld_fly", "run_base"], ages: [9, 14], minutes: 10, group: "small",
      setup: "Outfielders in a line. Coach points left or right, fielder drop-steps, then coach throws or hits over their head.",
      cues: ["Drop step first, then turn and run", "Run on your toes so the ball does not bounce in your eyes", "Glove up late"],
      twist: "Points for catches: 1 for a routine, 3 for over the shoulder. First to 10 wins.",
      push: "Throw further and make them call it while running.", gentle: "Throw it shorter so they can get under it before it drops.",
    },
    {
      id: "d_throw_progression", name: "Throwing progression with target", skills: ["thr_mech", "thr_acc"], ages: [7, 14], minutes: 10, group: "team",
      setup: "Partners, start on one knee at 20 feet, stand at 40, stretch to 60 and back. A towel or a glove is the target.",
      cues: ["Elbow up, fingers on top of the ball", "Point your front shoulder at the target", "Follow through across your body"],
      twist: "Each pair counts chest-high throws. Winning pair sets the cones for the next drill.",
      push: "Long toss to their max distance, then back in with a crow hop.", gentle: "Stay close, throw slow, get the arm path right before you add distance.",
    },
    {
      id: "d_pitch_target", name: "Pitcher target game", skills: ["pit_strikes", "thr_acc"], ages: [8, 14], minutes: 12, group: "small",
      setup: "Pitcher and catcher (or a net with a strike zone taped). Coach calls a zone: high, low, in, out.",
      cues: ["Balance point, then go", "Glove side stays closed", "Finish with your chest over your front knee"],
      twist: "10 pitches, 1 point for a strike, 2 for the called zone. Track it week over week.",
      push: "Call the zone after the leg lift.", gentle: "Any strike is a point. Do not call zones until they throw 6 of 10 strikes.",
    },
    {
      id: "d_bull_pen_short", name: "Short bullpen, 15 pitches", skills: ["pit_strikes", "thr_mech"], ages: [9, 14], minutes: 8, group: "small",
      setup: "Pitcher, catcher, coach standing behind the pitcher. 15 pitches total, count them, stop at 15.",
      cues: ["Same tempo every pitch", "Land softly on a bent front knee", "Breathe before you start"],
      twist: "Pitcher predicts strikes out of 15 before the set. Beat the prediction and the catcher does a lap.",
      push: "Last 5 pitches with a batter standing in.", gentle: "Coach stands beside them and talks through every pitch. No batter.",
    },
    {
      id: "d_base_race", name: "Home to first race", skills: ["run_base"], ages: [5, 14], minutes: 8, group: "team",
      setup: "Two lines at home plate, one at each batter's box. Race to first on the swing.",
      cues: ["Run through the base, do not jump at it", "Look at the base, not the ball", "Turn right after the bag"],
      twist: "Bracket tournament. The loser of each race becomes the cheering section for the winner.",
      push: "Time them and post the times. Then add a turn at first and a look to second.", gentle: "Race the coach, and the coach loses, barely.",
    },
    {
      id: "d_base_situations", name: "Read the ball baserunning", skills: ["run_base", "iq_game"], ages: [8, 14], minutes: 12, group: "team",
      setup: "Runners at first. Coach hits or throws: ground ball (go), line drive (freeze), fly ball (halfway or tag).",
      cues: ["Ground ball go, line drive freeze, fly ball halfway", "Pick up your coach at third", "Aggressive turn, then decide"],
      twist: "Runners get a point for each right read. Fielders get a point for each runner they catch wrong.",
      push: "Add a runner at second and a bunt read.", gentle: "Coach calls the read out loud the first 5 reps, then goes quiet.",
    },
    {
      id: "d_where_throw", name: "Where does it go?", skills: ["iq_game", "thr_acc"], ages: [8, 14], minutes: 12, group: "team",
      setup: "Full infield, coach at home with a fungo. Coach calls the situation (runner on first, one out), then hits.",
      cues: ["Know the play before the pitch", "Say it out loud: \"one on first, I go to two\"", "Get the sure out"],
      twist: "Defense earns a point for each correct throw. 10 points and the coaches run a lap.",
      push: "Do not call the situation; have the shortstop call it.", gentle: "Walk through each play with no ball first, then add a rolled ball.",
    },
    {
      id: "d_cutoff_relay", name: "Cutoff relay race", skills: ["iq_game", "thr_acc", "mind_team"], ages: [9, 14], minutes: 12, group: "team",
      setup: "Two lines from the outfield fence to home, 4 kids each. Ball goes fence to home through relays.",
      cues: ["Show your hands, be loud", "Catch on your glove side, turn and throw", "Hit the cutoff, every time"],
      twist: "Best of 5 races. Loser picks the warm-up song next practice.",
      push: "Add an extra relay and make them call the throw.", gentle: "Shorten the lines to 3 and slow it down until every throw is caught.",
    },
    {
      id: "d_situational_scrim", name: "Situational scrimmage", skills: ["iq_game", "hit_contact", "run_base", "mind_focus"], ages: [8, 14], minutes: 20, group: "team",
      setup: "Two teams. Coach sets a situation each inning (runner on second, one out) and hits or pitches.",
      cues: ["Play it like a real inning", "Talk before the pitch", "Next pitch, that is all that matters"],
      twist: "Points for execution (moving the runner, getting the lead out), not for runs.",
      push: "Let the kids run the situations and coach each other.", gentle: "Start with the easiest situation and celebrate the first clean play, loudly.",
    },
    {
      id: "d_two_strike_battle", name: "Two-strike battle", skills: ["hit_discipline", "mind_conf", "mind_resil"], ages: [9, 14], minutes: 10, group: "small",
      setup: "Front toss or machine. Every hitter starts with two strikes. Goal: put it in play.",
      cues: ["Choke up, shorten up", "Just get the barrel on it", "Fight it off, foul balls are wins"],
      twist: "Each hitter survives as long as they can. Longest at-bat of the day gets the helmet sticker.",
      push: "Add a called strike three on any take of a strike.", gentle: "Foul balls and contact both count. Reset the count if they get frustrated.",
    },
    {
      id: "d_reset_routine", name: "The reset routine", skills: ["mind_resil", "mind_focus"], ages: [7, 14], minutes: 6, group: "team",
      setup: "Teach a 3-step reset: breathe, say your word, next pitch. Practice it after a made-up error.",
      cues: ["Breathe in for 3, out for 3", "Pick one word (\"next\", \"easy\", \"here\")", "Look at the pitcher, not the dugout"],
      twist: "Coach makes a fake error mid-drill. Whole team does the reset together, loudly.",
      push: "Call on them by name to demonstrate the reset for the group.", gentle: "Practice it one on one first so they are not the demo.",
    },
    {
      id: "d_focus_freeze", name: "Focus freeze", skills: ["mind_focus"], ages: [5, 12], minutes: 6, group: "team",
      setup: "Fielders in position. Coach hits balls. On the whistle everyone freezes in ready position.",
      cues: ["Ready position before every pitch", "Eyes on the bat", "Still feet, quiet glove"],
      twist: "Anyone not in ready position at the freeze does 3 jumping jacks. Coaches included.",
      push: "Shorter intervals between freezes.", gentle: "Longer intervals and a countdown before the freeze.",
    },
    {
      id: "d_loud_team", name: "Loudest dugout", skills: ["mind_team"], ages: [5, 14], minutes: 5, group: "team",
      setup: "During any drill, two kids are the designated hype crew. They call names and cheer every rep.",
      cues: ["Use their name", "Cheer effort, not just results", "Everybody gets one"],
      twist: "Rotate hype crew every 5 minutes. Coach picks the best hype crew of the day.",
      push: "Make them lead the pre-game huddle.", gentle: "Pair a quiet kid with a loud friend so they never hype alone.",
    },
    {
      id: "d_confidence_reps", name: "Five in a row", skills: ["mind_conf", "hit_contact"], ages: [6, 12], minutes: 8, group: "small",
      setup: "Tee or soft toss. The only goal: five solid hits in a row. Then stop.",
      cues: ["One good swing, then another", "Same swing every time", "Feel it, do not think it"],
      twist: "End the session on a good rep, always. The last swing you take is the one you remember.",
      push: "Make it 8 in a row and they must call the contact point before each swing.", gentle: "Coach tosses easy until they hit 5. Nobody watches.",
    },
    {
      id: "d_dynamic_warmup", name: "Dynamic warm-up with a ball", skills: ["run_base", "mind_focus"], ages: [5, 14], minutes: 8, group: "team",
      setup: "Two lines. High knees, butt kicks, skips, karaoke, sprints. Every kid carries a ball and tosses it up on the way.",
      cues: ["Move fast, move loose", "Catch the ball, keep running", "Finish through the line"],
      twist: "Last movement is a race and the coach picks the song.",
      push: "Add a partner toss between lines.", gentle: "No toss the first time through. Just movement.",
    },
    {
      id: "d_knockout", name: "Fielding knockout", skills: ["fld_ground", "fld_catch", "mind_resil"], ages: [7, 12], minutes: 10, group: "team",
      setup: "All fielders at short. Coach hits ground balls. Clean play and throw stays in; a miss moves you to a second line that is still playing, just for the crown.",
      cues: ["Attack the ball, do not wait", "Two hands", "Throw through the target"],
      twist: "Nobody sits. The second line competes for its own crown. Winners play each other.",
      push: "Harder hits and backhand only for the finalists.", gentle: "Rolled balls for the second line so everyone stays in it.",
    },
    {
      id: "d_catcher_block", name: "Catcher blocking basics", skills: ["fld_catch", "mind_conf"], ages: [9, 14], minutes: 8, group: "small",
      setup: "Full gear, tennis balls first. Coach bounces balls in the dirt from 15 feet.",
      cues: ["Chin down, glove between the legs", "Chest over the ball", "Smother, do not catch"],
      twist: "Blocks in a row. Beat the record, get the gear off first at the end of practice.",
      push: "Real baseballs and balls to the side.", gentle: "Tennis balls only. Stand next to them and toss underhand.",
    },
  ];

  /* ---------- At-home drills, keyed by skill. What a kid can do alone or with a parent. ---------- */
  /* need: equipment. reps: the mission. video: search phrase for a demo clip (a real library is P2). */
  const HOME_DRILLS = {
    hit_contact: [
      { name: "Tee work: 25 swings, top half", need: "Tee, bat, net or open yard, 5 balls", reps: "25 swings, count line drives", how: "Set the tee at belt height, middle of the plate. Swing easy at 70 percent. The only goal is to hit the top half of the ball and see it go straight.", cue: "Eyes on the ball until the bat gets there", video: "youth baseball tee drill hit top half of the ball", xp: 30 },
      { name: "Soft toss with a parent", need: "A parent or sibling, 10 balls, net or fence", reps: "3 rounds of 10", how: "Tosser kneels to the side and tosses underhand to the front hip. Hitter freezes the finish for 1 second after every swing.", cue: "Short to the ball, long through it", video: "soft toss drill youth baseball front hip", xp: 40 },
    ],
    hit_power: [
      { name: "Hip turn with a bat behind the back", need: "Bat", reps: "3 sets of 10", how: "Bat across your lower back, held by the elbows. Get to your load, then turn your hips hard and let the back foot pivot. No ball.", cue: "Back foot turns, hips lead", video: "hip rotation drill bat behind back youth baseball", xp: 20 },
      { name: "Tee: hit it over the line", need: "Tee, bat, open space, a line 60 feet away", reps: "20 swings, count balls past the line", how: "Mark a line in the yard. Try to hit the ball past it in the air. Keep score and beat it next time.", cue: "Finish high", video: "youth baseball power tee drill launch angle", xp: 30 },
    ],
    hit_discipline: [
      { name: "Strike zone calls with a parent", need: "A parent, 15 tennis balls", reps: "15 pitches, call ball or strike out loud", how: "Parent throws from 25 feet. You do not swing. You call ball or strike before it hits the fence. Parent keeps score.", cue: "See it up, let it go", video: "youth baseball plate discipline drill call the pitch", xp: 25 },
      { name: "Two-strike tee swings", need: "Tee, bat, net", reps: "20 choke-up swings", how: "Choke up an inch. Shorter, quicker swing. Hit everything hard through the middle.", cue: "Choke up, shorten up", video: "two strike approach drill youth hitting", xp: 25 },
    ],
    fld_ground: [
      { name: "Wall ball: 50 ground balls", need: "Tennis ball, wall or garage door, glove", reps: "50 clean catches", how: "Throw the ball low against the wall from 10 feet. Field it with your glove on the ground and your feet moving. Count only the clean ones.", cue: "Glove down early, see it in", video: "wall ball drill ground balls youth baseball", xp: 30 },
      { name: "Alligator hands, no glove", need: "Tennis ball, a parent to roll", reps: "3 sets of 10", how: "No glove. Parent rolls it. Field with both hands like an alligator chomping. Bare hands teach soft hands.", cue: "Chomp on top, bring it to your belly", video: "alligator drill ground balls youth", xp: 20 },
    ],
    fld_fly: [
      { name: "Self toss and catch, 30 in a row", need: "Tennis ball, glove", reps: "30 catches without a drop", how: "Toss it straight up as high as you can, get under it, catch it above your eyes with thumbs together. Drop it and the count starts over.", cue: "Thumbs together, catch in front of your face", video: "fly ball drill youth thumbs together self toss", xp: 25 },
      { name: "Drop step with a parent", need: "A parent, tennis balls, open space", reps: "20 catches, 10 each side", how: "Parent points left or right. You drop-step that way, then they throw it over your head. Run on your toes.", cue: "Drop step first, then go", video: "outfield drop step drill youth baseball", xp: 35 },
    ],
    fld_catch: [
      { name: "Catch with a parent, chest high", need: "A parent, baseball, gloves", reps: "50 throws", how: "Plain catch, but every throw you catch you call \"got it\" and give a chest-high target with two hands. Count how many hit your glove without you reaching.", cue: "Two hands, target out front", video: "how to play catch youth baseball fundamentals", xp: 25 },
    ],
    thr_acc: [
      { name: "Target throws, 30 tries", need: "Tennis ball, a target (towel, box, chalk square) on a wall", reps: "30 throws, count hits", how: "Stand 30 feet away. Step to the target, throw, count hits. Beat last time's number.", cue: "Step to your target, finish across your body", video: "throwing accuracy drill youth baseball target", xp: 30 },
      { name: "Knee throws for the arm path", need: "A parent or a wall, baseball", reps: "20 from one knee, 20 standing", how: "Start on one knee, 20 feet away. Elbow up, fingers on top of the ball. Then stand and back up.", cue: "Elbow up, fingers on top", video: "one knee throwing drill youth baseball", xp: 20 },
    ],
    thr_mech: [
      { name: "Towel drill", need: "A hand towel", reps: "3 sets of 15", how: "Hold the end of a towel like a ball. Go through your full throwing motion and snap the towel at a target (a parent's hand, held out front). No ball, no strain.", cue: "Point the shoulder, finish across", video: "towel drill throwing mechanics youth", xp: 20 },
      { name: "Long toss, build up slowly", need: "A parent, baseball, gloves", reps: "10 minutes, out and back", how: "Start close. Every 5 throws take 3 steps back until it is a stretch, then walk it back in with hard, low throws.", cue: "Same arm path at every distance", video: "long toss youth baseball how to", xp: 35 },
    ],
    pit_strikes: [
      { name: "Strike zone bullpen, 20 pitches", need: "A target with a strike zone (tape on a fence or net), baseballs", reps: "20 pitches, count strikes", how: "Full windup from 40 feet. Track strikes out of 20. Same tempo every pitch. Stop at 20, arms are not free.", cue: "Balance point, then go", video: "youth pitching strike zone target drill", xp: 35 },
      { name: "Balance point holds", need: "Nothing", reps: "10 holds of 3 seconds", how: "Go to your leg lift and hold it for 3 seconds without wobbling. Then finish the motion without a ball.", cue: "Tall and still at the top", video: "pitching balance point drill youth", xp: 15 },
    ],
    run_base: [
      { name: "Home to first sprints", need: "Two markers 60 feet apart", reps: "6 sprints, run through the base", how: "Swing an imaginary bat, drop it, sprint through the far marker. Do not slow down until you are past it. Have a parent time you.", cue: "Run through the base, look at the base", video: "home to first sprint technique youth baseball", xp: 25 },
      { name: "Turns at first", need: "Two markers", reps: "10 turns", how: "Sprint to first, make an aggressive turn toward second, then plant and come back. Practice both the turn and the stop.", cue: "Aggressive turn, then decide", video: "rounding first base drill youth", xp: 20 },
    ],
    iq_game: [
      { name: "Situation flashcards", need: "A parent, paper", reps: "10 situations", how: "Parent says a situation (runner on first, one out, ball hit to you at second). You say where the ball goes and why. Then swap.", cue: "Know the play before the pitch", video: "youth baseball where to throw the ball situations explained", xp: 20 },
      { name: "Watch an inning on purpose", need: "Any game on TV or YouTube", reps: "1 inning", how: "Pick one fielder. Watch only them for a whole inning. Where do they move before every pitch? Tell your coach one thing you noticed.", cue: "Watch the fielder, not the ball", video: "how to watch baseball like a player fielders positioning", xp: 15 },
    ],
    mind_conf: [
      { name: "Five good swings, then stop", need: "Tee, bat, net", reps: "End on 5 in a row", how: "Swing until you get 5 solid ones in a row. Then stop, no matter what. The last swing you take is the one you remember.", cue: "Same swing every time", video: "hitting confidence drill youth end on a good one", xp: 20 },
      { name: "Say your reset word", need: "Nothing", reps: "Practice it 5 times today", how: "Pick one word: next, easy, here. When something goes wrong today (any thing), breathe in for 3, out for 3, say your word.", cue: "Breathe, word, next", video: "youth athlete reset routine after a mistake", xp: 10 },
    ],
    mind_focus: [
      { name: "Ready position, every pitch", need: "A game to watch, or a parent playing catch", reps: "One inning or 30 throws", how: "Get into ready position before every single pitch or throw. Have a parent call \"freeze\" and check you.", cue: "Ready before it happens", video: "ready position drill youth baseball fielders", xp: 15 },
    ],
    mind_resil: [
      { name: "The reset routine at home", need: "Nothing", reps: "Use it 3 times today", how: "Breathe in for 3, out for 3, say your word, move on. Try it on homework, on a video game, on anything hard.", cue: "Breathe, word, next", video: "reset routine youth athlete breathing", xp: 10 },
      { name: "Best mistake of the day", need: "A parent", reps: "1 conversation", how: "At dinner, tell a parent your best mistake of the day and what you tried after. The mistake is not the point. The next try is.", cue: "Mistakes are the curriculum", video: "growth mindset kids sports mistakes", xp: 10 },
    ],
    mind_team: [
      { name: "Cheer for someone by name", need: "Any practice or game", reps: "5 times", how: "Five times at the next practice, cheer for a teammate by name for something specific. Not \"good job.\" \"Nice glove, Sofia.\"", cue: "Use their name, name the thing", video: "how to be a good teammate youth sports", xp: 15 },
    ],
  };

  /* ---------- Coach onboarding ---------- */
  const TEAM_LEVELS = [
    { id: "rec_first", label: "Rec, mostly first-timers", desc: "Many kids are new to the sport or to this level. Some have never worn a glove.",
      advice: "Your job is fundamentals and fun in that order. Every drill gets the easy version first. Expect to re-teach the basics every week for a month, and count reps, not results.",
      firstPractice: "Names game, catch with a partner, ground balls rolled by a coach, everyone hits off a tee, one silly race. Send them home smiling." },
    { id: "rec_mixed", label: "Rec, mixed skill", desc: "A few strong kids, a few beginners, most in the middle. The usual rec team.",
      advice: "Stations are your answer to the skill gap. Group by skill for mechanics work, mix groups for games. Give your strongest kids a teaching job so they stay engaged without dominating.",
      firstPractice: "Warm-up together, then three stations so you can see every kid throw, field, and hit. Finish with a team game and the huddle." },
    { id: "travel", label: "Travel or competitive", desc: "Tryout-selected. Kids and parents expect development and results.",
      advice: "You can push harder on mechanics and situations, but the age ceiling still applies: a 10-year-old on a travel team is still 10. Protect arms, rotate roles, and be explicit with parents about playing time before the first game.",
      firstPractice: "Throwing program with arm care, position-specific stations, a situational scrimmage, and a huddle where you state the playing-time rule out loud." },
  ];
  const COACH_EXPERIENCE = [
    { id: "first", label: "First season", desc: "I volunteered. I know the game, I have never coached it.",
      advice: "Run the generated practice as written for the first three weeks. Do not improvise yet. Read one playbook card before each practice. You will be fine: the kids need organized and kind more than they need expert." },
    { id: "some", label: "A few seasons", desc: "I have coached before, mostly by feel.",
      advice: "Use the player cards to individualize. That is the step most experienced volunteers never take. Pick one kid each practice and coach them the way they asked to be coached." },
    { id: "veteran", label: "Veteran", desc: "Many seasons. I have my own drills and opinions.",
      advice: "Treat the planner as a checklist against your instincts: does every kid get reps, is the age ceiling respected, do the quiet kids get a job. Consider running a station for another coach's team." },
  ];
  const WORRIES = [
    { id: "attention", label: "Keeping their attention", playbook: "p_lines", action: "Run stations at your next practice and count how many reps your least-skilled kid gets." },
    { id: "planning", label: "Planning a practice", playbook: "p_fun", action: "Open the Practice tab. It is already built. Print it and run it as written." },
    { id: "mechanics", label: "Teaching mechanics", playbook: "p_one_cue", action: "Watch the throwing breakdown, then pick one cue per kid and write it on your lineup card." },
    { id: "meltdowns", label: "A kid who melts down", playbook: "p_meltdown", action: "Teach the reset routine at practice this week so it exists before the game." },
    { id: "parents", label: "Parents", playbook: "p_parents", action: "Say the rotation rule out loud at the first practice and share each kid's plan before the second game." },
    { id: "fairness", label: "Playing time and fairness", playbook: "p_competition", action: "Use the Game day lineup. It rotates everyone and shows the bench count so you can defend it." },
    { id: "quiet", label: "The kid who checks out", playbook: "p_quiet", action: "Give the quiet kid a job that is not performance: keeping the count, picking the warm-up game." },
    { id: "winning", label: "Winning vs developing", playbook: "p_mistakes", action: "Give the best mistake award at the huddle this week. It tells the team what you actually value." },
  ];
  /* Coach call-up path, mirroring the kid app's Rookie to Legend ladder. */
  const COACH_ACTIONS = [
    { id: "onboard", label: "Set up your coaching profile" },
    { id: "ageGuide", label: "Read the age guide for your group" },
    { id: "card", label: "Open a player's card and read how they want to be coached" },
    { id: "practice", label: "Print or share a generated practice" },
    { id: "video", label: "Watch the throwing breakdown" },
    { id: "share", label: "Share a kid's plan with their family" },
    { id: "focus", label: "Star an off-season focus for a player" },
    { id: "playbook", label: "Read three playbook cards" },
  ];
  const COACH_LEVELS = [
    { at: 0, label: "Rookie coach" }, { at: 2, label: "Assistant" }, { at: 4, label: "Bench coach" }, { at: 6, label: "Skipper" }, { at: 8, label: "Manager" },
  ];

  /* ---------- Skill demos: a real video plus an in-app animated breakdown ---------- */
  const VIDEOS = [
    { id: "v_throw_kids", skill: "thr_mech", yt: "R0A_qFdt5jY", title: "How to Teach Young Kids to Throw, Step by Step", by: "Coach Dan Blewett", minutes: "8", why: "The clearest step-by-step for a parent coach. Grip, T position, step, finish. Watch it once before your first practice.", primary: true },
    { id: "v_throw_bf", skill: "thr_mech", yt: "MDzvD-3neaU", title: "Baseball Factory Coaching Tip 02: Throwing Mechanics", by: "Baseball Factory", minutes: "3", why: "Short and clean. Good to replay at the field to check one thing." },
    { id: "v_throw_prog", skill: "thr_mech", yt: "LtzwCrthlTY", title: "Youth Baseball Essentials: Simple Throwing Progressions", by: "Dominate The Diamond", minutes: "6", why: "The knee-to-standing progression used in the throwing block of every practice here." },
  ];
  const SKILL_DEMOS = {
    thr_mech: {
      title: "Proper throwing mechanics",
      intro: "Four checkpoints. Teach one at a time, in this order, and only move on when the one before it is automatic.",
      phases: [
        { id: "grip", label: "1. Grip and ready", cue: "Fingers on top, ball in the fingertips", detail: "Four-seam grip across the horseshoe. The ball sits in the fingers, not the palm; a kid should be able to slide a finger between the ball and the palm. Feet shoulder width, glove and ball together at the chest, eyes on the target.", mistake: "Palming the ball. It kills the wrist snap and the ball sails.", say: "\"Show me daylight between the ball and your hand.\"" },
        { id: "t", label: "2. Turn and make a T", cue: "Front shoulder at the target, elbow up", detail: "Turn sideways so the glove-side shoulder points at the target. Separate the hands: glove arm reaches toward the target, throwing hand goes back and up so the elbow is at shoulder height and the ball faces away from the target.", mistake: "Elbow below the shoulder (the push throw) or the ball facing the target early.", say: "\"Point your shoulder. Show the ball to the fence behind you.\"" },
        { id: "step", label: "3. Step and drive", cue: "Step at the target, hips then chest", detail: "Step directly toward the target with the front foot, landing softly on a bent knee. The hips turn first, the chest follows, and the throwing elbow leads the hand forward. The glove pulls in to the chest instead of flying open.", mistake: "Stepping across the body or to the side. Everything after that aims somewhere else.", say: "\"Step on the line. Glove to your heart.\"" },
        { id: "finish", label: "4. Release and finish", cue: "Fingers on top through release, finish across", detail: "Release out front with the fingers behind the ball and the wrist snapping down. The arm keeps going across the body toward the opposite hip and the back foot comes up and around. A kid who finishes tall is stopping their arm and will be sore.", mistake: "Stopping the arm at release, or throwing with the body standing straight up.", say: "\"Throw it and pick up the dirt with your fingers.\"" },
      ],
      drill: "d_throw_progression",
      home: "thr_mech",
    },
  };

  /* ---------- Coach playbook (short, situational lessons) ---------- */
  const PLAYBOOK = [
    {
      id: "p_lines", tag: "Practice design", title: "Stations beat lines, every time",
      hook: "If a kid stands still for more than 90 seconds, you have lost them for the next 5 minutes.",
      body: ["Split the team into 3 groups of 3 to 4. Run 3 stations at once. One coach or a parent helper at each.", "Every station gets a small goal with a number: 15 clean ground balls, 5 line drives in a row.", "Rotate on a timer, not when it feels done. Kids love the whistle."],
      tryThis: "Next practice, count how many reps your least-skilled kid gets. Then run stations and count again.",
    },
    {
      id: "p_ratio", tag: "Feedback", title: "The 5 to 1 rule",
      hook: "Kids need about five pieces of specific praise for every correction to stay open to coaching.",
      body: ["Specific means naming the thing: \"your feet were moving before the ball got there,\" not \"nice job.\"", "Corrections work best as the next thing to try, not the thing that was wrong.", "Keep a mental tally for one kid per practice. Most coaches are shocked."],
      tryThis: "Pick the kid who frustrates you most. Give them five specific praises before you correct anything.",
    },
    {
      id: "p_one_cue", tag: "Teaching", title: "One cue at a time",
      hook: "A 9-year-old can hold one mechanical thought while swinging. One.",
      body: ["Pick the cue that fixes the most. Say it in five words or fewer. Repeat it for a week.", "Do not stack cues (\"hands back, elbow up, see the ball, stride short\"). That is four cues and zero of them will land.", "When the cue sticks, retire it and pick the next one."],
      tryThis: "Write each kid's one cue on your lineup card. Say it, do not explain it.",
    },
    {
      id: "p_meltdown", tag: "Mindset", title: "When a kid melts down",
      hook: "The error is not the problem. The spiral after the error is the problem, and it is coachable.",
      body: ["Get close, get low, get quiet. Volume across the field makes it worse.", "Do not fix the mechanics right now. Say: \"Breathe. Next pitch. That is all.\"", "Teach the reset routine at practice so it exists before the game. See the reset routine drill.", "After the game, and only after, ask what they felt. Not what happened."],
      tryThis: "Agree on a reset word with each kid at the start of the season. Use it, do not shout it.",
    },
    {
      id: "p_quiet", tag: "Mindset", title: "The quiet kid",
      hook: "Quiet is not the same as not caring. It is usually the opposite.",
      body: ["They will not ask for help. Go to them, in the flow of a drill, not in front of the group.", "Give them a job that is not performance: keeping the count, setting cones, running the hype crew with a friend.", "Praise them privately and specifically. Public praise can feel like exposure."],
      tryThis: "Ask the quiet kid to pick tomorrow's warm-up game. Then run it exactly as they said.",
    },
    {
      id: "p_huddle", tag: "Practice design", title: "How to run a huddle",
      hook: "The last 5 minutes are what the kids tell their parents about in the car.",
      body: ["Everyone takes a knee, coach at eye level.", "Three things: one thing the team did well, one thing to work on, one award. Under 3 minutes.", "The award is for effort or attitude, never for talent. Rotate it so everyone wins it by midseason.", "End with a cheer the kids chose."],
      tryThis: "Let a different kid give the \"one thing we did well\" each practice.",
    },
    {
      id: "p_fun", tag: "Practice design", title: "Fun is a skill, not a break",
      hook: "Kids do not quit sports because they lose. They quit because it stopped being fun.",
      body: ["Fun for a 9-year-old means: a score, a teammate, a chance to win something small, and the coach playing too.", "Every drill in this app has a twist. Use it. The twist is where the reps come from.", "Let the kids name things. A drill called \"The Volcano\" gets run harder than \"ground ball progression.\""],
      tryThis: "End every practice with the same 5-minute game the kids picked. Make it the reason they come.",
    },
    {
      id: "p_competition", tag: "Practice design", title: "Competition without losers",
      hook: "Competition motivates most kids. Losing in front of friends demotivates almost all of them.",
      body: ["Compete against a number (the team record) more often than against each other.", "When you do compete head to head, nobody sits out. Knockout drills need a second bracket.", "Team goals where the coach pays the price (a lap, a push-up) unite the group instantly."],
      tryThis: "Post a team record board: throws in a row, clean plays in a row. Chase it every week.",
    },
    {
      id: "p_parents", tag: "Parents", title: "Parents on the fence",
      hook: "A parent who hears the plan trusts the plan. A parent who sees only the lineup argues with the lineup.",
      body: ["Share what each kid is working on. This app builds that for you.", "Say the rotation rule out loud at the first practice: everyone plays infield, everyone sits sometimes.", "When a parent complains, ask what their kid said in the car. Then listen."],
      tryThis: "Send the personalized plan to each family before the second game.",
    },
    {
      id: "p_motivation", tag: "Mindset", title: "Reading how a kid is motivated",
      hook: "The same sentence lands as encouragement for one kid and as an attack for another.",
      body: ["Some kids want a bar to clear and get bored without one. Some kids need a win before a correction. Some kids need a quiet voice and time.", "Ask them. The intake in this app does. Then believe them.", "Watch their face after you correct them. That is your data."],
      tryThis: "Read each kid's motivation note before practice. Say one thing from the \"say this\" list to each of them.",
    },
    {
      id: "p_mistakes", tag: "Mindset", title: "Mistakes are the curriculum",
      hook: "A practice with no errors was too easy.",
      body: ["Tell them: \"I want to see mistakes at practice so we do not see them in the game.\"", "Celebrate a great attempt that fails: the dive that misses, the aggressive turn that gets caught.", "Never punish a physical error. Correct an effort error, once, privately."],
      tryThis: "Give the \"best mistake\" award at the huddle this week.",
    },
    {
      id: "p_pitching", tag: "Baseball", title: "Pitch counts are not optional",
      hook: "The kid with the best arm at 10 is the one most at risk at 14.",
      body: ["Know your league's pitch count limits and rest days. Write them on the lineup card.", "Rotate pitchers on purpose. Everyone who wants to pitch gets innings early in the season.", "Sore is not the same as hurt, but elbow pain is always a stop."],
      tryThis: "Track pitches for every kid in the game day lineup and stop before the limit, not at it.",
    },
  ];

  /* ---------- Demo team ---------- */
  const TEAM = {
    id: "t_spartans",
    name: "Northbrook Spartans",
    ageGroup: "minors",
    season: "Fall 2026",
    practiceMinutes: 75,
    coachName: "Coach Kurt",
    helpers: 2,
    nextPractice: "Tue 6:00 PM, Meadowhill Field 3",
    nextGame: "Sat 10:00 AM vs Glenview Cubs",
  };

  const PLAYERS = [
    { id: "p1", name: "Ethan", number: 7, age: 10, strengths: ["hit_contact", "run_base"], growth: ["fld_fly", "mind_resil", "thr_acc"], goal: "Catch a fly ball in a real game without being scared of it", motivation: "balanced", prefer: ["2B", "CF"], avoid: ["C"], fun: ["compete", "friends"], parentNote: "Gets down on himself after an error and it lasts the whole game.", intakeDone: true },
    { id: "p2", name: "Mateo", number: 12, age: 10, strengths: ["thr_mech", "pit_strikes", "mind_conf"], growth: ["hit_discipline", "mind_team"], goal: "Pitch a full inning with no walks", motivation: "push", prefer: ["P", "SS"], avoid: [], fun: ["compete", "lead"], parentNote: "", intakeDone: true },
    { id: "p3", name: "Jaylen", number: 3, age: 9, strengths: ["fld_ground", "iq_game"], growth: ["hit_power", "hit_contact", "mind_conf"], goal: "Get a hit off a kid pitcher", motivation: "gentle", prefer: ["SS", "3B"], avoid: ["P", "C"], fun: ["quiet", "coach1"], parentNote: "First year of kid pitch. Nervous at the plate, loves fielding.", intakeDone: true },
    { id: "p4", name: "Owen", number: 21, age: 10, strengths: ["hit_power", "thr_mech"], growth: ["fld_ground", "mind_focus", "run_base"], goal: "Hit one over the outfielders' heads", motivation: "push", prefer: ["1B", "P"], avoid: [], fun: ["hit", "compete"], parentNote: "Big kid, big swing, drifts off between pitches.", intakeDone: true },
    { id: "p5", name: "Sofia", number: 9, age: 9, strengths: ["fld_catch", "mind_focus", "mind_team"], growth: ["thr_acc", "hit_contact"], goal: "Play catcher in a game", motivation: "balanced", prefer: ["C", "1B"], avoid: [], fun: ["friends", "lead"], parentNote: "Only girl on the team, totally unbothered by it. Wants to catch.", intakeDone: true },
    { id: "p6", name: "Liam", number: 4, age: 10, strengths: ["run_base", "mind_team"], growth: ["fld_fly", "fld_ground", "hit_contact"], goal: "Not be the last one picked", motivation: "gentle", prefer: ["LF", "RF"], avoid: ["SS", "P", "C"], fun: ["music", "friends"], parentNote: "Second year, still learning the basics. Loves being on the team more than the baseball.", intakeDone: true },
    { id: "p7", name: "Nora", number: 15, age: 10, strengths: ["hit_discipline", "iq_game", "mind_focus"], growth: ["hit_power", "thr_mech"], goal: "Play second base and turn a double play", motivation: "push", prefer: ["2B", "SS"], avoid: ["C"], fun: ["compete", "games"], parentNote: "", intakeDone: true },
    { id: "p8", name: "Caleb", number: 2, age: 9, strengths: ["thr_acc", "fld_ground"], growth: ["mind_conf", "hit_contact", "mind_resil"], goal: "Stop being scared of the ball when I hit", motivation: "gentle", prefer: ["3B", "2B"], avoid: ["P"], fun: ["coach1", "quiet"], parentNote: "Got hit by a pitch last season and has been bailing out since.", intakeDone: true },
    { id: "p9", name: "Diego", number: 33, age: 10, strengths: ["hit_contact", "hit_power", "mind_conf"], growth: ["fld_fly", "iq_game", "mind_team"], goal: "Be the best hitter in the league", motivation: "push", prefer: ["SS", "P", "CF"], avoid: [], fun: ["compete", "hit"], parentNote: "Most talented kid on the team and knows it. Needs to learn to cheer for others.", intakeDone: true },
    { id: "p10", name: "Henry", number: 8, age: 9, strengths: ["mind_focus", "run_base"], growth: ["thr_acc", "fld_catch", "hit_contact"], goal: "Make the throw to first from third", motivation: "balanced", prefer: ["3B", "LF"], avoid: [], fun: ["games", "music"], parentNote: "", intakeDone: false },
    { id: "p11", name: "Avery", number: 11, age: 10, strengths: [], growth: [], goal: "", motivation: "balanced", prefer: [], avoid: [], fun: [], parentNote: "", intakeDone: false },
  ];

  const POSTS = [
    { id: "m1", from: "Coach Kurt", role: "coach", when: "Sun 7:12 PM", text: "Practice Tuesday at Meadowhill 3. This week we are working on fly balls and throwing to a target. If your kid has a tennis ball at home, 20 wall balls before dinner counts as a Level Up mission.", attachment: null },
    { id: "m2", from: "Priya (Jaylen's mom)", role: "parent", when: "Sun 8:40 PM", text: "Jaylen filled out his goals on his own. He picked \"get a hit off a kid pitcher.\" He was proud of it.", attachment: null },
    { id: "m3", from: "Coach Kurt", role: "coach", when: "Mon 6:05 AM", text: "Two kids still need to finish the player card (Henry, Avery). Takes 3 minutes and it shapes what we do at practice. Link is in the app.", attachment: null },
  ];

  return { SKILLS, MOTIVATION, FUN, POSITIONS, INFIELD, AGE_GUIDES, DRILLS, HOME_DRILLS, PLAYBOOK, TEAM, PLAYERS, POSTS, TEAM_LEVELS, COACH_EXPERIENCE, WORRIES, COACH_ACTIONS, COACH_LEVELS, VIDEOS, SKILL_DEMOS };
})();
