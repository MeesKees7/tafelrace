<?php
require_once __DIR__ . '/db.php';

try {
    $db = get_db();
    $input = read_json();
    $name = trim($input['name'] ?? '');
    $code = strtoupper(trim($input['code'] ?? ''));
    if ($name === '' || $code === '') {
        json_response(['ok' => false, 'error' => 'Naam en code zijn vereist'], 400);
    }

    // Bestaat room en is niet al gestart?
    $stmt = $db->prepare('SELECT status FROM rooms WHERE code = ? LIMIT 1');
    $stmt->execute([$code]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        json_response(['ok' => false, 'error' => 'Onbekende spelcode'], 404);
    }
    if (($row['status'] ?? '') === 'gestart') {
        json_response(['ok' => false, 'error' => 'Dit spel is al gestart'], 409);
    }

    // Voeg speler toe
    $now = (new DateTimeImmutable('now'))->format(DateTimeInterface::ATOM);
    $stmt = $db->prepare('INSERT INTO players(room_code, name, joined_at) VALUES(?, ?, ?)');
    $stmt->execute([$code, $name, $now]);

    json_response(['ok' => true]);
} catch (Throwable $e) {
    json_response(['ok' => false, 'error' => 'Serverfout: ' . $e->getMessage()], 500);
}


