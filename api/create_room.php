<?php
require_once __DIR__ . '/db.php';

try {
    $db = get_db();
    $input = read_json();
    $name = trim($input['name'] ?? '');
    if ($name === '') {
        json_response(['ok' => false, 'error' => 'Naam is vereist'], 400);
    }

    // Genereer unieke code
    $code = '';
    for ($attempt = 0; $attempt < 10; $attempt++) {
        $candidate = generate_code(4);
        $stmt = $db->prepare('SELECT code FROM rooms WHERE code = ? LIMIT 1');
        $stmt->execute([$candidate]);
        if ($stmt->fetchColumn() === false) {
            $code = $candidate;
            break;
        }
    }
    if ($code === '') {
        json_response(['ok' => false, 'error' => 'Kon geen unieke code genereren'], 500);
    }

    // Maak room aan
    $now = (new DateTimeImmutable('now'))->format(DateTimeInterface::ATOM);
    $stmt = $db->prepare('INSERT INTO rooms(code, status, created_at) VALUES(?, "wachtend", ?)');
    $stmt->execute([$code, $now]);

    // Voeg host als speler toe
    $stmt = $db->prepare('INSERT INTO players(room_code, name, joined_at) VALUES(?, ?, ?)');
    $stmt->execute([$code, $name, $now]);

    json_response(['ok' => true, 'code' => $code]);
} catch (Throwable $e) {
    json_response(['ok' => false, 'error' => 'Serverfout: ' . $e->getMessage()], 500);
}


