/* Baseball HQ v2 navigation: three destinations (Today / Me / Team),
   Arcade + Log reached contextually from Today, Parent behind the code.
   Reuses app.js as the engine; this only controls which section shows. */
(function () {
  function showScreen(id) {
    document.querySelectorAll('.v2-screen').forEach(s => s.classList.toggle('active', s.id === id));
    document.querySelectorAll('.v2-tab').forEach(t => t.classList.toggle('active', t.dataset.screen === id));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // charts need a visible canvas to size correctly
    if (id === 'v2-me' && document.querySelector('#me-progress.active') && typeof renderCharts === 'function') renderCharts();
    if (id === 'v2-team' && typeof refreshLeaderboards === 'function') refreshLeaderboards();
  }
  window.showV2 = showScreen;

  // primary bottom tabs
  document.querySelectorAll('.v2-tab').forEach(t => t.onclick = () => showScreen(t.dataset.screen));
  // contextual jumps (Today -> Log / Arcade, Back buttons)
  document.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => showScreen(b.dataset.goto));

  // Me sub-navigation
  document.querySelectorAll('[data-mesub]').forEach(b => b.onclick = () => {
    document.querySelectorAll('[data-mesub]').forEach(x => x.classList.toggle('active', x === b));
    document.querySelectorAll('#v2-me .v2-sub').forEach(s => s.classList.toggle('active', s.id === b.dataset.mesub));
    if (b.dataset.mesub === 'me-progress' && typeof renderCharts === 'function') renderCharts();
  });

  // Team sub-navigation
  document.querySelectorAll('[data-teamsub]').forEach(b => b.onclick = () => {
    document.querySelectorAll('[data-teamsub]').forEach(x => x.classList.toggle('active', x === b));
    document.querySelectorAll('#v2-team .v2-sub').forEach(s => s.classList.toggle('active', s.id === b.dataset.teamsub));
  });

  // Parent zone behind the code (gear icon)
  document.getElementById('v2Parent').onclick = () => {
    var code = window.prompt('Enter parent code to open the Parent Zone');
    if (!code) return;
    var expected = (typeof state === 'object' && state && state.parentCode) ? state.parentCode : 'SPARTAN9';
    if (code === expected) showScreen('v2-parent');
    else window.alert('Incorrect parent code.');
  };

  showScreen('v2-today');
})();
