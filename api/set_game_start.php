<?php
require_once __DIR__ . '/db.php';

try {
    $db = get_db();
    $input = read_json();
    $code = strtoupper(trim($input['code'] ?? ''));
    $playerName = trim($input['playerName'] ?? '');
    
    if ($code === '' || $playerName === '') {
        json_response(['ok' => false, 'error' => 'Code en speler naam zijn vereist'], 400);
    }

    $now = (new DateTimeImmutable('now'))->format(DateTimeInterface::ATOM);
    
    // Sla game start tijd op voor deze speler
    $stmt = $db->prepare('INSERT OR REPLACE INTO player_scores(room_code, player_name, correct_answers, game_started_at) VALUES(?, ?, 0, ?)');
    $stmt->execute([$code, $playerName, $now]);
    
    json_response(['ok' => true]);
} catch (Throwable $e) {
    json_response(['ok' => false, 'error' => 'Serverfout: ' . $e->getMessage()], 500);
}
