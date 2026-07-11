/* ============================================================
   Home Run Derby — a behind-the-plate timing + placement game.
   Self-contained canvas game. No dependencies.

   How it plays: the pitcher throws, the ball grows as it comes
   toward you. Tap ONCE to swing: WHERE you tap = where your bat
   meets the ball, WHEN you tap = your timing. Square it up in the
   middle with good timing for a home run. Catch the top of the
   ball and you top it (grounder); catch under it and you pop it up.

   Integrates with the app when present (awardGameXP / state / save)
   but also runs standalone. Mount by having #derbyCanvas + #derbyStart
   in the DOM; it auto-wires on load.
   ============================================================ */
(function () {
  // colors (kept simple + on-brand)
  var SKY_TOP = '#1b3a5c', SKY_BOT = '#3f6d97', WALL = '#0e5a2a', WALL_TOP = '#0a4a22',
      GRASS = '#2f7d3a', GRASS2 = '#2a7134', DIRT = '#b57b41', WHITE = '#f7f7f2';

  var PITCHES = 6;

  var canvas, ctx, hudPitch, hudScore, resultEl, startBtn;
  var w = 0, h = 0, dpr = 1;
  var raf = null;

  var game = null; // active game state

  function X(rx){ return rx * w; }
  function Y(ry){ return ry * h; }

  function resize() {
    if (!canvas) return;
    var rect = canvas.getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;
    w = rect.width; h = rect.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ---- scene ----
  var HORIZON = 0.30, MOUND = {x:0.5, y:0.40};
  var ZONE = { xL:0.37, xR:0.63, yT:0.50, yB:0.74 };
  var PLATE = { x:0.5, y:0.86 };

  function drawScene() {
    ctx.clearRect(0,0,w,h);
    // sky
    var sky = ctx.createLinearGradient(0,0,0,Y(HORIZON));
    sky.addColorStop(0,SKY_TOP); sky.addColorStop(1,SKY_BOT);
    ctx.fillStyle = sky; ctx.fillRect(0,0,w,Y(HORIZON));
    // outfield wall
    ctx.fillStyle = WALL_TOP; ctx.fillRect(0,Y(HORIZON)-Y(0.03),w,Y(0.03));
    ctx.fillStyle = WALL; ctx.fillRect(0,Y(HORIZON),w,Y(0.04));
    // "HOME RUN" wall text
    ctx.fillStyle = 'rgba(255,199,44,.5)';
    ctx.font = '800 ' + Math.round(h*0.022) + 'px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('◄  HOME RUN TERRITORY  ►', X(0.5), Y(HORIZON)+Y(0.028));
    // grass with perspective wedges toward the mound
    ctx.fillStyle = GRASS; ctx.fillRect(0,Y(HORIZON)+Y(0.04),w,h);
    for (var i=0;i<7;i++){
      if (i%2===0) continue;
      ctx.fillStyle = GRASS2;
      ctx.beginPath();
      ctx.moveTo(X(0.5), Y(HORIZON)+Y(0.04));
      ctx.lineTo(X(i/7), h);
      ctx.lineTo(X((i+1)/7), h);
      ctx.closePath(); ctx.fill();
    }
    // dirt infield arc
    ctx.fillStyle = DIRT;
    ctx.beginPath();
    ctx.ellipse(X(0.5), Y(0.98), X(0.42), Y(0.30), 0, Math.PI, 0);
    ctx.fill();
    // pitcher's mound + pitcher
    ctx.fillStyle = '#c98a4d';
    ctx.beginPath(); ctx.ellipse(X(MOUND.x), Y(MOUND.y+0.02), X(0.07), Y(0.02), 0, 0, Math.PI*2); ctx.fill();
    drawPitcher(MOUND.x, MOUND.y, game ? game.windup : 0);
    // strike zone
    drawZone();
    // home plate
    ctx.fillStyle = WHITE;
    ctx.beginPath();
    ctx.moveTo(X(PLATE.x-0.05),Y(PLATE.y));
    ctx.lineTo(X(PLATE.x+0.05),Y(PLATE.y));
    ctx.lineTo(X(PLATE.x+0.05),Y(PLATE.y+0.02));
    ctx.lineTo(X(PLATE.x),Y(PLATE.y+0.05));
    ctx.lineTo(X(PLATE.x-0.05),Y(PLATE.y+0.02));
    ctx.closePath(); ctx.fill();
  }

  function drawPitcher(x,y,windup){
    var s = 0.5 + windup*0.5; // lean back during windup
    ctx.save();
    ctx.translate(X(x), Y(y));
    ctx.fillStyle = '#12345a';
    // body
    ctx.fillRect(-X(0.012), -Y(0.03), X(0.024), Y(0.05));
    // head
    ctx.fillStyle = '#e9c79c';
    ctx.beginPath(); ctx.arc(0, -Y(0.045), Math.max(3,X(0.014)), 0, Math.PI*2); ctx.fill();
    // throwing arm swings forward as windup releases
    ctx.strokeStyle = '#12345a'; ctx.lineWidth = Math.max(2,X(0.008));
    ctx.beginPath();
    ctx.moveTo(0,-Y(0.02));
    ctx.lineTo(X(0.02*(1-windup*2)), -Y(0.03 + 0.02*windup));
    ctx.stroke();
    ctx.restore();
  }

  function drawZone(){
    var xL=X(ZONE.xL), xR=X(ZONE.xR), yT=Y(ZONE.yT), yB=Y(ZONE.yB);
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2;
    ctx.strokeRect(xL,yT,xR-xL,yB-yT);
    ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1;
    for (var i=1;i<3;i++){
      ctx.beginPath(); ctx.moveTo(xL+(xR-xL)*i/3,yT); ctx.lineTo(xL+(xR-xL)*i/3,yB); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(xL,yT+(yB-yT)*i/3); ctx.lineTo(xR,yT+(yB-yT)*i/3); ctx.stroke();
    }
  }

  function ballPos(p){
    // release near mound, arrive at this pitch's target
    var t = game.target;
    var x = MOUND.x + (t.x - MOUND.x) * p;
    var y = MOUND.y + (t.y - MOUND.y) * p;
    return { x:x, y:y };
  }
  function ballRadius(p){ return (0.006 + 0.028*Math.pow(p,1.7)) * w; }

  function drawBall(p){
    var b = ballPos(p), r = ballRadius(p);
    ctx.save();
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.beginPath(); ctx.ellipse(X(b.x), Y(b.y)+r*0.9, r*0.9, r*0.35, 0, 0, Math.PI*2); ctx.fill();
    // ball
    ctx.fillStyle = WHITE;
    ctx.beginPath(); ctx.arc(X(b.x), Y(b.y), r, 0, Math.PI*2); ctx.fill();
    // seams
    ctx.strokeStyle = '#d23'; ctx.lineWidth = Math.max(1, r*0.14);
    ctx.beginPath(); ctx.arc(X(b.x)-r*0.35, Y(b.y), r*0.9, -0.9, 0.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(X(b.x)+r*0.35, Y(b.y), r*0.9, Math.PI-0.9, Math.PI+0.9); ctx.stroke();
    ctx.restore();
  }

  function ease(t){ return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2,2)/2; }

  // Right-handed batter stands to the LEFT of the plate (catcher's view).
  // sw: 0 = loaded stance, 1 = full follow-through.
  function drawBatter(sw){
    ctx.save();
    ctx.strokeStyle = '#0a1727'; ctx.fillStyle = '#0a1727';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    var hipX=X(0.25), hipY=Y(0.80), shX=X(0.31), shY=Y(0.63);
    var footY=Y(0.965);
    // legs
    ctx.lineWidth = Math.max(6, X(0.032));
    ctx.beginPath(); ctx.moveTo(hipX,hipY); ctx.lineTo(X(0.185),footY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hipX,hipY); ctx.lineTo(X(0.315),footY); ctx.stroke();
    // torso (lean toward the plate)
    ctx.lineWidth = Math.max(9, X(0.05));
    ctx.beginPath(); ctx.moveTo(hipX,hipY); ctx.lineTo(shX,shY); ctx.stroke();
    // head + helmet brim facing the pitcher (right)
    var hr = Math.max(9, X(0.033));
    ctx.beginPath(); ctx.arc(shX+X(0.012), shY-hr*0.7, hr, 0, Math.PI*2); ctx.fill();
    ctx.fillRect(shX+X(0.012), shY-hr*1.15, hr*1.2, hr*0.55);
    // hands pivot + arms
    var hx=shX+X(0.03), hy=shY+Y(0.015);
    ctx.lineWidth = Math.max(5, X(0.024));
    ctx.beginPath(); ctx.moveTo(shX,shY+Y(0.005)); ctx.lineTo(hx,hy); ctx.stroke();
    // bat angle sweeps from loaded (up over back shoulder) through the zone to follow-through
    var loaded=-2.25, follow=1.25;
    var ang = sw<=0 ? loaded : loaded + (follow-loaded)*ease(Math.min(1,sw));
    drawBat(hx, hy, ang);
    ctx.restore();
  }

  function drawBat(hx, hy, ang){
    var len = Math.max(34, X(0.30));
    var ex = hx + Math.cos(ang)*len, ey = hy + Math.sin(ang)*len;
    var perp = ang + Math.PI/2;
    var wH = Math.max(2, X(0.006)), wB = Math.max(4, X(0.017)); // handle vs barrel
    ctx.beginPath();
    ctx.moveTo(hx+Math.cos(perp)*wH, hy+Math.sin(perp)*wH);
    ctx.lineTo(hx-Math.cos(perp)*wH, hy-Math.sin(perp)*wH);
    ctx.lineTo(ex-Math.cos(perp)*wB, ey-Math.sin(perp)*wB);
    ctx.lineTo(ex+Math.cos(perp)*wB, ey+Math.sin(perp)*wB);
    ctx.closePath();
    ctx.fillStyle = '#d9a566'; ctx.fill();                 // wood barrel
    ctx.beginPath(); ctx.arc(ex,ey,wB,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#0a1727';                             // knob
    ctx.beginPath(); ctx.arc(hx,hy,wH*1.6,0,Math.PI*2); ctx.fill();
  }

  // floating on-canvas coaching feedback ("TOO EARLY", "JUST RIGHT!", ...)
  function drawFeedback(res, age){
    if (!res.timing) return;
    var q = Math.min(1, age/1100);
    var alpha = q < 0.65 ? 1 : Math.max(0, 1-(q-0.65)/0.35);
    var x = X(Math.max(0.22, Math.min(0.78, res.contactX||0.5)));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.fillStyle = res.timing.good ? '#4be08a' : '#ff8a5c';
    ctx.font = '900 ' + Math.round(h*0.05) + 'px system-ui, sans-serif';
    ctx.fillText(res.timing.label, x, Y(0.46 - 0.06*q));
    ctx.restore();
  }

  function drawHit(res, age){
    var dur = res.type==='HOMER' ? 1100 : 650;
    var prog = Math.min(1, age/dur);
    if (res.type==='HOMER'){
      // ball launches out over the wall
      var sx = PLATE.x, sy = PLATE.y;
      var ex = res.dir, ey = HORIZON-0.02;
      var x = sx + (ex-sx)*prog;
      var y = sy + (ey-sy)*prog - Math.sin(prog*Math.PI)*0.25; // arc up
      var r = (0.03*(1-prog)+0.004)*w;
      ctx.fillStyle = WHITE;
      ctx.beginPath(); ctx.arc(X(x),Y(y),Math.max(2,r),0,Math.PI*2); ctx.fill();
      if (prog>0.4){ // sparkle burst near apex
        ctx.fillStyle='rgba(255,199,44,'+(1-prog)+')';
        for(var k=0;k<6;k++){var a=k/6*Math.PI*2; ctx.beginPath();
          ctx.arc(X(ex)+Math.cos(a)*20*prog, Y(ey)+Math.sin(a)*20*prog, 3,0,Math.PI*2); ctx.fill();}
      }
    } else if (res.type==='GROUNDER'){
      var gx = PLATE.x + (res.dir-PLATE.x)*prog;
      var gy = PLATE.y - 0.02 - Math.abs(Math.sin(prog*8))*0.01*(1-prog);
      ctx.fillStyle = WHITE;
      ctx.beginPath(); ctx.arc(X(gx),Y(gy),Math.max(2,0.012*w),0,Math.PI*2); ctx.fill();
    } else if (res.type==='FLY'){
      var fx = PLATE.x + (res.dir-PLATE.x)*prog;
      var fy = PLATE.y + (0.42-PLATE.y)*prog - Math.sin(prog*Math.PI)*0.35;
      ctx.fillStyle = WHITE;
      ctx.beginPath(); ctx.arc(X(fx),Y(fy),Math.max(2,0.012*w*(1-prog*0.5)),0,Math.PI*2); ctx.fill();
    } else if (res.type==='HIT'){
      var hx = PLATE.x + (res.dir-PLATE.x)*prog;
      var hy = PLATE.y + (0.5-PLATE.y)*prog*0.4;
      ctx.fillStyle = WHITE;
      ctx.beginPath(); ctx.arc(X(hx),Y(hy),Math.max(2,0.013*w),0,Math.PI*2); ctx.fill();
    }
  }

  // ---- game flow ----
  var OUTCOMES = {
    HOMER:    { pts:100, msg:'💥 HOME RUN!' },
    HIT:      { pts:40,  msg:'🟢 Base hit!' },
    FLY:      { pts:15,  msg:'🌤️ Fly out' },
    GROUNDER: { pts:15,  msg:'⚾ Ground out' },
    MISS:     { pts:0,   msg:'❌ Swing and a miss!' },
    TAKE:     { pts:0,   msg:'😐 Took the pitch. Strike!' }
  };

  function newPitch(){
    var idx = game.pitch;
    var speed = 1500 - idx*90;              // faster each pitch
    game.state = 'windup';
    game.windup = 0;
    game.target = {
      x: ZONE.xL + 0.03 + Math.random()*(ZONE.xR-ZONE.xL-0.06),
      y: ZONE.yT + 0.03 + Math.random()*(ZONE.yB-ZONE.yT-0.06)
    };
    game.speed = speed;
    game.tStart = performance.now();
    resultEl.textContent = 'Here comes the pitch...';
  }

  function judgeTiming(p){
    if (p < 0.86) return { label:'TOO EARLY', good:false, tip:'Wait a beat, let it reach the zone.' };
    if (p < 0.94) return { label:'A HAIR EARLY', good:false, tip:'Just a touch later next time.' };
    if (p <= 1.06) return { label:'JUST RIGHT!', good:true, tip:'' };
    if (p <= 1.14) return { label:'A TOUCH LATE', good:false, tip:'Start your swing a little sooner.' };
    return { label:'TOO LATE', good:false, tip:'Swing earlier, you were behind it.' };
  }

  function evaluate(rx, ry, p){
    var b = ballPos(p);
    var locErr = Math.hypot(rx-b.x, ry-b.y);
    var timeErr = Math.abs(p - 1.0);
    var timing = judgeTiming(p);
    var res;
    if (locErr > 0.14 || timeErr > 0.24){
      res = { type:'MISS', locTip:'Tap right where the ball crosses the zone.' };
    } else {
      var timingGood = timeErr < 0.09;
      var centered = locErr < 0.05;
      if (timingGood && centered) res = { type:'HOMER', locTip:'Perfect, you squared it up!' };
      else if (ry < b.y - 0.015) res = { type:'GROUNDER', locTip:'You caught the top, aim a touch lower.' };
      else if (ry > b.y + 0.015) res = { type:'FLY', locTip:'You got under it, aim a touch higher.' };
      else res = { type:'HIT', locTip:'Good contact, center it up for a homer.' };
    }
    res.timing = timing;
    res.contactX = b.x;
    res.dir = 0.2 + Math.random()*0.6; // where the ball goes horizontally
    return res;
  }

  function finishSwing(res){
    game.state = 'result';
    game.result = res;
    game.resStart = performance.now();
    var o = OUTCOMES[res.type];
    game.score += o.pts;
    if (res.type==='HOMER') game.homers++;
    // coaching tip: if the timing was off, coach the timing; otherwise coach placement
    var tip = (res.timing && !res.timing.good) ? res.timing.tip : (res.locTip || '');
    resultEl.textContent = o.msg + (o.pts ? ('  +'+o.pts+' pts') : '') + (tip ? ('   (' + tip + ')') : '');
    hudScore.textContent = game.score + ' pts';
  }

  function nextOrEnd(){
    game.pitch++;
    if (game.pitch >= PITCHES){ endGame(); }
    else { hudPitch.textContent = 'Pitch ' + (game.pitch+1) + '/' + PITCHES; newPitch(); }
  }

  function endGame(){
    game.state = 'over';
    var xpMsg = '';
    // award game XP through the app if available (respects the daily cap)
    try {
      if (typeof awardGameXP === 'function'){
        var earned = awardGameXP(game.homers >= 3 ? 10 : 5);
        xpMsg = '  +' + earned + ' XP';
      }
      if (typeof state === 'object' && state && state.gameScores){
        state.gameScores.derby = Math.max(state.gameScores.derby||0, game.score);
        if (typeof save === 'function') save();
      }
    } catch(e){ /* standalone mode */ }
    resultEl.textContent = 'Final: ' + game.homers + '/' + PITCHES + ' homers · ' + game.score + ' pts' + xpMsg;
    hudPitch.textContent = 'Round over';
    startBtn.textContent = 'Play Again';
    startBtn.disabled = false;
  }

  function loop(now){
    raf = requestAnimationFrame(loop);
    // re-size if the canvas container changed (e.g. arcade tab was just shown)
    if (canvas && Math.abs(canvas.getBoundingClientRect().width - w) > 1) resize();
    if (w < 2) return; // container not visible yet
    drawScene();
    // batter is always on screen; swings during the result window
    var sw = (game && game.state === 'result' && game.swingAt) ? (now - game.swingAt) / 230 : 0;
    drawBatter(sw);
    if (!game) return;
    if (game.state === 'windup'){
      var wp = (now - game.tStart) / 450;
      game.windup = Math.min(1, wp);
      if (wp >= 1){ game.state='pitch'; game.tStart = now; }
    } else if (game.state === 'pitch'){
      var p = (now - game.tStart) / game.speed;
      if (p >= 1.18){ // ball got by you
        finishSwing({ type:'TAKE', dir:0.5, contactX:0.5,
          timing:{ label:'TOOK IT', good:false, tip:'Be ready, do not let good pitches go by.' }, locTip:'' });
      } else {
        drawBall(Math.max(0.02, p));
      }
    } else if (game.state === 'result'){
      var age = now - game.resStart;
      drawHit(game.result, age);
      drawFeedback(game.result, age);
      var dur = game.result.type==='HOMER' ? 1300 : 950;
      if (age > dur){ game.swingAt = 0; nextOrEnd(); }
    }
  }

  function onSwing(clientX, clientY){
    if (!game || game.state !== 'pitch') return;
    var rect = canvas.getBoundingClientRect();
    var rx = (clientX - rect.left) / rect.width;
    var ry = (clientY - rect.top) / rect.height;
    var p = (performance.now() - game.tStart) / game.speed;
    game.swingAt = performance.now();
    finishSwing(evaluate(rx, ry, p));
  }

  function start(){
    game = { pitch:0, score:0, homers:0, state:'windup', windup:0, swingAt:0 };
    hudPitch.textContent = 'Pitch 1/' + PITCHES;
    hudScore.textContent = '0 pts';
    startBtn.textContent = 'Pitching...';
    startBtn.disabled = true;
    newPitch();
  }

  function init(){
    canvas = document.getElementById('derbyCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    hudPitch = document.getElementById('derbyPitch');
    hudScore = document.getElementById('derbyScore');
    resultEl = document.getElementById('derbyResult');
    startBtn = document.getElementById('derbyStart');
    resize();
    window.addEventListener('resize', resize);
    canvas.addEventListener('pointerdown', function(e){ e.preventDefault(); onSwing(e.clientX, e.clientY); });
    if (startBtn) startBtn.addEventListener('click', start);
    raf = requestAnimationFrame(loop);
  }

  // Public API: start() to launch, simulate() for tuning/testing the scoring.
  window.HomeRunDerby = {
    start: function(){ if (startBtn) start(); },
    simulate: function(rx, ry, p, target){
      var saved = game;
      game = { target: target || { x:0.5, y:0.62 } };
      var r; try { r = evaluate(rx, ry, p); } finally { game = saved; }
      return r;
    },
    // static single-frame render for visual checks (this pane throttles rAF)
    renderTest: function(o){
      o = o || {};
      resize();
      var saved = game;
      game = { target: o.target || { x:0.5, y:0.62 }, windup: o.windup||0 };
      drawScene();
      drawBatter(o.sw || 0);
      if (o.ballP != null) drawBall(o.ballP);
      if (o.feedback) drawFeedback({ timing:o.feedback, contactX:o.cx!=null?o.cx:0.5 }, o.age||0);
      game = saved;
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
