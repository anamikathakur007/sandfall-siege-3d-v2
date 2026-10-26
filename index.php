<?php
$pageTitle = 'Sandfall Siege 3D — Desert FPS';
require __DIR__ . '/includes/header.php';
?>
<main class="home-shell">
  <section class="hero-card">
    <div class="eyebrow">SINGLE-PLAYER BROWSER FPS</div>
    <h1>Fight through a ruined desert palace.</h1>
    <p class="lead">A slower, more tactical rebuild of Sandfall Siege with first-person movement, visible rifle, magazines, reloading, recoil, enemy soldiers and large broken palace structures.</p>
    <div class="hero-actions">
      <a class="btn primary" href="play.php">Launch Mission</a>
      <a class="btn" href="scores.php">Leaderboard</a>
    </div>
  </section>

  <section class="feature-grid">
    <article><h3>Proper FPS controls</h3><p>Arrow keys movement, mouse look, sprint, crouch, jump, ADS and pointer-lock aiming.</p></article>
    <article><h3>Weapon system</h3><p>30-round rifle magazine, reserve ammo, reload timing, recoil, muzzle flash, hit markers and ammo pickups.</p></article>
    <article><h3>Desert ruins</h3><p>Explore courtyards, broken palace walls, tall towers, arches, rubble and cover positions.</p></article>
    <article><h3>Enemy soldiers</h3><p>Enemies patrol, detect the player, move toward cover-range and fire back instead of simply rushing.</p></article>
  </section>

  <section class="controls-card">
    <h2>Controls</h2>
    <div class="controls-grid">
      <span><kbd>W A S D</kbd> Move</span>
      <span><kbd>Mouse</kbd> Look</span>
      <span><kbd>Left Click</kbd> Fire</span>
      <span><kbd>Right Click</kbd> Aim</span>
      <span><kbd>R</kbd> Reload</span>
      <span><kbd>Shift</kbd> Sprint</span>
      <span><kbd>C</kbd> Crouch</span>
      <span><kbd>Space</kbd> Jump</span>
    </div>
    <p class="note">Desktop/laptop recommended. Click inside the game to capture the mouse. Press Esc to release it.</p>
  </section>
</main>
<?php require __DIR__ . '/includes/footer.php'; ?>
