<?php
$pageTitle = 'Play — Sandfall Siege 3D';
require __DIR__ . '/includes/header.php';
?>
<main class="game-page">
  <div id="gameWrap" class="game-wrap">
    <div id="gameMount"></div>

    <div id="hud" class="hud hidden">
      <div class="hud-top">
        <div class="objective-box"><small>MISSION</small><strong id="objectiveText">Clear the palace courtyard</strong></div>
        <div class="enemy-box"><small>ENEMIES</small><strong id="enemyCount">0</strong></div>
      </div>
      <div class="enemy-locator"><small>NEAREST ENEMY</small><strong id="nearestEnemy">--</strong></div>
      <div class="view-controls">
        <button id="firstPersonBtn" type="button" class="view-btn active">GUN VIEW</button>
        <button id="thirdPersonBtn" type="button" class="view-btn">FULL CHARACTER</button>
      </div>
      <div class="damage-vignette" id="damageVignette"></div>
      <div id="hitMarker" class="hit-marker">×</div>
      <div id="crosshair" class="crosshair"><i></i><b></b></div>
      <div class="hud-bottom">
        <div class="health-box"><small>HEALTH</small><div class="bar"><span id="healthBar"></span></div><strong id="healthText">100</strong></div>
        <div class="ammo-box"><div><small>ASSAULT RIFLE</small><strong><span id="ammoMag">30</span><em>/</em><span id="ammoReserve">120</span></strong></div><span id="reloadText"></span></div>
      </div>
      <div class="arrow-hint" aria-hidden="true">
        <span></span><kbd>↑</kbd><span></span><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd>
      </div>
    </div>

    <div id="menu" class="game-overlay">
      <div class="overlay-panel deploy-panel">
        <div class="eyebrow">MISSION 01 · THE FALLEN PALACE</div>
        <h1>Sandfall Siege</h1>
        <p>Enter a ruined desert palace, locate enemy soldiers and clear the compound. Enemies now have visible red markers so you can find the fight quickly.</p>
        <div class="preference-row">
          <span>STARTING VIEW</span>
          <button id="menuFirstPerson" type="button" class="choice active">Gun only</button>
          <button id="menuThirdPerson" type="button" class="choice">Full character</button>
        </div>
        <button id="startBtn" class="btn primary large">Deploy</button>
        <div class="mini-controls">Arrow keys move · Mouse aim · Left click fire · Right click aim · R reload · Shift sprint · Space jump · V switch view</div>
      </div>
    </div>

    <div id="pausePanel" class="pause-panel hidden">
      <div><h2>Paused</h2><p>Click inside the game to continue.</p></div>
    </div>

    <div id="endPanel" class="game-overlay hidden">
      <div class="overlay-panel">
        <div class="eyebrow" id="endEyebrow">MISSION COMPLETE</div>
        <h1 id="endTitle">Palace secured.</h1>
        <p id="endStats"></p>
        <form action="scores.php" method="post" class="score-form">
          <input type="hidden" name="score" id="scoreInput" value="0">
          <input type="text" name="name" maxlength="20" placeholder="Your name" required>
          <button class="btn primary" type="submit">Save Score</button>
        </form>
        <button id="restartBtn" class="btn">Play Again</button>
      </div>
    </div>
  </div>
  <p class="game-help">Click inside the game if the mouse is not captured. Press Esc to release the mouse. Press V at any time to switch between gun view and full-character view.</p>
</main>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="assets/js/game.js"></script>
<?php require __DIR__ . '/includes/footer.php'; ?>
