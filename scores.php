<?php
$pageTitle = 'Leaderboard — Sandfall Siege 3D';
$dataFile = __DIR__ . '/data/scores.json';
if (!is_dir(dirname($dataFile))) { @mkdir(dirname($dataFile), 0777, true); }
if (!file_exists($dataFile)) { @file_put_contents($dataFile, '[]'); }

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = trim((string)($_POST['name'] ?? 'Player'));
    $name = preg_replace('/[^A-Za-z0-9 _-]/', '', $name);
    if ($name === '') $name = 'Player';
    $name = substr($name, 0, 20);
    $score = max(0, min(9999999, (int)($_POST['score'] ?? 0)));
    $scores = json_decode((string)@file_get_contents($dataFile), true);
    if (!is_array($scores)) $scores = [];
    $scores[] = ['name'=>$name, 'score'=>$score, 'date'=>date('Y-m-d H:i')];
    usort($scores, fn($a,$b) => ($b['score'] ?? 0) <=> ($a['score'] ?? 0));
    $scores = array_slice($scores, 0, 20);
    @file_put_contents($dataFile, json_encode($scores, JSON_PRETTY_PRINT), LOCK_EX);
    header('Location: scores.php?saved=1'); exit;
}
$scores = json_decode((string)@file_get_contents($dataFile), true);
if (!is_array($scores)) $scores = [];
require __DIR__ . '/includes/header.php';
?>
<main class="scores-shell">
  <section class="scores-card">
    <div class="eyebrow">TOP OPERATORS</div>
    <h1>Leaderboard</h1>
    <?php if (isset($_GET['saved'])): ?><div class="saved-msg">Score saved.</div><?php endif; ?>
    <div class="score-table-wrap">
      <table class="score-table">
        <thead><tr><th>#</th><th>Player</th><th>Score</th><th>Date</th></tr></thead>
        <tbody>
        <?php if (!$scores): ?>
          <tr><td colspan="4" class="empty">No scores yet. Be the first.</td></tr>
        <?php else: foreach ($scores as $i => $row): ?>
          <tr><td><?= $i+1 ?></td><td><?= htmlspecialchars((string)$row['name']) ?></td><td><?= number_format((int)$row['score']) ?></td><td><?= htmlspecialchars((string)$row['date']) ?></td></tr>
        <?php endforeach; endif; ?>
        </tbody>
      </table>
    </div>
    <a class="btn primary" href="play.php">Play Mission</a>
  </section>
</main>
<?php require __DIR__ . '/includes/footer.php'; ?>
